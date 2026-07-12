/*
 * MASAR
 * Owner: Saud Alqhtani
 * GitHub: sqp77
 * =============
 */

// Pure data, mirrors achievements.js's "data stays separate from evaluation logic" convention.
// `type` drives SaveManager.updateDailyProgress(); `target` is a level-count goal for 'complete'
// and a seconds threshold for 'fastTime' (all other types complete on a single qualifying run).
// `label` is an i18n key (see data/strings.js), passed through I18n#t() at display time.
export const CHALLENGE_POOL = [
  { id: 'complete1', label: 'challenge.complete1', type: 'complete', target: 1, reward: 20 },
  { id: 'complete3', label: 'challenge.complete3', type: 'complete', target: 3, reward: 40 },
  { id: 'noCollision1', label: 'challenge.noCollision1', type: 'noCollision', target: 1, reward: 25 },
  { id: 'threeStar1', label: 'challenge.threeStar1', type: 'threeStar', target: 1, reward: 30 },
  { id: 'fastTime1', label: 'challenge.fastTime1', type: 'fastTime', target: 60, reward: 25 },
];

// Event-only challenges, merged into the daily pool only while a national event is active
// (see systems/EventManager.js) — kept in a separate array so SaveManager's daily-pick logic
// stays a single flat pool regardless of caller.
export const EVENT_CHALLENGE_POOL = [
  { id: 'eventNationalDay', label: 'challenge.event.nationalDay', type: 'complete', target: 1, reward: 35, eventId: 'nationalDay' },
  { id: 'eventFoundingDay', label: 'challenge.event.foundingDay', type: 'complete', target: 1, reward: 35, eventId: 'foundingDay' },
  { id: 'eventRiyadhSeason', label: 'challenge.event.riyadhSeason', type: 'complete', target: 1, reward: 35, eventId: 'riyadhSeason' },
];

export const DAILY_COUNT = 3;
