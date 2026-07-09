/*
 * MASAR
 * Owner: Saud Alqhtani
 * GitHub: sqp77
 * =============
 */

// Pure data for the Saudi environmental theming pass — a pool of real Saudi road names
// (Arabic + English transliteration, matching how Saudi road signage is itself bilingual)
// that WorldBuilder picks from deterministically per level. Mirrors the existing
// data/achievements.js / data/parkingTypes.js "data stays separate from the code that
// consumes it" convention.
export const SAUDI_STREET_NAMES = [
  { ar: 'شارع الملك فهد', en: 'King Fahd Road' },
  { ar: 'طريق الملك عبدالله', en: 'King Abdullah Road' },
  { ar: 'شارع العليا', en: 'Olaya Street' },
  { ar: 'طريق الأمير سلطان', en: 'Prince Sultan Road' },
  { ar: 'شارع التحلية', en: 'Tahlia Street' },
  { ar: 'طريق الملك خالد', en: 'King Khalid Road' },
  { ar: 'شارع الستين', en: 'Sitteen Street' },
  { ar: 'طريق مكة المكرمة', en: 'Makkah Road' },
];
