import * as THREE from 'three';
import { LANES, SPAWN_Z, DESPAWN_Z } from '../core/Constants.js';
import { createCollectible, COLLECTIBLE_KEYS } from './Collectible.js';
import { createObstacle, OBSTACLE_KEYS } from './Obstacle.js';

const COLLISION_Z_MIN = -2.3;
const COLLISION_Z_MAX = 2.0;
const COLLISION_X_TOLERANCE = 1.15;

export class SpawnManager {
  constructor(scene) {
    this.scene = scene;
    this.active = [];
    this.pools = new Map();
    this._spawnTimer = 0;
    this._time = 0;

    this.onCollect = null; // (typeKey) => void
    this.onCrash = null; // (typeKey) => void
  }

  _getMesh(typeKey, kind) {
    const poolKey = `${kind}:${typeKey}`;
    if (!this.pools.has(poolKey)) this.pools.set(poolKey, []);
    const pool = this.pools.get(poolKey);
    let mesh = pool.pop();
    if (!mesh) {
      mesh = kind === 'collectible' ? createCollectible(typeKey) : createObstacle(typeKey);
      this.scene.add(mesh);
    }
    mesh.visible = true;
    return mesh;
  }

  _release(item) {
    item.mesh.visible = false;
    const poolKey = `${item.kind}:${item.typeKey}`;
    this.pools.get(poolKey).push(item.mesh);
  }

  reset() {
    for (const item of this.active) this._release(item);
    this.active = [];
    this._spawnTimer = 0;
    this._time = 0;
  }

  _spawnRow(difficultyT) {
    const obstacleChance = 0.22 + difficultyT * 0.28;
    const emptyChance = Math.max(0.12, 0.38 - difficultyT * 0.2);

    const laneContent = LANES.map(() => 'empty');
    let filledCount = 0;
    for (let i = 0; i < LANES.length; i++) {
      const roll = Math.random();
      if (roll < emptyChance) {
        laneContent[i] = 'empty';
      } else if (roll < emptyChance + obstacleChance) {
        laneContent[i] = 'obstacle';
        filledCount++;
      } else {
        laneContent[i] = 'collectible';
        filledCount++;
      }
    }
    // Guarantee at least one passable lane
    if (filledCount === LANES.length) {
      laneContent[Math.floor(Math.random() * LANES.length)] = 'empty';
    }

    laneContent.forEach((content, laneIdx) => {
      if (content === 'empty') return;
      const kind = content;
      const typeKey =
        kind === 'collectible'
          ? COLLECTIBLE_KEYS[Math.floor(Math.random() * COLLECTIBLE_KEYS.length)]
          : OBSTACLE_KEYS[Math.floor(Math.random() * OBSTACLE_KEYS.length)];

      const mesh = this._getMesh(typeKey, kind);
      mesh.position.set(LANES[laneIdx], 0, SPAWN_Z - Math.random() * 6);
      mesh.rotation.y = kind === 'collectible' ? Math.random() * Math.PI * 2 : (Math.random() - 0.5) * 0.3;

      this.active.push({
        mesh,
        kind,
        typeKey,
        lane: laneIdx,
        resolved: false,
        bobOffset: Math.random() * Math.PI * 2,
      });
    });
  }

  update(dt, delta, vehicleX, difficultyT, spawnInterval) {
    this._time += dt;
    this._spawnTimer -= dt;
    if (this._spawnTimer <= 0) {
      this._spawnRow(difficultyT);
      this._spawnTimer = spawnInterval;
    }

    for (let i = this.active.length - 1; i >= 0; i--) {
      const item = this.active[i];
      item.mesh.position.z += delta;

      if (item.kind === 'collectible') {
        item.mesh.position.y = 0.15 + Math.sin(this._time * 3 + item.bobOffset) * 0.12;
        item.mesh.rotation.y += dt * 1.6;
      }

      if (
        !item.resolved &&
        item.mesh.position.z > COLLISION_Z_MIN &&
        item.mesh.position.z < COLLISION_Z_MAX &&
        Math.abs(item.mesh.position.x - vehicleX) < COLLISION_X_TOLERANCE
      ) {
        item.resolved = true;
        if (item.kind === 'collectible') {
          if (this.onCollect) this.onCollect(item.typeKey, item.mesh.position);
        } else if (this.onCrash) {
          this.onCrash(item.typeKey, item.mesh.position);
        }
        this._release(item);
        this.active.splice(i, 1);
        continue;
      }

      if (item.mesh.position.z > DESPAWN_Z) {
        this._release(item);
        this.active.splice(i, 1);
      }
    }
  }
}
