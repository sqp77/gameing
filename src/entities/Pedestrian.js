/*
 * MASAR
 * Owner: Saud Alqhtani
 * GitHub: sqp77
 * =============
 */

import * as THREE from 'three';

// v1.2.0 Pedestrians & City Life expansion: same torso+head primitives, just a per-role color
// tint (and a reflective stripe for the attendant's hi-vis vest) — zero added triangle count for
// 'trainee', one extra thin box for 'attendant'. `variant` is optional so every existing call
// site (campaign TrafficManager, and Hub paths without a `role`) keeps the original civilian look.
const VARIANTS = {
  civilian: { torso: 0x2b3a55, head: 0xd9b48f },
  trainee: { torso: 0x1a6fd4, head: 0xd9b48f }, // academy blue (matches HubBuilder's academy accent)
  attendant: { torso: 0xffb020, head: 0xd9b48f }, // hi-vis vest orange
};

export function createPedestrianModel(variant = 'civilian') {
  const colors = VARIANTS[variant] || VARIANTS.civilian;
  const body = new THREE.Group();
  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.9, 0.28),
    new THREE.MeshStandardMaterial({ color: colors.torso, roughness: 0.85 })
  );
  torso.position.y = 0.55;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshStandardMaterial({ color: colors.head, roughness: 0.7 }));
  head.position.y = 1.12;
  body.add(torso, head);

  if (variant === 'attendant') {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.44, 0.12, 0.3),
      new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.4, emissive: 0xf5f5f5, emissiveIntensity: 0.15 })
    );
    stripe.position.y = 0.62;
    body.add(stripe);
  }

  return body;
}
