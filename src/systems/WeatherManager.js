/*
 * MASAR
 * Owner: Saud Alqhtani
 * GitHub: sqp77
 * =============
 */

import * as THREE from 'three';
import { makeSeededRandom, lerp } from '../utils/MathUtils.js';

// v1.2.0 Dynamic Weather System — Hub-only (same scope as the Day/Night Cycle). One shared
// InstancedMesh particle pool (same dynamic-usage/frustumCulled-false idiom EffectsManager
// already uses for sparks/confetti) reused for both rain and sandstorm by re-parameterizing
// per-particle fall speed/drift/color/scale rather than building two separate systems — capped
// well under mobile-friendly counts.
const MAX_PARTICLES = 200;
const WEATHER_TYPES = ['clear', 'cloudy', 'rain', 'fog', 'sandstorm'];
const WEATHER_WEIGHTS = { clear: 0.4, cloudy: 0.25, rain: 0.15, fog: 0.12, sandstorm: 0.08 };
// Grip multiplier feeds PhysicsManager.step's options.gripMultiplier; toleranceMultiplier feeds
// ParkingManager.update's toleranceMultiplier — both default 1 (byte-for-byte unchanged) outside
// the Hub, since only GameManager's hub loop passes them.
const GRIP_MULTIPLIER = { clear: 1, cloudy: 1, rain: 0.8, fog: 0.9, sandstorm: 0.65 };
const TOLERANCE_MULTIPLIER = { clear: 1, cloudy: 1, rain: 0.85, fog: 0.8, sandstorm: 0.7 };
// Fog distance multipliers (applied to the active theme's own fogNear/fogFar) — this is the
// "affects visibility" requirement; no separate post-processing pass needed.
const FOG_FAR_MULTIPLIER = { clear: 1, cloudy: 0.85, rain: 0.55, fog: 0.32, sandstorm: 0.4 };
const PARTICLE_COUNT = { clear: 0, cloudy: 0, rain: 170, fog: 0, sandstorm: 140 };
const VOLUME_RADIUS = 26; // meters — particle box half-extent around the player, XZ
const VOLUME_HEIGHT = 16;

export class WeatherManager {
  constructor(scene) {
    this.scene = scene;
    this.current = 'clear';
    this.enabled = true;
    this._baseTheme = null;
    this._elapsed = 0;
    this._rng = makeSeededRandom(Date.now() % 100000);
    this._group = new THREE.Group();
    this._group.name = 'weather';
    this.scene.add(this._group);
    this._buildParticlePool();
  }

  _buildParticlePool() {
    const geo = new THREE.BoxGeometry(0.06, 0.5, 0.06);
    const mat = new THREE.MeshBasicMaterial({ color: 0xbfe0ff, transparent: true, opacity: 0.55, depthWrite: false });
    this._mesh = new THREE.InstancedMesh(geo, mat, MAX_PARTICLES);
    this._mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this._mesh.frustumCulled = false;
    this._mesh.visible = false;
    this._group.add(this._mesh);
    this._dummy = new THREE.Object3D();
    this._particles = new Array(MAX_PARTICLES).fill(null).map(() => ({ x: 0, y: 0, z: 0, vx: 0, vy: 0 }));
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) this._applyWeather('clear');
  }

  // Called once per Hub session (GameManager.enterHub, right after this.hub.build()) — rerolls
  // the weather for this visit and applies it against the freshly-built theme's own base fog
  // values, so each city theme's palette/fog-distance is respected rather than overwritten.
  rollForSession(theme) {
    this._baseTheme = theme;
    const kind = this.enabled ? this._weightedPick() : 'clear';
    this._applyWeather(kind);
  }

  _weightedPick() {
    const total = Object.values(WEATHER_WEIGHTS).reduce((s, w) => s + w, 0);
    let roll = this._rng() * total;
    for (const kind of WEATHER_TYPES) {
      roll -= WEATHER_WEIGHTS[kind];
      if (roll <= 0) return kind;
    }
    return 'clear';
  }

  _applyWeather(kind) {
    this.current = kind;
    if (this._baseTheme && this.scene.fog) {
      this.scene.fog.far = this._baseTheme.fogFar * (FOG_FAR_MULTIPLIER[kind] ?? 1);
      this.scene.fog.near = Math.min(this._baseTheme.fogNear, this.scene.fog.far * 0.25);
    }
    const count = PARTICLE_COUNT[kind] ?? 0;
    this._mesh.count = count;
    this._mesh.visible = count > 0;
    const isDust = kind === 'sandstorm';
    this._mesh.material.color.setHex(isDust ? 0xd9b877 : 0xbfe0ff);
    this._mesh.material.opacity = isDust ? 0.35 : 0.55;
    for (let i = 0; i < count; i++) this._resetParticle(this._particles[i], kind, 0, 0, true);
  }

  getGripMultiplier() {
    return GRIP_MULTIPLIER[this.current] ?? 1;
  }

  getParkingToleranceMultiplier() {
    return TOLERANCE_MULTIPLIER[this.current] ?? 1;
  }

  _resetParticle(p, kind, centerX, centerZ, randomHeight) {
    p.x = centerX + (this._rng() * 2 - 1) * VOLUME_RADIUS;
    p.z = centerZ + (this._rng() * 2 - 1) * VOLUME_RADIUS;
    if (kind === 'sandstorm') {
      p.y = this._rng() * 3 + 0.2;
      p.vx = lerp(3, 6, this._rng());
      p.vy = 0;
    } else {
      p.y = randomHeight ? this._rng() * VOLUME_HEIGHT : VOLUME_HEIGHT;
      p.vx = 0;
      p.vy = -lerp(16, 22, this._rng());
    }
  }

  // `centerX`/`centerZ` re-center the particle volume on the player each frame (Hub is open
  // enough that a fixed-position volume would leave the player driving out of the effect).
  update(dt, centerX = 0, centerZ = 0) {
    this._elapsed += dt;
    const count = this._mesh.count;
    if (count === 0) return;
    const isDust = this.current === 'sandstorm';
    for (let i = 0; i < count; i++) {
      const p = this._particles[i];
      if (isDust) {
        p.x += p.vx * dt;
        if (Math.abs(p.x - centerX) > VOLUME_RADIUS) this._resetParticle(p, this.current, centerX, centerZ, false);
      } else {
        p.y += p.vy * dt;
        if (p.y < 0) this._resetParticle(p, this.current, centerX, centerZ, false);
      }
      this._dummy.position.set(p.x, p.y, p.z);
      this._dummy.rotation.set(0, 0, isDust ? Math.PI / 2 : 0);
      this._dummy.scale.setScalar(isDust ? 3 : 1);
      this._dummy.updateMatrix();
      this._mesh.setMatrixAt(i, this._dummy.matrix);
    }
    this._mesh.instanceMatrix.needsUpdate = true;
  }
}
