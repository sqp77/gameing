import * as THREE from 'three';
import { OBSTACLE_TYPES } from '../core/Constants.js';

function buildBarrier() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.7 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xd94b1f, roughness: 0.6 });
  const legMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });

  const board = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.42, 0.12), bodyMat);
  board.position.y = 0.55;
  g.add(board);
  for (let i = -1; i <= 1; i += 2) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.42, 0.13), stripeMat);
    stripe.position.set(i * 0.45, 0.55, 0);
    g.add(stripe);
  }
  const legGeo = new THREE.BoxGeometry(0.1, 0.55, 0.35);
  for (const x of [-0.6, 0.6]) {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(x, 0.28, 0);
    g.add(leg);
  }
  g.traverse((c) => { if (c.isMesh) c.castShadow = true; });
  return g;
}

function buildCone() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xff6a1f, roughness: 0.6 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.6 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.5), mat);
  base.position.y = 0.03;
  g.add(base);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.65, 14), mat);
  cone.position.y = 0.38;
  g.add(cone);
  const stripe = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.13, 14), whiteMat);
  stripe.position.y = 0.5;
  g.add(stripe);
  g.traverse((c) => { if (c.isMesh) c.castShadow = true; });
  return g;
}

function buildTire() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x161616, roughness: 0.9 });
  const tire = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.16, 10, 20), mat);
  tire.rotation.x = Math.PI / 2;
  tire.position.y = 0.34;
  g.add(tire);
  g.traverse((c) => { if (c.isMesh) c.castShadow = true; });
  return g;
}

function buildGarbageBag() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x2b2b30, roughness: 0.75 });
  const bag = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 10), mat);
  bag.scale.set(1, 0.85, 1.1);
  bag.position.y = 0.3;
  g.add(bag);
  const tie = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), mat);
  tie.position.y = 0.58;
  g.add(tie);
  g.traverse((c) => { if (c.isMesh) c.castShadow = true; });
  return g;
}

const BUILDERS = {
  barrier: buildBarrier,
  cone: buildCone,
  tire: buildTire,
  garbageBag: buildGarbageBag,
};

export function createObstacle(typeKey) {
  const def = OBSTACLE_TYPES[typeKey];
  const group = new THREE.Group();
  group.add(BUILDERS[typeKey]());
  group.userData = { type: typeKey, penalty: def.penalty, kind: 'obstacle' };
  return group;
}

export const OBSTACLE_KEYS = Object.keys(OBSTACLE_TYPES);
