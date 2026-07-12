/*
 * MASAR
 * Owner: Saud Alqhtani
 * GitHub: sqp77
 * =============
 */

import { degToRad } from '../utils/MathUtils.js';

// Job System templates + difficulty-scaling table. Pure data/pure functions only (no THREE,
// no scene access) — JobManager is the stateful piece that turns a generated job descriptor
// into an actual ParkingManager spot / trigger pair inside the hub. Reward/time-limit scaling
// mirrors the academy-stage-index difficulty curve already used in data/academyLevels.js
// (tighter tolerance + shorter time + bigger payout as the driver levels up), just keyed off
// the player's driver level (utils/reputation.js#levelForXp) instead of a fixed stage index.

export const JOB_TYPES = {
  parking: { id: 'parking', nameKey: 'jobs.type.parking', descKey: 'jobs.desc.parking', baseCoins: 40, baseXp: 15, baseTimeLimit: 50 },
  delivery: { id: 'delivery', nameKey: 'jobs.type.delivery', descKey: 'jobs.desc.delivery', baseCoins: 55, baseXp: 20, baseTimeLimit: 75 },
  taxi: { id: 'taxi', nameKey: 'jobs.type.taxi', descKey: 'jobs.desc.taxi', baseCoins: 50, baseXp: 18, baseTimeLimit: 65 },
  valet: { id: 'valet', nameKey: 'jobs.type.valet', descKey: 'jobs.desc.valet', baseCoins: 60, baseXp: 22, baseTimeLimit: 55 },
};

export const JOB_TYPE_IDS = Object.keys(JOB_TYPES);

// Ordered lowest-first; bandForLevel returns the last band whose `minLevel` the driver clears —
// same "ordered tier, take the last match" shape as utils/reputation.js#rankForScore.
const DIFFICULTY_BANDS = [
  { minLevel: 1, timeMult: 1.15, rewardMult: 1.0, spotWidth: 3.0, spotTolerance: degToRad(18) },
  { minLevel: 4, timeMult: 1.0, rewardMult: 1.15, spotWidth: 2.6, spotTolerance: degToRad(14) },
  { minLevel: 8, timeMult: 0.88, rewardMult: 1.35, spotWidth: 2.35, spotTolerance: degToRad(10) },
  { minLevel: 13, timeMult: 0.75, rewardMult: 1.6, spotWidth: 2.15, spotTolerance: degToRad(7) },
];

export function bandForLevel(level) {
  let band = DIFFICULTY_BANDS[0];
  for (const b of DIFFICULTY_BANDS) {
    if (level >= b.minLevel) band = b;
    else break;
  }
  return band;
}

export function pickJobType(rng) {
  return JOB_TYPE_IDS[Math.floor(rng() * JOB_TYPE_IDS.length)];
}

// A pure descriptor — JobManager is responsible for turning `spotWidth`/`spotTolerance` into an
// actual makeSpot() OBB positioned at the marker, and `timeLimit`/`coins`/`xp` into HUD/save calls.
export function generateJob(typeId, level, markerId, rng) {
  const type = JOB_TYPES[typeId];
  const band = bandForLevel(level);
  return {
    id: `${typeId}-${markerId}-${Math.floor(rng() * 1e6)}`,
    type: typeId,
    markerId,
    timeLimit: Math.round(type.baseTimeLimit * band.timeMult),
    coins: Math.round(type.baseCoins * band.rewardMult),
    xp: Math.round(type.baseXp * band.rewardMult),
    spotWidth: band.spotWidth,
    spotDepth: 5.2,
    spotTolerance: band.spotTolerance,
  };
}

// Picks a dropoff point (for delivery/taxi/valet) from the combined marker+landmark pool,
// excluding the pickup marker itself, biased toward farther points as the driver levels up
// (higher level -> longer routes) by sampling from the top-N farthest candidates.
export function pickDropoff(candidates, pickup, level, rng) {
  const others = candidates.filter((c) => c.id !== pickup.id);
  if (!others.length) return pickup;
  const sorted = [...others].sort((a, b) => {
    const da = Math.hypot(a.x - pickup.x, a.z - pickup.z);
    const db = Math.hypot(b.x - pickup.x, b.z - pickup.z);
    return db - da;
  });
  const pool = level >= 8 ? sorted.slice(0, Math.max(1, Math.ceil(sorted.length / 2))) : sorted;
  return pool[Math.floor(rng() * pool.length)];
}
