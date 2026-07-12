/*
 * MASAR
 * Owner: Saud Alqhtani
 * GitHub: sqp77
 * =============
 */

// Pure data mapping a level's derived parking-type id (see levels.js's
// `parkingType` field) to a display-label i18n key (see data/strings.js) and a short glyph
// for compact UI (level-select tiles). Mirrors data/achievements.js's "data stays separate
// from the logic that consumes it" convention.
export const PARKING_TYPE_LABELS = {
  parallel: 'parkingType.parallel',
  reverse: 'parkingType.reverse',
  perpendicular: 'parkingType.perpendicular',
  angled: 'parkingType.angled',
};

export const PARKING_TYPE_GLYPHS = {
  parallel: '⇔',
  reverse: '⟲',
  perpendicular: '⊥',
  angled: '◤',
};
