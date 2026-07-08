/*
 * ParkMaster3D
 * Owner: Saud
 * GitHub: sqp77
 * =============
 */

import * as THREE from 'three';
import { clamp, damp } from '../utils/MathUtils.js';

const MODES = ['third', 'first', 'top', 'reverse'];

// Drives the single game camera across four modes (third-person chase, first-person
// driver view, high top-down chase, rear-mounted reverse/parking camera), smoothing both
// position and look-at target so mode switches and car motion never produce a hard cut.
export class CameraController {
  constructor(camera) {
    this.camera = camera;
    this.mode = 'third';
    this._pos = new THREE.Vector3();
    this._look = new THREE.Vector3();
    this._fov = 62;
    this._initialized = false;
  }

  setMode(mode) {
    if (MODES.includes(mode)) this.mode = mode;
  }

  cycle() {
    const idx = MODES.indexOf(this.mode);
    this.mode = MODES[(idx + 1) % MODES.length];
    return this.mode;
  }

  update(dt, car) {
    const { x, z, yaw } = car.state;
    const speed = Math.abs(car.state.speed);
    const forward = { x: Math.cos(yaw), z: Math.sin(yaw) };

    const desiredPos = new THREE.Vector3();
    const desiredLook = new THREE.Vector3();
    let fov = 62;

    if (this.mode === 'first') {
      const { rideHeight, dimensions } = car.model;
      const eyeHeight = rideHeight + dimensions.height * 0.92;
      const seatForward = dimensions.length * 0.08;
      desiredPos.set(x + forward.x * seatForward, eyeHeight, z + forward.z * seatForward);
      desiredLook.set(x + forward.x * 14, eyeHeight - 0.15, z + forward.z * 14);
      fov = 70;
    } else if (this.mode === 'top') {
      desiredPos.set(x - forward.x * 5, 19, z - forward.z * 5);
      desiredLook.set(x, 0, z);
      fov = 48;
    } else if (this.mode === 'reverse') {
      // Rear-mounted backup camera: mounted low at the back bumper, wide-angle, looking
      // backward (opposite the first-person driver view) so it reads what's behind the car.
      const { rideHeight, dimensions } = car.model;
      const mountHeight = rideHeight + dimensions.height * 0.55;
      const mountBack = dimensions.length * 0.52;
      desiredPos.set(x - forward.x * mountBack, mountHeight, z - forward.z * mountBack);
      desiredLook.set(x - forward.x * 14, mountHeight - 0.4, z - forward.z * 14);
      fov = 78;
    } else {
      const dist = 7.6;
      const height = 3.3;
      desiredPos.set(x - forward.x * dist, height, z - forward.z * dist);
      desiredLook.set(x + forward.x * 3, 1.1, z + forward.z * 3);
      fov = 60 + clamp(speed / 12, 0, 1) * 8;
    }

    if (!this._initialized) {
      this._pos.copy(desiredPos);
      this._look.copy(desiredLook);
      this._fov = fov;
      this._initialized = true;
    } else {
      const posLambda = this.mode === 'first' || this.mode === 'reverse' ? 14 : 8;
      this._pos.x = damp(this._pos.x, desiredPos.x, posLambda, dt);
      this._pos.y = damp(this._pos.y, desiredPos.y, posLambda, dt);
      this._pos.z = damp(this._pos.z, desiredPos.z, posLambda, dt);
      this._look.x = damp(this._look.x, desiredLook.x, 10, dt);
      this._look.y = damp(this._look.y, desiredLook.y, 10, dt);
      this._look.z = damp(this._look.z, desiredLook.z, 10, dt);
      this._fov = damp(this._fov, fov, 5, dt);
    }

    this.camera.position.copy(this._pos);
    this.camera.lookAt(this._look);
    this.camera.fov = this._fov;
    this.camera.updateProjectionMatrix();
  }
}
