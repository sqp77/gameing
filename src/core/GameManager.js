/*
 * MASAR
 * Owner: Saud Alqhtani
 * GitHub: sqp77
 * =============
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { InputManager } from './InputManager.js';
import { SaveManager } from './SaveManager.js';
import { AuthManager } from './AuthManager.js';
import { I18n } from './I18n.js';
import { AudioManager } from '../systems/AudioManager.js';
import { PhysicsManager } from '../systems/PhysicsManager.js';
import { CameraController } from '../systems/CameraController.js';
import { ParkingManager } from '../systems/ParkingManager.js';
import { ScoreManager } from '../systems/ScoreManager.js';
import { EffectsManager } from '../systems/EffectsManager.js';
import { TrafficManager } from '../systems/TrafficManager.js';
import { AssistManager } from '../systems/AssistManager.js';
import { AchievementManager } from '../systems/AchievementManager.js';
import { getActiveEvent } from '../systems/EventManager.js';
import { ReplayRecorder, GhostPlayer } from '../systems/ReplayManager.js';
import { WorldBuilder } from '../world/WorldBuilder.js';
import { UIManager } from '../ui/UIManager.js';
import { CarController } from '../entities/CarController.js';
import { GhostCar } from '../entities/GhostCar.js';
import { VEHICLE_PRESETS } from '../entities/Car.js';
import { getLevelConfig, LEVEL_COUNT, resolveParkingType } from '../world/levels.js';
import { ACADEMY_MODULES, getAcademyStageConfig } from '../data/academyLevels.js';
import { LICENSE_ROUTES, getLicenseRoute, getLicenseLegConfig } from '../data/licenseRoutes.js';

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
    this.auth = new AuthManager(this.save);
    this.i18n = new I18n(this.save);
    this.audio = new AudioManager();
    this.physics = new PhysicsManager();
    this.effects = new EffectsManager(this.scene);
    this.world = new WorldBuilder(this.scene, this.physics);
    this.traffic = new TrafficManager(this.scene, this.physics);
    this.assist = new AssistManager(this.scene);
    this.parking = new ParkingManager();
    this.score = new ScoreManager();
    this.achievements = new AchievementManager(this.save);
    this.replayRecorder = new ReplayRecorder();
    this.cameraController = new CameraController(this.camera);
    this.ui = new UIManager(this.save, this.auth, this.i18n);

    this.carController = null;
    this.ghostCar = null;
    this.ghostPlayer = null;
    this.currentLevelId = 1;
    this.currentLevelConfig = null;
    this.state = 'menu';
    this.mode = 'campaign'; // 'campaign' | 'academy' | 'license' — which config source _startWithConfig used
    this.currentAcademyModuleId = null;
    this.currentAcademyStageIndex = 0;
    this.currentLicenseRouteId = null;
    this.currentLicenseLegIndex = 0;
    this._licenseAccuracySum = 0;
    this._licenseLegCount = 0;
    this._currentModeLabel = '';
    this._collisionCooldown = 0;
    this._boundaryCooldown = 0;
    this._sessionPlayTime = 0; // accumulated seconds of active driving, flushed into SaveManager on state changes
    this._sessionDistance = 0; // accumulated meters driven this session, flushed alongside play time
    this._proximityBeepCooldown = 0;
    this._preConfirmState = 'playing'; // state to return to if a restart confirmation is cancelled

    this.renderer.shadowMap.enabled = this.save.getSettings().shadows;
    this.audio.setVolume(this.save.getSettings().volume);
    this.cameraController.setMode(this.save.getSettings().camera);

    this._wireUIEvents();
    this._wireParkingEvents();
    this._wireAchievementEvents();
    window.addEventListener('resize', () => this._onResize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'playing') this.pauseGame();
    });
    window.addEventListener('beforeunload', () => this._flushSessionStats());
  }

  init() {
    this.i18n.apply(document);
    this.i18n.on('change', () => this.ui.onLanguageChange());
    this.ui.showMobileControls(this.input.isMobile());
    this._buildMenuBackdrop();
    this.ui.showScreen(this.auth.getActiveAccount() ? 'main-menu' : 'auth');
    requestAnimationFrame(() => this._loop());
    setTimeout(() => this.ui.hideLoading(), 350);
  }

  _wireUIEvents() {
    this.ui.on('play', () => this.startLevel(this.save.getUnlockedLevel()));
    this.ui.on('selectLevel', (id) => this.startLevel(id));
    this.ui.on('pause', () => this.pauseGame());
    this.ui.on('resume', () => this.resumeGame());
    this.ui.on('restart', () => this.restartLevel());
    this.ui.on('restartRequest', () => this.requestRestart());
    this.ui.on('restartConfirmed', () => this.confirmRestart());
    this.ui.on('restartCancelled', () => this.cancelRestart());
    this.ui.on('quit', () => this.quitToMenu());
    this.ui.on('nextLevel', () => this._advanceAfterVictory());
    this.ui.on('cameraToggle', () => this.cameraController.cycle());
    this.ui.on('settingsChange', (patch) => this._applySettings(patch));
    this.ui.on('watchReplay', () => this.watchReplay());
    this.ui.on('stopReplay', () => this.stopReplay());
    this.ui.on('buyVehicle', (id) => this.buyVehicle(id));
    this.ui.on('selectVehicle', (id) => this.selectVehicle(id));
    this.ui.on('startAcademyStage', ({ moduleId, stageIndex }) => this.startAcademyModule(moduleId, stageIndex));
    this.ui.on('startLicenseTest', (routeId) => this.startLicenseTest(routeId));
    this.ui.on('quitToAcademy', () => this.quitToAcademy());
    this.ui.on('authProviderLogin', (payload) => {
      this.auth.signIn(payload);
      this.ui.showScreen('main-menu');
    });
    this.ui.on('authSelectAccount', (id) => {
      this.auth.selectAccount(id);
      this.ui.showScreen('main-menu');
    });
    this.ui.on('authRemoveAccount', (id) => {
      this.auth.removeAccount(id);
      this.ui.populateAuthScreen();
    });
    this.ui.on('logout', () => {
      this.auth.logout();
      this.ui.showScreen('auth');
    });
    this.ui.on('importSaveFile', (file) => this._handleImportSaveFile(file));
  }

  _handleImportSaveFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      const ok = this.save.importSnapshot(reader.result);
      this.ui.showToast(this.i18n.t(ok ? 'toast.saveImported' : 'toast.saveInvalid'), ok ? 'success' : 'warn');
      if (ok) this.ui.populateProgressScreen();
    };
    reader.readAsText(file);
  }

  _wireParkingEvents() {
    this.parking.on('success', ({ accuracy }) => this._handleParkingSuccess(accuracy));
    this.parking.on('wrongSpot', () => {
      this.score.registerWrongSpot();
      this.ui.showToast(this.i18n.t('toast.wrongSpot'), 'warn');
    });
  }

  _wireAchievementEvents() {
    this.achievements.on('unlocked', (def) => this.ui.queueAchievementPopup(def));
  }

  _applySettings(patch) {
    this.save.updateSettings(patch);
    if ('volume' in patch) this.audio.setVolume(patch.volume);
    if ('shadows' in patch) this.renderer.shadowMap.enabled = patch.shadows;
    if ('camera' in patch) this.cameraController.setMode(patch.camera);
    if ('ghostReplay' in patch) this._applyGhostReplaySetting(patch.ghostReplay);
    if ('assist' in patch) {
      this.assist.setEnabled(patch.assist);
      if (!patch.assist) this.ui.updateProximity(null);
    }
    if ('language' in patch) this.i18n.setLanguage(patch.language);
  }

  // Optional national-event lookup (Saudi National Day / Founding Day / Riyadh Season — see
  // data/events.js), gated by the Settings toggle so the feature is fully off with zero effect
  // when disabled. Used for lamp/flag recoloring and a coin bonus; never required for gameplay.
  _getActiveEventIfEnabled() {
    if (!this.save.getSettings().eventsEnabled) return null;
    return getActiveEvent();
  }

  // Stamps `eventAccent`/`eventFlagBonus` onto a level-config when a national event is active —
  // a no-op (returns `cfg` unchanged) whenever no event is active or the setting is off, so every
  // existing call site (campaign levels included) behaves exactly as before outside an event.
  _applyEventDecor(cfg) {
    const event = this._getActiveEventIfEnabled();
    return event ? { ...cfg, eventAccent: event.accent, eventFlagBonus: true } : cfg;
  }

  // Toggling the setting mid-level takes effect immediately rather than waiting for the next
  // level: turning it off hides the ghost right away, turning it on (if a best replay exists for
  // the level in progress) spawns one synced to the current run's elapsed time.
  _applyGhostReplaySetting(enabled) {
    if (!enabled) {
      this._disposeGhost();
      return;
    }
    if (this.state !== 'playing' || this.ghostCar) return;
    const replay = this.save.getReplay(this.currentLevelId);
    if (!replay) return;
    this._spawnGhost(replay);
    this.ghostPlayer.elapsed = this.replayRecorder.duration;
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  _buildMenuBackdrop() {
    const cfg = this._applyEventDecor(getLevelConfig(1));
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

  // Resets the recorder for the new attempt and, if ghost replay is enabled and a best run is
  // saved for this level, spawns a GhostCar driven by a fresh GhostPlayer. The ghost never touches
  // PhysicsManager/ParkingManager — it's pure playback, moved only via setPose() in the game loop.
  _setupGhost(cfg) {
    this._disposeGhost();
    this.replayRecorder.start(this._pickVehiclePreset().id);
    if (!this.save.getSettings().ghostReplay) return;
    const replay = this.save.getReplay(cfg.id);
    if (replay) this._spawnGhost(replay);
  }

  _spawnGhost(replay) {
    const preset = VEHICLE_PRESETS.find((p) => p.id === replay.vehicleId) || VEHICLE_PRESETS[0];
    this.ghostCar = new GhostCar(preset);
    this.scene.add(this.ghostCar.object3D);
    this.ghostPlayer = new GhostPlayer(replay);
  }

  _disposeGhost() {
    if (!this.ghostCar) return;
    this.scene.remove(this.ghostCar.object3D);
    this.ghostCar.dispose();
    this.ghostCar = null;
    this.ghostPlayer = null;
  }

  startLevel(id) {
    const clamped = Math.min(Math.max(1, id), LEVEL_COUNT);
    this._startWithConfig(getLevelConfig(clamped), { mode: 'campaign', id: clamped, hudLevel: clamped, modeLabel: '' });
  }

  startAcademyModule(moduleId, stageIndex) {
    const cfg = getAcademyStageConfig(moduleId, stageIndex);
    if (!cfg) return;
    this.currentAcademyModuleId = moduleId;
    this.currentAcademyStageIndex = stageIndex;
    const moduleDef = ACADEMY_MODULES.find((m) => m.id === moduleId);
    const modeLabel = moduleDef ? this.i18n.t(moduleDef.nameKey) : '';
    this._startWithConfig(cfg, { mode: 'academy', hudLevel: stageIndex + 1, modeLabel });
  }

  startLicenseTest(routeId) {
    const route = getLicenseRoute(routeId);
    const legCfg = getLicenseLegConfig(routeId, 0);
    if (!route || !legCfg) return;
    this.currentLicenseRouteId = routeId;
    this.currentLicenseLegIndex = 0;
    this._licenseAccuracySum = 0;
    this._licenseLegCount = 0;
    const routeNum = LICENSE_ROUTES.findIndex((r) => r.id === routeId) + 1;
    const modeLabel = `${this.i18n.t('license.title')} — ${this.i18n.t('license.routePrefix')}${routeNum}`;
    this._startWithConfig({ ...legCfg, timeLimit: route.totalTimeLimit }, { mode: 'license', hudLevel: 1, modeLabel });
  }

  // Shared tail for every "start a fresh timed attempt" entry point (campaign level, Academy
  // stage, or the first leg of a License route) — builds the world/car/parking/score exactly
  // once. Mid-route License leg advances reuse `_rebuildLicenseLeg` instead, since those must NOT
  // reset the route's shared timer/collision count.
  _startWithConfig(cfg, meta) {
    this._flushSessionStats();
    this.mode = meta.mode;
    const built = this._applyEventDecor(cfg);
    this.currentLevelConfig = built;

    const { theme } = this.world.build(built);
    this.traffic.build(built, theme);
    this.parking.setSpots(built.spots);
    this.score.reset(built.timeLimit);
    this.effects.clearLevel();
    this._spawnCar(built.carStart);
    this._setupGhost(built);
    this._collisionCooldown = 0;
    this._boundaryCooldown = 0;

    if (meta.mode === 'campaign') {
      this.currentLevelId = meta.id;
      this.save.incrementLevelPlays(meta.id);
    }
    this.save.addVehicleUsage(this._pickVehiclePreset().id);

    this.assist.setEnabled(this.save.getSettings().assist);
    this.assist.setTargetSpot(this.parking.spots.find((s) => s.isTarget) || null);

    this._currentModeLabel = meta.modeLabel || '';
    this.state = 'playing';
    this.ui.updateHUD({
      level: meta.hudLevel,
      score: this.score.getLiveEstimate(),
      timeRemaining: this.score.timeRemaining,
      speedKmh: 0,
      gear: 'D',
      objective: built.objective,
      modeLabel: this._currentModeLabel,
    });
    this.ui.showParkingProgress(0);
    this.ui.showScreen('hud');
    this.ui.showLevelIntro(meta.hudLevel, built.parkingType || resolveParkingType(built.spots));
  }

  // Rebuilds the scene/car/parking for the next leg of an in-progress License Test WITHOUT
  // touching score/timer/collisions — the whole route is one continuous timed attempt (see
  // startLicenseTest / _handleLicenseLegSuccess).
  _rebuildLicenseLeg(legCfg) {
    const built = this._applyEventDecor(legCfg);
    this.currentLevelConfig = built;
    const { theme } = this.world.build(built);
    this.traffic.build(built, theme);
    this.parking.setSpots(built.spots);
    this.effects.clearLevel();
    this._spawnCar(built.carStart);
    this.assist.setTargetSpot(this.parking.spots.find((s) => s.isTarget) || null);
    this.ui.showParkingProgress(0);
    this.ui.updateHUD({
      level: this.currentLicenseLegIndex + 1,
      score: this.score.getLiveEstimate(),
      timeRemaining: this.score.timeRemaining,
      speedKmh: 0,
      gear: 'D',
      objective: built.objective,
      modeLabel: this._currentModeLabel,
    });
    this.ui.showLevelIntro(this.currentLicenseLegIndex + 1, built.parkingType || resolveParkingType(built.spots));
  }

  // "Next Level" on the Victory screen means different things per mode: advance the campaign
  // level counter, advance to the next Academy stage (or back to the Academy list if the module
  // has none left), or — Licence Test never reaches the Victory screen (see
  // _handleLicenseLegSuccess) so it has no case here.
  _advanceAfterVictory() {
    if (this.mode === 'academy') {
      const moduleDef = ACADEMY_MODULES.find((m) => m.id === this.currentAcademyModuleId);
      const next = this.currentAcademyStageIndex + 1;
      if (moduleDef && next < moduleDef.stageCount) this.startAcademyModule(this.currentAcademyModuleId, next);
      else this.quitToAcademy();
      return;
    }
    this.startLevel(Math.min(this.currentLevelId + 1, LEVEL_COUNT));
  }

  pauseGame() {
    if (this.state !== 'playing') return;
    this._flushSessionStats();
    this.state = 'paused';
    this.ui.showScreen('pause');
  }

  resumeGame() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.ui.showScreen('hud');
  }

  restartLevel() {
    this.save.addRestart();
    if (this.mode === 'academy') this.startAcademyModule(this.currentAcademyModuleId, this.currentAcademyStageIndex);
    else if (this.mode === 'license') this.startLicenseTest(this.currentLicenseRouteId);
    else this.startLevel(this.currentLevelId);
  }

  // Shows a confirmation overlay instead of restarting immediately, for restarts that interrupt
  // an attempt already in progress (pause menu, in-HUD button, R key). Victory/Game-Over "Retry"
  // call restartLevel() directly since the attempt is already over there.
  requestRestart() {
    if (this.state !== 'playing' && this.state !== 'paused') return;
    this._preConfirmState = this.state;
    this.state = 'confirm-restart';
    this.ui.showRestartConfirm();
  }

  confirmRestart() {
    this.restartLevel();
  }

  cancelRestart() {
    this.state = this._preConfirmState;
    this.ui.showScreen(this.state === 'paused' ? 'pause' : 'hud');
  }

  quitToMenu() {
    this._flushSessionStats();
    this._disposeGhost();
    this.assist.setEnabled(false);
    if (this.carController) this.carController.object3D.visible = true;
    this.state = 'menu';
    this.mode = 'campaign';
    this.ui.showScreen('main-menu');
  }

  // Same cleanup as quitToMenu, but lands back on the Academy list — used by the Academy
  // Certificate screen's "Back to Academy" button and by _advanceAfterVictory when a module's
  // final stage has just been completed.
  quitToAcademy() {
    this._flushSessionStats();
    this._disposeGhost();
    this.assist.setEnabled(false);
    if (this.carController) this.carController.object3D.visible = true;
    this.state = 'menu';
    this.mode = 'campaign';
    this.ui.showScreen('academy');
  }

  _flushSessionStats() {
    if (this._sessionPlayTime > 0) this.save.addPlayTime(this._sessionPlayTime);
    if (this._sessionDistance > 0) this.save.addDistance(this._sessionDistance);
    this._sessionPlayTime = 0;
    this._sessionDistance = 0;
  }

  // Applies the active event's coin-bonus percentage (see data/events.js) to a computed score
  // breakdown in place — a no-op when no event is active/enabled. Shared by the campaign and
  // Academy victory paths; the License Test doesn't award coins (it awards a certification).
  _applyEventCoinBonus(breakdown) {
    const event = this._getActiveEventIfEnabled();
    if (!event) return;
    breakdown.coins = Math.round(breakdown.coins * (1 + event.coinBonusPct / 100));
    this.ui.showToast(this.i18n.t('toast.eventCoinBonus', event.coinBonusPct), 'success');
  }

  _handleParkingSuccess(accuracy) {
    if (this.mode === 'license') {
      this._handleLicenseLegSuccess(accuracy);
      return;
    }

    this._flushSessionStats();
    this.state = 'victory';
    const breakdown = this.score.computeFinalScore(accuracy);
    this._applyEventCoinBonus(breakdown);
    this.achievements.evaluateRun({ collisions: this.score.collisions, elapsed: this.score.elapsed, accuracy });

    if (this.mode === 'academy') {
      const moduleDef = ACADEMY_MODULES.find((m) => m.id === this.currentAcademyModuleId);
      const justCertified = this.save.recordAcademyStage(
        this.currentAcademyModuleId,
        this.currentAcademyStageIndex,
        moduleDef.stageCount,
        breakdown.stars
      );
      this.save.addCoins(breakdown.coins);
      this.audio.playSuccessChime();
      this.effects.emitSuccessBurst(this.carController.state.x, this.carController.state.z);
      if (justCertified) {
        this.ui.showToast(this.i18n.t('toast.academyModuleCertified'), 'success');
        this.ui.showAcademyCertificate(moduleDef, this.auth.getActiveAccount());
      } else {
        this.ui.setNextLevelEnabled(this.currentAcademyStageIndex + 1 < moduleDef.stageCount);
        this.ui.setWatchReplayEnabled(false);
        this.ui.showVictory(breakdown);
      }
      return;
    }

    // ---- campaign (unchanged) ----
    this.save.recordLevelResult(
      this.currentLevelId,
      {
        score: breakdown.total,
        elapsed: this.score.elapsed,
        accuracy,
        collisions: this.score.collisions,
        stars: breakdown.stars,
        ratingValue: breakdown.ratingValue,
      },
      this.replayRecorder.finish()
    );
    this._checkVehicleUnlocks();
    this.save.addCoins(breakdown.coins);
    const dailyDone = this.save.updateDailyProgress(
      { stars: breakdown.stars, collisions: this.score.collisions, elapsed: this.score.elapsed },
      this._getActiveEventIfEnabled()?.id
    );
    for (const c of dailyDone) this.ui.showToast(this.i18n.t('toast.dailyComplete', c.reward), 'success');
    this.audio.playSuccessChime();
    this.effects.emitSuccessBurst(this.carController.state.x, this.carController.state.z);
    this.ui.setNextLevelEnabled(this.currentLevelId < LEVEL_COUNT);
    this.ui.setWatchReplayEnabled(!!this.save.getReplay(this.currentLevelId));
    this.ui.showVictory(breakdown);
  }

  // One parking success within a License Test: every leg but the last just advances to the next
  // maneuver (world/car rebuilt, shared timer/collision count untouched — see _rebuildLicenseLeg).
  // The final leg evaluates the whole route's pass/fail rubric.
  _handleLicenseLegSuccess(accuracy) {
    this._licenseAccuracySum += accuracy;
    this._licenseLegCount += 1;
    const route = getLicenseRoute(this.currentLicenseRouteId);
    const isFinalLeg = this.currentLicenseLegIndex + 1 >= route.legs.length;
    if (!isFinalLeg) {
      this.audio.playSuccessChime();
      this.ui.showToast(this.i18n.t('toast.academyStageComplete'), 'success');
      this.currentLicenseLegIndex += 1;
      this._rebuildLicenseLeg(getLicenseLegConfig(this.currentLicenseRouteId, this.currentLicenseLegIndex));
      return;
    }
    this._finishLicenseTest(true);
  }

  // `completedAllLegs` is false only when this is called from the route's timer running out
  // (see _loop) rather than from a successful final-leg park.
  _finishLicenseTest(completedAllLegs) {
    this._flushSessionStats();
    const route = getLicenseRoute(this.currentLicenseRouteId);
    const avgAccuracy = this._licenseLegCount > 0 ? this._licenseAccuracySum / this._licenseLegCount : 0;
    const passed =
      completedAllLegs &&
      this.score.timeRemaining > 0 &&
      this.score.collisions <= route.maxCollisions &&
      avgAccuracy >= route.minAccuracy;
    this.save.recordLicenseRouteResult(this.currentLicenseRouteId, passed);
    this.state = 'license-result';
    this.audio[passed ? 'playSuccessChime' : 'playFailBuzz']();
    this.ui.showToast(this.i18n.t(passed ? 'toast.licensePassed' : 'toast.licenseFailed'), passed ? 'success' : 'warn');
    this.ui.showLicenseResult({
      passed,
      timeRemaining: this.score.timeRemaining,
      collisions: this.score.collisions,
      maxCollisions: route.maxCollisions,
      avgAccuracy,
      minAccuracy: route.minAccuracy,
      account: this.auth.getActiveAccount(),
    });
  }

  // Plays back the level's saved best-run replay with a hidden real car and a ghost driven purely
  // by GhostPlayer, camera following via the same CameraController math used during live play (fed
  // a lightweight adapter shaped like a CarController). Triggered on-demand from the Victory screen.
  watchReplay() {
    const replay = this.save.getReplay(this.currentLevelId);
    if (!replay) return;
    this._disposeGhost();
    this._spawnGhost(replay);
    this.ghostPlayer.elapsed = 0;
    if (this.carController) this.carController.object3D.visible = false;
    this.state = 'replay';
    this.ui.showScreen('replay');
  }

  stopReplay() {
    this._disposeGhost();
    if (this.carController) this.carController.object3D.visible = true;
    this.state = 'victory';
    this.ui.showScreen('victory');
  }

  _updateReplayPlayback(dt) {
    if (!this.ghostPlayer || !this.ghostCar) return;
    const sample = this.ghostPlayer.update(dt);
    this.ghostCar.setPose(sample.x, sample.z, sample.yaw);
    const adapter = { state: { x: sample.x, z: sample.z, yaw: sample.yaw, speed: 8 }, model: this.ghostCar.model };
    this.cameraController.update(dt, adapter);
  }

  buyVehicle(id) {
    const preset = VEHICLE_PRESETS.find((p) => p.id === id);
    if (!preset || this.save.isVehicleUnlocked(id)) return;
    if (!this.save.spendCoins(preset.cost)) {
      this.ui.showToast(this.i18n.t('toast.notEnoughCoins'), 'warn');
      return;
    }
    this.save.unlockVehicle(id);
    this.ui.showToast(this.i18n.t('toast.vehicleUnlocked', this.i18n.t(preset.name)), 'success');
    this.ui.populateShop();
  }

  selectVehicle(id) {
    if (!this.save.isVehicleUnlocked(id)) return;
    this.save.setSelectedVehicle(id);
    this.ui.populateShop();
  }

  _checkVehicleUnlocks() {
    const unlockedLevel = this.save.getUnlockedLevel();
    for (const preset of VEHICLE_PRESETS) {
      if (preset.unlockLevel <= unlockedLevel && this.save.unlockVehicle(preset.id)) {
        this.save.setSelectedVehicle(preset.id);
        this.ui.showToast(this.i18n.t('toast.newVehicleUnlocked', this.i18n.t(preset.name)), 'success');
      }
    }
  }

  _triggerGameOver(reason) {
    this._flushSessionStats();
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
      } else if (this.input.state.restartToggle) {
        this.requestRestart();
      } else {
        this._sessionPlayTime += dt;
        if (this.input.state.cameraToggle) this.cameraController.cycle();

        const result = this.carController.update(dt, this.input.state, {
          steerSensitivity: this.save.getSettings().sensitivity,
        });
        this._sessionDistance += Math.abs(this.carController.state.speed) * dt;

        this._collisionCooldown = Math.max(0, this._collisionCooldown - dt);
        if (result.collided && result.impact > COLLISION_IMPACT_THRESHOLD && this._collisionCooldown <= 0) {
          this._collisionCooldown = COLLISION_TOAST_COOLDOWN;
          this.score.registerCollision();
          this.save.addCollision();
          this.ui.showToast(this.i18n.t('toast.collision'), 'warn');
        }

        this._boundaryCooldown = Math.max(0, this._boundaryCooldown - dt);
        if (result.outOfBounds && this._boundaryCooldown <= 0) {
          this._boundaryCooldown = BOUNDARY_TOAST_COOLDOWN;
          this.score.registerBoundaryExit();
          this.ui.showToast(this.i18n.t('toast.outOfBounds'), 'warn');
        }

        const parkResult = this.parking.update(dt, this.carController.state);
        this.ui.showParkingProgress(parkResult.progress);

        this.replayRecorder.record(dt, this.carController.state);
        if (this.ghostPlayer) {
          const ghostSample = this.ghostPlayer.update(dt);
          this.ghostCar.setPose(ghostSample.x, ghostSample.z, ghostSample.yaw);
        }
        const nearbyTraffic = this.traffic.update(dt, this.carController.state);
        this.ui.updateRadar(this.carController.state, nearbyTraffic);

        if (this.save.getSettings().assist) {
          const proximity = this.assist.update(dt, this.carController.state, this.physics);
          this.ui.updateProximity(proximity);
          this._updateProximityBeep(proximity, dt);
        }

        const timeRemaining = this.score.tick(dt);
        const hudLevel =
          this.mode === 'academy' ? this.currentAcademyStageIndex + 1 : this.mode === 'license' ? this.currentLicenseLegIndex + 1 : this.currentLevelId;
        this.ui.updateHUD({
          level: hudLevel,
          score: this.score.getLiveEstimate(),
          timeRemaining,
          speedKmh: this.carController.getSpeedKmh(),
          gear: this.carController.getGear(),
          objective: this.currentLevelConfig.objective,
          modeLabel: this._currentModeLabel,
        });

        if (timeRemaining <= 0 && this.state === 'playing') {
          if (this.mode === 'license') this._finishLicenseTest(false);
          else this._triggerGameOver('gameover.reasonTimeUp');
        }
      }
    } else if (this.state === 'replay') {
      this._updateReplayPlayback(dt);
    }

    if (this.state !== 'replay' && this.carController) {
      this.cameraController.update(dt, this.carController);
    }
    this.effects.update(dt);
    this.world.update(dt);
    this.renderer.render(this.scene, this.camera);
  }

  // Beeps faster/higher-pitched as the nearest sensed obstacle gets closer, on a short cooldown
  // so it reads as a proximity alarm rather than a constant tone.
  _updateProximityBeep(proximity, dt) {
    this._proximityBeepCooldown = Math.max(0, this._proximityBeepCooldown - dt);
    const closest = Math.min(proximity.front ?? Infinity, proximity.rear ?? Infinity);
    const threshold = 1.2;
    if (closest < threshold && this._proximityBeepCooldown <= 0) {
      const intensity = 1 - Math.max(0, Math.min(1, closest / threshold));
      this.audio.playProximityBeep(intensity);
      this._proximityBeepCooldown = 0.15 + (closest / threshold) * 0.25;
    }
  }
}
