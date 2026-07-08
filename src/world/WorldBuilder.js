/*
 * ParkMaster3D
 * Owner: Saud
 * GitHub: sqp77
 * =============
 */

import * as THREE from 'three';
import { createCarModel } from '../entities/Car.js';
import { getTheme } from './themes.js';
import { makeSeededRandom } from '../utils/MathUtils.js';

const OBSTACLE_CAR_COLORS = [0x8a8f97, 0x5c6470, 0x9c7a5a, 0x4a5568, 0x6b6f76, 0x7c8590, 0xa3b1c2];

// Builds and tears down the full drivable environment for one level: sky/fog/lights,
// ground, a sidewalk+curb perimeter (also the physical/collidable level boundary),
// scattered buildings/trees/streetlights/signs, gameplay obstacles (parked cars,
// cones, barriers), and painted parking-spot ground markings. Repeated decorative
// props use InstancedMesh; everything solid is registered into PhysicsManager.
export class WorldBuilder {
  constructor(scene, physicsManager) {
    this.scene = scene;
    this.physics = physicsManager;
    this.group = new THREE.Group();
    this.group.name = 'world';
    this.scene.add(this.group);
  }

  clear() {
    while (this.group.children.length) {
      const child = this.group.children.pop();
      this._disposeRecursive(child);
    }
    this.physics.reset();
  }

  _disposeRecursive(obj) {
    obj.traverse?.((node) => {
      if (node.geometry) node.geometry.dispose();
      if (node.material) {
        const mats = Array.isArray(node.material) ? node.material : [node.material];
        for (const m of mats) {
          if (m.map) m.map.dispose();
          m.dispose();
        }
      }
    });
  }

  build(levelConfig) {
    this.clear();
    const theme = getTheme(levelConfig.theme);
    const night = levelConfig.night || theme.night;
    const themed = { ...theme, night };
    const rng = makeSeededRandom(levelConfig.seed);
    const { halfX, halfZ } = levelConfig.bounds;

    this._setupSkyAndLights(themed);
    this._buildGround(themed, halfX, halfZ);
    this._buildPerimeter(themed, halfX, halfZ);
    this._buildBuildings(themed, halfX, halfZ, rng);
    this._buildTrees(themed, halfX, halfZ, rng);
    this._buildStreetlights(themed, halfX, halfZ, rng);
    this._buildSigns(levelConfig.spots);
    this._buildSpotMarkings(themed, levelConfig.spots);
    this._buildObstacles(rng, levelConfig.obstacles);

    this.physics.setBoundary(halfX, halfZ);
    return { theme: themed };
  }

  _setupSkyAndLights(theme) {
    this.scene.background = new THREE.Color(theme.night ? 0x0a1220 : theme.skyTop);
    this.scene.fog = new THREE.Fog(theme.night ? 0x0a1220 : theme.fogColor, theme.fogNear, theme.fogFar);

    const hemi = new THREE.HemisphereLight(theme.night ? 0x2a3550 : theme.skyTop, theme.ground, theme.ambientIntensity);
    this.group.add(hemi);

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
    this.group.add(sun, sun.target);
  }

  _buildGround(theme, halfX, halfZ) {
    const geo = new THREE.PlaneGeometry(halfX * 2 + 45, halfZ * 2 + 45);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({ color: theme.road, roughness: 0.95, metalness: 0.02 });
    const ground = new THREE.Mesh(geo, mat);
    ground.receiveShadow = true;
    this.group.add(ground);
  }

  _mkBox(w, h, d, x, y, z, mat, { collide, collideType } = {}) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    box.position.set(x, y, z);
    box.receiveShadow = true;
    box.castShadow = true;
    this.group.add(box);
    if (collide) this.physics.addCollider({ x, z, halfWidth: w / 2, halfDepth: d / 2, angle: 0 }, collideType);
    return box;
  }

  _buildPerimeter(theme, halfX, halfZ) {
    const inset = 3.2;
    const curbHeight = 0.18;
    const curbThickness = 0.28;
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: theme.sidewalk, roughness: 0.9 });
    const curbMat = new THREE.MeshStandardMaterial({ color: theme.curb, roughness: 0.8 });

    this._mkBox(halfX * 2 + inset * 2, 0.1, inset, 0, 0.05, halfZ + inset / 2, sidewalkMat);
    this._mkBox(halfX * 2 + inset * 2, 0.1, inset, 0, 0.05, -(halfZ + inset / 2), sidewalkMat);
    this._mkBox(inset, 0.1, halfZ * 2, halfX + inset / 2, 0.05, 0, sidewalkMat);
    this._mkBox(inset, 0.1, halfZ * 2, -(halfX + inset / 2), 0.05, 0, sidewalkMat);

    this._mkBox(halfX * 2, curbHeight, curbThickness, 0, curbHeight / 2, halfZ, curbMat, { collide: true, collideType: 'curb' });
    this._mkBox(halfX * 2, curbHeight, curbThickness, 0, curbHeight / 2, -halfZ, curbMat, { collide: true, collideType: 'curb' });
    this._mkBox(curbThickness, curbHeight, halfZ * 2, halfX, curbHeight / 2, 0, curbMat, { collide: true, collideType: 'curb' });
    this._mkBox(curbThickness, curbHeight, halfZ * 2, -halfX, curbHeight / 2, 0, curbMat, { collide: true, collideType: 'curb' });
  }

  _buildBuildings(theme, halfX, halfZ, rng) {
    const spacing = 10;
    const depthOffset = 8;
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
      this._mkBox(w, h, d, x, h / 2, z, mat);
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
  }

  _buildTrees(theme, halfX, halfZ, rng) {
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
    this.group.add(trunkMesh);

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
    this.group.add(foliageMesh);
  }

  _buildStreetlights(theme, halfX, halfZ, rng) {
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
        this.group.add(light);
      }
    }
    this.group.add(poleMesh, headMesh);
  }

  _buildSigns(spots) {
    const target = spots.find((s) => s.isTarget) || spots[0];
    if (!target) return;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6), new THREE.MeshStandardMaterial({ color: 0x555555 }));
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.6, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x1a6fd4, emissive: 0x0a3060, emissiveIntensity: 0.4 })
    );
    const perp = { x: -Math.sin(target.heading), z: Math.cos(target.heading) };
    const dist = target.halfWidth + 2.4;
    const sx = target.x + perp.x * dist;
    const sz = target.z + perp.z * dist;
    pole.position.set(sx, 1.2, sz);
    board.position.set(sx, 2.3, sz);
    pole.castShadow = true;
    board.castShadow = true;
    this.group.add(pole, board);
  }

  _makeMarkingTexture(isTarget, lineColorHex) {
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
    const tex = new THREE.CanvasTexture(canvas);
    if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  _buildSpotMarkings(theme, spots) {
    const cache = new Map();
    for (const spot of spots) {
      const key = spot.isTarget ? 'target' : 'decoy';
      let tex = cache.get(key);
      if (!tex) {
        tex = this._makeMarkingTexture(spot.isTarget, theme.lineColor);
        cache.set(key, tex);
      }
      const geo = new THREE.PlaneGeometry(spot.halfDepth * 2, spot.halfWidth * 2);
      geo.rotateX(-Math.PI / 2);
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(spot.x, 0.02, spot.z);
      mesh.rotation.y = -spot.heading;
      this.group.add(mesh);
    }
  }

  _buildObstacles(rng, obstacles) {
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
        this.group.add(model.group);
      } else if (o.type === 'cone') {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(o.halfWidth, 0.7, 10), new THREE.MeshStandardMaterial({ color: 0xff6a1a, roughness: 0.7 }));
        cone.position.set(o.x, 0.35, o.z);
        cone.castShadow = true;
        this.group.add(cone);
      } else if (o.type === 'barrier') {
        const bar = new THREE.Mesh(
          new THREE.BoxGeometry(o.halfWidth * 2, 0.5, o.halfDepth * 2),
          new THREE.MeshStandardMaterial({ color: 0xffcc33, roughness: 0.6 })
        );
        bar.position.set(o.x, 0.25, o.z);
        bar.rotation.y = -heading;
        bar.castShadow = true;
        this.group.add(bar);
      }
      this.physics.addCollider(o, o.type);
    }
  }
}
