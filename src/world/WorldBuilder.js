/*
 * MASAR
 * Owner: Saud Alqhtani
 * GitHub: sqp77
 * =============
 */

import * as THREE from 'three';
import { getTheme, CITY_THEME_IDS } from './themes.js';
import { makeSeededRandom } from '../utils/MathUtils.js';
import { AISLE_HALF_WIDTH } from './levels.js';
import { SAUDI_STREET_NAMES } from '../data/saudiTheme.js';
import * as propKit from './propKit.js';

const FLAG_THEME_IDS = new Set(['downtown', 'drivingSchool', ...CITY_THEME_IDS]);

// Builds and tears down the full drivable environment for one level: sky/fog/lights,
// ground, a sidewalk+curb perimeter (also the physical/collidable level boundary),
// scattered buildings/trees/streetlights/signs, gameplay obstacles (parked cars,
// cones, barriers), and painted parking-spot ground markings. Repeated decorative
// props use InstancedMesh; everything solid is registered into PhysicsManager.
// All of the actual prop geometry/texture code lives in propKit.js (shared with the
// open-world HubBuilder) — this class just orchestrates per-level build/clear and
// tracks the small bits of per-frame animation state (lamp flicker, flag flutter).
export class WorldBuilder {
  constructor(scene, physicsManager) {
    this.scene = scene;
    this.physics = physicsManager;
    this.group = new THREE.Group();
    this.group.name = 'world';
    this.scene.add(this.group);
    this._lampLights = [];
    this._flags = [];
    this._elapsed = 0;
  }

  clear() {
    while (this.group.children.length) {
      const child = this.group.children.pop();
      this._disposeRecursive(child);
    }
    this._lampLights = [];
    this._flags = [];
    this._elapsed = 0;
    this.physics.reset();
  }

  // Subtle flicker on night-level streetlights (Environment Polish), plus a gentle flutter on any
  // Saudi flags placed this level. Both are cheap — only a handful of lights/flags exist per
  // level, and both arrays are no-ops on levels that have neither.
  update(dt) {
    this._elapsed += dt;
    for (let i = 0; i < this._lampLights.length; i++) {
      const { light, base } = this._lampLights[i];
      light.intensity = base + Math.sin(this._elapsed * 1.5 + i) * base * 0.18;
    }
    for (let i = 0; i < this._flags.length; i++) {
      this._flags[i].rotation.y = Math.sin(this._elapsed * 2 + i) * 0.15;
    }
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

  // `levelConfig.eventAccent` (optional hex color) and `.eventFlagBonus` (optional bool) are set
  // by GameManager only when EventManager reports an active, enabled national event — both are
  // no-ops on every existing campaign level, which never sets them. `levelConfig.signs` (optional
  // array of {x, z, id}) places bilingual regulatory road-sign props (see data/roadSigns.js),
  // used by Academy/License scenes.
  build(levelConfig) {
    this.clear();
    const theme = getTheme(levelConfig.theme);
    const night = levelConfig.night || theme.night;
    const themed = { ...theme, night, lampColor: levelConfig.eventAccent || theme.lampColor };
    const rng = makeSeededRandom(levelConfig.seed);
    const { halfX, halfZ } = levelConfig.bounds;
    const flagCount = levelConfig.eventFlagBonus ? 2 : 1;

    propKit.setupSkyAndLights(this.group, this.scene, themed);
    propKit.buildGround(this.group, themed, halfX, halfZ);
    propKit.buildPerimeter(this.group, this.physics, themed, halfX, halfZ);
    const { flags } = propKit.buildBuildingCluster(this.group, themed, halfX, halfZ, rng, {
      flagEnabled: FLAG_THEME_IDS.has(themed.id),
      flagCount,
    });
    this._flags.push(...flags);
    propKit.buildTrees(this.group, themed, halfX, halfZ, rng);
    this._lampLights.push(...propKit.buildStreetlights(this.group, themed, halfX, halfZ, rng));
    this._buildSigns(levelConfig.spots);
    this._buildEntranceSign(levelConfig.carStart);
    this._buildStreetSign(levelConfig.carStart, rng);
    propKit.buildSpotMarkings(this.group, themed, levelConfig.spots);
    propKit.buildObstacles(this.group, this.physics, rng, levelConfig.obstacles);
    propKit.buildRegulatorySigns(this.group, levelConfig.signs);

    this.physics.setBoundary(halfX, halfZ);
    return { theme: themed };
  }

  _buildSigns(spots) {
    const target = spots.find((s) => s.isTarget) || spots[0];
    if (!target) return;
    propKit.buildTargetSign(this.group, target);
  }

  _buildEntranceSign(carStart) {
    const sx = carStart.x - 2;
    const sz = -(AISLE_HALF_WIDTH + 1.4);
    propKit.buildEntranceSign(this.group, sx, sz);
  }

  _buildStreetSign(carStart, rng) {
    const entry = SAUDI_STREET_NAMES[Math.floor(rng() * SAUDI_STREET_NAMES.length)];
    const sx = carStart.x + 3;
    const sz = AISLE_HALF_WIDTH + 1.4;
    propKit.buildStreetSign(this.group, sx, sz, entry.ar, entry.en);
  }
}
