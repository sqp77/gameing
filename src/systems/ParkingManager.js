/*
 * ParkMaster3D
 * Owner: Saud
 * GitHub: sqp77
 * =============
 */

import { OBB2D } from '../utils/OBB.js';
import { clamp, shortestAngleDelta } from '../utils/MathUtils.js';
import { carOBBFromState } from './PhysicsManager.js';
import { EventEmitter } from '../utils/EventEmitter.js';

const SPEED_EPSILON = 0.35; // m/s — "stopped" threshold
const CONTAINMENT_MARGIN = 0.04;
const WRONG_SPOT_COOLDOWN = 2.5;

// Detects parking completion: the car's OBB must be fully inside the target spot's
// OBB, its heading aligned within tolerance (either direction unless the spot demands
// reverse/nose-out parking), and its speed near zero — held continuously for the
// spot's `holdTime` before counting as parked. Emits 'success' and 'wrongSpot'.
export class ParkingManager extends EventEmitter {
  constructor() {
    super();
    this.spots = [];
    this.holdTimer = 0;
    this.activeSpotId = null;
    this.completed = false;
    this._wrongSpotCooldown = 0;
  }

  setSpots(spots) {
    this.spots = spots.map((s) => ({ ...s, obb: new OBB2D(s.x, s.z, s.halfWidth, s.halfDepth, s.angle) }));
    this.holdTimer = 0;
    this.activeSpotId = null;
    this.completed = false;
    this._wrongSpotCooldown = 0;
  }

  reset() {
    this.holdTimer = 0;
    this.activeSpotId = null;
    this.completed = false;
  }

  update(dt, carState) {
    if (this.completed) return { progress: 1, inSpot: null };

    const carBox = carOBBFromState(carState);
    const speed = Math.abs(carState.speed);

    let matched = null;
    for (const spot of this.spots) {
      if (OBB2D.isFullyInside(carBox, spot.obb, CONTAINMENT_MARGIN)) {
        matched = spot;
        break;
      }
    }

    this._wrongSpotCooldown = Math.max(0, this._wrongSpotCooldown - dt);

    if (!matched) {
      this.holdTimer = 0;
      this.activeSpotId = null;
      return { progress: 0, inSpot: null };
    }

    if (!matched.isTarget) {
      if (speed < SPEED_EPSILON && this._wrongSpotCooldown <= 0) {
        this._wrongSpotCooldown = WRONG_SPOT_COOLDOWN;
        this.emit('wrongSpot', matched);
      }
      this.holdTimer = 0;
      this.activeSpotId = matched.spotId;
      return { progress: 0, inSpot: matched };
    }

    const angleOk = matched.requireReverse
      ? Math.abs(shortestAngleDelta(carState.yaw, matched.heading)) <= matched.tolerance
      : Math.abs(shortestAngleDelta(carState.yaw, matched.heading)) <= matched.tolerance ||
        Math.abs(shortestAngleDelta(carState.yaw, matched.heading + Math.PI)) <= matched.tolerance;
    const speedOk = speed < SPEED_EPSILON;

    this.activeSpotId = matched.spotId;
    if (angleOk && speedOk) {
      this.holdTimer += dt;
      if (this.holdTimer >= matched.holdTime) {
        this.completed = true;
        const accuracy = this._computeAccuracy(carBox, matched, carState);
        this.emit('success', { spot: matched, accuracy });
        return { progress: 1, inSpot: matched, angleOk, speedOk };
      }
    } else {
      this.holdTimer = Math.max(0, this.holdTimer - dt * 2);
    }

    return { progress: clamp(this.holdTimer / matched.holdTime, 0, 1), inSpot: matched, angleOk, speedOk };
  }

  _computeAccuracy(carBox, spot, carState) {
    const dx = carBox.x - spot.x;
    const dz = carBox.z - spot.z;
    const cos = Math.cos(spot.angle);
    const sin = Math.sin(spot.angle);
    const localX = dx * cos + dz * sin;
    const localZ = -dx * sin + dz * cos;
    const centering = 1 - clamp((Math.abs(localX) / spot.halfWidth + Math.abs(localZ) / spot.halfDepth) / 2, 0, 1);
    const angleDelta = Math.min(
      Math.abs(shortestAngleDelta(carState.yaw, spot.heading)),
      Math.abs(shortestAngleDelta(carState.yaw, spot.heading + Math.PI))
    );
    const angleScore = 1 - clamp(angleDelta / spot.tolerance, 0, 1);
    return clamp(centering * 0.6 + angleScore * 0.4, 0, 1);
  }
}
