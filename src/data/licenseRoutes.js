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

// v1.1.0 Expanded License Program (Feature 6): the original 3 routes become the "beginner"
// tier — unchanged, still immediately playable, preserving existing behavior exactly — with
// three new tiers above it, each 3 routes tougher than the last (tighter tolerance, fewer
// allowed collisions, higher minimum accuracy, shorter time limits), gated in sequence via
// SaveManager#isLicenseTierUnlocked. `LICENSE_TIER_IDS` order is the gating order.
export const LICENSE_TIER_IDS = ['beginner', 'intermediate', 'advanced', 'professional'];

export const LICENSE_ROUTES = [
  {
    id: 'route1',
    tier: 'beginner',
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
    tier: 'beginner',
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
    tier: 'beginner',
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
  {
    id: 'route4',
    tier: 'intermediate',
    totalTimeLimit: 170,
    maxCollisions: 1,
    minAccuracy: 0.72,
    legs: [
      () => perpendicularStage({ seed: 6100, theme: 'dammam', width: 2.4, depth: 5.0, gap: 0.4, time: 0, tolerance: degToRad(11), signIds: ['parking', 'caution'] }),
      () => parallelStage({ seed: 6101, theme: 'dammam', width: 2.3, depth: 5.2, gap: 0.35, time: 0, tolerance: degToRad(11), signIds: ['oneWay', 'parking'] }),
      () =>
        perpendicularStage({
          seed: 6102,
          theme: 'dammam',
          width: 2.2,
          depth: 4.8,
          gap: 0.3,
          time: 0,
          requireReverse: true,
          tolerance: degToRad(10),
          signIds: ['noParking', 'caution'],
        }),
    ],
  },
  {
    id: 'route5',
    tier: 'intermediate',
    totalTimeLimit: 160,
    maxCollisions: 1,
    minAccuracy: 0.75,
    legs: [
      () => perpendicularStage({ seed: 6110, theme: 'jeddah', width: 2.3, depth: 4.9, gap: 0.35, time: 0, tolerance: degToRad(10), decoys: 1, signIds: ['parking', 'noParking'] }),
      () => parallelStage({ seed: 6111, theme: 'jeddah', width: 2.2, depth: 5.0, gap: 0.3, time: 0, tolerance: degToRad(10), signIds: ['noParking', 'oneWay'] }),
      () =>
        perpendicularStage({
          seed: 6112,
          theme: 'jeddah',
          width: 2.15,
          depth: 4.7,
          gap: 0.28,
          time: 0,
          requireReverse: true,
          tolerance: degToRad(9),
          extraCone: true,
          signIds: ['caution', 'parking'],
        }),
    ],
  },
  {
    id: 'route6',
    tier: 'intermediate',
    totalTimeLimit: 150,
    maxCollisions: 0,
    minAccuracy: 0.8,
    legs: [
      () => perpendicularStage({ seed: 6120, theme: 'khobar', width: 2.2, depth: 4.8, gap: 0.3, time: 0, tolerance: degToRad(9), signIds: ['noParking', 'caution'] }),
      () => parallelStage({ seed: 6121, theme: 'khobar', width: 2.15, depth: 4.9, gap: 0.28, time: 0, tolerance: degToRad(9), signIds: ['oneWay', 'noParking'] }),
      () =>
        perpendicularStage({
          seed: 6122,
          theme: 'khobar',
          width: 2.1,
          depth: 4.6,
          gap: 0.25,
          time: 0,
          requireReverse: true,
          tolerance: degToRad(8),
          decoys: 1,
          signIds: ['caution', 'noParking'],
        }),
    ],
  },
  {
    id: 'route7',
    tier: 'advanced',
    totalTimeLimit: 140,
    maxCollisions: 0,
    minAccuracy: 0.82,
    legs: [
      () => perpendicularStage({ seed: 6200, theme: 'alula', width: 2.15, depth: 4.7, gap: 0.28, time: 0, tolerance: degToRad(8), decoys: 1, signIds: ['parking', 'caution'] }),
      () => parallelStage({ seed: 6201, theme: 'alula', width: 2.1, depth: 4.8, gap: 0.25, time: 0, tolerance: degToRad(8), signIds: ['noParking', 'oneWay'] }),
      () =>
        perpendicularStage({
          seed: 6202,
          theme: 'alula',
          width: 2.05,
          depth: 4.6,
          gap: 0.22,
          time: 0,
          requireReverse: true,
          tolerance: degToRad(7),
          extraCone: true,
          signIds: ['caution', 'noParking'],
        }),
    ],
  },
  {
    id: 'route8',
    tier: 'advanced',
    totalTimeLimit: 130,
    maxCollisions: 0,
    minAccuracy: 0.85,
    legs: [
      () => perpendicularStage({ seed: 6210, theme: 'neom', width: 2.1, depth: 4.6, gap: 0.25, time: 0, tolerance: degToRad(7), decoys: 1, signIds: ['noParking', 'caution'] }),
      () => parallelStage({ seed: 6211, theme: 'neom', width: 2.05, depth: 4.7, gap: 0.22, time: 0, tolerance: degToRad(7), signIds: ['oneWay', 'noParking'] }),
      () =>
        perpendicularStage({
          seed: 6212,
          theme: 'neom',
          width: 2.0,
          depth: 4.5,
          gap: 0.2,
          time: 0,
          requireReverse: true,
          tolerance: degToRad(6),
          extraCone: true,
          signIds: ['caution', 'parking'],
        }),
    ],
  },
  {
    id: 'route9',
    tier: 'advanced',
    totalTimeLimit: 125,
    maxCollisions: 0,
    minAccuracy: 0.87,
    legs: [
      () => perpendicularStage({ seed: 6220, theme: 'riyadh', width: 2.05, depth: 4.5, gap: 0.22, time: 0, tolerance: degToRad(6), decoys: 1, signIds: ['parking', 'noParking'] }),
      () => parallelStage({ seed: 6221, theme: 'riyadh', width: 2.0, depth: 4.6, gap: 0.2, time: 0, tolerance: degToRad(6), signIds: ['noParking', 'oneWay'] }),
      () =>
        perpendicularStage({
          seed: 6222,
          theme: 'riyadh',
          width: 1.95,
          depth: 4.4,
          gap: 0.18,
          time: 0,
          requireReverse: true,
          tolerance: degToRad(6),
          extraCone: true,
          decoys: 1,
          signIds: ['caution', 'noParking'],
        }),
    ],
  },
  {
    id: 'route10',
    tier: 'professional',
    totalTimeLimit: 115,
    maxCollisions: 0,
    minAccuracy: 0.9,
    legs: [
      () => perpendicularStage({ seed: 6300, theme: 'dammam', width: 2.0, depth: 4.4, gap: 0.2, time: 0, tolerance: degToRad(6), decoys: 2, signIds: ['parking', 'caution'] }),
      () => parallelStage({ seed: 6301, theme: 'dammam', width: 1.95, depth: 4.5, gap: 0.18, time: 0, tolerance: degToRad(6), signIds: ['oneWay', 'parking'] }),
      () =>
        perpendicularStage({
          seed: 6302,
          theme: 'dammam',
          width: 1.9,
          depth: 4.3,
          gap: 0.16,
          time: 0,
          requireReverse: true,
          tolerance: degToRad(5),
          extraCone: true,
          decoys: 1,
          signIds: ['noParking', 'caution'],
        }),
    ],
  },
  {
    id: 'route11',
    tier: 'professional',
    totalTimeLimit: 105,
    maxCollisions: 0,
    minAccuracy: 0.92,
    legs: [
      () => perpendicularStage({ seed: 6310, theme: 'khobar', width: 1.95, depth: 4.3, gap: 0.18, time: 0, tolerance: degToRad(5), decoys: 2, signIds: ['noParking', 'parking'] }),
      () => parallelStage({ seed: 6311, theme: 'khobar', width: 1.9, depth: 4.4, gap: 0.16, time: 0, tolerance: degToRad(5), signIds: ['oneWay', 'noParking'] }),
      () =>
        perpendicularStage({
          seed: 6312,
          theme: 'khobar',
          width: 1.85,
          depth: 4.2,
          gap: 0.15,
          time: 0,
          requireReverse: true,
          tolerance: degToRad(5),
          extraCone: true,
          decoys: 1,
          signIds: ['caution', 'noParking'],
        }),
    ],
  },
  {
    id: 'route12',
    tier: 'professional',
    totalTimeLimit: 95,
    maxCollisions: 0,
    minAccuracy: 0.95,
    legs: [
      () => perpendicularStage({ seed: 6320, theme: 'neom', width: 1.9, depth: 4.2, gap: 0.16, time: 0, tolerance: degToRad(4), decoys: 2, signIds: ['parking', 'caution'] }),
      () => parallelStage({ seed: 6321, theme: 'neom', width: 1.85, depth: 4.3, gap: 0.15, time: 0, tolerance: degToRad(4), signIds: ['noParking', 'oneWay'] }),
      () =>
        perpendicularStage({
          seed: 6322,
          theme: 'neom',
          width: 1.8,
          depth: 4.1,
          gap: 0.14,
          time: 0,
          requireReverse: true,
          tolerance: degToRad(4),
          extraCone: true,
          decoys: 2,
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
