/*
 * ParkMaster3D
 * Owner: Saud
 * GitHub: sqp77
 * =============
 */

// Pure data, mirrors achievements.js's "data stays separate from evaluation logic" convention.
// `type` drives SaveManager.updateDailyProgress(); `target` is a level-count goal for 'complete'
// and a seconds threshold for 'fastTime' (all other types complete on a single qualifying run).
export const CHALLENGE_POOL = [
  { id: 'complete1', label: 'Complete 1 level', type: 'complete', target: 1, reward: 20 },
  { id: 'complete3', label: 'Complete 3 levels', type: 'complete', target: 3, reward: 40 },
  { id: 'noCollision1', label: 'Finish a level with no collisions', type: 'noCollision', target: 1, reward: 25 },
  { id: 'threeStar1', label: 'Earn 3 stars on a level', type: 'threeStar', target: 1, reward: 30 },
  { id: 'fastTime1', label: 'Finish a level in under 60 seconds', type: 'fastTime', target: 60, reward: 25 },
];

export const DAILY_COUNT = 3;
