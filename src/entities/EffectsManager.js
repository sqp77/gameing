import * as THREE from 'three';

// Lightweight particle burst system for collect sparkles and crash debris.
// Bursts are plain THREE.Points objects driven by per-particle velocity arrays
// and removed once their lifetime expires — no external sprite assets needed.

export class EffectsManager {
  constructor(scene) {
    this.scene = scene;
    this.bursts = [];
  }

  spawnCollectBurst(position, color) {
    const count = 16;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];
    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y + 0.4;
      positions[i * 3 + 2] = position.z;
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 2.5;
      velocities.push(
        Math.cos(angle) * speed,
        2 + Math.random() * 3,
        Math.sin(angle) * speed
      );
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color,
      size: 0.16,
      transparent: true,
      opacity: 1,
      depthWrite: false,
    });
    const points = new THREE.Points(geometry, material);
    this.scene.add(points);
    this.bursts.push({ points, velocities, life: 0, maxLife: 0.7, gravity: -9 });
  }

  spawnCrashBurst(position) {
    const count = 22;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];
    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y + 0.5;
      positions[i * 3 + 2] = position.z;
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      velocities.push(
        Math.cos(angle) * speed,
        1.5 + Math.random() * 3.5,
        Math.sin(angle) * speed
      );
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0x9a9a9a,
      size: 0.14,
      transparent: true,
      opacity: 1,
      depthWrite: false,
    });
    const points = new THREE.Points(geometry, material);
    this.scene.add(points);
    this.bursts.push({ points, velocities, life: 0, maxLife: 0.6, gravity: -14 });
  }

  update(dt) {
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const burst = this.bursts[i];
      burst.life += dt;
      const t = burst.life / burst.maxLife;
      if (t >= 1) {
        this.scene.remove(burst.points);
        burst.points.geometry.dispose();
        burst.points.material.dispose();
        this.bursts.splice(i, 1);
        continue;
      }
      const positions = burst.points.geometry.attributes.position;
      for (let p = 0; p < positions.count; p++) {
        const vi = p * 3;
        burst.velocities[vi + 1] += burst.gravity * dt;
        positions.setX(p, positions.getX(p) + burst.velocities[vi] * dt);
        positions.setY(p, positions.getY(p) + burst.velocities[vi + 1] * dt);
        positions.setZ(p, positions.getZ(p) + burst.velocities[vi + 2] * dt);
      }
      positions.needsUpdate = true;
      burst.points.material.opacity = 1 - t;
    }
  }
}
