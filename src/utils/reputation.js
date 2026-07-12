/*
 * MASAR
 * Owner: Saud Alqhtani
 * GitHub: sqp77
 * =============
 */

import { clamp } from './MathUtils.js';

// Single source of truth for reputation-score -> rank and XP -> driver-level mappings,
// shared by SaveManager (persistence), GameManager (rank-up toasts), and UIManager
// (Progress screen / hub HUD badge). Same pure-function shape as utils/scoring.js —
// tuning a threshold here never requires a save migration since rank/level are always
// derived, never stored.

const REPUTATION_MIN = -200;
const REPUTATION_MAX = 999;

// Ordered lowest-first; rankForScore returns the last tier whose `min` the score clears.
const REPUTATION_RANKS = [
  { min: -200, id: 'beginner', label: 'reputation.rank.beginner' },
  { min: 50, id: 'skilled', label: 'reputation.rank.skilled' },
  { min: 150, id: 'advanced', label: 'reputation.rank.advanced' },
  { min: 350, id: 'professional', label: 'reputation.rank.professional' },
  { min: 700, id: 'master', label: 'reputation.rank.master' },
];

export function clampReputation(score) {
  return clamp(score, REPUTATION_MIN, REPUTATION_MAX);
}

export function rankForScore(score) {
  let tier = REPUTATION_RANKS[0];
  for (const t of REPUTATION_RANKS) {
    if (score >= t.min) tier = t;
    else break;
  }
  return tier;
}

// For UI progress bars (main menu Progress Card, Hub HUD): how far the score sits between the
// current rank's threshold and the next one, 0..1 (1 once at the top rank — MASAR Master has
// nowhere further to progress toward). Pure/derived like rankForScore, never persisted.
export function rankProgress(score) {
  const current = rankForScore(score);
  const idx = REPUTATION_RANKS.indexOf(current);
  const next = REPUTATION_RANKS[idx + 1];
  if (!next) return 1;
  return clamp((score - current.min) / (next.min - current.min), 0, 1);
}

// Point deltas for the actions the reputation system reacts to (kept as named constants,
// not magic numbers, so GameManager/JobManager/PoliceManager call sites read intent-first).
export const REPUTATION_DELTA = {
  cleanPark: 2, // accuracy >= 0.9 and zero collisions on a completed run
  collision: -1, // per collision on a completed run, capped per run by the caller
  fastCompletion: 1, // finished with >= 50% of the time limit remaining
  missionSuccess: 3,
  missionFailure: -2,
  reckless: -1, // speeding / near-miss flagged by PoliceManager while in the hub
  policeFine: -3, // repeated reckless driving, fined by PoliceManager
};

const XP_PER_LEVEL = 100;
const MAX_LEVEL = 20;

export function levelForXp(xp) {
  return clamp(Math.floor(xp / XP_PER_LEVEL) + 1, 1, MAX_LEVEL);
}

export function xpIntoLevel(xp) {
  return xp % XP_PER_LEVEL;
}
