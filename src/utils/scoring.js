/*
 * ParkMaster3D
 * Owner: Saud
 * GitHub: sqp77
 * =============
 */

const THREE_STAR_SCORE = 850;
const TWO_STAR_SCORE = 550;

// Single source of truth for the score->stars mapping, shared by ScoreManager (live breakdown),
// SaveManager (persisted per-level stats), and UIManager (level tiles / progress screen) so the
// thresholds can never drift out of sync between them.
export function starsForScore(score) {
  return score >= THREE_STAR_SCORE ? 3 : score >= TWO_STAR_SCORE ? 2 : 1;
}
