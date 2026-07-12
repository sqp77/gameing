/*
 * MASAR
 * Owner: Saud Alqhtani
 * GitHub: sqp77
 * =============
 */

import { starsForScore } from '../utils/scoring.js';
import { makeSeededRandom } from '../utils/MathUtils.js';
import { CHALLENGE_POOL, EVENT_CHALLENGE_POOL, DAILY_COUNT } from '../data/challenges.js';
import { LICENSE_ROUTES, LICENSE_TIER_IDS } from '../data/licenseRoutes.js';
import { clampReputation, rankForScore, levelForXp } from '../utils/reputation.js';
import { JOB_TYPE_IDS } from '../data/jobs.js';

const STORAGE_KEY = 'parkmaster3d.save.v1';
const DEFAULT_SETTINGS = {
  volume: 0.7,
  sensitivity: 1,
  shadows: true,
  camera: 'third',
  ghostReplay: true,
  assist: true,
  language: 'en',
  eventsEnabled: true,
};
const LEVEL_COUNT = 20;

function defaultAcademyState() {
  return { modules: {} };
}

function defaultAcademyModuleState() {
  return { unlockedStage: 0, stars: {}, certified: false };
}

function defaultLicenseState() {
  return { earned: false, earnedAt: null, passedRoutes: {}, earnedTiers: {} };
}

function defaultReputationState() {
  return { score: 0 };
}

function defaultProgressionState() {
  return { xp: 0 };
}

function defaultJobsState() {
  return { activeJob: null, completed: Object.fromEntries(JOB_TYPE_IDS.map((id) => [id, 0])), history: [] };
}

function defaultLastPlayed() {
  return { mode: null, cityLabel: null, at: null };
}

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
    academy: defaultAcademyState(),
    license: defaultLicenseState(),
    reputation: defaultReputationState(),
    progression: defaultProgressionState(),
    jobs: defaultJobsState(),
    lastPlayed: defaultLastPlayed(),
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
      academy: {
        modules: Object.fromEntries(
          Object.entries((parsed.academy || {}).modules || {}).map(([id, m]) => [id, { ...defaultAcademyModuleState(), ...m }])
        ),
      },
      license: { ...defaultLicenseState(), ...(parsed.license || {}) },
      reputation: { ...defaultReputationState(), ...(parsed.reputation || {}) },
      progression: { ...defaultProgressionState(), ...(parsed.progression || {}) },
      jobs: {
        ...defaultJobsState(),
        ...(parsed.jobs || {}),
        completed: { ...defaultJobsState().completed, ...((parsed.jobs || {}).completed || {}) },
      },
      lastPlayed: { ...defaultLastPlayed(), ...(parsed.lastPlayed || {}) },
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
  // `activeEventId` (optional) folds that event's bonus challenge into today's pool alongside the
  // regular CHALLENGE_POOL — a no-op whenever no national event is active/enabled (see
  // systems/EventManager.js), so existing daily-challenge behavior is unchanged outside events.
  _ensureDaily(activeEventId) {
    const today = todayStr();
    if (this.data.daily.date === today) return;
    const rng = makeSeededRandom(Number(today.replace(/-/g, '')));
    const pool = [...CHALLENGE_POOL, ...EVENT_CHALLENGE_POOL.filter((c) => c.eventId === activeEventId)];
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
  getDailyChallenges(activeEventId) {
    this._ensureDaily(activeEventId);
    const allDefs = [...CHALLENGE_POOL, ...EVENT_CHALLENGE_POOL];
    return this.data.daily.items.map((item) => ({ ...item, ...allDefs.find((c) => c.id === item.id) }));
  }

  // Called once per level completion with that run's outcome. Advances any not-yet-done daily
  // challenge it qualifies for and auto-awards coins the moment a challenge finishes (no separate
  // "claim" step, keeping the UI compact). Returns the challenges that just completed.
  updateDailyProgress({ stars, collisions, elapsed }, activeEventId) {
    this._ensureDaily(activeEventId);
    const rewards = [];
    for (const item of this.data.daily.items) {
      if (item.done) continue;
      const tmpl = [...CHALLENGE_POOL, ...EVENT_CHALLENGE_POOL].find((c) => c.id === item.id);
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

  // ---- Driving Academy progress (see data/academyLevels.js) ----

  getAcademyModuleState(moduleId) {
    return this.data.academy.modules[moduleId] || defaultAcademyModuleState();
  }

  // Records one finished stage attempt. Only raises `unlockedStage` (never lowers it on a
  // replay) and keeps the best star count per stage, same "best persists" spirit as
  // recordLevelResult. Returns true the first time `certified` flips on for this module.
  recordAcademyStage(moduleId, stageIndex, stageCount, stars) {
    const state = { ...defaultAcademyModuleState(), ...this.data.academy.modules[moduleId] };
    state.unlockedStage = Math.max(state.unlockedStage, Math.min(stageIndex + 1, stageCount - 1));
    state.stars = { ...state.stars, [stageIndex]: Math.max(state.stars[stageIndex] || 0, stars) };
    const wasCertified = state.certified;
    if (Object.keys(state.stars).length >= stageCount && Object.values(state.stars).every((s) => s > 0)) {
      state.certified = true;
    }
    this.data.academy.modules[moduleId] = state;
    this._persist();
    return !wasCertified && state.certified;
  }

  getAcademyProgress() {
    return this.data.academy.modules;
  }

  // ---- Driving License Test (see data/licenseRoutes.js) ----

  getLicenseStatus() {
    return this.data.license;
  }

  // Returns `{ tierEarned }` — the tier id if this result just completed every route in its
  // tier for the first time (used by GameManager to fire a tier-unlock toast + vehicle check),
  // or null otherwise. Mirrors recordAcademyStage's "only tell the caller about new milestones"
  // shape.
  recordLicenseRouteResult(routeId, passed) {
    let tierEarned = null;
    if (passed) {
      this.data.license.passedRoutes[routeId] = true;
      if (!this.data.license.earned) {
        this.data.license.earned = true;
        this.data.license.earnedAt = Date.now();
      }
      const route = LICENSE_ROUTES.find((r) => r.id === routeId);
      const tier = route?.tier;
      if (tier && !this.data.license.earnedTiers[tier]) {
        const tierRoutes = LICENSE_ROUTES.filter((r) => r.tier === tier);
        if (tierRoutes.every((r) => this.data.license.passedRoutes[r.id])) {
          this.data.license.earnedTiers[tier] = true;
          tierEarned = tier;
        }
      }
    }
    this._persist();
    return { tierEarned };
  }

  isLicenseTierEarned(tier) {
    return !!this.data.license.earnedTiers[tier];
  }

  isLicenseTierUnlocked(tier) {
    const idx = LICENSE_TIER_IDS.indexOf(tier);
    if (idx <= 0) return true;
    return this.isLicenseTierEarned(LICENSE_TIER_IDS[idx - 1]);
  }

  getEarnedLicenseTierCount() {
    return LICENSE_TIER_IDS.filter((t) => this.isLicenseTierEarned(t)).length;
  }

  // ---- Reputation (Feature 4) — score is the only persisted value, rank is always derived
  // (see utils/reputation.js) so tuning rank thresholds never needs a save migration. ----

  getReputation() {
    const score = this.data.reputation.score;
    return { score, rank: rankForScore(score) };
  }

  addReputation(delta) {
    if (!delta) return { ...this.getReputation(), rankChanged: false };
    const prevRank = rankForScore(this.data.reputation.score).id;
    this.data.reputation.score = clampReputation(this.data.reputation.score + delta);
    this._persist();
    const next = this.getReputation();
    return { ...next, rankChanged: next.rank.id !== prevRank };
  }

  // ---- Driver XP/level (Job System rewards) ----

  getProgression() {
    const xp = this.data.progression.xp;
    return { xp, level: levelForXp(xp) };
  }

  addXP(delta) {
    if (!delta) return { ...this.getProgression(), levelChanged: false };
    const prevLevel = levelForXp(this.data.progression.xp);
    this.data.progression.xp = Math.max(0, this.data.progression.xp + delta);
    this._persist();
    const next = this.getProgression();
    return { ...next, levelChanged: next.level !== prevLevel };
  }

  // ---- Job System (Feature 2) ----

  getActiveJob() {
    return this.data.jobs.activeJob;
  }

  setActiveJob(job) {
    this.data.jobs.activeJob = job;
    this._persist();
  }

  clearActiveJob() {
    this.data.jobs.activeJob = null;
    this._persist();
  }

  // Persists a finished job's outcome (win or fail) and returns the running total for its type
  // so callers can show "Parking Jobs completed: N" without a second read.
  recordJobResult(type, success, reward = {}) {
    if (success) {
      this.data.jobs.completed[type] = (this.data.jobs.completed[type] || 0) + 1;
    }
    this.data.jobs.history.unshift({ type, success, coins: reward.coins || 0, xp: reward.xp || 0, at: Date.now() });
    if (this.data.jobs.history.length > 20) this.data.jobs.history.length = 20;
    this._persist();
    return this.data.jobs.completed[type] || 0;
  }

  getJobStats() {
    const completed = this.data.jobs.completed;
    const total = Object.values(completed).reduce((sum, n) => sum + n, 0);
    return { completed, total, history: this.data.jobs.history };
  }

  getVehicleCount() {
    return this.data.unlockedVehicles.length;
  }

  // ---- Main menu Quick Access panel (display-only — never read by gameplay code) ----

  recordLastPlayed({ mode, cityLabel }) {
    this.data.lastPlayed = { mode, cityLabel: cityLabel || null, at: Date.now() };
    this._persist();
  }

  getLastPlayed() {
    return this.data.lastPlayed;
  }
}
