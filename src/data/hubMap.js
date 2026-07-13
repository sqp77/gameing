/*
 * MASAR
 * Owner: Saud Alqhtani
 * GitHub: sqp77
 * =============
 */

// Pure layout data for the persistent Open World Hub — a small, compact drivable city
// area (140m x 140m) connecting the three landmark buildings named in the v1.1.0 brief
// (Academy, License Center, Dealership) plus a scatter of job markers, one shared lane
// loop for ambient AI traffic + the police patrol, and a couple of short sidewalk paths
// for ambient pedestrians. Consumed by HubBuilder (geometry), HubTriggerManager
// (building/job proximity), HubTrafficManager (lane-following + pedestrians), and
// PoliceManager (patrol route) — kept as one small data file so the whole hub layout is
// tunable in one place, same spirit as world/levels.js for the campaign.

export const HUB_BOUNDS = { halfX: 70, halfZ: 70 };

// yaw = -PI/2 faces -Z (forward = {cos(yaw), sin(yaw)} = {0, -1}), i.e. from the south edge
// spawn toward the hub center/landmarks — matches the {cos,sin} heading convention used
// throughout world/levels.js and PhysicsManager.
export const HUB_CAR_START = { x: 0, z: 56, yaw: -Math.PI / 2 };

// Trigger radius is the "drive close enough" distance HubTriggerManager checks against;
// labelKey/descKey are i18n keys (see data/strings.js).
export const HUB_LANDMARKS = [
  {
    id: 'academy',
    x: -42,
    z: -42,
    radius: 9,
    labelKey: 'hub.academy.name',
    descKey: 'hub.academy.desc',
    action: 'openAcademy',
  },
  {
    id: 'licenseCenter',
    x: 42,
    z: -42,
    radius: 9,
    labelKey: 'hub.license.name',
    descKey: 'hub.license.desc',
    action: 'openLicense',
  },
  {
    id: 'dealership',
    x: -42,
    z: 42,
    radius: 9,
    labelKey: 'hub.shop.name',
    descKey: 'hub.shop.desc',
    action: 'openShop',
  },
];

// Free-standing job markers scattered away from the landmarks — HubTriggerManager assigns
// a randomized job (see data/jobs.js) to whichever markers are currently idle.
export const HUB_JOB_MARKERS = [
  { id: 'job-0', x: 0, z: 0, radius: 7 },
  { id: 'job-1', x: 26, z: -18, radius: 7 },
  { id: 'job-2', x: -26, z: 18, radius: 7 },
  { id: 'job-3', x: 20, z: 26, radius: 7 },
  { id: 'job-4', x: -20, z: -26, radius: 7 },
];

// One shared one-way loop (rectangle with midpoints) reused by every ambient civilian car
// and the police patrol car, each at a different phase offset — cheap (one path, many
// followers) and still reads as real lane-following traffic. Corner nodes are flagged
// `stop: true` to simulate intersections (followers dwell briefly there).
export const HUB_LANE_LOOP = [
  { x: -50, z: -50, stop: true },
  { x: 0, z: -50 },
  { x: 50, z: -50, stop: true },
  { x: 50, z: 0 },
  { x: 50, z: 50, stop: true },
  { x: 0, z: 50 },
  { x: -50, z: 50, stop: true },
  { x: -50, z: 0 },
];

export const HUB_PATROL_ROUTE = HUB_LANE_LOOP;

// Short back-and-forth sidewalk segments for ambient pedestrians (Dynamic City Life) —
// reuses the same two-point ping-pong walker as the campaign TrafficManager's pedestrians.
// v1.2.0: the two paths that already sit at a landmark's edge are tagged with a `role` so
// HubTrafficManager spawns a recolored variant (see entities/Pedestrian.js) there instead of a
// plain civilian — paths without `role` are unaffected (still the default civilian look).
export const HUB_PEDESTRIAN_PATHS = [
  { from: { x: -47, z: -40 }, to: { x: -33, z: -40 }, role: 'trainee' }, // academy edge
  { from: { x: 33, z: -40 }, to: { x: 47, z: -40 } },
  { from: { x: -47, z: 40 }, to: { x: -33, z: 40 }, role: 'attendant' }, // dealership edge
  { from: { x: -10, z: 4 }, to: { x: 10, z: 4 } },
];

// A handful of always-idle cosmetic cars near the dealership (Dynamic City Life's
// "animated parking lot") — visual-only, never registered with PhysicsManager.
export const HUB_DEALERSHIP_LOT = {
  center: { x: -30, z: 50 },
  slots: [
    { x: -34, z: 48, heading: 0 },
    { x: -30, z: 48, heading: 0 },
    { x: -26, z: 48, heading: 0 },
  ],
};

export const HUB_THEME_ID = 'riyadh';

export function isHubBuildingId(id) {
  return HUB_LANDMARKS.some((l) => l.id === id);
}
