/*
 * ParkMaster3D
 * Owner: Saud
 * GitHub: sqp77
 * =============
 */

// Pure data, no unlock logic — mirrors themes.js's "data stays separate from the code that
// evaluates/consumes it" convention. AchievementManager decides when each id unlocks.
export const ACHIEVEMENTS = [
  { id: 'no_collision', name: 'Clean Parker', description: 'Complete a level without any collisions.', icon: '✓' },
  { id: 'speed_master', name: 'Speed Master', description: 'Finish a level in under 20 seconds.', icon: '⏱' },
  { id: 'perfect_parking', name: 'Perfect Parking', description: 'Achieve maximum parking accuracy.', icon: '◎' },
  { id: 'precision_driver', name: 'Precision Driver', description: 'Complete 5 levels with no collisions.', icon: '✦' },
  { id: 'parking_expert', name: 'Parking Expert', description: 'Earn 3 stars on every level.', icon: '★' },
  { id: 'night_driver', name: 'Night Driver', description: 'Complete all night-themed levels.', icon: '☾' },
  { id: 'vehicle_collector', name: 'Vehicle Collector', description: 'Unlock every vehicle.', icon: '▣' },
  { id: 'combo_master', name: 'Combo Master', description: 'Earn multiple achievements in a single run.', icon: '✴' },
];

export const ACHIEVEMENT_COUNT = ACHIEVEMENTS.length;
