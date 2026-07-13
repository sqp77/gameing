/*
 * MASAR
 * Owner: Saud Alqhtani
 * GitHub: sqp77
 * =============
 */

import { lerp } from '../utils/MathUtils.js';

// v1.2.0 Day/Night Cycle — a single pure function shared by HubBuilder (the only place a live
// time-of-day makes sense; campaign/Academy/License levels keep their fixed per-level
// `theme.night` boolean, untouched). Returns continuous 0..1 factors rather than a boolean so
// callers can lerp lighting smoothly instead of snapping between two states.
//
// Cycle layout (fraction of `cycleLengthSec`): 0-0.15 sunrise, 0.15-0.45 day, 0.45-0.6 sunset,
// 0.6-1.0 night. `sunFactor`/`ambientFactor` multiply the theme's own sunIntensity/
// ambientIntensity (so day/night still respects each Saudi city theme's palette); `lampOn`/
// `headlightsOn` are 0..1 the same way.
export function computeDayNightState(elapsedSec, cycleLengthSec = 480) {
  const t = ((elapsedSec % cycleLengthSec) + cycleLengthSec) % cycleLengthSec;
  const p = t / cycleLengthSec;

  let phase;
  let sunFactor;
  let ambientFactor;
  let lampOn;

  if (p < 0.15) {
    phase = 'sunrise';
    const k = p / 0.15;
    sunFactor = lerp(0.35, 1, k);
    ambientFactor = lerp(0.4, 1, k);
    lampOn = 1 - k;
  } else if (p < 0.45) {
    phase = 'day';
    sunFactor = 1;
    ambientFactor = 1;
    lampOn = 0;
  } else if (p < 0.6) {
    phase = 'sunset';
    const k = (p - 0.45) / 0.15;
    sunFactor = lerp(1, 0.35, k);
    ambientFactor = lerp(1, 0.4, k);
    lampOn = k;
  } else {
    phase = 'night';
    sunFactor = 0.35;
    ambientFactor = 0.4;
    lampOn = 1;
  }

  return { phase, sunFactor, ambientFactor, lampOn, headlightsOn: lampOn };
}
