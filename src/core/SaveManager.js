import { STORAGE_KEYS } from './Constants.js';

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — fail silently */
  }
}

export class SaveManager {
  constructor() {
    this.bestScore = readJSON(STORAGE_KEYS.bestScore, 0);
    this.totalItems = readJSON(STORAGE_KEYS.totalItems, 0);
    this.leaderboard = readJSON(STORAGE_KEYS.leaderboard, []);
    this.achievements = readJSON(STORAGE_KEYS.achievements, []);
    this.muted = readJSON(STORAGE_KEYS.muted, false);
  }

  isNewBest(score) {
    return score > this.bestScore;
  }

  recordRun({ score, items }) {
    if (score > this.bestScore) {
      this.bestScore = score;
      writeJSON(STORAGE_KEYS.bestScore, this.bestScore);
    }
    this.totalItems += items;
    writeJSON(STORAGE_KEYS.totalItems, this.totalItems);

    this.leaderboard.push({ score, date: new Date().toISOString() });
    this.leaderboard.sort((a, b) => b.score - a.score);
    this.leaderboard = this.leaderboard.slice(0, 10);
    writeJSON(STORAGE_KEYS.leaderboard, this.leaderboard);
  }

  unlockAchievement(id) {
    if (this.achievements.includes(id)) return false;
    this.achievements.push(id);
    writeJSON(STORAGE_KEYS.achievements, this.achievements);
    return true;
  }

  hasAchievement(id) {
    return this.achievements.includes(id);
  }

  setMuted(muted) {
    this.muted = muted;
    writeJSON(STORAGE_KEYS.muted, muted);
  }
}
