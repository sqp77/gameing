/*
 * MASAR
 * Owner: Saud Alqhtani
 * GitHub: sqp77
 * =============
 */

import { clamp } from './MathUtils.js';

const THREE_STAR_SCORE = 850;
const TWO_STAR_SCORE = 550;

// Single source of truth for the score->stars mapping, shared by ScoreManager (live breakdown),
// SaveManager (persisted per-level stats), and UIManager (level tiles / progress screen) so the
// thresholds can never drift out of sync between them.
export function starsForScore(score) {
  return score >= THREE_STAR_SCORE ? 3 : score >= TWO_STAR_SCORE ? 2 : 1;
}

// Rating tiers for the post-park accuracy rating (Feature: Parking Accuracy Rating).
// Ordered highest-first; `ratingLabelForValue` returns the first tier whose `min` the
// value clears. `label` is an i18n key (see data/strings.js) — callers pass it through
// I18n#t() at display time rather than showing it directly.
const RATING_TIERS = [
  { min: 0.97, label: 'rating.perfect' },
  { min: 0.9, label: 'rating.excellent' },
  { min: 0.75, label: 'rating.great' },
  { min: 0.55, label: 'rating.good' },
  { min: 0, label: 'rating.needsImprovement' },
];

export function ratingLabelForValue(value) {
  for (const tier of RATING_TIERS) {
    if (value >= tier.min) return tier.label;
  }
  return 'rating.needsImprovement';
}

// Composite parking rating: position/rotation accuracy is the primary factor (it already
// captures how well the car ended up in the spot), lightly adjusted down for collisions and
// for finishing with very little time left. Deliberately separate from ScoreManager's
// score/coin formulas so tuning the rating never shifts the score economy.
export function computeParkingRating({ accuracy, collisions, elapsed, timeLimit }) {
  const timeUsedRatio = timeLimit > 0 ? clamp(elapsed / timeLimit, 0, 1) : 0;
  const timePenalty = timeUsedRatio > 0.85 ? (timeUsedRatio - 0.85) * 0.4 : 0;
  const collisionPenalty = Math.min(0.3, collisions * 0.08);
  const value = clamp(accuracy - collisionPenalty - timePenalty, 0, 1);
  return { value, label: ratingLabelForValue(value) };
}
