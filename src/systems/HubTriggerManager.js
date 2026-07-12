/*
 * MASAR
 * Owner: Saud Alqhtani
 * GitHub: sqp77
 * =============
 */

import { EventEmitter } from '../utils/EventEmitter.js';
import { HUB_LANDMARKS, HUB_JOB_MARKERS } from '../data/hubMap.js';

// Edge-triggered proximity detection for the hub's landmark buildings (Academy/License
// Center/Dealership) and job markers — same `Math.hypot <= radius` circular-proximity
// pattern already used by TrafficManager's HUD radar and AssistManager's sensor range
// query, just applied to fixed hub-map points instead of moving agents. Emits
// `enterLandmark`/`exitLandmark` and `enterJobMarker`/`exitJobMarker` only on state
// change (not every frame) so GameManager/JobManager can show/hide a prompt cheaply.
export class HubTriggerManager extends EventEmitter {
  constructor() {
    super();
    this._insideLandmarkId = null;
    this._insideMarkerId = null;
  }

  reset() {
    this._insideLandmarkId = null;
    this._insideMarkerId = null;
  }

  update(carState) {
    let landmark = null;
    for (const l of HUB_LANDMARKS) {
      if (Math.hypot(carState.x - l.x, carState.z - l.z) <= l.radius) {
        landmark = l;
        break;
      }
    }
    if (landmark?.id !== this._insideLandmarkId) {
      this._insideLandmarkId = landmark?.id || null;
      if (landmark) this.emit('enterLandmark', landmark);
      else this.emit('exitLandmark');
    }

    let marker = null;
    for (const m of HUB_JOB_MARKERS) {
      if (Math.hypot(carState.x - m.x, carState.z - m.z) <= m.radius) {
        marker = m;
        break;
      }
    }
    if (marker?.id !== this._insideMarkerId) {
      this._insideMarkerId = marker?.id || null;
      if (marker) this.emit('enterJobMarker', marker);
      else this.emit('exitJobMarker');
    }
  }
}
