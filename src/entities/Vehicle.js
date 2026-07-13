import * as THREE from 'three';
import { LANES, VEHICLE_Z, LANE_SWITCH_TIME } from '../core/Constants.js';
import { buildLogoDecal } from '../branding/Logo.js';

const BODY_COLOR = 0xc23b2b; // Hilux-esque red
const WHEEL_RADIUS = 0.42;

function buildWheel() {
  const group = new THREE.Group();
  const tireGeo = new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, 0.32, 18);
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.9 });
  const tire = new THREE.Mesh(tireGeo, tireMat);
  tire.rotation.z = Math.PI / 2;
  tire.castShadow = true;
  group.add(tire);

  const rimGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.34, 10);
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xb9bec4, metalness: 0.7, roughness: 0.3 });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  rim.rotation.z = Math.PI / 2;
  group.add(rim);

  return group;
}

export class Vehicle {
  constructor(scene) {
    this.scene = scene;
    this.laneIndex = 1;
    this.targetLaneIndex = 1;
    this._laneFrom = LANES[1];
    this._laneTo = LANES[1];
    this._laneT = 1;
    this.crashShakeTime = 0;
    this.crashFlashTime = 0;

    this.group = new THREE.Group();
    this.group.position.set(LANES[1], 0, VEHICLE_Z);
    scene.add(this.group);

    this._buildBody();
    this._buildWheels();
    this._buildLights();

    this._time = 0;
    this._distance = 0;
  }

  _buildBody() {
    const bodyMat = new THREE.MeshStandardMaterial({ color: BODY_COLOR, metalness: 0.35, roughness: 0.45 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1c1e22, metalness: 0.2, roughness: 0.6 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x1a2733, metalness: 0.2, roughness: 0.1, transparent: true, opacity: 0.85 });

    this.chassis = new THREE.Group();
    this.chassis.position.y = 0.62;
    this.group.add(this.chassis);

    // Lower chassis / bumper base
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.32, 4.6), darkMat);
    base.position.y = -0.18;
    base.castShadow = true;
    this.chassis.add(base);

    // Hood / front body
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.55, 1.7), bodyMat);
    hood.position.set(0, 0.14, -1.55);
    hood.castShadow = true;
    this.chassis.add(hood);

    // Cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.85, 1.5), bodyMat);
    cabin.position.set(0, 0.42, -0.2);
    cabin.castShadow = true;
    this.chassis.add(cabin);

    // Windshield + windows
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.62, 0.06), glassMat);
    windshield.position.set(0, 0.5, -0.95);
    windshield.rotation.x = -0.28;
    this.chassis.add(windshield);

    const sideGlassGeo = new THREE.BoxGeometry(0.06, 0.5, 1.3);
    const glassLeft = new THREE.Mesh(sideGlassGeo, glassMat);
    glassLeft.position.set(-0.92, 0.48, -0.2);
    this.chassis.add(glassLeft);
    const glassRight = glassLeft.clone();
    glassRight.position.x = 0.92;
    this.chassis.add(glassRight);

    // Roof
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.08, 1.35), bodyMat);
    roof.position.set(0, 0.87, -0.2);
    roof.castShadow = true;
    this.chassis.add(roof);

    // Truck bed
    const bedFloor = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 1.9), darkMat);
    bedFloor.position.set(0, 0.2, 1.55);
    this.chassis.add(bedFloor);

    const wallGeo = new THREE.BoxGeometry(1.8, 0.42, 0.08);
    const backWall = new THREE.Mesh(wallGeo, bodyMat);
    backWall.position.set(0, 0.42, 2.5);
    this.chassis.add(backWall);
    this._tailgate = backWall;

    const sideWallGeo = new THREE.BoxGeometry(0.08, 0.42, 1.9);
    const bedLeft = new THREE.Mesh(sideWallGeo, bodyMat);
    bedLeft.position.set(-0.9, 0.42, 1.55);
    this.chassis.add(bedLeft);
    const bedRight = bedLeft.clone();
    bedRight.position.x = 0.9;
    this.chassis.add(bedRight);

    // Grille
    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.32, 0.06), darkMat);
    grille.position.set(0, 0.05, -2.42);
    this.chassis.add(grille);

    // Side mirrors
    const mirrorGeo = new THREE.BoxGeometry(0.08, 0.16, 0.22);
    const mirrorL = new THREE.Mesh(mirrorGeo, darkMat);
    mirrorL.position.set(-0.98, 0.6, -0.85);
    this.chassis.add(mirrorL);
    const mirrorR = mirrorL.clone();
    mirrorR.position.x = 0.98;
    this.chassis.add(mirrorR);

    // Roll bar over bed (common Hilux styling)
    const barMat = new THREE.MeshStandardMaterial({ color: 0x25272b, metalness: 0.8, roughness: 0.3 });
    const barGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.62, 8);
    for (const side of [-0.78, 0.78]) {
      const bar = new THREE.Mesh(barGeo, barMat);
      bar.position.set(side, 0.62, 1.85);
      this.chassis.add(bar);
    }
    const topBar = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.7, 8), barMat);
    topBar.rotation.z = Math.PI / 2;
    topBar.position.set(0, 0.93, 1.85);
    this.chassis.add(topBar);
  }

  _buildWheels() {
    const positions = [
      [-0.95, -0.15, -1.35],
      [0.95, -0.15, -1.35],
      [-0.95, -0.15, 1.25],
      [0.95, -0.15, 1.25],
    ];
    this.wheels = positions.map(([x, y, z]) => {
      const wheel = buildWheel();
      wheel.position.set(x, y, z);
      this.group.add(wheel);
      return wheel;
    });
  }

  _buildLights() {
    const headlightMat = new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0xfff2a8, emissiveIntensity: 1.2 });
    const tailMat = new THREE.MeshStandardMaterial({ color: 0x990000, emissive: 0xff2200, emissiveIntensity: 0.9 });
    const lightGeo = new THREE.BoxGeometry(0.24, 0.14, 0.06);

    for (const side of [-0.7, 0.7]) {
      const headlight = new THREE.Mesh(lightGeo, headlightMat);
      headlight.position.set(side, 0.08, -2.46);
      this.chassis.add(headlight);

      const taillight = new THREE.Mesh(lightGeo, tailMat);
      taillight.position.set(side * 1.25, 0.42, 2.54);
      this.chassis.add(taillight);
    }

    this.headSpot1 = new THREE.SpotLight(0xfff2c9, 0.8, 20, Math.PI / 6, 0.5);
    this.headSpot1.position.set(-0.7, 0.5, -2.4);
    this.headSpot1.target.position.set(-0.7, 0, -20);
    this.chassis.add(this.headSpot1, this.headSpot1.target);

    this.headSpot2 = this.headSpot1.clone();
    this.headSpot2.position.set(0.7, 0.5, -2.4);
    this.headSpot2.target.position.set(0.7, 0, -20);
    this.chassis.add(this.headSpot2, this.headSpot2.target);
  }

  applyLogo(logoTexture) {
    // Branding decal on the tailgate, facing straight back toward the chase camera.
    const decal = buildLogoDecal(logoTexture, { size: 0.62, backingColor: 0xf5f2e8 });
    decal.position.set(0, 0.42, 2.545);
    this.chassis.add(decal);
  }

  requestLaneChange(direction) {
    // direction: -1 = left, +1 = right (world space / screen space)
    const next = THREE.MathUtils.clamp(this.targetLaneIndex + direction, 0, LANES.length - 1);
    if (next === this.targetLaneIndex) return false;
    this.targetLaneIndex = next;
    this._laneFrom = this.group.position.x;
    this._laneTo = LANES[next];
    this._laneT = 0;
    return true;
  }

  triggerCrash() {
    this.crashShakeTime = 0.4;
    this.crashFlashTime = 0.5;
  }

  update(dt, speedRatio, distanceDelta) {
    this._time += dt;
    this._distance += distanceDelta;

    // Lane interpolation with slight overshoot easing
    if (this._laneT < 1) {
      this._laneT = Math.min(1, this._laneT + dt / LANE_SWITCH_TIME);
      const eased = 1 - Math.pow(1 - this._laneT, 3);
      this.group.position.x = THREE.MathUtils.lerp(this._laneFrom, this._laneTo, eased);
      this.laneIndex = this.targetLaneIndex;
    }

    const laneDelta = this._laneTo - this._laneFrom;
    const turning = this._laneT < 1 ? laneDelta : 0;
    const targetTilt = THREE.MathUtils.clamp(-turning * 0.09, -0.22, 0.22);
    this.group.rotation.z = THREE.MathUtils.lerp(this.group.rotation.z, targetTilt, Math.min(1, dt * 10));
    this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetTilt * 0.4, Math.min(1, dt * 10));

    // Suspension bounce
    const bounce = Math.sin(this._time * (8 + speedRatio * 10)) * 0.02 * (0.4 + speedRatio);
    this.chassis.position.y = 0.62 + bounce;
    this.chassis.rotation.x = Math.sin(this._time * 6.5) * 0.008 * (0.5 + speedRatio);

    // Wheel spin
    const spin = distanceDelta / WHEEL_RADIUS;
    for (const wheel of this.wheels) {
      wheel.rotation.x += spin;
    }

    // Crash shake
    if (this.crashShakeTime > 0) {
      this.crashShakeTime -= dt;
      const s = this.crashShakeTime * 0.06;
      this.group.position.y = Math.sin(this._time * 60) * s;
    } else {
      this.group.position.y = THREE.MathUtils.lerp(this.group.position.y, 0, Math.min(1, dt * 8));
    }
    if (this.crashFlashTime > 0) this.crashFlashTime -= dt;
  }
}
