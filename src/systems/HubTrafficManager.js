/*
 * MASAR
 * Owner: Saud Alqhtani
 * GitHub: sqp77
 * =============
 */

import * as THREE from 'three';
import { createCarModel } from '../entities/Car.js';
import { createPedestrianModel } from '../entities/Pedestrian.js';
import { makeSeededRandom, lerp, pingPongWalk } from '../utils/MathUtils.js';
import { HUB_LANE_LOOP, HUB_PEDESTRIAN_PATHS } from '../data/hubMap.js';

const MAX_CIVILIAN_CARS = 4; // capped for mobile performance (Optimization Rules) — full car
// models are relatively heavy (~20 meshes each incl. two headlight spotlights), so this stays
// well under the campaign's own per-level traffic caps despite the hub's larger open area.
const CIVILIAN_SPEED_RANGE = [5, 8]; // m/s
const STOP_DWELL = 1.6; // seconds paused at an intersection (loop) node
const PEDESTRIAN_SPEED = 1.1;
const AHEAD_GAP = 4.5; // minimum following distance before a car pauses for the one ahead
const CIVILIAN_SEED = 77001;
const CAR_COLORS = [0x8a8f97, 0x5c6470, 0x9c7a5a, 0x4a5568, 0x6b6f76, 0x7c8590, 0xa3b1c2, 0x2ec4ff];

// Advances a position along an ordered node loop at constant speed, pausing `STOP_DWELL`
// seconds at any node flagged `stop: true` (data/hubMap.js's HUB_LANE_LOOP corners) — the
// one shared "lane-following + stop at intersections" primitive reused by every ambient
// civilian car here and by PoliceManager's patrol car (Feature 3 + Feature 5), instead of
// three separate movement systems.
export class LoopFollower {
  constructor(loop, speed, startIndex = 0, startT = 0) {
    this.loop = loop;
    this.speed = speed;
    this.index = startIndex % loop.length;
    this.t = startT;
    this.dwell = 0;
  }

  peekProgress() {
    return this.index + this.t;
  }

  // `blocked` (optional) lets a following car pause mid-segment instead of just at nodes —
  // the simple "avoid collisions when possible" behavior: don't advance into the car ahead.
  advance(dt, blocked = false) {
    const loop = this.loop;
    if (!blocked) {
      if (this.dwell > 0) {
        this.dwell = Math.max(0, this.dwell - dt);
      } else {
        const a = loop[this.index];
        const b = loop[(this.index + 1) % loop.length];
        const segLen = Math.max(0.001, Math.hypot(b.x - a.x, b.z - a.z));
        this.t += (this.speed * dt) / segLen;
        if (this.t >= 1) {
          this.t = 0;
          this.index = (this.index + 1) % loop.length;
          if (loop[this.index].stop) this.dwell = STOP_DWELL;
        }
      }
    }
    const cur = loop[this.index];
    const next = loop[(this.index + 1) % loop.length];
    const x = lerp(cur.x, next.x, this.t);
    const z = lerp(cur.z, next.z, this.t);
    const heading = Math.atan2(next.z - cur.z, next.x - cur.x);
    return { x, z, heading };
  }
}

// Ambient civilian traffic + pedestrians + a small always-idle "animated" dealership lot
// (Feature 3: Traffic System, Feature 7: Dynamic City Life). Every agent is registered
// with PhysicsManager the same way TrafficManager's level agents are, so the existing
// PhysicsManager.step() collision loop resolves the player against hub traffic automatically.
export class HubTrafficManager {
  constructor(scene, physics) {
    this.scene = scene;
    this.physics = physics;
    this.group = new THREE.Group();
    this.group.name = 'hubTraffic';
    this.scene.add(this.group);
    this.cars = [];
    this.pedestrians = [];
    this._elapsed = 0;
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
    this.cars = [];
    this.pedestrians = [];
    this._elapsed = 0;
  }

  // Does NOT reset PhysicsManager (HubBuilder.build() already did, and owns that
  // responsibility) — only clears this manager's own agents/colliders references.
  build() {
    this.clear();
    const rng = makeSeededRandom(CIVILIAN_SEED);
    for (let i = 0; i < MAX_CIVILIAN_CARS; i++) this._spawnCivilianCar(rng, i);
    for (const path of HUB_PEDESTRIAN_PATHS) this._spawnPedestrian(rng, path);
  }

  _spawnCivilianCar(rng, index) {
    const length = 4.2;
    const width = 1.85;
    const preset = {
      id: 'hubCivilian',
      color: CAR_COLORS[Math.floor(rng() * CAR_COLORS.length)],
      length,
      width,
      height: 1.3,
      wheelbase: length * 0.58,
      track: width * 0.82,
      maxSpeed: 0,
      accel: 0,
      handling: 1,
    };
    const model = createCarModel(preset);
    // Ambient background traffic never needs working headlights or shadows — dropping both
    // (rather than just zeroing spotlight intensity) keeps the hub's total dynamic-light and
    // shadow-caster count well below what MAX_CIVILIAN_CARS full car models would otherwise
    // add, which matters a lot more on mobile/low-end GPUs than on desktop.
    for (const spot of model.headlightSpots) model.group.remove(spot, spot.target);
    model.group.traverse((node) => {
      if (node.isMesh) node.castShadow = false;
    });
    this.group.add(model.group);

    const speed = lerp(CIVILIAN_SPEED_RANGE[0], CIVILIAN_SPEED_RANGE[1], rng());
    const startIndex = Math.floor((index / MAX_CIVILIAN_CARS) * HUB_LANE_LOOP.length) % HUB_LANE_LOOP.length;
    const follower = new LoopFollower(HUB_LANE_LOOP, speed, startIndex, rng());
    const collider = this.physics.addCollider({ x: 0, z: 0, halfWidth: width / 2, halfDepth: length / 2, angle: 0 }, 'trafficCar');
    this.cars.push({ model, follower, collider, halfDepth: length / 2 });
  }

  _spawnPedestrian(rng, path) {
    const model = createPedestrianModel();
    this.group.add(model);
    const collider = this.physics.addCollider({ x: path.from.x, z: path.from.z, halfWidth: 0.3, halfDepth: 0.3, angle: 0 }, 'pedestrian');
    this.pedestrians.push({ model, collider, from: path.from, to: path.to, phase: rng() * 10 });
  }

  update(dt) {
    this._elapsed += dt;

    // Simple ahead-car gap check: a car pauses (dwell-style) if the next car sharing the
    // loop is within AHEAD_GAP of it in loop-progress terms — cheap O(n^2) over a handful
    // of cars, avoids overlapping/rear-ending on the shared one-way loop.
    for (let i = 0; i < this.cars.length; i++) {
      const car = this.cars[i];
      let blocked = false;
      for (let j = 0; j < this.cars.length; j++) {
        if (i === j) continue;
        const other = this.cars[j];
        if (other.follower.index !== car.follower.index) continue;
        const gap = other.follower.t - car.follower.t;
        if (gap > 0 && gap * this._segmentLength(car.follower) < AHEAD_GAP + car.halfDepth) {
          blocked = true;
          break;
        }
      }
      const { x, z, heading } = car.follower.advance(dt, blocked);
      car.model.group.position.set(x, 0, z);
      car.model.group.rotation.y = -heading;
      car.collider.obb.set(x, z, heading - Math.PI / 2);
    }

    for (const p of this.pedestrians) {
      const { x, z, heading } = pingPongWalk(this._elapsed, p.phase, p.from, p.to, PEDESTRIAN_SPEED);
      p.model.position.set(x, 0, z);
      p.model.rotation.y = -heading;
      p.collider.obb.set(x, z, heading - Math.PI / 2);
    }
  }

  _segmentLength(follower) {
    const loop = follower.loop;
    const a = loop[follower.index];
    const b = loop[(follower.index + 1) % loop.length];
    return Math.max(0.001, Math.hypot(b.x - a.x, b.z - a.z));
  }
}
