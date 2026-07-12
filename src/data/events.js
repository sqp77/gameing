/*
 * MASAR
 * Owner: Saud Alqhtani
 * GitHub: sqp77
 * =============
 */

// Pure data for the 3 optional national events, mirrors data/achievements.js's "data stays
// separate from evaluation logic" convention — systems/EventManager.js does the date matching.
// `name` is an i18n key (see data/strings.js). `accent` recolors streetlights/flags for the
// duration (see WorldBuilder.build()'s eventAccent handling); `coinBonusPct` is a flat bonus
// applied to a level's coin reward while the event is active (see GameManager).
// Month is 1-12. `wraps` marks a range that crosses the New Year (start month > end month).
export const NATIONAL_EVENTS = [
  {
    id: 'nationalDay',
    name: 'event.nationalDay.name',
    accent: 0x1fae5c,
    coinBonusPct: 25,
    start: { month: 9, day: 22 },
    end: { month: 9, day: 24 },
  },
  {
    id: 'foundingDay',
    name: 'event.foundingDay.name',
    accent: 0x1fae5c,
    coinBonusPct: 20,
    start: { month: 2, day: 21 },
    end: { month: 2, day: 23 },
  },
  {
    id: 'riyadhSeason',
    name: 'event.riyadhSeason.name',
    accent: 0xffb020,
    coinBonusPct: 15,
    start: { month: 10, day: 1 },
    end: { month: 3, day: 31 },
    wraps: true,
  },
];
