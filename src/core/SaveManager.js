/*
 * ParkMaster3D
 * Owner: Saud
 * GitHub: sqp77
 * =============
 */

const STORAGE_KEY = 'parkmaster3d.save.v1';
const DEFAULT_SETTINGS = { volume: 0.7, sensitivity: 1, shadows: true, camera: 'third', ghostReplay: true };

function defaultSave() {
  return {
    unlockedLevel: 1,
    unlockedVehicles: ['hatchback'],
    selectedVehicle: 'hatchback',
    bestScores: {},
    replays: {},
    achievements: {},
    noCollisionClearCount: 0,
    settings: { ...DEFAULT_SETTINGS },
  };
}

// Thin localStorage wrapper: unlocked levels/vehicles, best score per level, and
// persisted settings. Every mutator persists immediately (writes are tiny and rare —
// once per level result / settings change — so no batching is needed).
export class SaveManager {
  constructor() {
    this.data = this._load();
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultSave();
      const parsed = JSON.parse(raw);
      return {
        ...defaultSave(),
        ...parsed,
        settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
      };
    } catch {
      return defaultSave();
    }
  }

  _persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      /* storage unavailable (private mode / quota) — game still works, just won't persist */
    }
  }

  getSettings() {
    return this.data.settings;
  }

  updateSettings(patch) {
    Object.assign(this.data.settings, patch);
    this._persist();
  }

  getUnlockedLevel() {
    return this.data.unlockedLevel;
  }

  getBestScore(levelId) {
    return this.data.bestScores[levelId] || 0;
  }

  getOverallBestScore() {
    const values = Object.values(this.data.bestScores);
    return values.length ? Math.max(...values) : 0;
  }

  isVehicleUnlocked(id) {
    return this.data.unlockedVehicles.includes(id);
  }

  getSelectedVehicle() {
    return this.data.selectedVehicle;
  }

  setSelectedVehicle(id) {
    this.data.selectedVehicle = id;
    this._persist();
  }

  unlockVehicle(id) {
    if (this.data.unlockedVehicles.includes(id)) return false;
    this.data.unlockedVehicles.push(id);
    this._persist();
    return true;
  }

  // `replayData` (see ReplayManager.ReplayRecorder#finish) is only kept when this run beats the
  // previous best score, so the stored ghost always matches the stored best-score run.
  recordLevelResult(levelId, score, replayData = null) {
    const prevBest = this.data.bestScores[levelId] || 0;
    const improved = score > prevBest;
    if (improved) {
      this.data.bestScores[levelId] = score;
      if (replayData) this.data.replays[levelId] = replayData;
    }
    if (levelId >= this.data.unlockedLevel) this.data.unlockedLevel = Math.min(levelId + 1, 20);
    this._persist();
    return improved;
  }

  getReplay(levelId) {
    return this.data.replays[levelId] || null;
  }

  getAchievements() {
    return this.data.achievements;
  }

  isAchievementUnlocked(id) {
    return !!this.data.achievements[id]?.unlocked;
  }

  // Returns true only the first time an id is unlocked, so callers can tell "newly unlocked"
  // apart from "already had it" without tracking that themselves.
  unlockAchievement(id) {
    if (this.data.achievements[id]?.unlocked) return false;
    this.data.achievements[id] = { unlocked: true, unlockedAt: Date.now() };
    this._persist();
    return true;
  }

  getNoCollisionClearCount() {
    return this.data.noCollisionClearCount;
  }

  incrementNoCollisionClearCount() {
    this.data.noCollisionClearCount++;
    this._persist();
    return this.data.noCollisionClearCount;
  }
}
