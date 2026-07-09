/*
 * MASAR
 * Owner: Saud Alqhtani
 * GitHub: sqp77
 * =============
 */

import * as THREE from 'three';
import { OBB2D } from '../utils/OBB.js';
import { clamp } from '../utils/MathUtils.js';

const SENSOR_RANGE = 4.5; // meters ahead/behind the bumper the sensors can detect
const SENSOR_STEP = 0.3;
const SENSOR_STEPS = Math.ceil(SENSOR_RANGE / SENSOR_STEP);
const GUIDE_SPEED_THRESHOLD = 8; // m/s — guide lines only make sense at parking speeds
const GUIDE_LENGTH = 6; // meters
const GUIDE_SEGMENTS = 14;
const OUTLINE_Y = 0.035;
const GUIDE_Y = 0.03;

// Optional driver-assist overlay: proximity sensing (front/rear distance to the nearest
// collider), a predicted-path guide pair derived from the current steering angle, and a
// pulsing outline around the target parking spot. Purely additive — it only reads
// PhysicsManager/ParkingManager state, never mutates it. All THREE geometry is built once and
// updated in place each frame (no per-frame allocation); the whole overlay is one group toggled
// via `.visible` so disabling it in Settings is instant and free.
export class AssistManager {
  constructor(scene) {
    this.group = new THREE.Group();
    this.group.name = 'assist';
    this.group.visible = false;
    scene.add(this.group);

    this.enabled = false;
    this._elapsed = 0;
    this._probe = new OBB2D(0, 0, 0.5, SENSOR_STEP / 2, 0);

    this._buildOutline();
    this._buildGuideLines();
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    this.group.visible = enabled;
  }

  // `spot` is a ParkingManager spot entry (has `.obb`), or null to hide the outline.
  setTargetSpot(spot) {
    if (!spot) {
      this._outline.visible = false;
      return;
    }
    this._outline.visible = true;
    const corners = spot.obb.getCorners();
    const positions = this._outline.geometry.attributes.position;
    for (let i = 0; i < 4; i++) positions.setXYZ(i, corners[i].x, OUTLINE_Y, corners[i].z);
    positions.setXYZ(4, corners[0].x, OUTLINE_Y, corners[0].z);
    positions.needsUpdate = true;
  }

  _buildOutline() {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(5 * 3), 3));
    const mat = new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.9 });
    this._outline = new THREE.Line(geo, mat);
    this._outline.visible = false;
    this.group.add(this._outline);
  }

  _buildGuideLines() {
    this._guides = [0, 1].map(() => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((GUIDE_SEGMENTS + 1) * 3), 3));
      const mat = new THREE.LineBasicMaterial({ color: 0x2ee6a8, transparent: true, opacity: 0.75 });
      const line = new THREE.Line(geo, mat);
      line.visible = false;
      this.group.add(line);
      return line;
    });
  }

  // Steps a small probe box out from the car's front/rear bumper along its heading, testing
  // against a pre-filtered slice of PhysicsManager's own collider list via the same OBB2D SAT
  // test the physics step already uses (OBB2D.intersects) — no new collision math, just a
  // different query over the same data. `sign` is +1 for front, -1 for rear.
  _senseDirection(carState, colliders, sign) {
    const { preset } = carState;
    const forward = { x: Math.cos(carState.yaw), z: Math.sin(carState.yaw) };
    const angle = carState.yaw - Math.PI / 2;
    const startOffset = preset.length / 2;
    this._probe.halfWidth = (preset.width / 2) * 0.85;
    for (let i = 1; i <= SENSOR_STEPS; i++) {
      const dist = startOffset + (i - 0.5) * SENSOR_STEP;
      this._probe.set(carState.x + forward.x * dist * sign, carState.z + forward.z * dist * sign, angle);
      for (const obb of colliders) {
        if (OBB2D.intersects(this._probe, obb)) return Math.round((dist - startOffset) * 10) / 10;
      }
    }
    return null;
  }

  // Closed-form circular-arc solution of the same kinematic-bicycle yaw-rate integral
  // PhysicsManager.step() uses (`yawRate = speed/wheelbase * tan(steerAngle)`), so the guide
  // exactly matches how the car will actually turn rather than an approximation.
  _updateGuideLines(carState) {
    const { preset, steerAngle, speed } = carState;
    const show = Math.abs(speed) < GUIDE_SPEED_THRESHOLD;
    for (const line of this._guides) line.visible = show;
    if (!show) return;

    const dirSign = speed < -0.05 ? -1 : 1;
    const yaw0 = carState.yaw;
    const ox = carState.x + Math.cos(yaw0) * (preset.length / 2) * dirSign;
    const oz = carState.z + Math.sin(yaw0) * (preset.length / 2) * dirSign;
    const sin0 = Math.sin(yaw0);
    const cos0 = Math.cos(yaw0);
    const k = Math.abs(steerAngle) > 0.005 ? Math.tan(steerAngle) / preset.wheelbase : 0;
    const R = k !== 0 ? 1 / k : 0;

    for (let side = 0; side < 2; side++) {
      const laneOffset = (preset.width / 2) * 0.85 * (side === 0 ? 1 : -1);
      const positions = this._guides[side].geometry.attributes.position;
      for (let i = 0; i <= GUIDE_SEGMENTS; i++) {
        const s = (i / GUIDE_SEGMENTS) * GUIDE_LENGTH * dirSign;
        const yaw = yaw0 + k * s;
        let x, z;
        if (k === 0) {
          x = ox + cos0 * s;
          z = oz + sin0 * s;
        } else {
          x = ox + R * (Math.sin(yaw) - sin0);
          z = oz - R * (Math.cos(yaw) - cos0);
        }
        positions.setXYZ(i, x - Math.sin(yaw) * laneOffset, GUIDE_Y, z + Math.cos(yaw) * laneOffset);
      }
      positions.needsUpdate = true;
    }
  }

  // Returns `{ front, rear }` proximity distances in meters (null if nothing within range).
  update(dt, carState, physicsManager) {
    this._elapsed += dt;
    if (this._outline.visible) {
      this._outline.material.opacity = clamp(0.55 + Math.sin(this._elapsed * 2.2) * 0.35, 0.2, 0.95);
    }
    this._updateGuideLines(carState);

    const checkRangeSq = (SENSOR_RANGE + carState.preset.length) ** 2;
    const nearby = [];
    for (const entry of physicsManager.colliders) {
      const dx = entry.obb.x - carState.x;
      const dz = entry.obb.z - carState.z;
      if (dx * dx + dz * dz <= checkRangeSq) nearby.push(entry.obb);
    }

    return {
      front: this._senseDirection(carState, nearby, 1),
      rear: this._senseDirection(carState, nearby, -1),
    };
  }
}
