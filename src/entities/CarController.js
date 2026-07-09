/*
 * MASAR
 * Owner: Saud Alqhtani
 * GitHub: sqp77
 * =============
 */

import * as THREE from 'three';
import { createCarModel } from './Car.js';
import { clamp, damp } from '../utils/MathUtils.js';

// Orchestrates one drivable car: owns its visual model (from Car.js), its physics
// state (stepped by PhysicsManager), and translates physics results into wheel
// roll/steer, body suspension tilt, lights, audio and skid-mark effects.
export class CarController {
  constructor(preset, physicsManager, audioManager, effectsManager) {
    this.preset = preset;
    this.physics = physicsManager;
    this.audio = audioManager;
    this.effects = effectsManager;

    this.model = createCarModel(preset);
    // Root handles world position/heading; the inner model group carries purely
    // cosmetic suspension tilt so wheel roll/steer (children of the model group)
    // aren't affected by the split.
    this.root = new THREE.Group();
    this.root.add(this.model.group);

    this.state = physicsManager.createVehicleState(preset);
    this._roll = 0;
    this._pitch = 0;
    this._wheelSpin = 0;
    this._lastSpeed = 0;

    for (const spot of this.model.headlightSpots) spot.intensity = 25;
  }

  get object3D() {
    return this.root;
  }

  placeAt(x, z, yaw) {
    this.physics.placeVehicle(this.state, x, z, yaw);
    this.root.position.set(x, 0, z);
    this.root.rotation.y = -yaw;
    this._lastSpeed = 0;
  }

  getSpeedKmh() {
    return Math.abs(this.state.speed) * 3.6;
  }

  getGear() {
    return this.state.speed < -0.05 ? 'R' : 'D';
  }

  update(dt, input, options = {}) {
    const result = this.physics.step(this.state, input, dt, options);
    const { x, z, yaw, speed, steerAngle } = this.state;

    this.root.position.set(x, 0, z);
    this.root.rotation.y = -yaw;

    // Wheel roll: distance traveled this frame / wheel circumference -> radians.
    this._wheelSpin += (speed * dt) / this.model.wheelRadius;
    for (const wheel of Object.values(this.model.wheels)) wheel.rotation.x = this._wheelSpin;
    this.model.steeringPivots.fl.rotation.y = -steerAngle;
    this.model.steeringPivots.fr.rotation.y = -steerAngle;

    // Suspension feel: roll into turns, pitch under accel/brake.
    const speedRatio = clamp(Math.abs(speed) / (this.preset.maxSpeed / 3.6), 0, 1);
    const targetRoll = -steerAngle * speedRatio * 0.35;
    const accelSign = clamp((speed - this._lastSpeed) / Math.max(dt, 0.0001) / this.preset.accel, -1, 1);
    const targetPitch = -accelSign * 0.05;
    this._roll = damp(this._roll, targetRoll, 8, dt);
    this._pitch = damp(this._pitch, targetPitch, 6, dt);
    this.model.group.rotation.z = this._roll;
    this.model.group.rotation.x = this._pitch;
    this._lastSpeed = speed;

    const braking = input.brake > 0 || input.handbrake;
    for (const light of this.model.brakeLights) light.material.emissiveIntensity = braking ? 3.2 : 0.4;

    this.audio.updateEngine(result.speedRatio, input.throttle);
    if (result.collided && result.impact > 1.5) {
      this.audio.playCollision(clamp(result.impact / 6, 0.2, 1));
    }
    if (input.handbrake && Math.abs(speed) > 2) {
      this.audio.playBrakeScreech(clamp(Math.abs(speed) / 8, 0.2, 1));
    }

    if (this.effects && this.state.handbrakeSlip > 0.15) {
      const forward = { x: Math.cos(yaw), z: Math.sin(yaw) };
      const lateral = { x: -Math.sin(yaw), z: Math.cos(yaw) };
      const half = this.model.dimensions.wheelbase / 2;
      const track = this.model.dimensions.track / 2;
      for (const sign of [1, -1]) {
        const wx = x - forward.x * half + lateral.x * track * sign;
        const wz = z - forward.z * half + lateral.z * track * sign;
        this.effects.emitSkid(wx, wz, yaw, this.state.handbrakeSlip);
      }
    }
    if (this.effects && result.collided) {
      this.effects.emitCollisionSpark(x, z);
    }

    return result;
  }
}
