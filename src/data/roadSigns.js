/*
 * MASAR
 * Owner: Saud Alqhtani
 * GitHub: sqp77
 * =============
 */

// Pure data for the 8 Saudi regulatory/informational road signs, mirroring
// data/achievements.js's "data stays separate from the code that consumes it" convention.
// `label` is an i18n key (see data/strings.js) — WorldBuilder renders the Arabic text
// directly (real road signs lead with Arabic) with the English translation underneath,
// and looks the English string up via I18n only for the DOM legend, not the 3D texture.
// `shape`/`bg`/`fg` drive a simple, real-world-accurate sign silhouette: octagon+red for
// STOP, red-ringed circle for prohibition, blue circle for mandatory/regulatory, yellow
// diamond for warnings, green rectangle for informational (exit/entrance/parking).
export const ROAD_SIGNS = {
  stop: { id: 'stop', ar: 'قف', en: 'STOP', label: 'roadSign.stop', shape: 'octagon', bg: '#c8102e', fg: '#ffffff' },
  oneWay: { id: 'oneWay', ar: 'اتجاه واحد', en: 'ONE WAY', label: 'roadSign.oneWay', shape: 'rect', bg: '#0a5cd8', fg: '#ffffff' },
  noParking: { id: 'noParking', ar: 'ممنوع الوقوف', en: 'NO PARKING', label: 'roadSign.noParking', shape: 'circle', bg: '#ffffff', fg: '#c8102e' },
  bump: { id: 'bump', ar: 'مطب', en: 'BUMP', label: 'roadSign.bump', shape: 'diamond', bg: '#ffcc00', fg: '#111111' },
  parking: { id: 'parking', ar: 'مواقف', en: 'PARKING', label: 'roadSign.parking', shape: 'rect', bg: '#0a5cd8', fg: '#ffffff' },
  exit: { id: 'exit', ar: 'مخرج', en: 'EXIT', label: 'roadSign.exit', shape: 'rect', bg: '#0d6b3a', fg: '#ffffff' },
  entrance: { id: 'entrance', ar: 'دخول', en: 'ENTRANCE', label: 'roadSign.entrance', shape: 'rect', bg: '#0d6b3a', fg: '#ffffff' },
  caution: { id: 'caution', ar: 'انتبه', en: 'CAUTION', label: 'roadSign.caution', shape: 'diamond', bg: '#ffcc00', fg: '#111111' },
};
