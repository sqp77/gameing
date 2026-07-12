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

const PATROL_SPEED = 6; // m/s
const SPEED_LIMIT = 14; // m/s (~50 km/h) — hub-only; campaign/Academy/License are untouched
const SPEEDING_SUSTAIN = 2.5; // seconds of continuous over-limit driving = one offense
const RECKLESS_WINDOW = 20; // seconds — offenses older than this roll off
const OFFENSES_BEFORE_FINE = 2; // 1st offense in the window = warning only, 2nd = fine
const FINE_COOLDOWN = 30; // seconds — never fines twice back-to-back
const FINE_AMOUNT = 50; // coins

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
