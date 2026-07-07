import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { InputManager } from './InputManager.js';
import { SaveManager } from './SaveManager.js';
import { AudioManager } from '../systems/AudioManager.js';
import { PhysicsManager } from '../systems/PhysicsManager.js';
import { CameraController } from '../systems/CameraController.js';
import { ParkingManager } from '../systems/ParkingManager.js';
import { ScoreManager } from '../systems/ScoreManager.js';
import { EffectsManager } from '../systems/EffectsManager.js';
import { WorldBuilder } from '../world/WorldBuilder.js';
import { UIManager } from '../ui/UIManager.js';
import { CarController } from '../entities/CarController.js';
import { VEHICLE_PRESETS } from '../entities/Car.js';
import { getLevelConfig, LEVEL_COUNT } from '../world/levels.js';

const COLLISION_TOAST_COOLDOWN = 1.0;
const BOUNDARY_TOAST_COOLDOWN = 2.0;
const COLLISION_IMPACT_THRESHOLD = 1.2;

// Top-level orchestrator: owns the renderer/scene/camera/clock, every subsystem, the
// game state machine (menu/playing/paused/victory/gameover), and the single
// requestAnimationFrame loop that steps them in order each frame.
export class GameManager {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 400);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.clock = new THREE.Clock();
    this.input = new InputManager();
    this.save = new SaveManager();
    this.audio = new AudioManager();
    this.physics = new PhysicsManager();
    this.effects = new EffectsManager(this.scene);
    this.world = new WorldBuilder(this.scene, this.physics);
    this.parking = new ParkingManager();
    this.score = new ScoreManager();
    this.cameraController = new CameraController(this.camera);
    this.ui = new UIManager(this.save);

    this.carController = null;
    this.currentLevelId = 1;
    this.currentLevelConfig = null;
    this.state = 'menu';
    this._collisionCooldown = 0;
    this._boundaryCooldown = 0;

    this.renderer.shadowMap.enabled = this.save.getSettings().shadows;
    this.audio.setVolume(this.save.getSettings().volume);
    this.cameraController.setMode(this.save.getSettings().camera);

    this._wireUIEvents();
    this._wireParkingEvents();
    window.addEventListener('resize', () => this._onResize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'playing') this.pauseGame();
    });
  }

  init() {
    this.ui.showMobileControls(this.input.isMobile());
    this._buildMenuBackdrop();
    this.ui.showScreen('main-menu');
    requestAnimationFrame(() => this._loop());
    setTimeout(() => this.ui.hideLoading(), 350);
  }

  _wireUIEvents() {
    this.ui.on('play', () => this.startLevel(this.save.getUnlockedLevel()));
    this.ui.on('selectLevel', (id) => this.startLevel(id));
    this.ui.on('pause', () => this.pauseGame());
    this.ui.on('resume', () => this.resumeGame());
    this.ui.on('restart', () => this.restartLevel());
    this.ui.on('quit', () => this.quitToMenu());
    this.ui.on('nextLevel', () => this.startLevel(Math.min(this.currentLevelId + 1, LEVEL_COUNT)));
    this.ui.on('cameraToggle', () => this.cameraController.cycle());
    this.ui.on('settingsChange', (patch) => this._applySettings(patch));
  }

  _wireParkingEvents() {
    this.parking.on('success', ({ accuracy }) => this._handleParkingSuccess(accuracy));
    this.parking.on('wrongSpot', () => {
      this.score.registerWrongSpot();
      this.ui.showToast('Wrong spot!', 'warn');
    });
  }

  _applySettings(patch) {
    this.save.updateSettings(patch);
    if ('volume' in patch) this.audio.setVolume(patch.volume);
    if ('shadows' in patch) this.renderer.shadowMap.enabled = patch.shadows;
    if ('camera' in patch) this.cameraController.setMode(patch.camera);
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  _buildMenuBackdrop() {
    const cfg = getLevelConfig(1);
    this.world.build(cfg);
    this._spawnCar(cfg.carStart);
  }

  _pickVehiclePreset() {
    const id = this.save.getSelectedVehicle();
    return VEHICLE_PRESETS.find((p) => p.id === id) || VEHICLE_PRESETS[0];
  }

  _spawnCar(startPose) {
    if (this.carController) {
      this.scene.remove(this.carController.object3D);
      this._disposeObject3D(this.carController.object3D);
    }
    this.carController = new CarController(this._pickVehiclePreset(), this.physics, this.audio, this.effects);
    this.scene.add(this.carController.object3D);
    this.carController.placeAt(startPose.x, startPose.z, startPose.yaw);
  }

  _disposeObject3D(obj) {
    obj.traverse((node) => {
      if (node.geometry) node.geometry.dispose();
      if (node.material) {
        const mats = Array.isArray(node.material) ? node.material : [node.material];
        for (const m of mats) m.dispose();
      }
    });
  }

  startLevel(id) {
    const clamped = Math.min(Math.max(1, id), LEVEL_COUNT);
    this.currentLevelId = clamped;
    const cfg = getLevelConfig(clamped);
    this.currentLevelConfig = cfg;

    this.world.build(cfg);
    this.parking.setSpots(cfg.spots);
    this.score.reset(cfg.timeLimit);
    this.effects.clearLevel();
    this._spawnCar(cfg.carStart);
    this._collisionCooldown = 0;
    this._boundaryCooldown = 0;

    this.state = 'playing';
    this.ui.updateHUD({
      level: clamped,
      score: this.score.getLiveEstimate(),
      timeRemaining: this.score.timeRemaining,
      speedKmh: 0,
      gear: 'D',
      objective: cfg.objective,
    });
    this.ui.showParkingProgress(0);
    this.ui.showScreen('hud');
  }

  pauseGame() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.ui.showScreen('pause');
  }

  resumeGame() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.ui.showScreen('hud');
  }

  restartLevel() {
    this.startLevel(this.currentLevelId);
  }

  quitToMenu() {
    this.state = 'menu';
    this.ui.showScreen('main-menu');
  }

  _handleParkingSuccess(accuracy) {
    this.state = 'victory';
    const breakdown = this.score.computeFinalScore(accuracy);
    this.save.recordLevelResult(this.currentLevelId, breakdown.total);
    this._checkVehicleUnlocks();
    this.audio.playSuccessChime();
    this.effects.emitSuccessBurst(this.carController.state.x, this.carController.state.z);
    this.ui.setNextLevelEnabled(this.currentLevelId < LEVEL_COUNT);
    this.ui.showVictory(breakdown);
  }

  _checkVehicleUnlocks() {
    const unlockedLevel = this.save.getUnlockedLevel();
    for (const preset of VEHICLE_PRESETS) {
      if (preset.unlockLevel <= unlockedLevel && this.save.unlockVehicle(preset.id)) {
        this.save.setSelectedVehicle(preset.id);
        this.ui.showToast(`New vehicle unlocked: ${preset.name}`, 'success');
      }
    }
  }

  _triggerGameOver(reason) {
    this.state = 'gameover';
    this.audio.playFailBuzz();
    this.ui.showGameOver(reason);
  }

  _loop() {
    requestAnimationFrame(() => this._loop());
    const dt = Math.min(this.clock.getDelta(), 0.1);
    this.input.update();

    if (this.state === 'playing') {
      if (this.input.state.pauseToggle) {
        this.pauseGame();
      } else {
        if (this.input.state.cameraToggle) this.cameraController.cycle();

        const result = this.carController.update(dt, this.input.state, {
          steerSensitivity: this.save.getSettings().sensitivity,
        });

        this._collisionCooldown = Math.max(0, this._collisionCooldown - dt);
        if (result.collided && result.impact > COLLISION_IMPACT_THRESHOLD && this._collisionCooldown <= 0) {
          this._collisionCooldown = COLLISION_TOAST_COOLDOWN;
          this.score.registerCollision();
          this.ui.showToast('Collision! -40', 'warn');
        }

        this._boundaryCooldown = Math.max(0, this._boundaryCooldown - dt);
        if (result.outOfBounds && this._boundaryCooldown <= 0) {
          this._boundaryCooldown = BOUNDARY_TOAST_COOLDOWN;
          this.score.registerBoundaryExit();
          this.ui.showToast('Out of bounds! -25', 'warn');
        }

        const parkResult = this.parking.update(dt, this.carController.state);
        this.ui.showParkingProgress(parkResult.progress);

        const timeRemaining = this.score.tick(dt);
        this.ui.updateHUD({
          level: this.currentLevelId,
          score: this.score.getLiveEstimate(),
          timeRemaining,
          speedKmh: this.carController.getSpeedKmh(),
          gear: this.carController.getGear(),
          objective: this.currentLevelConfig.objective,
        });

        if (timeRemaining <= 0 && this.state === 'playing') {
          this._triggerGameOver("Time's up");
        }
      }
    }

    if (this.carController) this.cameraController.update(dt, this.carController);
    this.effects.update(dt);
    this.renderer.render(this.scene, this.camera);
  }
}
