/*
 * ParkMaster3D
 * Owner: Saud
 * GitHub: sqp77
 * =============
 */

import { OBB2D } from '../utils/OBB.js';
import { clamp, damp, degToRad, normalizeAngle } from '../utils/MathUtils.js';

const MAX_STEER_DEG = 36;
const STEER_RATE_DEG = 210;

function moveTowards(current, target, maxDelta) {
  if (Math.abs(target - current) <= maxDelta) return target;
  return current + Math.sign(target - current) * maxDelta;
}

// Builds the same OBB2D convention used for parking spots/obstacles: `angle =
// heading - PI/2` so the box's long (depth) axis points along the heading/forward
// direction. Kept in sync with world/levels.js's poseToBox().
export function carOBBFromState(state) {
  const { preset } = state;
  return new OBB2D(state.x, state.z, preset.width / 2, preset.length / 2, state.yaw - Math.PI / 2);
}

// Owns per-vehicle kinematic-bicycle-model physics plus the static collider registry
// (parking spots' neighboring obstacles, decorative buildings, level boundary) that
// the car is resolved against every frame via OBB2D (Separating Axis Theorem).
export class PhysicsManager {
  constructor() {
    this.colliders = [];
    this.boundary = null;
  }

  reset() {
    this.colliders = [];
    this.boundary = null;
  }

  setBoundary(halfX, halfZ) {
    this.boundary = { halfX, halfZ };
  }

  addCollider(box, type, meta = {}) {
    const obb = new OBB2D(box.x, box.z, box.halfWidth, box.halfDepth, box.angle);
    const entry = { obb, type, meta };
    this.colliders.push(entry);
    return entry;
  }

  createVehicleState(preset) {
    return { preset, x: 0, z: 0, yaw: 0, speed: 0, steerAngle: 0, handbrakeSlip: 0 };
  }

  placeVehicle(state, x, z, yaw) {
    state.x = x;
    state.z = z;
    state.yaw = yaw;
    state.speed = 0;
    state.steerAngle = 0;
    state.handbrakeSlip = 0;
  }

  // Advances vehicle physics one frame given normalized input {throttle,brake,steer,handbrake}.
  // Returns {collided, hitTypes, outOfBounds, impact} describing what happened this frame.
  step(state, input, dt, options = {}) {
    const preset = state.preset;
    const maxSpeed = preset.maxSpeed / 3.6; // km/h -> m/s
    const reverseMaxSpeed = maxSpeed * 0.45;
    const speedRatio = clamp(Math.abs(state.speed) / maxSpeed, 0, 1);

    const steerSens = options.steerSensitivity ?? 1;
    const maxSteer = degToRad(MAX_STEER_DEG) * preset.handling * steerSens * (1 - speedRatio * 0.45);
    const targetSteer = clamp(input.steer, -1, 1) * maxSteer;
    const steerRate = degToRad(STEER_RATE_DEG) * preset.handling;
    state.steerAngle = moveTowards(state.steerAngle, targetSteer, steerRate * dt);

    const accel = preset.accel;
    let targetAccel = 0;
    if (input.handbrake) {
      targetAccel = state.speed > 0.05 ? -accel * 3.0 : state.speed < -0.05 ? accel * 3.0 : 0;
    } else if (input.throttle > 0 && state.speed >= -0.05) {
      targetAccel = accel * input.throttle * (1 - speedRatio * 0.55);
    } else if (input.throttle > 0) {
      targetAccel = accel * 2.2 * input.throttle; // throttle while rolling backward: brake out of reverse
    } else if (input.brake > 0 && state.speed > 0.05) {
      targetAccel = -accel * 2.3 * input.brake;
    } else if (input.brake > 0) {
      targetAccel = -accel * 0.7 * input.brake; // reverse gear
    } else if (Math.abs(state.speed) > 0.001) {
      targetAccel = -Math.sign(state.speed) * accel * 0.9; // engine braking / rolling friction
    }

    state.speed += targetAccel * dt;
    state.speed = clamp(state.speed, -reverseMaxSpeed, maxSpeed);
    if (!input.throttle && !input.brake && !input.handbrake && Math.abs(state.speed) < 0.05) {
      state.speed = 0;
    }

    const yawRate = (state.speed / preset.wheelbase) * Math.tan(state.steerAngle);
    state.yaw = normalizeAngle(state.yaw + yawRate * dt);

    const slipTarget = input.handbrake && Math.abs(state.speed) > 1.5 ? clamp(Math.abs(state.steerAngle) / maxSteer, 0, 1) : 0;
    state.handbrakeSlip = damp(state.handbrakeSlip, slipTarget, 6, dt);

    const forward = { x: Math.cos(state.yaw), z: Math.sin(state.yaw) };
    const lateral = { x: -Math.sin(state.yaw), z: Math.cos(state.yaw) };
    const slipAmount = state.handbrakeSlip * 2.4 * Math.sign(state.steerAngle || 0.0001);
    state.x += forward.x * state.speed * dt + lateral.x * slipAmount * dt;
    state.z += forward.z * state.speed * dt + lateral.z * slipAmount * dt;

    const carBox = carOBBFromState(state);
    let collided = false;
    let impact = 0;
    const hitTypes = new Set();
    for (const entry of this.colliders) {
      const mtv = OBB2D.resolve(carBox, entry.obb);
      if (mtv) {
        state.x += mtv.x;
        state.z += mtv.z;
        carBox.set(state.x, state.z, carBox.angle);
        impact = Math.max(impact, Math.abs(state.speed));
        hitTypes.add(entry.type);
        collided = true;
        state.speed *= 0.15;
      }
    }

    let outOfBounds = false;
    if (this.boundary) {
      const { halfX, halfZ } = this.boundary;
      if (Math.abs(state.x) > halfX || Math.abs(state.z) > halfZ) {
        outOfBounds = true;
        state.x = clamp(state.x, -halfX, halfX);
        state.z = clamp(state.z, -halfZ, halfZ);
        state.speed *= 0.3;
      }
    }

    return { collided, hitTypes: Array.from(hitTypes), outOfBounds, impact, speed: state.speed, speedRatio: Math.abs(state.speed) / maxSpeed };
  }
}
