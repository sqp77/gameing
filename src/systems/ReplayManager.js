/*
 * MASAR
 * Owner: Saud Alqhtani
 * GitHub: sqp77
 * =============
 */

import { lerp, shortestAngleDelta } from '../utils/MathUtils.js';

const SAMPLE_INTERVAL = 0.15; // seconds (~6.7Hz) — smooth enough to lerp, ~9x smaller than per-frame

function round2(n) {
  return Math.round(n * 100) / 100;
}

// Records the player's vehicle pose at a fixed cadence (independent of frame rate) into a flat
// [x, z, yaw, x, z, yaw, ...] array, so a full run is a handful of numbers rather than an array of
// objects — keeps localStorage payloads small across 20 levels' worth of best replays.
export class ReplayRecorder {
  start(vehicleId) {
    this.vehicleId = vehicleId;
    this.points = [];
    this._accum = 0;
    this.duration = 0;
  }

  record(dt, carState) {
    this._accum += dt;
    this.duration += dt;
    if (this._accum < SAMPLE_INTERVAL) return;
    this._accum -= SAMPLE_INTERVAL;
    this.points.push(round2(carState.x), round2(carState.z), round2(carState.yaw));
  }

  finish() {
    return { vehicleId: this.vehicleId, interval: SAMPLE_INTERVAL, duration: this.duration, points: this.points };
  }
}

// Plays back a recorded run by interpolating between the two samples bracketing the current
// elapsed time — continuous interpolation (not sample-snapping) so playback stays smooth even
// though samples were only taken a few times a second.
export class GhostPlayer {
  constructor(replayData) {
    this.data = replayData;
    this.elapsed = 0;
    this._sampleCount = Math.max(1, Math.floor(replayData.points.length / 3));
  }

  update(dt) {
    this.elapsed += dt;
    return this._sampleAt(this.elapsed);
  }

  _sampleAt(t) {
    const { interval, duration, points } = this.data;
    const lastIdx = this._sampleCount - 1;
    if (t >= duration || lastIdx === 0) {
      const i = lastIdx * 3;
      return { x: points[i], z: points[i + 1], yaw: points[i + 2], finished: t >= duration };
    }
    const idx = clampIdx(t / interval, lastIdx);
    const i0 = Math.floor(idx);
    const i1 = Math.min(i0 + 1, lastIdx);
    const frac = idx - i0;
    const b0 = i0 * 3;
    const b1 = i1 * 3;
    const x = lerp(points[b0], points[b1], frac);
    const z = lerp(points[b0 + 1], points[b1 + 1], frac);
    const yaw = points[b0 + 2] + shortestAngleDelta(points[b0 + 2], points[b1 + 2]) * frac;
    return { x, z, yaw, finished: false };
  }
}

function clampIdx(idx, max) {
  return Math.max(0, Math.min(max, idx));
}
