import * as THREE from 'three';
import { Sky } from '../world/Sky.js';
import { Road } from '../world/Road.js';
import { Environment } from '../world/Environment.js';
import { Vehicle } from '../entities/Vehicle.js';
import { SpawnManager } from '../entities/SpawnManager.js';
import { EffectsManager } from '../entities/EffectsManager.js';
import { FinishBanner } from '../entities/FinishBanner.js';
import { InputManager } from './InputManager.js';
import { AudioManager } from './AudioManager.js';
import {
  LANES,
  GAME_DURATION,
  BASE_SPEED,
  MAX_SPEED,
  DIFFICULTY_RAMP_TIME,
  CAMERA_OFFSET,
  CRASH_SLOWDOWN,
  CRASH_RECOVERY_TIME,
  COMBO_WINDOW,
  COMBO_MAX_MULTIPLIER,
  ITEM_TYPES,
  OBSTACLE_TYPES,
  ACHIEVEMENTS,
  STAR_THRESHOLDS,
} from './Constants.js';

const FINISH_DECEL_TIME = 1.5;

export class Game {
  constructor(canvas, logoTexture = null) {
    this.canvas = canvas;
    this.logoTexture = logoTexture;
    this.state = 'idle'; // idle | playing | paused | finishing | results

    // Public callback hooks — wired up by main.js / UIManager.
    this.onScoreChange = null;
    this.onTimeChange = null;
    this.onItemsChange = null;
    this.onCombo = null;
    this.onScorePopup = null;
    this.onAchievement = null;
    this.onGameEnd = null;
    this.onCrashFlash = null;
    this.onFinishStart = null;

    this._initThree();
    this._initWorld();
    this.audio = new AudioManager();
    this.input = new InputManager(window);
    this.input.onLeft = () => this.requestLaneChange(-1);
    this.input.onRight = () => this.requestLaneChange(1);

    this._resetState();

    window.addEventListener('resize', () => this._onResize());
    this._onResize();

    this._clock = new THREE.Clock();
    this.renderer.setAnimationLoop(() => this._tick());
  }

  _initThree() {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0xd9c898, 0.011);

    this.camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 600);
    this.cameraShake = { time: 0, magnitude: 0 };

    const hemi = new THREE.HemisphereLight(0xcfe8ff, 0xd9b877, 0.75);
    this.scene.add(hemi);

    this.sun = new THREE.DirectionalLight(0xfff3d6, 1.15);
    this.sun.position.set(-40, 60, -30);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -30;
    this.sun.shadow.camera.right = 30;
    this.sun.shadow.camera.top = 30;
    this.sun.shadow.camera.bottom = -30;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 150;
    this.sun.shadow.bias = -0.0015;
    this.scene.add(this.sun);
    this.sun.target.position.set(0, 0, -10);
    this.scene.add(this.sun.target);

    const fill = new THREE.AmbientLight(0xffffff, 0.25);
    this.scene.add(fill);
  }

  _initWorld() {
    this.sky = new Sky(this.scene);
    this.road = new Road(this.scene);
    this.environment = new Environment(this.scene, this.road.halfWidth, this.logoTexture);
    this.vehicle = new Vehicle(this.scene);
    if (this.logoTexture) this.vehicle.applyLogo(this.logoTexture);
    this.spawner = new SpawnManager(this.scene);
    this.effects = new EffectsManager(this.scene);
    if (this.logoTexture) {
      this.finishBanner = new FinishBanner(this.scene, this.road.halfWidth, this.logoTexture);
    }

    this.spawner.onCollect = (typeKey, pos) => this._handleCollect(typeKey, pos);
    this.spawner.onCrash = (typeKey, pos) => this._handleCrash(typeKey, pos);
  }

  _resetState() {
    this.score = 0;
    this.itemsCollected = 0;
    this.distance = 0;
    this.timeLeft = GAME_DURATION;
    this.elapsed = 0;
    this.categoryCounts = { plastic: 0, metal: 0, cardboard: 0, paper: 0, glass: 0 };
    this.crashCount = 0;
    this.comboStreak = 0;
    this.comboMultiplier = 1;
    this.comboTimer = 0;
    this.crashSlowTimer = 0;
    this.finishTimer = 0;
    this.vehicle.group.position.set(LANES[1], 0, 0);
    this.vehicle.laneIndex = 1;
    this.vehicle.targetLaneIndex = 1;
    this.vehicle._laneFrom = LANES[1];
    this.vehicle._laneTo = LANES[1];
    this.vehicle._laneT = 1;
    this.spawner.reset();
    if (this.finishBanner) this.finishBanner.reset();
  }

  // ---------------- Public controls ----------------

  start() {
    this._resetState();
    this.state = 'playing';
    this.audio.resume();
    this.audio.startEngine();
    this.audio.startMusic();
    this._emitHUD();
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.audio.stopMusic();
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.audio.startMusic();
  }

  requestLaneChange(direction) {
    if (this.state !== 'playing') return;
    if (this.vehicle.requestLaneChange(direction)) {
      this.audio.playUIClick();
    }
  }

  setMuted(muted) {
    this.audio.setMuted(muted);
  }

  // ---------------- Frame loop ----------------

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  _tick() {
    const dt = Math.min(this._clock.getDelta(), 0.05);

    this.sky.update(dt);

    if (this.state === 'playing') {
      this._updatePlaying(dt);
    } else if (this.state === 'finishing') {
      this._updateFinishing(dt);
    } else {
      // idle / paused / results — keep a subtle idle animation on the vehicle
      this.vehicle.update(dt, 0, 0);
    }

    this._updateCamera(dt);
    this.effects.update(dt);
    this.renderer.render(this.scene, this.camera);
  }

  _currentSpeed(difficultyT) {
    let speed = THREE.MathUtils.lerp(BASE_SPEED, MAX_SPEED, difficultyT);
    if (this.crashSlowTimer > 0) {
      const recoveryT = 1 - this.crashSlowTimer / CRASH_RECOVERY_TIME;
      const factor = THREE.MathUtils.lerp(CRASH_SLOWDOWN, 1, recoveryT);
      speed *= factor;
    }
    return speed;
  }

  _updatePlaying(dt) {
    this.elapsed += dt;
    this.timeLeft = Math.max(0, this.timeLeft - dt);

    if (this.crashSlowTimer > 0) this.crashSlowTimer = Math.max(0, this.crashSlowTimer - dt);
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this._resetCombo();
    }

    const difficultyT = THREE.MathUtils.clamp(this.elapsed / DIFFICULTY_RAMP_TIME, 0, 1);
    const speed = this._currentSpeed(difficultyT);
    const speedRatio = (speed - BASE_SPEED) / (MAX_SPEED - BASE_SPEED);
    const delta = speed * dt;
    this.distance += delta;

    this.vehicle.update(dt, speedRatio, delta);
    this.road.update(delta);
    this.environment.update(delta, speedRatio);

    const spawnInterval = THREE.MathUtils.lerp(1.05, 0.55, difficultyT);
    this.spawner.update(dt, delta, this.vehicle.group.position.x, difficultyT, spawnInterval);

    this.audio.updateEngine(speedRatio);

    this._emitHUD();

    if (this.timeLeft <= 0) {
      this.state = 'finishing';
      this.finishTimer = FINISH_DECEL_TIME;
      this._finishStartSpeed = speed;
      if (this.finishBanner) this.finishBanner.spawnAhead(this.vehicle.group.position.z);
      if (this.onFinishStart) this.onFinishStart();
    }
  }

  _updateFinishing(dt) {
    this.finishTimer -= dt;
    const t = THREE.MathUtils.clamp(1 - this.finishTimer / FINISH_DECEL_TIME, 0, 1);
    const speed = THREE.MathUtils.lerp(this._finishStartSpeed || BASE_SPEED, 0, t);
    const speedRatio = speed / MAX_SPEED;
    const delta = speed * dt;
    this.distance += delta;

    this.vehicle.update(dt, speedRatio, delta);
    this.road.update(delta);
    this.environment.update(delta, speedRatio);
    if (this.finishBanner) this.finishBanner.update(delta);
    this.audio.updateEngine(speedRatio);

    if (this.finishTimer <= 0) {
      this._endGame();
    }
  }

  _updateCamera(dt) {
    const vp = this.vehicle.group.position;
    let shakeX = 0;
    let shakeY = 0;
    if (this.cameraShake.time > 0) {
      this.cameraShake.time -= dt;
      const m = this.cameraShake.magnitude * (this.cameraShake.time / 0.35);
      shakeX = (Math.random() - 0.5) * m;
      shakeY = (Math.random() - 0.5) * m;
    }
    const targetX = vp.x * 0.35 + shakeX;
    this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, targetX, Math.min(1, dt * 4));
    this.camera.position.y = CAMERA_OFFSET.y + shakeY;
    this.camera.position.z = vp.z + CAMERA_OFFSET.z;
    this.camera.lookAt(vp.x * 0.6, 1.1, vp.z - 14);
  }

  // ---------------- Gameplay events ----------------

  _resetCombo() {
    this.comboStreak = 0;
    this.comboMultiplier = 1;
    if (this.onCombo) this.onCombo(1, false);
  }

  _handleCollect(typeKey, worldPos) {
    const def = ITEM_TYPES[typeKey];
    this.comboStreak += 1;
    this.comboTimer = COMBO_WINDOW;
    this.comboMultiplier = Math.min(COMBO_MAX_MULTIPLIER, 1 + Math.floor(this.comboStreak / 3));

    const earned = def.points * this.comboMultiplier;
    this.score += earned;
    this.itemsCollected += 1;
    this.categoryCounts[def.category] += 1;

    this.effects.spawnCollectBurst(worldPos, def.color);
    this.audio.playCollect(this.comboMultiplier);

    this._popupAt(worldPos, `+${earned}`, false);
    if (this.onCombo) this.onCombo(this.comboMultiplier, this.comboMultiplier > 1);

    this._checkAchievement('firstCollect', () => this.itemsCollected >= 1);
    this._checkAchievement('combo5', () => this.comboMultiplier >= 5);
    this._checkAchievement('ecoHero', () => this.itemsCollected >= 25);
    this._checkAchievement('highScorer', () => this.score >= 500);

    this._emitHUD();
  }

  _handleCrash(typeKey, worldPos) {
    const def = OBSTACLE_TYPES[typeKey];
    this.score = Math.max(0, this.score - def.penalty);
    this.crashCount += 1;
    this.crashSlowTimer = CRASH_RECOVERY_TIME;
    this._resetCombo();

    this.vehicle.triggerCrash();
    this.cameraShake.time = 0.35;
    this.cameraShake.magnitude = 0.4;

    this.effects.spawnCrashBurst(worldPos);
    this.audio.playCrash();

    this._popupAt(worldPos, `-${def.penalty}`, true);
    if (this.onCrashFlash) this.onCrashFlash();

    this._emitHUD();
  }

  _checkAchievement(id, predicate) {
    if (!this._save) return;
    if (this._save.hasAchievement(id)) return;
    if (!predicate()) return;
    this._save.unlockAchievement(id);
    this.audio.playAchievement();
    if (this.onAchievement) this.onAchievement(ACHIEVEMENTS[id]);
  }

  attachSaveManager(saveManager) {
    this._save = saveManager;
  }

  _popupAt(worldPos, text, negative) {
    if (!this.onScorePopup) return;
    const vector = new THREE.Vector3(worldPos.x, worldPos.y + 0.8, worldPos.z).project(this.camera);
    const xPercent = (vector.x * 0.5 + 0.5) * 100;
    const yPercent = (1 - (vector.y * 0.5 + 0.5)) * 100;
    this.onScorePopup(text, xPercent, yPercent, negative);
  }

  _emitHUD() {
    if (this.onScoreChange) this.onScoreChange(this.score);
    if (this.onTimeChange) this.onTimeChange(Math.ceil(this.timeLeft));
    if (this.onItemsChange) this.onItemsChange(this.itemsCollected);
  }

  _endGame() {
    this.state = 'results';
    this.audio.stopEngine();
    this.audio.stopMusic();

    this._checkAchievement('cleanRun', () => this.crashCount === 0 && this.itemsCollected > 0);

    const stars = this._computeStars(this.score);

    if (this._save) this._save.recordRun({ score: this.score, items: this.itemsCollected });

    if (this.onGameEnd) {
      this.onGameEnd({
        score: this.score,
        items: this.itemsCollected,
        distance: Math.round(this.distance),
        playTime: GAME_DURATION,
        categories: { ...this.categoryCounts },
        stars,
        crashCount: this.crashCount,
        isNewBest: this._save ? this._save.isNewBest(this.score) : false,
      });
    }

    this.audio.playCelebration();
  }

  _computeStars(score) {
    for (const tier of STAR_THRESHOLDS) {
      if (score >= tier.min) return tier;
    }
    return STAR_THRESHOLDS[STAR_THRESHOLDS.length - 1];
  }
}
