/*
 * MASAR
 * Owner: Saud Alqhtani
 * GitHub: sqp77
 * =============
 */

import * as THREE from 'three';
import { clamp, damp } from '../utils/MathUtils.js';

const MODES = ['third', 'first', 'top', 'reverse', 'cinematic'];

// Drives the single game camera across four modes (third-person chase, first-person
// driver view, high top-down chase, rear-mounted reverse/parking camera), smoothing both
// position and look-at target so mode switches and car motion never produce a hard cut.
export class CameraController {
  constructor(camera, canvas) {
    this.camera = camera;
    this.canvas = canvas;
    this.mode = 'third';
    this._pos = new THREE.Vector3();
    this._look = new THREE.Vector3();
    this._fov = 62;
    this._initialized = false;
    this._orbitAngle = 0;

    // Photo Mode (v1.2.0) free camera — orbits a fixed point (the car's position when photo
    // mode was entered) via pointer drag (rotate) and wheel/pinch (zoom), completely independent
    // of the chase-cam `update()` above. Listeners attach/detach in enterFreeCam/exitFreeCam so
    // normal driving input is never touched.
    this._freeCam = null; // { center: Vector3, yaw, pitch, dist }
    this._dragging = false;
    this._lastPointer = { x: 0, y: 0 };
    this._pinchDist = null;
    this._onPointerDown = (e) => {
      this._dragging = true;
      this._lastPointer = { x: e.clientX, y: e.clientY };
    };
    this._onPointerMove = (e) => {
      if (!this._dragging || !this._freeCam) return;
      const dx = e.clientX - this._lastPointer.x;
      const dy = e.clientY - this._lastPointer.y;
      this._lastPointer = { x: e.clientX, y: e.clientY };
      this._freeCam.yaw -= dx * 0.006;
      this._freeCam.pitch = clamp(this._freeCam.pitch - dy * 0.006, -1.3, 1.3);
    };
    this._onPointerUp = () => {
      this._dragging = false;
    };
    this._onWheel = (e) => {
      if (!this._freeCam) return;
      e.preventDefault();
      this._freeCam.dist = clamp(this._freeCam.dist + e.deltaY * 0.01, 3, 30);
    };
    this._onTouchMove = (e) => {
      if (!this._freeCam || e.touches.length !== 2) return;
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      if (this._pinchDist != null) this._freeCam.dist = clamp(this._freeCam.dist - (d - this._pinchDist) * 0.03, 3, 30);
      this._pinchDist = d;
    };
    this._onTouchEnd = () => {
      this._pinchDist = null;
    };
  }

  enterFreeCam(car) {
    const { x, z, yaw } = car.state;
    this._freeCam = { center: new THREE.Vector3(x, 1, z), yaw: yaw + Math.PI, pitch: 0.35, dist: 9 };
    this._dragging = false;
    this._pinchDist = null;
    if (!this.canvas) return;
    this.canvas.addEventListener('pointerdown', this._onPointerDown);
    window.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerup', this._onPointerUp);
    this.canvas.addEventListener('wheel', this._onWheel, { passive: false });
    this.canvas.addEventListener('touchmove', this._onTouchMove, { passive: true });
    this.canvas.addEventListener('touchend', this._onTouchEnd);
  }

  exitFreeCam() {
    this._freeCam = null;
    if (!this.canvas) return;
    this.canvas.removeEventListener('pointerdown', this._onPointerDown);
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerup', this._onPointerUp);
    this.canvas.removeEventListener('wheel', this._onWheel);
    this.canvas.removeEventListener('touchmove', this._onTouchMove);
    this.canvas.removeEventListener('touchend', this._onTouchEnd);
  }

  updateFreeCam() {
    if (!this._freeCam) return;
    const { center, yaw, pitch, dist } = this._freeCam;
    const cosPitch = Math.cos(pitch);
    this.camera.position.set(
      center.x + Math.cos(yaw) * cosPitch * dist,
      center.y + Math.sin(pitch) * dist,
      center.z + Math.sin(yaw) * cosPitch * dist
    );
    this.camera.lookAt(center);
    this.camera.fov = 55;
    this.camera.updateProjectionMatrix();
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
    } else if (this.mode === 'cinematic') {
      // Slow orbiting third-person shot — angle accumulates independent of the car's own
      // heading, giving a steady sweeping pan around the vehicle instead of following behind it.
      this._orbitAngle += dt * 0.35;
      const dist = 9;
      const height = 4.2;
      desiredPos.set(x + Math.cos(this._orbitAngle) * dist, height, z + Math.sin(this._orbitAngle) * dist);
      desiredLook.set(x, 1.1, z);
      fov = 54;
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
