export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Frame-rate independent damping lerp (Freya Holmer's exponential decay)
export function damp(a, b, lambda, dt) {
  return lerp(a, b, 1 - Math.exp(-lambda * dt));
}

export function shortestAngleDelta(from, to) {
  let delta = (to - from) % (Math.PI * 2);
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

export function normalizeAngle(angle) {
  let a = angle % (Math.PI * 2);
  if (a > Math.PI) a -= Math.PI * 2;
  if (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

export function radToDeg(rad) {
  return (rad * 180) / Math.PI;
}

export function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

// Two-point ping-pong walk: returns the position/heading for a cycle of period
// `2 * |p1-p0| / speed`, offset by `phaseOffset` (seconds). Same math TrafficManager's
// pedestrian/cart/cone agents already use inline — pulled out here so the hub's ambient
// pedestrians (HubTrafficManager) can reuse it without duplicating the formula, while
// TrafficManager itself is left untouched.
export function pingPongWalk(elapsed, phaseOffset, p0, p1, speed) {
  const length = Math.max(0.001, Math.hypot(p1.x - p0.x, p1.z - p0.z));
  const cycleTime = (2 * length) / speed;
  const t = (elapsed + phaseOffset) % cycleTime;
  const half = cycleTime / 2;
  const forward = t < half;
  const legT = forward ? t / half : (cycleTime - t) / half;
  const x = lerp(p0.x, p1.x, legT);
  const z = lerp(p0.z, p1.z, legT);
  const dx = p1.x - p0.x;
  const dz = p1.z - p0.z;
  const heading = forward ? Math.atan2(dz, dx) : Math.atan2(-dz, -dx);
  return { x, z, heading };
}

// Seeded PRNG (mulberry32) for deterministic level generation
export function makeSeededRandom(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
