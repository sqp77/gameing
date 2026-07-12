/*
 * MASAR
 * Owner: Saud Alqhtani
 * GitHub: sqp77
 * =============
 */

import * as THREE from 'three';
import { createCarModel } from '../entities/Car.js';
import { ROAD_SIGNS } from '../data/roadSigns.js';

// Shared, theme-driven scene-building primitives (ground/perimeter/buildings/trees/
// streetlights/signage/obstacles) extracted from WorldBuilder so both the per-level
// WorldBuilder and the persistent open-world HubBuilder can build from the same
// palette/geometry code instead of duplicating it. Every function here is a pure
// builder: it takes the THREE.Group (and PhysicsManager where colliders are needed)
// to add into and returns whatever the caller needs to track (lamp lights, flags,
// meshes) — no internal state is kept here.

export const OBSTACLE_CAR_COLORS = [0x8a8f97, 0x5c6470, 0x9c7a5a, 0x4a5568, 0x6b6f76, 0x7c8590, 0xa3b1c2];

export function mkBox(group, physics, w, h, d, x, y, z, mat, { collide, collideType } = {}) {
  const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  box.position.set(x, y, z);
  box.receiveShadow = true;
  box.castShadow = true;
  group.add(box);
  if (collide) physics.addCollider({ x, z, halfWidth: w / 2, halfDepth: d / 2, angle: 0 }, collideType);
  return box;
}

export function setupSkyAndLights(group, scene, theme) {
  scene.background = new THREE.Color(theme.night ? 0x0a1220 : theme.skyTop);
  scene.fog = new THREE.Fog(theme.night ? 0x0a1220 : theme.fogColor, theme.fogNear, theme.fogFar);

  const hemi = new THREE.HemisphereLight(theme.night ? 0x2a3550 : theme.skyTop, theme.ground, theme.ambientIntensity);
  group.add(hemi);

  const sun = new THREE.DirectionalLight(theme.sunColor, theme.night ? theme.sunIntensity * 0.35 : theme.sunIntensity);
  sun.position.set(-45, 65, 35);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1536, 1536);
  sun.shadow.camera.left = -70;
  sun.shadow.camera.right = 70;
  sun.shadow.camera.top = 70;
  sun.shadow.camera.bottom = -70;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 180;
  sun.shadow.bias = -0.0015;
  group.add(sun, sun.target);
}

export function buildGround(group, theme, halfX, halfZ) {
  const geo = new THREE.PlaneGeometry(halfX * 2 + 45, halfZ * 2 + 45);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({ color: theme.road, roughness: 0.95, metalness: 0.02 });
  const ground = new THREE.Mesh(geo, mat);
  ground.receiveShadow = true;
  group.add(ground);
  return ground;
}

export function buildPerimeter(group, physics, theme, halfX, halfZ) {
  const inset = 3.2;
  const curbHeight = 0.18;
  const curbThickness = 0.28;
  const sidewalkMat = new THREE.MeshStandardMaterial({ color: theme.sidewalk, roughness: 0.9 });
  const curbMat = new THREE.MeshStandardMaterial({ color: theme.curb, roughness: 0.8 });

  mkBox(group, physics, halfX * 2 + inset * 2, 0.1, inset, 0, 0.05, halfZ + inset / 2, sidewalkMat);
  mkBox(group, physics, halfX * 2 + inset * 2, 0.1, inset, 0, 0.05, -(halfZ + inset / 2), sidewalkMat);
  mkBox(group, physics, inset, 0.1, halfZ * 2, halfX + inset / 2, 0.05, 0, sidewalkMat);
  mkBox(group, physics, inset, 0.1, halfZ * 2, -(halfX + inset / 2), 0.05, 0, sidewalkMat);

  mkBox(group, physics, halfX * 2, curbHeight, curbThickness, 0, curbHeight / 2, halfZ, curbMat, { collide: true, collideType: 'curb' });
  mkBox(group, physics, halfX * 2, curbHeight, curbThickness, 0, curbHeight / 2, -halfZ, curbMat, { collide: true, collideType: 'curb' });
  mkBox(group, physics, curbThickness, curbHeight, halfZ * 2, halfX, curbHeight / 2, 0, curbMat, { collide: true, collideType: 'curb' });
  mkBox(group, physics, curbThickness, curbHeight, halfZ * 2, -halfX, curbHeight / 2, 0, curbMat, { collide: true, collideType: 'curb' });
}

// `flagEnabled` + `flagCount` are decided by the caller (WorldBuilder gates on theme id +
// national-event bonus; HubBuilder always wants its landmark flags) so this stays generic.
export function buildBuildingCluster(group, theme, halfX, halfZ, rng, { flagEnabled = false, flagCount = 1 } = {}) {
  const spacing = 10;
  const depthOffset = 8;
  const parapetMat = new THREE.MeshStandardMaterial({ color: theme.curb, roughness: 0.75 });
  const place = (x, z) => {
    const h = theme.buildingHeights[0] + rng() * (theme.buildingHeights[1] - theme.buildingHeights[0]);
    const w = 6 + rng() * 5;
    const d = 6 + rng() * 5;
    const color = theme.buildingColors[Math.floor(rng() * theme.buildingColors.length)];
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.85,
      metalness: 0.05,
      emissive: theme.night ? 0xffdf91 : 0x000000,
      emissiveIntensity: theme.night ? 0.12 : 0,
    });
    mkBox(group, null, w, h, d, x, h / 2, z, mat);
    mkBox(group, null, w * 0.92, 0.35, d * 0.92, x, h + 0.17, z, parapetMat);
  };
  const countX = Math.max(2, Math.round(((halfX * 2) / spacing) * theme.propDensity));
  for (let i = 0; i < countX; i++) {
    const x = -halfX + rng() * halfX * 2;
    place(x, halfZ + depthOffset + rng() * 6);
    place(x, -(halfZ + depthOffset + rng() * 6));
  }
  const countZ = Math.max(2, Math.round(((halfZ * 2) / spacing) * theme.propDensity));
  for (let i = 0; i < countZ; i++) {
    const z = -halfZ + rng() * halfZ * 2;
    place(halfX + depthOffset + rng() * 6, z);
    place(-(halfX + depthOffset + rng() * 6), z);
  }

  const flags = [];
  if (flagEnabled) {
    const count = Math.min(flagCount || 1, 2);
    for (let i = 0; i < count; i++) {
      flags.push(buildFlag(group, halfX * (0.35 + i * 0.25), (halfZ + depthOffset) * (rng() < 0.5 ? 1 : -1)));
    }
  }
  return { flags };
}

export function buildTrees(group, theme, halfX, halfZ, rng) {
  const count = Math.max(6, Math.round(22 * theme.propDensity));
  const dummy = new THREE.Object3D();
  const positions = [];
  const trunkMesh = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.12, 0.16, 1.4, 6),
    new THREE.MeshStandardMaterial({ color: theme.trunk, roughness: 0.9 }),
    count
  );
  for (let i = 0; i < count; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const x = -halfX - 1 + rng() * (halfX * 2 + 2);
    const z = side * (halfZ + 2 + rng() * 3);
    const scale = 0.8 + rng() * 0.6;
    positions.push({ x, z, scale });
    dummy.position.set(x, 0.7 * scale, z);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    trunkMesh.setMatrixAt(i, dummy.matrix);
  }
  trunkMesh.castShadow = true;
  group.add(trunkMesh);

  const foliageMesh = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1.1, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 }),
    count
  );
  for (let i = 0; i < count; i++) {
    const p = positions[i];
    dummy.position.set(p.x, 1.5 * p.scale + 0.3, p.z);
    dummy.scale.setScalar(p.scale);
    dummy.updateMatrix();
    foliageMesh.setMatrixAt(i, dummy.matrix);
    foliageMesh.setColorAt(i, new THREE.Color(theme.foliage[Math.floor(rng() * theme.foliage.length)]));
  }
  foliageMesh.castShadow = true;
  group.add(foliageMesh);
}

export function buildStreetlights(group, theme, halfX, halfZ, rng) {
  const count = Math.max(4, Math.round(9 * theme.propDensity));
  const dummy = new THREE.Object3D();
  const poleMesh = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.06, 0.08, 4.2, 6),
    new THREE.MeshStandardMaterial({ color: 0x2b2d31, roughness: 0.6, metalness: 0.4 }),
    count
  );
  const headMesh = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.18, 8, 8),
    new THREE.MeshStandardMaterial({
      color: theme.lampColor,
      emissive: theme.lampColor,
      emissiveIntensity: theme.night ? 2.4 : 0.5,
    }),
    count
  );
  const lampLights = [];
  for (let i = 0; i < count; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const x = -halfX + (i / count) * halfX * 2 + (rng() - 0.5) * 2;
    const z = side * (halfZ + 1.7);
    dummy.position.set(x, 2.1, z);
    dummy.updateMatrix();
    poleMesh.setMatrixAt(i, dummy.matrix);
    dummy.position.set(x, 4.1, z);
    dummy.updateMatrix();
    headMesh.setMatrixAt(i, dummy.matrix);
    if (theme.night && i % 3 === 0) {
      const light = new THREE.PointLight(theme.lampColor, 8, 15, 2);
      light.position.set(x, 4.0, z);
      group.add(light);
      lampLights.push({ light, base: 8 });
    }
  }
  group.add(poleMesh, headMesh);
  return lampLights;
}

// Bilingual "P" + Arabic "هنا" (here) wayfinding texture for a target spot's sign board —
// same CanvasTexture pattern as makeMarkingTexture(). Generic sans-serif (not the Tajawal web
// font) since this is a one-time 3D texture snapshot, not DOM text, so there's no font-load race.
export function makeTargetSignTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size * 0.67;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1a6fd4';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 52px sans-serif';
  ctx.fillText('P', canvas.width * 0.32, canvas.height * 0.52);
  ctx.font = '24px sans-serif';
  ctx.direction = 'rtl';
  ctx.fillText('هنا', canvas.width * 0.68, canvas.height * 0.52);
  const tex = new THREE.CanvasTexture(canvas);
  if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildTargetSign(group, target) {
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6), new THREE.MeshStandardMaterial({ color: 0x555555 }));
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.6, 0.05),
    new THREE.MeshStandardMaterial({ map: makeTargetSignTexture(), emissive: 0x0a3060, emissiveIntensity: 0.4 })
  );
  const perp = { x: -Math.sin(target.heading), z: Math.cos(target.heading) };
  const dist = target.halfWidth + 2.4;
  const sx = target.x + perp.x * dist;
  const sz = target.z + perp.z * dist;
  pole.position.set(sx, 1.2, sz);
  board.position.set(sx, 2.3, sz);
  pole.castShadow = true;
  board.castShadow = true;
  group.add(pole, board);
}

export function makeMarkingTexture(isTarget, lineColorHex) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const hex = `#${lineColorHex.toString(16).padStart(6, '0')}`;
  ctx.clearRect(0, 0, size, size);
  if (isTarget) {
    ctx.fillStyle = 'rgba(0, 229, 255, 0.14)';
    ctx.fillRect(0, 0, size, size);
  }
  ctx.strokeStyle = isTarget ? '#00e5ff' : hex;
  ctx.lineWidth = isTarget ? 11 : 7;
  const m = 14;
  ctx.strokeRect(m, m, size - 2 * m, size - 2 * m);
  if (isTarget) {
    const midY = size / 2;
    ctx.lineWidth = 7;
    for (const cx of [size * 0.35, size * 0.5, size * 0.65]) {
      ctx.beginPath();
      ctx.moveTo(cx - 16, midY - 20);
      ctx.lineTo(cx + 16, midY);
      ctx.lineTo(cx - 16, midY + 20);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Bilingual "P" / "موقف" (parking) entrance sign — cheap decorative flavor, same pole+board
// primitive as buildTargetSign, offset onto the near sidewalk so it never overlaps the driving
// lane or spots.
export function buildEntranceSign(group, x, z) {
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6), new THREE.MeshStandardMaterial({ color: 0x555555 }));
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1a6fd4';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 60px sans-serif';
  ctx.fillText('P', size / 2, size * 0.4);
  ctx.font = '22px sans-serif';
  ctx.direction = 'rtl';
  ctx.fillText('موقف', size / 2, size * 0.78);
  const tex = new THREE.CanvasTexture(canvas);
  if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.7, 0.06),
    new THREE.MeshStandardMaterial({ map: tex, emissive: 0x0a3060, emissiveIntensity: 0.35 })
  );
  pole.position.set(x, 1.3, z);
  board.position.set(x, 2.75, z);
  pole.castShadow = true;
  board.castShadow = true;
  group.add(pole, board);
}

// Green bilingual road-name placard, real Saudi-style signage (Arabic name over an English
// transliteration).
export function makeStreetSignTexture(nameAr, nameEn) {
  const w = 512;
  const h = 160;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0d6b3a';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, w - 16, h - 16);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.direction = 'rtl';
  ctx.font = 'bold 50px sans-serif';
  ctx.fillText(nameAr, w / 2, 66);
  ctx.direction = 'ltr';
  ctx.font = '28px sans-serif';
  ctx.fillText(nameEn, w / 2, 118);
  const tex = new THREE.CanvasTexture(canvas);
  if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildStreetSign(group, x, z, nameAr, nameEn) {
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.8, 6), new THREE.MeshStandardMaterial({ color: 0x555555 }));
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.5, 0.05),
    new THREE.MeshStandardMaterial({ map: makeStreetSignTexture(nameAr, nameEn) })
  );
  pole.position.set(x, 1.4, z);
  board.position.set(x, 2.6, z);
  pole.castShadow = true;
  board.castShadow = true;
  group.add(pole, board);
}

// Renders one bilingual regulatory road-sign board (Arabic primary, English legend beneath),
// shape/color driven by data/roadSigns.js so STOP reads as a red octagon, NO PARKING as a
// red-ringed circle, warnings as yellow diamonds, and informational signs as green/blue
// rectangles.
export function makeRegulatorySignTexture(sign) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.44;

  ctx.fillStyle = sign.bg;
  ctx.strokeStyle = sign.fg;
  ctx.lineWidth = 6;
  ctx.beginPath();
  if (sign.shape === 'octagon') {
    for (let i = 0; i < 8; i++) {
      const a = Math.PI / 8 + (i * Math.PI) / 4;
      const px = cx + r * Math.cos(a);
      const py = cy + r * Math.sin(a);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  } else if (sign.shape === 'diamond') {
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r, cy);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r, cy);
    ctx.closePath();
  } else if (sign.shape === 'circle') {
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
  } else {
    const inset = size * 0.08;
    ctx.rect(inset, inset, size - inset * 2, size - inset * 2);
  }
  ctx.fill();
  ctx.stroke();
  if (sign.shape === 'circle') {
    ctx.strokeStyle = sign.fg;
    ctx.lineWidth = size * 0.07;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.82, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.6, cy + r * 0.6);
    ctx.lineTo(cx + r * 0.6, cy - r * 0.6);
    ctx.stroke();
  }

  ctx.fillStyle = sign.fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.direction = 'rtl';
  ctx.font = `bold ${Math.round(size * 0.2)}px sans-serif`;
  ctx.fillText(sign.ar, cx, cy - size * 0.06);
  ctx.direction = 'ltr';
  ctx.font = `${Math.round(size * 0.09)}px sans-serif`;
  ctx.fillText(sign.en, cx, cy + size * 0.2);

  const tex = new THREE.CanvasTexture(canvas);
  if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildRegulatorySign(group, x, z, signId) {
  const sign = ROAD_SIGNS[signId];
  if (!sign) return;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 2.3, 6), new THREE.MeshStandardMaterial({ color: 0x555555 }));
  const board = new THREE.Mesh(
    new THREE.CircleGeometry(0.42, 24),
    new THREE.MeshStandardMaterial({ map: makeRegulatorySignTexture(sign), side: THREE.DoubleSide })
  );
  pole.position.set(x, 1.1, z);
  board.position.set(x, 2.15, z);
  pole.castShadow = true;
  board.castShadow = true;
  group.add(pole, board);
}

export function buildRegulatorySigns(group, signs) {
  if (!signs || !signs.length) return;
  for (const s of signs) buildRegulatorySign(group, s.x, s.z, s.id);
}

// Simple green-field Saudi flag texture — a plain white sword silhouette drawn with canvas
// primitives (no calligraphy attempted, keeping this tasteful and font-independent).
export function makeFlagTexture() {
  const w = 128;
  const h = Math.round(w * 0.67);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0f7b3c';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#ffffff';
  ctx.fillStyle = '#ffffff';
  ctx.lineWidth = 4;
  const midY = h * 0.62;
  ctx.beginPath();
  ctx.moveTo(w * 0.18, midY);
  ctx.lineTo(w * 0.82, midY);
  ctx.stroke();
  ctx.fillRect(w * 0.15, midY - 5, w * 0.08, 10);
  const tex = new THREE.CanvasTexture(canvas);
  if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildFlag(group, x, z) {
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.06, 3.4, 6),
    new THREE.MeshStandardMaterial({ color: 0xcfd4d8, roughness: 0.4, metalness: 0.6 })
  );
  pole.position.set(x, 1.7, z);
  pole.castShadow = true;
  const flag = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.6),
    new THREE.MeshStandardMaterial({ map: makeFlagTexture(), roughness: 0.8, side: THREE.DoubleSide })
  );
  flag.position.set(x + 0.47, 3.05, z);
  flag.castShadow = true;
  group.add(pole, flag);
  return flag;
}

export function buildSpotMarkings(group, theme, spots) {
  const cache = new Map();
  for (const spot of spots) {
    const key = spot.isTarget ? 'target' : 'decoy';
    let tex = cache.get(key);
    if (!tex) {
      tex = makeMarkingTexture(spot.isTarget, theme.lineColor);
      cache.set(key, tex);
    }
    const geo = new THREE.PlaneGeometry(spot.halfDepth * 2, spot.halfWidth * 2);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(spot.x, 0.02, spot.z);
    mesh.rotation.y = -spot.heading;
    group.add(mesh);
  }
}

export function buildObstacles(group, physics, rng, obstacles) {
  for (const o of obstacles) {
    const heading = o.angle + Math.PI / 2;
    if (o.type === 'parkedCar') {
      const length = o.halfDepth * 2;
      const width = o.halfWidth * 2;
      const preset = {
        id: 'obstacle',
        color: OBSTACLE_CAR_COLORS[Math.floor(rng() * OBSTACLE_CAR_COLORS.length)],
        length,
        width,
        height: 1.3,
        wheelbase: length * 0.58,
        track: width * 0.82,
        maxSpeed: 0,
        accel: 0,
        handling: 1,
      };
      const model = createCarModel(preset);
      for (const spot of model.headlightSpots) spot.intensity = 0;
      model.group.position.set(o.x, 0, o.z);
      model.group.rotation.y = -heading;
      group.add(model.group);
    } else if (o.type === 'cone') {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(o.halfWidth, 0.7, 10), new THREE.MeshStandardMaterial({ color: 0xff6a1a, roughness: 0.7 }));
      cone.position.set(o.x, 0.35, o.z);
      cone.castShadow = true;
      group.add(cone);
    } else if (o.type === 'barrier') {
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(o.halfWidth * 2, 0.5, o.halfDepth * 2),
        new THREE.MeshStandardMaterial({ color: 0xffcc33, roughness: 0.6 })
      );
      bar.position.set(o.x, 0.25, o.z);
      bar.rotation.y = -heading;
      bar.castShadow = true;
      group.add(bar);
    }
    physics.addCollider(o, o.type);
  }
}
