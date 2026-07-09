/*
 * MASAR
 * Owner: Saud Alqhtani
 * GitHub: sqp77
 * =============
 */

import { starsForScore } from '../utils/scoring.js';
import { makeSeededRandom } from '../utils/MathUtils.js';
import { CHALLENGE_POOL, DAILY_COUNT } from '../data/challenges.js';

const STORAGE_KEY = 'parkmaster3d.save.v1';
const DEFAULT_SETTINGS = { volume: 0.7, sensitivity: 1, shadows: true, camera: 'third', ghostReplay: true, assist: true };
const LEVEL_COUNT = 20;

function defaultSave() {
  return {
    unlockedLevel: 1,
    lastPlayedLevel: 1,
    unlockedVehicles: ['hatchback'],
    selectedVehicle: 'hatchback',
    bestScores: {},
    replays: {},
    achievements: {},
    noCollisionClearCount: 0,
    settings: { ...DEFAULT_SETTINGS },
    levelStats: {},
    totals: {
      playTimeSec: 0,
      completedParks: 0,
      collisions: 0,
      coinsEarned: 0,
      distanceMeters: 0,
      restarts: 0,
      accuracySum: 0,
      accuracyCount: 0,
    },
    vehicleUsage: {},
    coins: 0,
    daily: { date: '', items: [] },
  };
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function defaultLevelStats() {
  return {
    bestScore: 0,
    stars: 0,
    bestTimeSec: null,
    bestAccuracy: null,
    bestRatingValue: null,
    lowestCollisions: null,
    timesCompleted: 0,
    timesPlayed: 0,
  };
}

// Thin localStorage wrapper: unlocked levels/vehicles, best score per level, and
// persisted settings. Every mutator persists immediately (writes are tiny and rare —
// once per level result / settings change — so no batching is needed).
//
// Account-aware save slots (used by AuthManager): data lives at STORAGE_KEY for the
// device's "guest" slot, or at `STORAGE_KEY.acct.<id>` once a local account is active.
// `_currentAccountId` starts null, so a player who never touches auth gets byte-identical
// behavior to before — same key, same load/persist path.
export class SaveManager {
  constructor() {
    this._currentAccountId = null;
    this.data = this._loadFrom(this._keyFor(null));
  }

  _keyFor(accountId) {
    return accountId ? `${STORAGE_KEY}.acct.${accountId}` : STORAGE_KEY;
  }

  _normalize(parsed) {
    return {
      ...defaultSave(),
      ...parsed,
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
      levelStats: { ...(parsed.levelStats || {}) },
      totals: { ...defaultSave().totals, ...(parsed.totals || {}) },
      vehicleUsage: { ...(parsed.vehicleUsage || {}) },
    };
  }

  _loadFrom(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return defaultSave();
      const merged = this._normalize(JSON.parse(raw));
      if (this._migrateLevelStats(merged)) {
        this._persistTo(key, merged);
      }
      return merged;
    } catch {
      return defaultSave();
    }
  }

  // Older saves only ever stored a single best score per level (`bestScores`). Synthesizes a
  // `levelStats` entry for any such level that doesn't have one yet, so upgrading never loses a
  // player's existing best scores/unlocks — only the newer per-run breakdown (time/accuracy/
  // collisions) is unknown for those historical runs and stays null until replayed. Writes the
  // migration straight back to localStorage (rather than leaving it purely in-memory) so it only
  // ever runs once per save instead of being recomputed on every load.
  _migrateLevelStats(save) {
    let migrated = false;
    for (const [levelId, score] of Object.entries(save.bestScores)) {
      if (save.levelStats[levelId]) continue;
      save.levelStats[levelId] = {
        ...defaultLevelStats(),
        bestScore: score,
        stars: starsForScore(score),
        timesCompleted: score > 0 ? 1 : 0,
      };
      migrated = true;
    }
    return migrated;
  }

  _persistTo(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      /* storage unavailable (private mode / quota) — game still works, just won't persist */
    }
  }

  _persist() {
    this._persistTo(this._keyFor(this._currentAccountId), this.data);
  }

  // ---- Account/session coordination (used by AuthManager; no-ops if auth is never used) ----

  // Re-tags the currently-loaded (guest) data as belonging to `accountId` without reloading —
  // used only the very first time a local account is ever created on this device, so existing
  // pre-login progress becomes that account's progress instead of being replaced by a blank save.
  claimGuestData(accountId) {
    this._currentAccountId = accountId;
    this._persist();
  }

  // Flushes the active save to its current slot (guest or account) and loads `accountId`'s slot
  // (or the guest slot if `accountId` is null) — used for login to an existing profile, logout,
  // and switching between profiles. No data is ever lost: the slot being left is always written
  // before the new one is read.
  switchAccount(accountId) {
    this._persist();
    this._currentAccountId = accountId;
    this.data = this._loadFrom(this._keyFor(accountId));
  }

  deleteAccountData(accountId) {
    try {
      localStorage.removeItem(this._keyFor(accountId));
    } catch {
      /* ignore */
    }
  }

  // Manual cross-device transfer: this build has no backend to sync automatically, so "cloud
  // save" is a JSON export/import the player carries between devices themselves.
  exportSnapshot() {
    return JSON.stringify(this.data);
  }

  importSnapshot(json) {
    try {
      const parsed = JSON.parse(json);
      if (!parsed || typeof parsed !== 'object' || !parsed.settings) return false;
      this.data = this._normalize(parsed);
      this._persist();
      return true;
    } catch {
      return false;
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

  // `result` = { score, elapsed, accuracy, collisions, stars } for one finished attempt.
  // `replayData` (see ReplayManager.ReplayRecorder#finish) is only kept when this run beats the
  // previous best score, so the stored ghost always matches the stored best-score run. Every
  // other per-level record (fastest time, highest accuracy, fewest collisions) is tracked
  // independently of score, since the run with the highest score isn't necessarily the fastest
  // or the most accurate one.
  recordLevelResult(levelId, result, replayData = null) {
    const { score, elapsed, accuracy, collisions, stars, ratingValue } = result;
    const prevBest = this.data.bestScores[levelId] || 0;
    const improved = score > prevBest;
    if (improved) {
      this.data.bestScores[levelId] = score;
      if (replayData) this.data.replays[levelId] = replayData;
    }

    const stats = this.data.levelStats[levelId] || defaultLevelStats();
    stats.bestScore = Math.max(stats.bestScore, score);
    stats.stars = Math.max(stats.stars, stars);
    stats.bestTimeSec = stats.bestTimeSec === null ? elapsed : Math.min(stats.bestTimeSec, elapsed);
    stats.bestAccuracy = stats.bestAccuracy === null ? accuracy : Math.max(stats.bestAccuracy, accuracy);
    if (ratingValue != null) {
      stats.bestRatingValue = stats.bestRatingValue === null ? ratingValue : Math.max(stats.bestRatingValue, ratingValue);
    }
    stats.lowestCollisions = stats.lowestCollisions === null ? collisions : Math.min(stats.lowestCollisions, collisions);
    stats.timesCompleted += 1;
    this.data.levelStats[levelId] = stats;

    this.data.totals.completedParks += 1;
    this.data.totals.accuracySum += accuracy;
    this.data.totals.accuracyCount += 1;

    if (levelId >= this.data.unlockedLevel) this.data.unlockedLevel = Math.min(levelId + 1, LEVEL_COUNT);
    this._persist();
    return improved;
  }

  getReplay(levelId) {
    return this.data.replays[levelId] || null;
  }

  getLevelStats(levelId) {
    return this.data.levelStats[levelId] || defaultLevelStats();
  }

  incrementLevelPlays(levelId) {
    const stats = this.data.levelStats[levelId] || defaultLevelStats();
    stats.timesPlayed += 1;
    this.data.levelStats[levelId] = stats;
    this.data.lastPlayedLevel = levelId;
    this._persist();
  }

  getLastPlayedLevel() {
    return this.data.lastPlayedLevel;
  }

  addPlayTime(sec) {
    if (sec <= 0) return;
    this.data.totals.playTimeSec += sec;
    this._persist();
  }

  addCollision() {
    this.data.totals.collisions += 1;
    this._persist();
  }

  addDistance(meters) {
    if (meters <= 0) return;
    this.data.totals.distanceMeters += meters;
    this._persist();
  }

  addRestart() {
    this.data.totals.restarts += 1;
    this._persist();
  }

  // Counts a play (not necessarily a completion) per vehicle so "favorite vehicle" reflects what
  // the player actually drives, same spirit as incrementLevelPlays for levels.
  addVehicleUsage(id) {
    this.data.vehicleUsage[id] = (this.data.vehicleUsage[id] || 0) + 1;
    this._persist();
  }

  getFavoriteVehicle() {
    const entries = Object.entries(this.data.vehicleUsage);
    if (entries.length === 0) return this.data.selectedVehicle;
    return entries.sort((a, b) => b[1] - a[1])[0][0];
  }

  // Reuses levelStats.timesPlayed (already tracked by incrementLevelPlays) rather than a
  // separate counter.
  getFavoriteLevel() {
    let best = null;
    let bestPlays = 0;
    for (const [levelId, stats] of Object.entries(this.data.levelStats)) {
      if (stats.timesPlayed > bestPlays) {
        bestPlays = stats.timesPlayed;
        best = Number(levelId);
      }
    }
    return best;
  }

  getCoins() {
    return this.data.coins;
  }

  // Bumps both the spendable balance and the lifetime "earned" stat in one call, so the
  // Statistics panel's "Total Coins Earned" never drops even after coins are spent in the shop.
  addCoins(n) {
    if (n <= 0) return;
    this.data.coins += n;
    this.data.totals.coinsEarned += n;
    this._persist();
  }

  spendCoins(n) {
    if (this.data.coins < n) return false;
    this.data.coins -= n;
    this._persist();
    return true;
  }

  // Regenerates the day's challenge picks (deterministic per calendar date via the same seeded
  // RNG levels.js uses) only when the stored date has rolled over — a no-op every other call.
  _ensureDaily() {
    const today = todayStr();
    if (this.data.daily.date === today) return;
    const rng = makeSeededRandom(Number(today.replace(/-/g, '')));
    const pool = [...CHALLENGE_POOL];
    const items = [];
    for (let i = 0; i < DAILY_COUNT && pool.length; i++) {
      const idx = Math.floor(rng() * pool.length);
      items.push({ id: pool.splice(idx, 1)[0].id, progress: 0, done: false });
    }
    this.data.daily = { date: today, items };
    this._persist();
  }

  // Merges today's saved progress ({id, progress, done}) with the static template (label/type/
  // target/reward) so the UI never has to touch CHALLENGE_POOL itself.
  getDailyChallenges() {
    this._ensureDaily();
    return this.data.daily.items.map((item) => ({ ...item, ...CHALLENGE_POOL.find((c) => c.id === item.id) }));
  }

  // Called once per level completion with that run's outcome. Advances any not-yet-done daily
  // challenge it qualifies for and auto-awards coins the moment a challenge finishes (no separate
  // "claim" step, keeping the UI compact). Returns the challenges that just completed.
  updateDailyProgress({ stars, collisions, elapsed }) {
    this._ensureDaily();
    const rewards = [];
    for (const item of this.data.daily.items) {
      if (item.done) continue;
      const tmpl = CHALLENGE_POOL.find((c) => c.id === item.id);
      if (!tmpl) continue;
      const qualifies =
        tmpl.type === 'complete' ||
        (tmpl.type === 'noCollision' && collisions === 0) ||
        (tmpl.type === 'threeStar' && stars === 3) ||
        (tmpl.type === 'fastTime' && elapsed <= tmpl.target);
      if (!qualifies) continue;
      item.progress += 1;
      if (item.progress >= (tmpl.type === 'complete' ? tmpl.target : 1)) {
        item.done = true;
        this.addCoins(tmpl.reward);
        rewards.push(tmpl);
      }
    }
    this._persist();
    return rewards;
  }

  // Aggregate profile stats for the Progress screen / main-menu overview panel.
  getTotals() {
    let levelsCompleted = 0;
    let totalStars = 0;
    let bestAccuracy = 0;
    for (let id = 1; id <= LEVEL_COUNT; id++) {
      const stats = this.data.levelStats[id];
      if (stats && stats.timesCompleted > 0) levelsCompleted++;
      if (stats) totalStars += stats.stars;
      if (stats && stats.bestAccuracy != null) bestAccuracy = Math.max(bestAccuracy, stats.bestAccuracy);
    }
    const { accuracySum, accuracyCount } = this.data.totals;
    return {
      playTimeSec: this.data.totals.playTimeSec,
      completedParks: this.data.totals.completedParks,
      collisions: this.data.totals.collisions,
      coinsEarned: this.data.totals.coinsEarned,
      distanceMeters: this.data.totals.distanceMeters,
      restarts: this.data.totals.restarts,
      averageAccuracy: accuracyCount > 0 ? accuracySum / accuracyCount : 0,
      favoriteVehicleId: this.getFavoriteVehicle(),
      favoriteLevelId: this.getFavoriteLevel(),
      bestAccuracy,
      levelsCompleted,
      totalStars,
      maxStars: LEVEL_COUNT * 3,
      percentComplete: Math.round((levelsCompleted / LEVEL_COUNT) * 100),
    };
  }

  // Last-unlocked-first, for the Progress screen / main-menu "recent achievements" panels.
  getRecentAchievements(limit = 3) {
    return Object.entries(this.data.achievements)
      .filter(([, rec]) => rec.unlocked)
      .sort((a, b) => (b[1].unlockedAt || 0) - (a[1].unlockedAt || 0))
      .slice(0, limit)
      .map(([id]) => id);
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
