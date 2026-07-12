/*
 * MASAR
 * Owner: Saud Alqhtani
 * GitHub: sqp77
 * =============
 */

// Data-driven definitions for the MASAR Driving Academy's 5 modules. Mirrors world/levels.js's
// "hand-authored teaching arc, generated per-stage from a difficulty table" approach, reusing the
// exact same spot/obstacle-construction helpers levels.js already exports (makeSpot,
// flankSideBySide, flankFrontBack, poseToBox, computeBounds, perpendicularHeading) so this file
// adds zero new parking-geometry math. Each stage is a level-config object shaped identically to
// what world/levels.js#getLevelConfig returns, fed through the exact same
// WorldBuilder/ParkingManager/ScoreManager pipeline as the 20-level campaign (see
// GameManager#startAcademyModule). Themed with the Saudi city-inspired presets (world/themes.js)
// that the 20-level campaign never uses, and sprinkled with 2 bilingual regulatory road signs per
// stage (data/roadSigns.js) — never more, per the "don't overcrowd the scene" brief.
import { degToRad, makeSeededRandom } from '../utils/MathUtils.js';
import {
  makeSpot,
  poseToBox,
  flankSideBySide,
  flankFrontBack,
  computeBounds,
  perpendicularHeading,
  AISLE_HALF_WIDTH,
  PARALLEL_LANE_OFFSET,
} from '../world/levels.js';

const CAR_START = { x: -17, z: 0, yaw: 0 };

function signsAround(anchor, idA, idB) {
  return [
    { x: anchor.x - 6, z: -(AISLE_HALF_WIDTH + 1.6), id: idA },
    { x: anchor.x + 4, z: AISLE_HALF_WIDTH + 1.6, id: idB },
  ];
}

// One straight-in perpendicular row (optionally with decoys) — covers Driving Basics,
// Reverse Parking, and Perpendicular Parking modules, which differ only in `requireReverse`/
// tolerance/decoy count. Exported for reuse by data/licenseRoutes.js's maneuver legs, so the
// License Test never duplicates this construction logic.
export function perpendicularStage({ seed, theme, width, depth, gap, time, requireReverse = false, tolerance, decoys = 0, extraCone = false, signIds }) {
  const rng = makeSeededRandom(seed);
  const heading = perpendicularHeading(true);
  const totalSlots = decoys + 1;
  const targetSlot = decoys > 0 ? Math.floor(rng() * totalSlots) : 0;
  const spacing = width + gap + 1.6;
  const rowStartX = 10 - ((totalSlots - 1) * spacing) / 2;
  const spots = [];
  const obstacles = [];
  for (let i = 0; i < totalSlots; i++) {
    const x = rowStartX + i * spacing;
    const s = makeSpot({
      id: `s${i}`,
      x,
      z: AISLE_HALF_WIDTH + depth / 2 + 0.4,
      heading,
      width,
      depth,
      type: 'perpendicular',
      requireReverse,
      tolerance,
      isTarget: i === targetSlot,
    });
    spots.push(s);
    const sides = i === 0 ? ['right'] : i === totalSlots - 1 ? ['left'] : ['left', 'right'];
    obstacles.push(...flankSideBySide(s, rng, { gap, sides }));
  }
  const target = spots[targetSlot];
  if (extraCone) {
    obstacles.push(poseToBox('cone', target.x - Math.cos(target.heading) * 3.2, target.z - Math.sin(target.heading) * 3.2, 0, 1.4, 1.4));
  }
  return {
    id: `academy-${seed}`,
    theme,
    night: false,
    timeLimit: time,
    seed,
    carStart: CAR_START,
    spots,
    obstacles,
    traffic: {},
    signs: signsAround(target, signIds[0], signIds[1]),
    objective: decoys > 0 ? 'objective.decoys' : requireReverse ? 'objective.requireReverse' : 'objective.default',
    bounds: computeBounds(CAR_START, spots, obstacles),
  };
}

// One parallel bay — covers the Parallel Parking module. Also exported for data/licenseRoutes.js.
export function parallelStage({ seed, theme, width, depth, gap, time, tolerance, signIds }) {
  const rng = makeSeededRandom(seed);
  const spot = makeSpot({ id: 's0', x: 10, z: PARALLEL_LANE_OFFSET + width / 2, heading: 0, width, depth, type: 'parallel', tolerance });
  const obstacles = flankFrontBack(spot, rng, { gap });
  return {
    id: `academy-${seed}`,
    theme,
    night: false,
    timeLimit: time,
    seed,
    carStart: CAR_START,
    spots: [spot],
    obstacles,
    traffic: {},
    signs: signsAround(spot, signIds[0], signIds[1]),
    objective: 'objective.parallel',
    bounds: computeBounds(CAR_START, [spot], obstacles),
  };
}

// id/nameKey/stageCount metadata for UI listing (Academy screen), stage builders resolved lazily
// via getAcademyStageConfig — same "metadata separate from build-time config" split as levels.js's
// PROCEDURAL_TABLE vs getLevelConfig.
export const ACADEMY_MODULES = [
  { id: 'basics', nameKey: 'academy.module.basics', stageCount: 2 },
  { id: 'perpendicular', nameKey: 'academy.module.perpendicular', stageCount: 3 },
  { id: 'parallel', nameKey: 'academy.module.parallel', stageCount: 3 },
  { id: 'reverse', nameKey: 'academy.module.reverse', stageCount: 3 },
  { id: 'precision', nameKey: 'academy.module.precision', stageCount: 3 },
];

const STAGE_BUILDERS = {
  basics: [
    () => perpendicularStage({ seed: 5000, theme: 'riyadh', width: 3.2, depth: 5.8, gap: 1.2, time: 160, signIds: ['caution', 'entrance'] }),
    () => perpendicularStage({ seed: 5001, theme: 'riyadh', width: 2.8, depth: 5.4, gap: 0.8, time: 130, signIds: ['parking', 'exit'] }),
  ],
  perpendicular: [
    () => perpendicularStage({ seed: 5010, theme: 'dammam', width: 2.9, depth: 5.5, gap: 0.6, time: 130, signIds: ['parking', 'entrance'] }),
    () => perpendicularStage({ seed: 5011, theme: 'dammam', width: 2.6, depth: 5.2, gap: 0.45, time: 110, signIds: ['parking', 'caution'] }),
    () => perpendicularStage({ seed: 5012, theme: 'dammam', width: 2.3, depth: 4.9, gap: 0.35, time: 95, decoys: 1, signIds: ['noParking', 'parking'] }),
  ],
  parallel: [
    () => parallelStage({ seed: 5020, theme: 'jeddah', width: 2.8, depth: 6.2, gap: 0.7, time: 150, signIds: ['parking', 'oneWay'] }),
    () => parallelStage({ seed: 5021, theme: 'jeddah', width: 2.6, depth: 5.6, gap: 0.5, time: 120, signIds: ['parking', 'noParking'] }),
    () => parallelStage({ seed: 5022, theme: 'jeddah', width: 2.3, depth: 5.1, gap: 0.3, time: 100, signIds: ['oneWay', 'caution'] }),
  ],
  reverse: [
    () =>
      perpendicularStage({
        seed: 5030,
        theme: 'khobar',
        width: 2.8,
        depth: 5.4,
        gap: 0.6,
        time: 140,
        requireReverse: true,
        signIds: ['caution', 'noParking'],
      }),
    () =>
      perpendicularStage({
        seed: 5031,
        theme: 'khobar',
        width: 2.5,
        depth: 5.1,
        gap: 0.45,
        time: 120,
        requireReverse: true,
        signIds: ['caution', 'parking'],
      }),
    () =>
      perpendicularStage({
        seed: 5032,
        theme: 'khobar',
        width: 2.3,
        depth: 4.9,
        gap: 0.35,
        time: 100,
        requireReverse: true,
        extraCone: true,
        signIds: ['noParking', 'caution'],
      }),
  ],
  precision: [
    () =>
      perpendicularStage({
        seed: 5040,
        theme: 'alula',
        width: 2.35,
        depth: 4.9,
        gap: 0.4,
        time: 100,
        tolerance: degToRad(12),
        signIds: ['noParking', 'caution'],
      }),
    () =>
      perpendicularStage({
        seed: 5041,
        theme: 'alula',
        width: 2.2,
        depth: 4.75,
        gap: 0.3,
        time: 90,
        tolerance: degToRad(9),
        signIds: ['parking', 'caution'],
      }),
    () =>
      perpendicularStage({
        seed: 5042,
        theme: 'alula',
        width: 2.1,
        depth: 4.6,
        gap: 0.25,
        time: 85,
        tolerance: degToRad(7),
        extraCone: true,
        signIds: ['noParking', 'parking'],
      }),
  ],
};

export function getAcademyStageConfig(moduleId, stageIndex) {
  const builders = STAGE_BUILDERS[moduleId];
  if (!builders) return null;
  const clamped = Math.min(Math.max(0, stageIndex), builders.length - 1);
  return builders[clamped]();
}
