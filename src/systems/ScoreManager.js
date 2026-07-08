/*
 * ParkMaster3D
 * Owner: Saud
 * GitHub: sqp77
 * =============
 */

import { EventEmitter } from '../utils/EventEmitter.js';
import { starsForScore } from '../utils/scoring.js';

const PENALTY_COLLISION = 40;
const PENALTY_BOUNDARY = 25;
const PENALTY_WRONG_SPOT = 30;
const BASE_SCORE = 500;
const TIME_BONUS_PER_SEC = 6;
const NO_COLLISION_BONUS = 150;
const ACCURACY_BONUS_MAX = 300;
const COIN_BASE = 10;
const COIN_BONUS = 5;

// Tracks a single level attempt's run stats (collisions, boundary exits, wrong-spot
// attempts, elapsed/remaining time) and turns them into the final score breakdown
// shown on the victory screen. Penalties are applied live so a toast can fire
// immediately; the score total itself is only computed once, on success.
export class ScoreManager extends EventEmitter {
  constructor() {
    super();
    this.reset(0);
  }

  reset(timeLimit) {
    this.timeLimit = timeLimit;
    this.timeRemaining = timeLimit;
    this.collisions = 0;
    this.boundaryExits = 0;
    this.wrongSpotAttempts = 0;
    this.penaltyTotal = 0;
    this.elapsed = 0;
  }

  tick(dt) {
    this.elapsed += dt;
    this.timeRemaining = Math.max(0, this.timeRemaining - dt);
    return this.timeRemaining;
  }

  registerCollision() {
    this.collisions++;
    this.penaltyTotal += PENALTY_COLLISION;
    this.emit('penalty', { reason: 'collision', amount: PENALTY_COLLISION });
  }

  registerBoundaryExit() {
    this.boundaryExits++;
    this.penaltyTotal += PENALTY_BOUNDARY;
    this.emit('penalty', { reason: 'boundary', amount: PENALTY_BOUNDARY });
  }

  registerWrongSpot() {
    this.wrongSpotAttempts++;
    this.penaltyTotal += PENALTY_WRONG_SPOT;
    this.emit('penalty', { reason: 'wrongSpot', amount: PENALTY_WRONG_SPOT });
  }

  // Live HUD estimate (no accuracy component yet — that's only known once parked).
  getLiveEstimate() {
    const timeBonus = Math.round(this.timeRemaining * TIME_BONUS_PER_SEC);
    const noCollisionBonus = this.collisions === 0 ? NO_COLLISION_BONUS : 0;
    return Math.max(0, Math.round(BASE_SCORE + timeBonus + noCollisionBonus - this.penaltyTotal));
  }

  computeFinalScore(accuracy) {
    const timeBonus = Math.round(this.timeRemaining * TIME_BONUS_PER_SEC);
    const accuracyBonus = Math.round(accuracy * ACCURACY_BONUS_MAX);
    const noCollisionBonus = this.collisions === 0 ? NO_COLLISION_BONUS : 0;
    const raw = BASE_SCORE + timeBonus + accuracyBonus + noCollisionBonus - this.penaltyTotal;
    const total = Math.max(0, Math.round(raw));
    const stars = starsForScore(total);
    // Small flat currency reward, independent of the score curve: a base payout plus bonuses for
    // the same three things the star rating already rewards (speed, accuracy, clean driving).
    const coins = COIN_BASE + (this.collisions === 0 ? COIN_BONUS : 0) + (accuracy >= 0.9 ? COIN_BONUS : 0) + (stars === 3 ? COIN_BONUS : 0);
    return {
      base: BASE_SCORE,
      timeBonus,
      accuracyBonus,
      noCollisionBonus,
      penalties: this.penaltyTotal,
      total,
      stars,
      coins,
    };
  }
}
