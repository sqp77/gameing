/*
 * MASAR
 * Owner: Saud Alqhtani
 * GitHub: sqp77
 * =============
 */

import * as THREE from 'three';
import { getTheme } from './themes.js';
import { makeSeededRandom } from '../utils/MathUtils.js';
import { createCarModel } from '../entities/Car.js';
import * as propKit from './propKit.js';
import { HUB_BOUNDS, HUB_LANDMARKS, HUB_JOB_MARKERS, HUB_DEALERSHIP_LOT, HUB_THEME_ID } from '../data/hubMap.js';
import { STRINGS } from '../data/strings.js';

const HUB_SEED = 90001;
const LANDMARK_ACCENTS = { academy: '#1a6fd4', licenseCenter: '#0d6b3a', dealership: '#b8862e' };

// Builds the persistent Open World Hub (Feature 1): a compact drivable city area sharing
// every visual primitive with the per-level WorldBuilder (both built on propKit.js) but,
// unlike WorldBuilder, built once and never cleared while the player is driving around,
// accepting a job, or approaching a landmark — only re-`build()`'d when re-entering the
// hub from outside it (see GameManager#enterHub). Landmark buildings (Academy, License
// Center, Dealership — Feature 1's three destinations) are real colliders with bilingual
// signage (Feature 9); job markers (Feature 2) and the dealership's ambient parked-car lot
// (Feature 7) are cosmetic props positioned from data/hubMap.js.
export class HubBuilder {
  constructor(scene, physics) {
    this.scene = scene;
    this.physics = physics;
    this.group = new THREE.Group();
    this.group.name = 'hub';
    this.scene.add(this.group);
    this._lampLights = [];
    this._flags = [];
    this._elapsed = 0;
  }

  clear() {
    while (this.group.children.length) {
      const child = this.group.children.pop();
      child.traverse?.((node) => {
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
    this._lampLights = [];
    this._flags = [];
    this._elapsed = 0;
    this.physics.reset();
  }

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

  build() {
    this.clear();
    // The hub's open area is ~2x a campaign level's, so background building/tree/streetlight
    // density is dialed down from the Riyadh theme's own (propDensity 1.3) — otherwise
    // propKit's per-level prop counts (tuned for campaign-sized lots) would roughly double,
    // which is unnecessary for a backdrop skyline and measurably heavier on mobile GPUs.
    const theme = { ...getTheme(HUB_THEME_ID), propDensity: 0.55 };
    const rng = makeSeededRandom(HUB_SEED);
    const { halfX, halfZ } = HUB_BOUNDS;

    propKit.setupSkyAndLights(this.group, this.scene, theme);
    propKit.buildGround(this.group, theme, halfX, halfZ);
    propKit.buildPerimeter(this.group, this.physics, theme, halfX, halfZ);
    // The background skyline is purely decorative and, at hub scale, is by far the largest
    // single group of shadow casters — muted here (traversed right after creation) rather
    // than changing propKit's shared builder, so the campaign's WorldBuilder keeps its
    // existing shadow look untouched.
    const beforeSkyline = this.group.children.length;
    const { flags } = propKit.buildBuildingCluster(this.group, theme, halfX, halfZ, rng, { flagEnabled: true, flagCount: 2 });
    for (let i = beforeSkyline; i < this.group.children.length; i++) {
      this.group.children[i].traverse?.((node) => {
        if (node.isMesh) node.castShadow = false;
      });
    }
    this._flags.push(...flags);
    propKit.buildTrees(this.group, theme, halfX, halfZ, rng);
    this._lampLights.push(...propKit.buildStreetlights(this.group, theme, halfX, halfZ, rng));

    for (const landmark of HUB_LANDMARKS) this._buildLandmark(theme, landmark);
    for (const marker of HUB_JOB_MARKERS) this._buildJobMarkerPost(marker);
    this._buildDealershipLot();

    this.physics.setBoundary(halfX, halfZ);
    return { theme };
  }

  _makeLandmarkSignTexture(labelAr, labelEn, accentHex) {
    const w = 512;
    const h = 220;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = accentHex;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.direction = 'rtl';
    ctx.font = 'bold 56px sans-serif';
    ctx.fillText(labelAr, w / 2, 88);
    ctx.direction = 'ltr';
    ctx.font = '34px sans-serif';
    ctx.fillText(labelEn, w / 2, 160);
    const tex = new THREE.CanvasTexture(canvas);
    if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // One large landmark building — a solid collidable structure (so the player can't drive
  // through it) plus a bilingual entrance sign board (Feature 9: Academy signage in Arabic
  // and English) and a Saudi flag, reusing propKit.buildFlag verbatim. The sign is baked once
  // from the raw strings table (both languages on one board, like the campaign's street signs)
  // rather than the active UI language, since it's a static 3D texture, not DOM text.
  _buildLandmark(theme, landmark) {
    const accent = LANDMARK_ACCENTS[landmark.id] || '#1a6fd4';
    const entry = STRINGS[landmark.labelKey] || { ar: landmark.id, en: landmark.id };
    const w = 16;
    const d = 16;
    const h = 15;
    const mat = new THREE.MeshStandardMaterial({ color: theme.buildingColors[0], roughness: 0.8, metalness: 0.08 });
    propKit.mkBox(this.group, this.physics, w, h, d, landmark.x, h / 2, landmark.z, mat, { collide: true, collideType: 'building' });

    const capMat = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.5, metalness: 0.3 });
    propKit.mkBox(this.group, null, w * 0.9, 0.6, d * 0.9, landmark.x, h + 0.3, landmark.z, capMat);

    // Sign board faces the hub center so it's readable while approaching from the open area.
    const toCenter = Math.atan2(-landmark.z, -landmark.x);
    const signDist = w / 2 + 1.6;
    const sx = landmark.x + Math.cos(toCenter) * signDist;
    const sz = landmark.z + Math.sin(toCenter) * signDist;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.4, 8), new THREE.MeshStandardMaterial({ color: 0x555555 }));
    pole.position.set(sx, 1.7, sz);
    pole.castShadow = true;
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 1.1, 0.08),
      new THREE.MeshStandardMaterial({ map: this._makeLandmarkSignTexture(entry.ar, entry.en, accent), emissive: 0x111111, emissiveIntensity: 0.2 })
    );
    board.position.set(sx, 3.1, sz);
    board.rotation.y = -(toCenter + Math.PI);
    board.castShadow = true;
    this.group.add(pole, board);

    this._flags.push(propKit.buildFlag(this.group, landmark.x + w * 0.55, landmark.z - d * 0.55));
  }

  // Job markers are always visually present (a lit pole + floating gold marker) — JobManager
  // only toggles which ones currently have an active job assigned via trigger logic, not the
  // prop itself, keeping this builder free of per-job state.
  _buildJobMarkerPost(marker) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.4, 8), new THREE.MeshStandardMaterial({ color: 0x555555 }));
    pole.position.set(marker.x, 1.2, marker.z);
    pole.castShadow = true;
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xffc233, emissive: 0xffc233, emissiveIntensity: 1.4, roughness: 0.4 })
    );
    orb.position.set(marker.x, 2.7, marker.z);
    // Emissive material alone reads clearly as a lit marker without the added cost of a real
    // dynamic PointLight — with 5 markers, that's 5 fewer lights for the GPU to account for
    // every material in the scene, which matters far more on mobile than the visual differs.
    this.group.add(pole, orb);
  }

  // Dynamic City Life (Feature 7): a small always-populated "animated" lot near the
  // dealership — purely cosmetic parked cars, never registered with PhysicsManager, so they
  // cost nothing physics-wise and can't ever block the player.
  _buildDealershipLot() {
    const colors = [0x2ec4ff, 0xff5252, 0xffc233, 0xb388ff];
    HUB_DEALERSHIP_LOT.slots.forEach((slot, i) => {
      const preset = {
        id: 'lot-car',
        color: colors[i % colors.length],
        length: 4.2,
        width: 1.85,
        height: 1.3,
        wheelbase: 2.6,
        track: 1.6,
        maxSpeed: 0,
        accel: 0,
        handling: 1,
      };
      const model = createCarModel(preset);
      for (const spot of model.headlightSpots) model.group.remove(spot, spot.target);
      model.group.traverse((node) => {
        if (node.isMesh) node.castShadow = false;
      });
      model.group.position.set(slot.x, 0, slot.z);
      model.group.rotation.y = -slot.heading;
      this.group.add(model.group);
    });
  }
}
