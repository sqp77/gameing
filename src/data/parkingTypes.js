/*
 * MASAR
 * Owner: Saud Alqhtani
 * GitHub: sqp77
 * =============
 */

// Pure data mapping a level's derived parking-type id (see levels.js's
// `parkingType` field) to a display label and a short glyph for compact UI
// (level-select tiles). Mirrors data/achievements.js's "data stays separate
// from the logic that consumes it" convention.
export const PARKING_TYPE_LABELS = {
  parallel: 'Parallel Parking',
  reverse: 'Reverse Parking',
  perpendicular: 'Perpendicular Parking',
  angled: 'Angled Parking',
};

export const PARKING_TYPE_GLYPHS = {
  parallel: '⇔',
  reverse: '⟲',
  perpendicular: '⊥',
  angled: '◤',
};
