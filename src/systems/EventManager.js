/*
 * MASAR
 * Owner: Saud Alqhtani
 * GitHub: sqp77
 * =============
 */

import { NATIONAL_EVENTS } from '../data/events.js';

function toOrdinal({ month, day }) {
  return month * 100 + day;
}

// Pure date-range lookup, no dependencies, no state — GameManager calls this once per menu/level
// start (never per-frame) and only applies its result when `settings.eventsEnabled` is true, so
// a disabled or dateless call site is a complete no-op. `wraps` events (Riyadh Season, Oct-Mar)
// are matched as "on or after start OR on or before end" instead of a plain between-check.
export function getActiveEvent(date = new Date(), events = NATIONAL_EVENTS) {
  const cur = toOrdinal({ month: date.getMonth() + 1, day: date.getDate() });
  for (const ev of events) {
    const start = toOrdinal(ev.start);
    const end = toOrdinal(ev.end);
    const inRange = ev.wraps ? cur >= start || cur <= end : cur >= start && cur <= end;
    if (inRange) return ev;
  }
  return null;
}
