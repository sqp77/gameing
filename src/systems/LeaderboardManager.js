/*
 * MASAR
 * Owner: Saud Alqhtani
 * GitHub: sqp77
 * =============
 */

import { EventEmitter } from '../utils/EventEmitter.js';

// v1.2.0 Online Leaderboard-Ready architecture — a local-only implementation today (capped
// top-10 per category, persisted via SaveManager.submitLeaderboardScore/getLeaderboardTop), but
// written with the exact shape a networked leaderboard would need: submitScore() is the single
// call site a future API call would replace, and fetchGlobalTop()/getTopScores() already return
// what a "top scores" response would look like. Modeled directly on JobManager's shape
// (constructor takes `save`, all persistence delegated to it, an EventEmitter for reactions).
export class LeaderboardManager extends EventEmitter {
  constructor(save) {
    super();
    this.save = save;
  }

  // categories: 'bestAccuracy' (0..1, higher wins), 'fastestCompletion' (seconds, lower wins),
  // 'reputation' (higher wins) — see SaveManager's LEADERBOARD_LOWER_IS_BETTER.
  submitScore(category, value, meta = {}) {
    const isNewBest = this.save.submitLeaderboardScore(category, value, meta);
    if (isNewBest) this.emit('newBest', { category, value });
  }

  getTopScores(category) {
    return this.save.getLeaderboardTop(category);
  }

  // Stub extension point for a future backend: today just resolves the local table
  // synchronously-wrapped-in-a-Promise; swapping in a real API means making this an actual
  // fetch and leaving every call site (already `await`-shaped) unchanged.
  fetchGlobalTop(category) {
    return Promise.resolve(this.getTopScores(category));
  }
}
