import * as THREE from 'three';
import { ITEM_TYPES } from '../core/Constants.js';

function ring(radius, color) {
  const glow = new THREE.Mesh(
    new THREE.RingGeometry(radius, radius + 0.12, 24),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.02;
  return glow;
}

function buildPlasticBottle() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x3fb6e0, transparent: true, opacity: 0.75, roughness: 0.15, metalness: 0.05 });
  const capMat = new THREE.MeshStandardMaterial({ color: 0x1c6fa5 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.5, 12), mat);
  body.position.y = 0.28;
  g.add(body);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.16, 10), mat);
  neck.position.y = 0.58;
  g.add(neck);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.08, 10), capMat);
  cap.position.y = 0.7;
  g.add(cap);
  return g;
}

function buildAluminumCan() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xc9ced6, metalness: 0.85, roughness: 0.25 });
  const stripe = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.3, roughness: 0.4 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.46, 16), mat);
  body.position.y = 0.24;
  g.add(body);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.172, 0.172, 0.12, 16), stripe);
  band.position.y = 0.24;
  g.add(band);
  return g;
}

function buildCardboardBox() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xb5814a, roughness: 0.95 });
  const tapeMat = new THREE.MeshStandardMaterial({ color: 0x8a6335, roughness: 0.9 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.4, 0.46), mat);
  box.position.y = 0.2;
  g.add(box);
  const tape = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.08, 0.47), tapeMat);
  tape.position.y = 0.2;
  g.add(tape);
  return g;
}

function buildPaperStack() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xf2e9d8, roughness: 0.9 });
  for (let i = 0; i < 5; i++) {
    const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.52), mat);
    sheet.position.y = 0.05 + i * 0.035;
    sheet.rotation.y = (Math.random() - 0.5) * 0.25;
    g.add(sheet);
  }
  return g;
}

function buildGlassBottle() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x2ecc71, transparent: true, opacity: 0.65, roughness: 0.1, metalness: 0.1 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.42, 12), mat);
  body.position.y = 0.26;
  g.add(body);
  const shoulder = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.15, 0.12, 12), mat);
  shoulder.position.y = 0.53;
  g.add(shoulder);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.08, 0.22, 10), mat);
  neck.position.y = 0.68;
  g.add(neck);
  return g;
}

const BUILDERS = {
  plastic: buildPlasticBottle,
  metal: buildAluminumCan,
  cardboard: buildCardboardBox,
  paper: buildPaperStack,
  glass: buildGlassBottle,
};

export function createCollectible(typeKey) {
  const def = ITEM_TYPES[typeKey];
  const group = new THREE.Group();
  const model = BUILDERS[typeKey]();
  model.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
    }
  });
  group.add(model);
  group.add(ring(0.42, def.color));

  group.userData = { type: typeKey, category: def.category, points: def.points, kind: 'collectible' };
  group.scale.setScalar(1.15);
  return group;
}

export const COLLECTIBLE_KEYS = Object.keys(ITEM_TYPES);
