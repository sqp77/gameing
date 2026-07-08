/*
 * ParkMaster3D
 * Owner: Saud
 * GitHub: sqp77
 * =============
 */

import * as THREE from 'three';

// Named, unlockable vehicle presets. Dimensions are in meters and drive both
// the visual model and the physics footprint (wheelbase/track/turn radius).
export const VEHICLE_PRESETS = [
  {
    id: 'hatchback',
    name: 'City Hatchback',
    unlockLevel: 1,
    cost: 0,
    color: 0x2ec4ff,
    length: 4.0,
    width: 1.8,
    height: 1.35,
    wheelbase: 2.5,
    track: 1.55,
    maxSpeed: 26,
    accel: 9,
    handling: 1.15,
  },
  {
    id: 'sedan',
    name: 'Sport Sedan',
    unlockLevel: 6,
    cost: 200,
    color: 0xff5252,
    length: 4.6,
    width: 1.85,
    height: 1.3,
    wheelbase: 2.8,
    track: 1.6,
    maxSpeed: 32,
    accel: 10.5,
    handling: 1.0,
  },
  {
    id: 'suv',
    name: 'Urban SUV',
    unlockLevel: 11,
    cost: 400,
    color: 0xffc233,
    length: 4.8,
    width: 2.0,
    height: 1.7,
    wheelbase: 2.85,
    track: 1.65,
    maxSpeed: 28,
    accel: 8,
    handling: 0.85,
  },
  {
    id: 'coupe',
    name: 'Speed Coupe',
    unlockLevel: 16,
    cost: 650,
    color: 0xb388ff,
    length: 4.3,
    width: 1.9,
    height: 1.15,
    wheelbase: 2.65,
    track: 1.62,
    maxSpeed: 38,
    accel: 13,
    handling: 1.3,
  },
];

function buildWheel(radius, width) {
  const geo = new THREE.CylinderGeometry(radius, radius, width, 18);
  geo.rotateZ(Math.PI / 2);
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.85, metalness: 0.1 });
  const wheel = new THREE.Mesh(geo, tireMat);
  wheel.castShadow = true;

  const hubGeo = new THREE.CylinderGeometry(radius * 0.55, radius * 0.55, width * 1.02, 12);
  hubGeo.rotateZ(Math.PI / 2);
  const hubMat = new THREE.MeshStandardMaterial({ color: 0xcfd4d8, roughness: 0.35, metalness: 0.8 });
  const hub = new THREE.Mesh(hubGeo, hubMat);
  wheel.add(hub);

  return wheel;
}

// Builds a complete drivable car as a THREE.Group, procedurally from primitives
// (no external model assets). Returns handles needed by physics + effects.
export function createCarModel(preset) {
  const group = new THREE.Group();
  group.name = `car-${preset.id}`;

  const { length: L, width: W, height: H } = preset;
  const bodyMat = new THREE.MeshStandardMaterial({ color: preset.color, roughness: 0.35, metalness: 0.55 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x0c0e12, roughness: 0.5, metalness: 0.3 });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0a1420,
    roughness: 0.05,
    metalness: 0.1,
    transmission: 0.55,
    transparent: true,
    opacity: 0.75,
  });

  const wheelRadius = H * 0.235;
  const rideHeight = wheelRadius * 0.92;

  // ----- Lower body shell -----
  const lowerH = H * 0.5;
  const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(L, lowerH, W), bodyMat);
  lowerBody.position.y = rideHeight + lowerH / 2;
  lowerBody.castShadow = true;
  lowerBody.receiveShadow = true;
  group.add(lowerBody);

  // Front + rear bumpers (slightly protruding, darker)
  const bumperGeo = new THREE.BoxGeometry(L * 0.12, lowerH * 0.55, W * 1.02);
  const frontBumper = new THREE.Mesh(bumperGeo, darkMat);
  frontBumper.position.set(L / 2 - (L * 0.06), rideHeight + lowerH * 0.35, 0);
  frontBumper.castShadow = true;
  group.add(frontBumper);
  const rearBumper = frontBumper.clone();
  rearBumper.position.x = -(L / 2 - L * 0.06);
  group.add(rearBumper);

  // ----- Cabin / greenhouse -----
  const cabinL = L * 0.52;
  const cabinH = H * 0.5;
  const cabinGeo = new THREE.BoxGeometry(cabinL, cabinH, W * 0.92);
  const cabin = new THREE.Mesh(cabinGeo, bodyMat);
  cabin.position.set(-L * 0.03, rideHeight + lowerH + cabinH / 2, 0);
  cabin.castShadow = true;
  group.add(cabin);

  // Taper the cabin roof slightly by scaling the top via a second smaller box (windshield area)
  const roofGeo = new THREE.BoxGeometry(cabinL * 0.86, cabinH * 0.22, W * 0.86);
  const roof = new THREE.Mesh(roofGeo, bodyMat);
  roof.position.set(-L * 0.03, rideHeight + lowerH + cabinH + roofGeo.parameters.height / 2 - 0.01, 0);
  roof.castShadow = true;
  group.add(roof);

  // Windows wrap (simple inset box, slightly smaller, using glass material) as windshield/side glass band
  const glassGeo = new THREE.BoxGeometry(cabinL * 0.98, cabinH * 0.62, W * 0.9);
  const glassBand = new THREE.Mesh(glassGeo, glassMat);
  glassBand.position.set(-L * 0.03, rideHeight + lowerH + cabinH * 0.62, 0);
  group.add(glassBand);

  // ----- Headlights -----
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffee, emissiveIntensity: 1.4 });
  const headGeo = new THREE.BoxGeometry(0.06, H * 0.14, W * 0.18);
  const headL = new THREE.Mesh(headGeo, headMat);
  headL.position.set(L / 2 - 0.02, rideHeight + lowerH * 0.55, W * 0.32);
  group.add(headL);
  const headR = headL.clone();
  headR.position.z = -W * 0.32;
  group.add(headR);

  const headlightSpotL = new THREE.SpotLight(0xfff2cc, 0, 22, Math.PI / 6, 0.5, 1.2);
  headlightSpotL.position.copy(headL.position);
  headlightSpotL.target.position.set(L, rideHeight, W * 0.32);
  group.add(headlightSpotL);
  group.add(headlightSpotL.target);
  const headlightSpotR = headlightSpotL.clone();
  headlightSpotR.position.copy(headR.position);
  headlightSpotR.target.position.set(L, rideHeight, -W * 0.32);
  group.add(headlightSpotR);
  group.add(headlightSpotR.target);

  // ----- Taillights (emissive; toggled bright as brake lights) -----
  const tailMat = new THREE.MeshStandardMaterial({ color: 0x330000, emissive: 0xff1111, emissiveIntensity: 0.4 });
  const tailGeo = new THREE.BoxGeometry(0.06, H * 0.12, W * 0.16);
  const tailL = new THREE.Mesh(tailGeo, tailMat);
  tailL.position.set(-L / 2 + 0.02, rideHeight + lowerH * 0.55, W * 0.32);
  group.add(tailL);
  const tailR = tailL.clone();
  tailR.position.z = -W * 0.32;
  group.add(tailR);

  // ----- Side mirrors -----
  const mirrorGeo = new THREE.BoxGeometry(0.12, 0.1, 0.05);
  const mirrorL = new THREE.Mesh(mirrorGeo, darkMat);
  mirrorL.position.set(L * 0.14, rideHeight + lowerH + cabinH * 0.55, W / 2 + 0.03);
  group.add(mirrorL);
  const mirrorR = mirrorL.clone();
  mirrorR.position.z = -(W / 2 + 0.03);
  group.add(mirrorR);

  // ----- Wheels -----
  const wheelWidth = W * 0.16;
  const wheelX = preset.wheelbase / 2;
  const wheelZ = preset.track / 2;

  const wheelFL = buildWheel(wheelRadius, wheelWidth);
  wheelFL.position.set(wheelX, wheelRadius, wheelZ);
  const wheelFR = buildWheel(wheelRadius, wheelWidth);
  wheelFR.position.set(wheelX, wheelRadius, -wheelZ);
  const wheelRL = buildWheel(wheelRadius, wheelWidth);
  wheelRL.position.set(-wheelX, wheelRadius, wheelZ);
  const wheelRR = buildWheel(wheelRadius, wheelWidth);
  wheelRR.position.set(-wheelX, wheelRadius, -wheelZ);

  // Steering pivots for the front wheels: rotate the pivot around Y for steer,
  // and the wheel mesh itself around its local X for rolling.
  const pivotFL = new THREE.Group();
  pivotFL.position.copy(wheelFL.position);
  wheelFL.position.set(0, 0, 0);
  pivotFL.add(wheelFL);

  const pivotFR = new THREE.Group();
  pivotFR.position.copy(wheelFR.position);
  wheelFR.position.set(0, 0, 0);
  pivotFR.add(wheelFR);

  group.add(pivotFL, pivotFR, wheelRL, wheelRR);

  // Simple underbody shadow-catcher plane removed; relying on real shadows.

  return {
    group,
    wheels: { fl: wheelFL, fr: wheelFR, rl: wheelRL, rr: wheelRR },
    steeringPivots: { fl: pivotFL, fr: pivotFR },
    brakeLights: [tailL, tailR],
    headlightSpots: [headlightSpotL, headlightSpotR],
    wheelRadius,
    rideHeight,
    dimensions: { length: L, width: W, height: H, wheelbase: preset.wheelbase, track: preset.track },
  };
}
