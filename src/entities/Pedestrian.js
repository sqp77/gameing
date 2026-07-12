/*
 * MASAR
 * Owner: Saud Alqhtani
 * GitHub: sqp77
 * =============
 */

import * as THREE from 'three';

// The simple humanoid (torso + head box/sphere primitives) originally built inline by
// TrafficManager#_spawnPedestrian, extracted so the v1.1.0 open-world hub's ambient
// pedestrians (Feature 7: Dynamic City Life) can reuse the exact same lightweight model
// instead of a second implementation. Campaign pedestrian behavior/visuals are unchanged —
// TrafficManager now just calls this instead of building the group inline.
export function createPedestrianModel() {
  const body = new THREE.Group();
  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.9, 0.28),
    new THREE.MeshStandardMaterial({ color: 0x2b3a55, roughness: 0.85 })
  );
  torso.position.y = 0.55;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshStandardMaterial({ color: 0xd9b48f, roughness: 0.7 }));
  head.position.y = 1.12;
  body.add(torso, head);
  return body;
}
