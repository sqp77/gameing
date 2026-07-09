/*
 * MASAR
 * Owner: Saud Alqhtani
 * GitHub: sqp77
 * =============
 */

import { EventEmitter } from '../utils/EventEmitter.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { VEHICLE_PRESETS } from '../entities/Car.js';
import { LEVEL_COUNT, getLevelConfig } from '../world/levels.js';

const PERFECT_ACCURACY = 0.99;
const SPEED_MASTER_SECONDS = 20;
const PRECISION_DRIVER_CLEARS = 5;
const THREE_STAR_SCORE = 850; // kept in sync with ScoreManager's own 3-star threshold

// Evaluates achievement conditions against one finished run plus the player's overall save state,
// and persists unlocks via SaveManager. `evaluateRun` is the single entry point, called once per
// level victory from GameManager; it returns (and emits 'unlocked' for) every achievement def that
// just flipped from locked to unlocked, so the UI can queue popups without re-deriving anything.
export class AchievementManager extends EventEmitter {
  constructor(saveManager) {
    super();
    this.save = saveManager;
  }

  evaluateRun({ collisions, elapsed, accuracy }) {
    const newlyUnlocked = [];
    const tryUnlock = (id) => {
      if (this.save.unlockAchievement(id)) newlyUnlocked.push(ACHIEVEMENTS.find((a) => a.id === id));
    };

    if (collisions === 0) {
      tryUnlock('no_collision');
      this.save.incrementNoCollisionClearCount();
      if (this.save.getNoCollisionClearCount() >= PRECISION_DRIVER_CLEARS) tryUnlock('precision_driver');
    }
    if (elapsed < SPEED_MASTER_SECONDS) tryUnlock('speed_master');
    if (accuracy >= PERFECT_ACCURACY) tryUnlock('perfect_parking');

    if (this._allLevelsAtThreeStars()) tryUnlock('parking_expert');
    if (this._allNightLevelsCleared()) tryUnlock('night_driver');
    if (VEHICLE_PRESETS.every((p) => this.save.isVehicleUnlocked(p.id))) tryUnlock('vehicle_collector');

    if (newlyUnlocked.length >= 2) tryUnlock('combo_master');

    for (const def of newlyUnlocked) this.emit('unlocked', def);
    return newlyUnlocked;
  }

  _allLevelsAtThreeStars() {
    for (let id = 1; id <= LEVEL_COUNT; id++) {
      if (this.save.getBestScore(id) < THREE_STAR_SCORE) return false;
    }
    return true;
  }

  _allNightLevelsCleared() {
    for (let id = 1; id <= LEVEL_COUNT; id++) {
      if (getLevelConfig(id).effectiveNight && this.save.getBestScore(id) <= 0) return false;
    }
    return true;
  }
}
