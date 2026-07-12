/*
 * MASAR
 * Owner: Saud Alqhtani
 * GitHub: sqp77
 * =============
 */

// Pure data, no unlock logic — mirrors themes.js's "data stays separate from the code that
// evaluates/consumes it" convention. AchievementManager decides when each id unlocks.
// `name`/`description` are i18n keys (see data/strings.js) — UI code passes them through
// I18n#t() at display time rather than showing them directly.
export const ACHIEVEMENTS = [
  { id: 'no_collision', name: 'achievement.no_collision.name', description: 'achievement.no_collision.desc', icon: '✓' },
  { id: 'speed_master', name: 'achievement.speed_master.name', description: 'achievement.speed_master.desc', icon: '⏱' },
  { id: 'perfect_parking', name: 'achievement.perfect_parking.name', description: 'achievement.perfect_parking.desc', icon: '◎' },
  { id: 'precision_driver', name: 'achievement.precision_driver.name', description: 'achievement.precision_driver.desc', icon: '✦' },
  { id: 'parking_expert', name: 'achievement.parking_expert.name', description: 'achievement.parking_expert.desc', icon: '★' },
  { id: 'night_driver', name: 'achievement.night_driver.name', description: 'achievement.night_driver.desc', icon: '☾' },
  { id: 'vehicle_collector', name: 'achievement.vehicle_collector.name', description: 'achievement.vehicle_collector.desc', icon: '▣' },
  { id: 'combo_master', name: 'achievement.combo_master.name', description: 'achievement.combo_master.desc', icon: '✴' },
];

export const ACHIEVEMENT_COUNT = ACHIEVEMENTS.length;
