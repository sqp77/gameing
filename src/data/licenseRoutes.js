/*
 * MASAR
 * Owner: Saud Alqhtani
 * GitHub: sqp77
 * =============
 */

// Data-driven definitions for the 3 MASAR Driving Test routes. Each route is an ordered array of
// "legs" — reusing data/academyLevels.js's perpendicularStage/parallelStage builders verbatim, so
// this file adds no new parking-geometry construction — plus a pass/fail rubric. GameManager
// (see startLicenseTest/_advanceLicenseLeg) runs the legs back-to-back inside one timed session:
// one ScoreManager countdown/collision-counter for the whole route rather than per leg, and the
// final leg's completion evaluates `{ timeRemaining > 0, collisions <= maxCollisions,
// averageAccuracy >= minAccuracy }` for the overall pass/fail.
import { degToRad } from '../utils/MathUtils.js';
import { perpendicularStage, parallelStage } from './academyLevels.js';

export const LICENSE_ROUTES = [
  {
    id: 'route1',
    totalTimeLimit: 240,
    maxCollisions: 2,
    minAccuracy: 0.55,
    legs: [
      () => perpendicularStage({ seed: 6000, theme: 'riyadh', width: 2.8, depth: 5.4, gap: 0.6, time: 0, signIds: ['parking', 'entrance'] }),
      () => parallelStage({ seed: 6001, theme: 'riyadh', width: 2.6, depth: 5.6, gap: 0.5, time: 0, signIds: ['oneWay', 'parking'] }),
      () =>
        perpendicularStage({
          seed: 6002,
          theme: 'riyadh',
          width: 2.5,
          depth: 5.1,
          gap: 0.45,
          time: 0,
          requireReverse: true,
          signIds: ['caution', 'noParking'],
        }),
    ],
  },
  {
    id: 'route2',
    totalTimeLimit: 200,
    maxCollisions: 1,
    minAccuracy: 0.65,
    legs: [
      () => perpendicularStage({ seed: 6010, theme: 'jeddah', width: 2.6, depth: 5.2, gap: 0.5, time: 0, signIds: ['parking', 'caution'] }),
      () => parallelStage({ seed: 6011, theme: 'khobar', width: 2.4, depth: 5.3, gap: 0.35, time: 0, signIds: ['noParking', 'oneWay'] }),
      () =>
        perpendicularStage({
          seed: 6012,
          theme: 'khobar',
          width: 2.3,
          depth: 4.9,
          gap: 0.35,
          time: 0,
          requireReverse: true,
          extraCone: true,
          signIds: ['caution', 'parking'],
        }),
    ],
  },
  {
    id: 'route3',
    totalTimeLimit: 180,
    maxCollisions: 0,
    minAccuracy: 0.75,
    legs: [
      () =>
        perpendicularStage({ seed: 6020, theme: 'neom', width: 2.3, depth: 4.9, gap: 0.35, time: 0, tolerance: degToRad(10), signIds: ['noParking', 'caution'] }),
      () =>
        parallelStage({ seed: 6021, theme: 'neom', width: 2.2, depth: 5.0, gap: 0.25, time: 0, tolerance: degToRad(10), signIds: ['oneWay', 'noParking'] }),
      () =>
        perpendicularStage({
          seed: 6022,
          theme: 'neom',
          width: 2.1,
          depth: 4.7,
          gap: 0.25,
          time: 0,
          requireReverse: true,
          tolerance: degToRad(9),
          extraCone: true,
          signIds: ['caution', 'noParking'],
        }),
    ],
  },
];

export function getLicenseRoute(routeId) {
  return LICENSE_ROUTES.find((r) => r.id === routeId) || null;
}

export function getLicenseLegConfig(routeId, legIndex) {
  const route = getLicenseRoute(routeId);
  if (!route) return null;
  const clamped = Math.min(Math.max(0, legIndex), route.legs.length - 1);
  return route.legs[clamped]();
}
