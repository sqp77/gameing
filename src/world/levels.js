/*
 * MASAR
 * Owner: Saud Alqhtani
 * GitHub: sqp77
 * =============
 */

// Data-driven definitions for all 20 levels. A handful (1-6) are hand-placed to teach
// mechanics in order; 7-20 are generated from a difficulty table via a seeded RNG so
// obstacle placement varies slightly but stays deterministic per level id.
//
// Coordinate convention: yaw/heading 0 = facing world +X. All gameplay-critical
// geometry (target spot, decoy spots, nearby obstacles) is expressed as axis-aligned-
// in-local-space boxes: {x, z, angle, halfWidth, halfDepth} ready to hand straight to
// `new OBB2D(x, z, halfWidth, halfDepth, angle)`. `angle = heading - PI/2` so that the
// box's long (depth) axis points along `heading` — i.e. the direction a car's nose
// points when correctly parked in it.
import { degToRad, makeSeededRandom } from '../utils/MathUtils.js';
import { getTheme } from './themes.js';

export const AISLE_HALF_WIDTH = 4.2; // driving lane half-width running along the X axis at z=0
export const PARALLEL_LANE_OFFSET = 2.9; // lateral offset of a parallel bay's near edge from the lane center

export function poseToBox(type, x, z, heading, width, length, extra) {
  return { type, x, z, angle: heading - Math.PI / 2, halfWidth: width / 2, halfDepth: length / 2, ...extra };
}

export function makeSpot({ id, x, z, heading, width, depth, type = 'perpendicular', requireReverse = false, tolerance, isTarget = true, holdTime = 1.1 }) {
  const box = poseToBox('spot', x, z, heading, width, depth);
  return {
    ...box,
    spotId: id,
    heading,
    type,
    requireReverse,
    tolerance: tolerance ?? degToRad(type === 'parallel' ? 14 : 18),
    isTarget,
    holdTime,
  };
}

// Neighboring parked cars offset along the perpendicular axis (side-by-side row) —
// used for perpendicular/angled spots.
export function flankSideBySide(spot, rng, { gap = 0.5, carWidth = 1.9, carLength = 4.5, sides = ['left', 'right'] } = {}) {
  const perp = { x: -Math.sin(spot.heading), z: Math.cos(spot.heading) };
  const offset = spot.halfWidth + gap + carWidth / 2;
  const obstacles = [];
  for (const side of sides) {
    const sign = side === 'left' ? 1 : -1;
    const jitter = (rng() - 0.5) * 0.12;
    obstacles.push(
      poseToBox('parkedCar', spot.x + perp.x * offset * sign + jitter, spot.z + perp.z * offset * sign + jitter, spot.heading + (rng() - 0.5) * degToRad(2), carWidth, carLength)
    );
  }
  return obstacles;
}

// Neighboring parked cars offset along the heading axis (front/back) — used for
// parallel parking bays.
export function flankFrontBack(spot, rng, { gap = 0.4, carWidth = 1.9, carLength = 4.5 } = {}) {
  const fwd = { x: Math.cos(spot.heading), z: Math.sin(spot.heading) };
  const offset = spot.halfDepth + gap + carLength / 2;
  const obstacles = [];
  for (const sign of [1, -1]) {
    const jitter = (rng() - 0.5) * 0.1;
    obstacles.push(
      poseToBox('parkedCar', spot.x + fwd.x * offset * sign + jitter, spot.z + fwd.z * offset * sign + jitter, spot.heading, carWidth, carLength)
    );
  }
  return obstacles;
}

export function computeBounds(carStart, spots, obstacles, margin = 15) {
  const xs = [carStart.x, ...spots.map((s) => s.x), ...obstacles.map((o) => o.x)];
  const zs = [carStart.z, ...spots.map((s) => s.z), ...obstacles.map((o) => o.z)];
  const halfX = Math.max(...xs.map(Math.abs)) + margin;
  const halfZ = Math.max(...zs.map(Math.abs)) + margin + AISLE_HALF_WIDTH;
  return { halfX, halfZ };
}

export function perpendicularHeading(onPositiveZSide) {
  return onPositiveZSide ? Math.PI / 2 : -Math.PI / 2;
}

// ---------------------------------------------------------------------------
// Hand-authored levels 1-6: teach throttle/brake/steer, flanked parking,
// angled parking, and the first parallel-park in a controlled sequence.
// ---------------------------------------------------------------------------
function level1() {
  const heading = perpendicularHeading(true);
  const spot = makeSpot({ id: 'a', x: 6, z: AISLE_HALF_WIDTH + 2.9, heading, width: 3.0, depth: 5.6, holdTime: 0.9 });
  const carStart = { x: -14, z: 0, yaw: 0 };
  return {
    id: 1,
    theme: 'drivingSchool',
    night: false,
    timeLimit: 150,
    seed: 1001,
    carStart,
    spots: [spot],
    obstacles: [],
    objective: 'objective.level1',
    bounds: computeBounds(carStart, [spot], []),
  };
}

function level2() {
  const rng = makeSeededRandom(1002);
  const heading = perpendicularHeading(true);
  const spot = makeSpot({ id: 'a', x: 8, z: AISLE_HALF_WIDTH + 2.7, heading, width: 2.7, depth: 5.3 });
  const obstacles = flankSideBySide(spot, rng, { gap: 0.7 });
  const carStart = { x: -14, z: 0, yaw: 0 };
  return {
    id: 2,
    theme: 'mall',
    night: false,
    timeLimit: 130,
    seed: 1002,
    carStart,
    spots: [spot],
    obstacles,
    objective: 'objective.level2',
    bounds: computeBounds(carStart, [spot], obstacles),
  };
}

function level3() {
  const rng = makeSeededRandom(1003);
  const heading = Math.PI / 2 - degToRad(45);
  const spot = makeSpot({ id: 'a', x: 8, z: AISLE_HALF_WIDTH + 3.0, heading, width: 2.6, depth: 5.1, type: 'angled' });
  const obstacles = flankSideBySide(spot, rng, { gap: 0.65 });
  const carStart = { x: -14, z: 0, yaw: 0 };
  return {
    id: 3,
    theme: 'drivingSchool',
    night: false,
    timeLimit: 120,
    seed: 1003,
    carStart,
    spots: [spot],
    obstacles,
    objective: 'objective.level3',
    bounds: computeBounds(carStart, [spot], obstacles),
  };
}

function level4() {
  const rng = makeSeededRandom(1004);
  const heading = perpendicularHeading(true);
  const spot = makeSpot({ id: 'a', x: 9, z: AISLE_HALF_WIDTH + 2.6, heading, width: 2.45, depth: 5.0 });
  const obstacles = flankSideBySide(spot, rng, { gap: 0.45 });
  const carStart = { x: -15, z: 0, yaw: 0 };
  return {
    id: 4,
    theme: 'mall',
    night: false,
    timeLimit: 105,
    seed: 1004,
    carStart,
    spots: [spot],
    obstacles,
    objective: 'objective.level4',
    bounds: computeBounds(carStart, [spot], obstacles),
  };
}

function level5() {
  const rng = makeSeededRandom(1005);
  const heading = Math.PI / 2 - degToRad(45);
  const spot = makeSpot({ id: 'a', x: 9, z: AISLE_HALF_WIDTH + 2.9, heading, width: 2.5, depth: 4.9, type: 'angled' });
  const obstacles = [
    ...flankSideBySide(spot, rng, { gap: 0.5 }),
    poseToBox('cone', spot.x - Math.cos(spot.heading) * 3.2, spot.z - Math.sin(spot.heading) * 3.2, 0, 0.7, 0.7),
  ];
  const carStart = { x: -15, z: 0, yaw: 0 };
  return {
    id: 5,
    theme: 'airport',
    night: false,
    timeLimit: 100,
    seed: 1005,
    carStart,
    spots: [spot],
    obstacles,
    objective: 'objective.level5',
    bounds: computeBounds(carStart, [spot], obstacles),
  };
}

function level6() {
  const rng = makeSeededRandom(1006);
  const heading = 0;
  const spot = makeSpot({
    id: 'a',
    x: 10,
    z: PARALLEL_LANE_OFFSET + 1.35,
    heading,
    width: 2.7,
    depth: 6.4,
    type: 'parallel',
  });
  const obstacles = flankFrontBack(spot, rng, { gap: 0.55 });
  const carStart = { x: -16, z: 0, yaw: 0 };
  return {
    id: 6,
    theme: 'downtown',
    night: false,
    timeLimit: 130,
    seed: 1006,
    carStart,
    spots: [spot],
    obstacles,
    objective: 'objective.level6',
    bounds: computeBounds(carStart, [spot], obstacles),
  };
}

const HAND_LEVELS = { 1: level1, 2: level2, 3: level3, 4: level4, 5: level5, 6: level6 };

// ---------------------------------------------------------------------------
// Procedural levels 7-20, driven by a per-level difficulty table.
// ---------------------------------------------------------------------------
// `traffic` gives TrafficManager per-level obstacle density (see TrafficManager.js) — counts
// scale up gradually across 7-20 so the last few levels are noticeably busier than the first few.
// Hand-authored levels 1-6 intentionally have none, to keep the tutorial arc uncluttered.
const PROCEDURAL_TABLE = {
  7: { theme: 'airport', type: 'perpendicular', width: 2.5, depth: 5.2, gap: 0.55, decoys: 1, time: 100, traffic: { pedestrians: 1 } },
  8: { theme: 'downtown', type: 'parallel', width: 2.6, depth: 6.0, gap: 0.5, decoys: 0, time: 115, traffic: { pedestrians: 1 } },
  9: { theme: 'mall', type: 'angled', width: 2.45, depth: 5.0, gap: 0.5, decoys: 1, time: 95, traffic: { pedestrians: 1, carts: 1 } },
  10: { theme: 'airport', type: 'perpendicular', width: 2.3, depth: 4.9, gap: 0.4, decoys: 1, time: 90, barrier: true, traffic: { pedestrians: 1, crossers: 1 } },
  11: { theme: 'downtown', type: 'perpendicular', width: 2.5, depth: 5.1, gap: 0.5, decoys: 2, time: 95, traffic: { pedestrians: 2 } },
  12: { theme: 'drivingSchool', type: 'perpendicular', width: 2.4, depth: 5.0, gap: 0.45, decoys: 0, time: 100, requireReverse: true, traffic: { pedestrians: 1, crossers: 1 } },
  13: { theme: 'mall', type: 'parallel', width: 2.5, depth: 5.6, gap: 0.35, decoys: 0, time: 105, traffic: { pedestrians: 1, carts: 1 } },
  14: { theme: 'airport', type: 'angled', width: 2.35, depth: 4.9, gap: 0.4, decoys: 1, time: 95, requireReverse: true, traffic: { pedestrians: 2, crossers: 1 } },
  15: { theme: 'downtown', type: 'perpendicular', width: 2.3, depth: 4.9, gap: 0.4, decoys: 3, time: 90, traffic: { pedestrians: 2, carts: 1 } },
  16: { theme: 'mall', type: 'parallel', width: 2.4, depth: 5.3, gap: 0.3, decoys: 0, time: 100, traffic: { pedestrians: 1, crossers: 1 } },
  17: { theme: 'downtown', type: 'parallel', width: 2.4, depth: 5.6, gap: 0.35, decoys: 0, time: 100, requireReverse: true, night: true, traffic: { pedestrians: 2, crossers: 1 } },
  18: { theme: 'downtown', type: 'perpendicular', width: 2.25, depth: 4.8, gap: 0.35, decoys: 2, time: 85, night: true, traffic: { pedestrians: 2, crossers: 1, carts: 1 } },
  19: { theme: 'downtown', type: 'angled', width: 2.2, depth: 4.8, gap: 0.3, decoys: 1, time: 85, requireReverse: true, night: true, traffic: { pedestrians: 2, crossers: 2 } },
  20: { theme: 'downtown', type: 'parallel', width: 2.15, depth: 5.1, gap: 0.25, decoys: 1, time: 90, requireReverse: true, night: true, extraCones: true, traffic: { pedestrians: 3, crossers: 2, carts: 1, cones: 2 } },
};

function buildProceduralLevel(id) {
  const cfg = PROCEDURAL_TABLE[id];
  const rng = makeSeededRandom(1000 + id);
  const targetSlot = cfg.decoys > 0 ? Math.floor(rng() * (cfg.decoys + 1)) : 0;
  const spacing = cfg.width + cfg.gap + 1.6;
  const totalSlots = cfg.decoys + 1;
  const rowStartX = 10 - ((totalSlots - 1) * spacing) / 2;

  const spots = [];
  const obstacles = [];
  let approachX = -18 - id * 0.15;

  if (cfg.type === 'parallel') {
    const heading = 0;
    for (let i = 0; i < totalSlots; i++) {
      const x = rowStartX + i * (cfg.depth + cfg.gap + 1.4);
      const s = makeSpot({
        id: `s${i}`,
        x,
        z: PARALLEL_LANE_OFFSET + cfg.width / 2,
        heading,
        width: cfg.width,
        depth: cfg.depth,
        type: 'parallel',
        requireReverse: !!cfg.requireReverse,
        isTarget: i === targetSlot,
      });
      spots.push(s);
      obstacles.push(...flankFrontBack(s, rng, { gap: cfg.gap }));
    }
  } else {
    const heading = cfg.type === 'angled' ? Math.PI / 2 - degToRad(45) : perpendicularHeading(true);
    for (let i = 0; i < totalSlots; i++) {
      const x = rowStartX + i * spacing;
      const s = makeSpot({
        id: `s${i}`,
        x,
        z: AISLE_HALF_WIDTH + cfg.depth / 2 + 0.4,
        heading,
        width: cfg.width,
        depth: cfg.depth,
        type: cfg.type,
        requireReverse: !!cfg.requireReverse,
        isTarget: i === targetSlot,
      });
      spots.push(s);
      const sides = i === 0 ? ['right'] : i === totalSlots - 1 ? ['left'] : ['left', 'right'];
      obstacles.push(...flankSideBySide(s, rng, { gap: cfg.gap, sides }));
    }
    if (cfg.barrier) {
      const target = spots[targetSlot];
      const behind = { x: target.x + Math.cos(target.heading) * (cfg.depth / 2 + 0.9), z: target.z + Math.sin(target.heading) * (cfg.depth / 2 + 0.9) };
      obstacles.push(poseToBox('barrier', behind.x, behind.z, target.heading, 2.6, 0.3));
    }
  }

  if (cfg.extraCones) {
    for (let i = 0; i < 4; i++) {
      obstacles.push(poseToBox('cone', rowStartX - 4 + i * 2.6 + (rng() - 0.5) * 0.6, AISLE_HALF_WIDTH - 1.4, 0, 0.6, 0.6));
    }
  }

  const carStart = { x: approachX, z: 0, yaw: 0 };
  return {
    id,
    theme: cfg.theme,
    night: !!cfg.night,
    timeLimit: cfg.time,
    seed: 1000 + id,
    carStart,
    spots,
    obstacles,
    traffic: cfg.traffic || {},
    objective:
      cfg.decoys > 0
        ? 'objective.decoys'
        : cfg.requireReverse
          ? 'objective.requireReverse'
          : cfg.type === 'parallel'
            ? 'objective.parallel'
            : 'objective.default',
    bounds: computeBounds(carStart, spots, obstacles),
  };
}

export const LEVEL_COUNT = 20;

// Derives the display parking-type id (parallel/reverse/perpendicular/angled) from the
// target spot's own data — `requireReverse` takes priority over the base shape since a
// reverse-in challenge is presented as its own category regardless of bay shape. Exported so
// GameManager can resolve it for Academy/License leg configs, which don't go through
// getLevelConfig.
export function resolveParkingType(spots) {
  const target = spots.find((s) => s.isTarget) || spots[0];
  if (!target) return 'perpendicular';
  return target.requireReverse ? 'reverse' : target.type;
}

export function getLevelConfig(id) {
  const clamped = Math.min(Math.max(1, id), LEVEL_COUNT);
  const cfg = HAND_LEVELS[clamped] ? HAND_LEVELS[clamped]() : buildProceduralLevel(clamped);
  cfg.traffic = cfg.traffic || {};
  cfg.effectiveNight = cfg.night || getTheme(cfg.theme).night;
  cfg.parkingType = resolveParkingType(cfg.spots);
  return cfg;
}
