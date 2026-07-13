/*
 * MASAR
 * Owner: Saud Alqhtani
 * GitHub: sqp77
 * =============
 */

import * as THREE from 'three';
import { createCarModel } from '../entities/Car.js';
import { EventEmitter } from '../utils/EventEmitter.js';
import { LoopFollower } from './HubTrafficManager.js';
import { HUB_PATROL_ROUTE } from '../data/hubMap.js';
import { shortestAngleDelta, degToRad } from '../utils/MathUtils.js';

const PATROL_SPEED = 6; // m/s
const SPEED_LIMIT = 14; // m/s (~50 km/h) — hub-only; campaign/Academy/License are untouched
const SPEEDING_SUSTAIN = 2.5; // seconds of continuous over-limit driving = one offense
const RECKLESS_WINDOW = 20; // seconds — offenses older than this roll off
const OFFENSES_BEFORE_FINE = 2; // 1st offense in the window = warning only, 2nd = fine
const FINE_COOLDOWN = 30; // seconds — never fines twice back-to-back
const FINE_AMOUNT = 50; // coins

// v1.2.0 Traffic Police System expansion — two new offense detectors reusing the exact same
// LoopFollower lane data (HUB_PATROL_ROUTE/HUB_LANE_LOOP) and warning/fine escalation as the
// existing speeding/collision checks below.
const WRONG_SIDE_RADIUS = 9; // meters from the lane loop centerline — must be "on the road"
const WRONG_SIDE_ANGLE = degToRad(120); // heading opposite the loop's flow direction beyond this
const WRONG_SIDE_SUSTAIN = 1.5; // seconds facing oncoming traffic = one offense
const REDLIGHT_RADIUS = 6; // meters — "at the intersection" trigger zone around a stop node
const REDLIGHT_MIN_SPEED = 3; // m/s — must be actually driving through, not idling nearby
const REDLIGHT_CYCLE = 6; // seconds per light cycle
const REDLIGHT_RED_DURATION = 2.2; // seconds red within each cycle

// Saudi-inspired traffic enforcement (Feature 5) — one patrol car reusing
// HubTrafficManager's LoopFollower on the same shared lane loop (data/hubMap.js's
// HUB_PATROL_ROUTE), plus a lightweight reckless-driving watch: speeding for
// `SPEEDING_SUSTAIN`s or a hub collision counts as one "offense"; the first offense in a
// rolling window is a warning (no penalty), a second triggers a fine — capped by a
// cooldown so the player is never fined repeatedly for one bad moment. Hub-only: never
// active during a timed campaign/Academy/License attempt, so parking techniques that
// need a hard handbrake turn are never penalized.
export class PoliceManager extends EventEmitter {
  constructor(scene, physics) {
    super();
    this.scene = scene;
    this.physics = physics;
    this.group = new THREE.Group();
    this.group.name = 'police';
    this.scene.add(this.group);
    this.car = null;
    this.follower = null;
    this.collider = null;
    this._lights = [];
    this._elapsed = 0;
    this._overSpeedTime = 0;
    this._fineCooldown = 0;
    this._offenseTimes = [];
    this._wrongSideTime = 0;
    this._signalNodes = [];
  }

  clear() {
    while (this.group.children.length) {
      const child = this.group.children.pop();
      child.traverse?.((node) => {
        if (node.geometry) node.geometry.dispose();
        if (node.material) {
          const mats = Array.isArray(node.material) ? node.material : [node.material];
          for (const m of mats) m.dispose();
        }
      });
    }
    this.car = null;
    this.follower = null;
    this.collider = null;
    this._lights = [];
    this._elapsed = 0;
    this._overSpeedTime = 0;
    this._fineCooldown = 0;
    this._offenseTimes = [];
    this._wrongSideTime = 0;
    this._signalNodes = [];
  }

  build() {
    this.clear();
    const length = 4.6;
    const width = 1.9;
    const preset = {
      id: 'police',
      color: 0xf4f6f8,
      length,
      width,
      height: 1.35,
      wheelbase: length * 0.58,
      track: width * 0.82,
      maxSpeed: 0,
      accel: 0,
      handling: 1,
    };
    this.car = createCarModel(preset);
    // The patrol car doesn't need working headlights (it's never player-controlled) — dropped
    // entirely rather than zeroed, same reasoning as HubTrafficManager's ambient cars.
    for (const spot of this.car.headlightSpots) {
      this.car.group.remove(spot, spot.target);
    }

    // Light bar: two small emissive spheres (red/blue) on the roof, flashed in update().
    const barGeo = new THREE.SphereGeometry(0.1, 8, 8);
    const red = new THREE.Mesh(barGeo, new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 2 }));
    const blue = new THREE.Mesh(barGeo, new THREE.MeshStandardMaterial({ color: 0x2255ff, emissive: 0x2255ff, emissiveIntensity: 2 }));
    red.position.set(0.3, this.car.dimensions.height + 0.15, 0.18);
    blue.position.set(0.3, this.car.dimensions.height + 0.15, -0.18);
    this.car.group.add(red, blue);
    this._lights = [red.material, blue.material];

    this.group.add(this.car.group);
    this.follower = new LoopFollower(HUB_PATROL_ROUTE, PATROL_SPEED, Math.floor(HUB_PATROL_ROUTE.length / 2), 0);
    this.collider = this.physics.addCollider({ x: 0, z: 0, halfWidth: width / 2, halfDepth: length / 2, angle: 0 }, 'trafficCar');

    // Traffic signals (v1.2.0 red-light violation): a small emissive sphere at every
    // intersection ("stop": true) node on the shared lane loop, cycling red/green in update() —
    // reuses the exact sphere+emissive-material idiom already used for the light bar above,
    // deliberately not a full 3D traffic-light model to stay lightweight.
    const signalGeo = new THREE.SphereGeometry(0.22, 8, 8);
    HUB_PATROL_ROUTE.forEach((node, index) => {
      if (!node.stop) return;
      const mat = new THREE.MeshStandardMaterial({ color: 0x2ee65c, emissive: 0x2ee65c, emissiveIntensity: 2 });
      const mesh = new THREE.Mesh(signalGeo, mat);
      mesh.position.set(node.x, 3.4, node.z);
      this.group.add(mesh);
      this._signalNodes.push({ x: node.x, z: node.z, phase: (index * 1.7) % REDLIGHT_CYCLE, material: mat, wasInside: false });
    });
  }

  _isRedAt(phase) {
    return (this._elapsed + phase) % REDLIGHT_CYCLE < REDLIGHT_RED_DURATION;
  }

  update(dt, carState) {
    this._elapsed += dt;
    this._fineCooldown = Math.max(0, this._fineCooldown - dt);

    const { x, z, heading } = this.follower.advance(dt);
    this.car.group.position.set(x, 0, z);
    this.car.group.rotation.y = -heading;
    this.collider.obb.set(x, z, heading - Math.PI / 2);

    const flashOn = Math.floor(this._elapsed * 4) % 2 === 0;
    this._lights[0].emissiveIntensity = flashOn ? 3 : 0.2;
    this._lights[1].emissiveIntensity = flashOn ? 0.2 : 3;

    const speed = Math.abs(carState.speed);
    if (speed > SPEED_LIMIT) {
      this._overSpeedTime += dt;
      if (this._overSpeedTime >= SPEEDING_SUSTAIN) {
        this._overSpeedTime = 0;
        this._registerOffense('speeding');
      }
    } else {
      this._overSpeedTime = Math.max(0, this._overSpeedTime - dt * 2);
    }

    // Wrong-side driving: sustained heading roughly opposite the lane loop's local flow
    // direction while actually near/on the loop — a brief U-turn or crossing the road doesn't
    // count, only holding an oncoming heading on the road for WRONG_SIDE_SUSTAIN seconds.
    const { dist: loopDist, heading: loopHeading } = this._nearestLoopHeading(carState.x, carState.z);
    const facingOncoming = loopDist < WRONG_SIDE_RADIUS && Math.abs(shortestAngleDelta(carState.yaw, loopHeading)) > WRONG_SIDE_ANGLE;
    if (facingOncoming && speed > 1) {
      this._wrongSideTime += dt;
      if (this._wrongSideTime >= WRONG_SIDE_SUSTAIN) {
        this._wrongSideTime = 0;
        this._registerOffense('wrongSide');
      }
    } else {
      this._wrongSideTime = Math.max(0, this._wrongSideTime - dt * 2);
    }

    // Red light: each signal cycles red/green independently (offset phase); driving through an
    // intersection's trigger radius while it's red counts once per entry (edge-triggered via
    // `wasInside`), not continuously while lingering nearby.
    for (const node of this._signalNodes) {
      const inside = Math.hypot(carState.x - node.x, carState.z - node.z) < REDLIGHT_RADIUS;
      const isRed = this._isRedAt(node.phase);
      node.material.color.setHex(isRed ? 0xff3030 : 0x2ee65c);
      node.material.emissive.setHex(isRed ? 0xff3030 : 0x2ee65c);
      if (inside && !node.wasInside && isRed && speed > REDLIGHT_MIN_SPEED) {
        this._registerOffense('redLight');
      }
      node.wasInside = inside;
    }
  }

  // Closest point on the shared lane loop to (x,z) and that segment's direction of travel —
  // used only for the wrong-side-driving check above; cheap linear scan over the loop's 8
  // segments (same data PoliceManager already follows via LoopFollower).
  _nearestLoopHeading(x, z) {
    const loop = HUB_PATROL_ROUTE;
    let best = { dist: Infinity, heading: 0 };
    for (let i = 0; i < loop.length; i++) {
      const a = loop[i];
      const b = loop[(i + 1) % loop.length];
      const abx = b.x - a.x;
      const abz = b.z - a.z;
      const lenSq = abx * abx + abz * abz || 1;
      const t = Math.max(0, Math.min(1, ((x - a.x) * abx + (z - a.z) * abz) / lenSq));
      const px = a.x + abx * t;
      const pz = a.z + abz * t;
      const dist = Math.hypot(x - px, z - pz);
      if (dist < best.dist) best = { dist, heading: Math.atan2(abz, abx) };
    }
    return best;
  }

  registerCollision() {
    this._registerOffense('collision');
  }

  _registerOffense(kind) {
    this._offenseTimes = this._offenseTimes.filter((t) => this._elapsed - t < RECKLESS_WINDOW);
    this._offenseTimes.push(this._elapsed);
    if (this._offenseTimes.length < OFFENSES_BEFORE_FINE) {
      this.emit('warning', { kind });
    } else if (this._fineCooldown <= 0) {
      this._fineCooldown = FINE_COOLDOWN;
      this._offenseTimes = [];
      this.emit('fine', { kind, amount: FINE_AMOUNT });
    }
  }
}
