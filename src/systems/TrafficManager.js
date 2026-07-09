/*
 * MASAR
 * Owner: Saud Alqhtani
 * GitHub: sqp77
 * =============
 */

import * as THREE from 'three';
import { createCarModel } from '../entities/Car.js';
import { makeSeededRandom, lerp } from '../utils/MathUtils.js';
import { AISLE_HALF_WIDTH } from '../world/levels.js';

// Independent seed stream from level layout's own `makeSeededRandom(1000 + id)` (levels.js), so
// adding traffic can never perturb the deterministic placement of existing spots/obstacles.
const TRAFFIC_SEED_OFFSET = 2000;
const WARNING_RADIUS = 18; // meters — agents inside this radius of the player feed the HUD radar

const AISLE_MARGIN = 0.5; // every agent path stays within |z| <= AISLE_HALF_WIDTH - AISLE_MARGIN,
// which is strictly inside the driving lane — parking spots always start at z > AISLE_HALF_WIDTH
// (see levels.js's makeSpot/poseToBox convention), so this structurally guarantees traffic can
// never sit on top of a spot.

const PEDESTRIAN_SPEED = 1.2;
const CROSSER_SPEED_RANGE = [4, 6];
const CART_SPEED = 0.8;
const CONE_SPEED = 0.5;

const CROSSER_COLORS = [0x556b7a, 0x7c8590, 0x8a6d4f, 0x4a5568, 0x9c7a5a];

// Manages every "moving obstacle" in a level: walking pedestrians, cars driving across the aisle,
// slow maintenance carts, and cones being relocated. Each agent is a simple ping-pong walker along
// a straight 2-point path; every frame its collider (registered once via PhysicsManager.addCollider,
// same mechanism WorldBuilder uses for static obstacles) and its Object3D transform are both
// updated, so the existing PhysicsManager.step() collision loop resolves the player against moving
// traffic automatically — no changes needed to PhysicsManager itself.
export class TrafficManager {
  constructor(scene, physics) {
    this.scene = scene;
    this.physics = physics;
    this.group = new THREE.Group();
    this.group.name = 'traffic';
    this.scene.add(this.group);
    this.agents = [];
    this.elapsed = 0;
  }

  clear() {
    while (this.group.children.length) {
      const child = this.group.children.pop();
      child.traverse?.((node) => {
        if (node.geometry) node.geometry.dispose();
        if (node.material) {
          const mats = Array.isArray(node.material) ? node.material : [node.material];
          for (const m of mats) m.dispose();
        }
      });
    }
    this.agents = [];
    this.elapsed = 0;
  }

  // `theme` (from WorldBuilder.build()'s return value) only affects whether crossing-traffic
  // headlights are lit — everything else about traffic is level-config driven, not theme driven.
  build(levelConfig, theme) {
    this.clear();
    const cfg = levelConfig.traffic || {};
    if (!cfg.pedestrians && !cfg.crossers && !cfg.carts && !cfg.cones) return;

    const rng = makeSeededRandom(TRAFFIC_SEED_OFFSET + levelConfig.id);
    const { halfX } = levelConfig.bounds;
    const laneHalf = AISLE_HALF_WIDTH - AISLE_MARGIN;

    for (let i = 0; i < (cfg.pedestrians || 0); i++) this._spawnPedestrian(rng, halfX, laneHalf);
    for (let i = 0; i < (cfg.crossers || 0); i++) this._spawnCrosser(rng, halfX, laneHalf, theme);
    for (let i = 0; i < (cfg.carts || 0); i++) this._spawnCart(rng, halfX, laneHalf);
    for (let i = 0; i < (cfg.cones || 0); i++) this._spawnCone(rng, halfX, laneHalf);
  }

  _addAgent({ mesh, type, p0, p1, speed, halfWidth, halfDepth, phase }) {
    const length = Math.max(0.1, Math.hypot(p1.x - p0.x, p1.z - p0.z));
    const cycleTime = (2 * length) / speed;
    const collider = this.physics.addCollider({ x: p0.x, z: p0.z, halfWidth, halfDepth, angle: 0 }, type);
    this.group.add(mesh);
    this.agents.push({ mesh, collider, p0, p1, cycleTime, phaseOffset: phase * cycleTime });
  }

  _spawnPedestrian(rng, halfX, laneHalf) {
    const body = new THREE.Group();
    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.9, 0.28),
      new THREE.MeshStandardMaterial({ color: 0x2b3a55, roughness: 0.85 })
    );
    torso.position.y = 0.55;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshStandardMaterial({ color: 0xd9b48f, roughness: 0.7 }));
    head.position.y = 1.12;
    body.add(torso, head);

    const x = -halfX + 3 + rng() * (halfX * 2 - 6);
    const z0 = -laneHalf + rng() * 0.4;
    const z1 = laneHalf - rng() * 0.4;
    this._addAgent({ mesh: body, type: 'pedestrian', p0: { x, z: z0 }, p1: { x, z: z1 }, speed: PEDESTRIAN_SPEED, halfWidth: 0.3, halfDepth: 0.3, phase: rng() });
  }

  _spawnCrosser(rng, halfX, laneHalf, theme) {
    const length = 4.2;
    const width = 1.8;
    const preset = {
      id: 'crosser',
      color: CROSSER_COLORS[Math.floor(rng() * CROSSER_COLORS.length)],
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
    for (const spot of model.headlightSpots) spot.intensity = theme?.night ? 20 : 0;

    const z = (rng() < 0.5 ? -1 : 1) * (laneHalf - width);
    const speed = lerp(CROSSER_SPEED_RANGE[0], CROSSER_SPEED_RANGE[1], rng());
    this._addAgent({
      mesh: model.group,
      type: 'trafficCar',
      p0: { x: -halfX + 2, z },
      p1: { x: halfX - 2, z },
      speed,
      halfWidth: width / 2,
      halfDepth: length / 2,
      phase: rng(),
    });
  }

  _spawnCart(rng, halfX, laneHalf) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.55, 0.7), new THREE.MeshStandardMaterial({ color: 0xffa63d, roughness: 0.7, metalness: 0.15 }));
    body.position.y = 0.4;
    const basket = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.6), new THREE.MeshStandardMaterial({ color: 0x8a8f97, roughness: 0.8 }));
    basket.position.y = 0.7;
    group.add(body, basket);

    const z = (rng() < 0.5 ? -1 : 1) * (laneHalf - 0.8);
    const cx = -halfX + 3 + rng() * (halfX * 2 - 9);
    this._addAgent({ mesh: group, type: 'cart', p0: { x: cx, z }, p1: { x: cx + 3 + rng() * 3, z }, speed: CART_SPEED, halfWidth: 0.4, halfDepth: 0.6, phase: rng() });
  }

  _spawnCone(rng, halfX, laneHalf) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.65, 10), new THREE.MeshStandardMaterial({ color: 0xff6a1a, roughness: 0.7 }));
    cone.position.y = 0.325;

    const z = (rng() < 0.5 ? -1 : 1) * (laneHalf - 0.4);
    const cx = -halfX + 3 + rng() * (halfX * 2 - 7);
    this._addAgent({ mesh: cone, type: 'cone', p0: { x: cx, z }, p1: { x: cx + 2 + rng() * 2, z }, speed: CONE_SPEED, halfWidth: 0.32, halfDepth: 0.32, phase: rng() });
  }

  // Advances every agent's ping-pong position/heading (and its collider), and returns the agents
  // currently within WARNING_RADIUS of the player for the HUD radar widget.
  update(dt, carState) {
    this.elapsed += dt;
    const warnings = [];
    for (const agent of this.agents) {
      const t = (this.elapsed + agent.phaseOffset) % agent.cycleTime;
      const half = agent.cycleTime / 2;
      const forward = t < half;
      const legT = forward ? t / half : (agent.cycleTime - t) / half;
      const x = lerp(agent.p0.x, agent.p1.x, legT);
      const z = lerp(agent.p0.z, agent.p1.z, legT);
      const dx = agent.p1.x - agent.p0.x;
      const dz = agent.p1.z - agent.p0.z;
      const heading = forward ? Math.atan2(dz, dx) : Math.atan2(-dz, -dx);

      agent.mesh.position.set(x, agent.mesh.position.y, z);
      agent.mesh.rotation.y = -heading;
      agent.collider.obb.set(x, z, heading - Math.PI / 2);

      if (Math.hypot(carState.x - x, carState.z - z) <= WARNING_RADIUS) {
        warnings.push({ x, z, type: agent.collider.type });
      }
    }
    return warnings;
  }
}
