/*
 * MASAR
 * Owner: Saud Alqhtani
 * GitHub: sqp77
 * =============
 */

import * as THREE from 'three';

const MAX_SKID = 400;
const MAX_SPARK = 140;
const MAX_CONFETTI = 220;
const GRAVITY = 9.8;

function makeParticlePool(geometry, material, count) {
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.count = count;
  const particles = new Array(count).fill(null).map(() => ({
    active: false,
    life: 0,
    maxLife: 1,
    pos: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    scale: 1,
  }));
  return { mesh, particles, cursor: 0 };
}

// Handles all non-essential "juice": rear-wheel skid marks (ring-buffer of instanced
// decals, no per-instance fade needed since real skid marks persist), and two pooled
// InstancedMesh particle bursts (collision spark, parking-success confetti). Pooling
// avoids any per-frame allocation/geometry churn.
export class EffectsManager {
  constructor(scene) {
    this.scene = scene;
    this._dummy = new THREE.Object3D();
    this._buildSkidPool();
    this._sparkPool = makeParticlePool(
      new THREE.BoxGeometry(0.08, 0.08, 0.08),
      new THREE.MeshBasicMaterial({ color: 0xffa63d }),
      MAX_SPARK
    );
    this._confettiPool = makeParticlePool(
      new THREE.BoxGeometry(0.14, 0.14, 0.04),
      new THREE.MeshBasicMaterial({ vertexColors: true, color: 0xffffff }),
      MAX_CONFETTI
    );
    this._hideAll(this._sparkPool);
    this._hideAll(this._confettiPool);
    this.scene.add(this._sparkPool.mesh, this._confettiPool.mesh);
  }

  _buildSkidPool() {
    const geo = new THREE.PlaneGeometry(0.26, 0.85);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x0a0a0a,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
    });
    this.skidMesh = new THREE.InstancedMesh(geo, mat, MAX_SKID);
    this.skidMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.skidMesh.count = 0;
    this.skidMesh.frustumCulled = false;
    this.scene.add(this.skidMesh);
    this.skidCursor = 0;
  }

  _hideAll(pool) {
    this._dummy.position.set(0, -999, 0);
    this._dummy.scale.setScalar(0);
    this._dummy.updateMatrix();
    for (let i = 0; i < pool.particles.length; i++) pool.mesh.setMatrixAt(i, this._dummy.matrix);
    pool.mesh.instanceMatrix.needsUpdate = true;
  }

  clearLevel() {
    this.skidMesh.count = 0;
    this.skidCursor = 0;
    for (const pool of [this._sparkPool, this._confettiPool]) {
      for (const p of pool.particles) p.active = false;
      this._hideAll(pool);
    }
  }

  emitSkid(x, z, yaw, strength = 1) {
    const i = this.skidCursor;
    this.skidCursor = (this.skidCursor + 1) % MAX_SKID;
    this._dummy.position.set(x, 0.012, z);
    this._dummy.rotation.set(0, -yaw, 0);
    this._dummy.scale.setScalar(0.55 + strength * 0.5);
    this._dummy.updateMatrix();
    this.skidMesh.setMatrixAt(i, this._dummy.matrix);
    this.skidMesh.count = Math.max(this.skidMesh.count, i + 1);
    this.skidMesh.instanceMatrix.needsUpdate = true;
  }

  _spawn(pool, x, y, z, vel, life, scale) {
    const p = pool.particles[pool.cursor];
    pool.cursor = (pool.cursor + 1) % pool.particles.length;
    p.active = true;
    p.life = life;
    p.maxLife = life;
    p.pos.set(x, y, z);
    p.vel.copy(vel);
    p.scale = scale;
    return p;
  }

  emitCollisionSpark(x, z, count = 10) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3;
      const vel = new THREE.Vector3(Math.cos(angle) * speed, 2 + Math.random() * 2.5, Math.sin(angle) * speed);
      this._spawn(this._sparkPool, x, 0.4, z, vel, 0.35 + Math.random() * 0.25, 0.8 + Math.random() * 0.6);
    }
  }

  emitSuccessBurst(x, z, count = 40) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      const vel = new THREE.Vector3(Math.cos(angle) * speed, 4 + Math.random() * 4, Math.sin(angle) * speed);
      const p = this._spawn(this._confettiPool, x, 1.2, z, vel, 1.2 + Math.random() * 0.8, 0.7 + Math.random() * 0.8);
      const hue = Math.random();
      p.color = new THREE.Color().setHSL(hue, 0.8, 0.6);
      this._confettiPool.mesh.setColorAt(this._confettiPool.particles.indexOf(p), p.color);
    }
    if (this._confettiPool.mesh.instanceColor) this._confettiPool.mesh.instanceColor.needsUpdate = true;
  }

  _updatePool(pool, dt) {
    let anyActive = false;
    for (let i = 0; i < pool.particles.length; i++) {
      const p = pool.particles[i];
      if (!p.active) continue;
      anyActive = true;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        this._dummy.position.set(0, -999, 0);
        this._dummy.scale.setScalar(0);
        this._dummy.rotation.set(0, 0, 0);
        this._dummy.updateMatrix();
        pool.mesh.setMatrixAt(i, this._dummy.matrix);
        continue;
      }
      p.vel.y -= GRAVITY * dt;
      p.pos.addScaledVector(p.vel, dt);
      if (p.pos.y < 0.02) {
        p.pos.y = 0.02;
        p.vel.y *= -0.3;
        p.vel.x *= 0.7;
        p.vel.z *= 0.7;
      }
      const fade = Math.max(0, p.life / p.maxLife);
      this._dummy.position.copy(p.pos);
      this._dummy.rotation.set(p.pos.x * 3, p.pos.y * 4, p.pos.z * 3);
      this._dummy.scale.setScalar(p.scale * fade);
      this._dummy.updateMatrix();
      pool.mesh.setMatrixAt(i, this._dummy.matrix);
    }
    pool.mesh.instanceMatrix.needsUpdate = true;
    return anyActive;
  }

  update(dt) {
    this._updatePool(this._sparkPool, dt);
    this._updatePool(this._confettiPool, dt);
  }
}
