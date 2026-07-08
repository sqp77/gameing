/*
 * ParkMaster3D
 * Owner: Saud
 * GitHub: sqp77
 * =============
 */

import * as THREE from 'three';
import { createCarModel } from './Car.js';

const GHOST_TINT = new THREE.Color(0x00e5ff);

// Purely cosmetic playback of a recorded run: builds the same procedural car model used for
// drivable/parked vehicles, then makes it a translucent "phantom" and strips anything that would
// make it interact with the world. It is never registered with PhysicsManager or ParkingManager,
// so it cannot affect collisions, scoring, or parking detection — only GameManager moves it, by
// calling setPose() from a GhostPlayer each frame.
export class GhostCar {
  constructor(preset) {
    this.model = createCarModel(preset);
    this.root = new THREE.Group();
    this.root.add(this.model.group);

    for (const spot of this.model.headlightSpots) spot.intensity = 0;

    this.root.traverse((node) => {
      if (!node.material) return;
      const wasArray = Array.isArray(node.material);
      const ghostMats = (wasArray ? node.material : [node.material]).map((m) => {
        const ghostMat = m.clone();
        ghostMat.transparent = true;
        ghostMat.opacity = 0.32;
        ghostMat.depthWrite = false;
        ghostMat.emissive = GHOST_TINT;
        ghostMat.emissiveIntensity = 0.5;
        return ghostMat;
      });
      node.material = wasArray ? ghostMats : ghostMats[0];
      node.castShadow = false;
      node.receiveShadow = false;
    });
  }

  get object3D() {
    return this.root;
  }

  setPose(x, z, yaw) {
    this.root.position.set(x, 0, z);
    this.root.rotation.y = -yaw;
  }

  dispose() {
    this.root.traverse((node) => {
      if (node.geometry) node.geometry.dispose();
      if (node.material) {
        const mats = Array.isArray(node.material) ? node.material : [node.material];
        for (const m of mats) m.dispose();
      }
    });
  }
}
