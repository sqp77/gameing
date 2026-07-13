import * as THREE from 'three';
import { createDustTexture } from './Textures.js';
import { SPAWN_Z, DESPAWN_Z } from '../core/Constants.js';
import { buildLogoDecal } from '../branding/Logo.js';

function buildPalmTree() {
  const group = new THREE.Group();

  const trunkCurveHeight = 5.2 + Math.random() * 1.4;
  const trunkGeo = new THREE.CylinderGeometry(0.14, 0.24, trunkCurveHeight, 7);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 0.9 });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = trunkCurveHeight / 2;
  trunk.rotation.z = (Math.random() - 0.5) * 0.12;
  trunk.castShadow = true;
  group.add(trunk);

  const frondMat = new THREE.MeshStandardMaterial({ color: 0x2f8f4e, roughness: 0.8, side: THREE.DoubleSide });
  const frondGeo = new THREE.ConeGeometry(0.45, 2.6, 4, 1, true);
  const frondCount = 7;
  for (let i = 0; i < frondCount; i++) {
    const frond = new THREE.Mesh(frondGeo, frondMat);
    frond.position.y = trunkCurveHeight + 0.1;
    const angle = (i / frondCount) * Math.PI * 2;
    frond.rotation.z = Math.PI / 2.1;
    frond.rotation.y = angle;
    frond.rotation.x = 0.5 + Math.random() * 0.15;
    frond.castShadow = true;
    group.add(frond);
  }

  // A few coconuts
  const coconutGeo = new THREE.SphereGeometry(0.16, 6, 6);
  const coconutMat = new THREE.MeshStandardMaterial({ color: 0x5a4326 });
  for (let i = 0; i < 3; i++) {
    const c = new THREE.Mesh(coconutGeo, coconutMat);
    c.position.set((Math.random() - 0.5) * 0.4, trunkCurveHeight - 0.1, (Math.random() - 0.5) * 0.4);
    group.add(c);
  }

  return group;
}

function buildStreetLight() {
  const group = new THREE.Group();
  const poleGeo = new THREE.CylinderGeometry(0.08, 0.1, 6.5, 8);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x3a3f45, metalness: 0.6, roughness: 0.4 });
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.y = 3.25;
  pole.castShadow = true;
  group.add(pole);

  const armGeo = new THREE.BoxGeometry(1.4, 0.1, 0.1);
  const arm = new THREE.Mesh(armGeo, poleMat);
  arm.position.set(0.7, 6.4, 0);
  group.add(arm);

  const headGeo = new THREE.SphereGeometry(0.22, 10, 10);
  const headMat = new THREE.MeshStandardMaterial({
    color: 0xfff2c0,
    emissive: 0xffe28a,
    emissiveIntensity: 1.4,
  });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.set(1.35, 6.35, 0);
  group.add(head);

  const glow = new THREE.PointLight(0xffdd88, 0.6, 9, 2);
  glow.position.copy(head.position);
  group.add(glow);

  return group;
}

function buildBillboard(logoTexture, sideSign) {
  const group = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x3a3f45, metalness: 0.6, roughness: 0.4 });

  for (const dz of [-0.9, 0.9]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 4.4, 8), poleMat);
    pole.position.set(0, 2.2, dz);
    pole.castShadow = true;
    group.add(pole);
  }

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 2.6, 2.2),
    new THREE.MeshStandardMaterial({ color: 0x0b3d2e, roughness: 0.6 })
  );
  frame.position.set(0, 3.9, 0);
  frame.castShadow = true;
  group.add(frame);

  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(1.9, 1.9),
    new THREE.MeshStandardMaterial({ color: 0xf5f2e8, roughness: 0.5, metalness: 0.1 })
  );
  panel.position.set(0.09, 3.9, 0);
  group.add(panel);

  const mark = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 1.5),
    new THREE.MeshBasicMaterial({ map: logoTexture, transparent: true, alphaTest: 0.4 })
  );
  mark.position.set(0.1, 3.9, 0);
  group.add(mark);

  // Orient the panel to face oncoming traffic on whichever side of the road it sits.
  group.rotation.y = sideSign < 0 ? Math.PI / 2 : -Math.PI / 2;

  return group;
}

class PropPool {
  constructor(scene, builder, count, xPositions, spacing, zStart) {
    this.items = [];
    for (let i = 0; i < count; i++) {
      const side = xPositions[i % xPositions.length];
      const mesh = builder(side);
      mesh.position.x = side;
      mesh.position.z = zStart - i * spacing;
      scene.add(mesh);
      this.items.push(mesh);
    }
    this.spacing = spacing;
    this.totalSpan = spacing * count;
  }

  update(delta) {
    for (const item of this.items) {
      item.position.z += delta;
      if (item.position.z > DESPAWN_Z) {
        item.position.z -= this.totalSpan;
      }
    }
  }
}

export class Environment {
  constructor(scene, roadHalfWidth, logoTexture) {
    this.scene = scene;

    const palmX = [-(roadHalfWidth + 3.2), roadHalfWidth + 3.2];
    this.palms = new PropPool(scene, buildPalmTree, 20, palmX, 14, SPAWN_Z);

    const lightX = [-(roadHalfWidth + 1.6), roadHalfWidth + 1.6];
    this.lights = new PropPool(scene, buildStreetLight, 14, lightX, 24, SPAWN_Z);

    if (logoTexture) {
      const billboardX = [-(roadHalfWidth + 5.5), roadHalfWidth + 5.5];
      this.billboards = new PropPool(
        scene,
        (side) => buildBillboard(logoTexture, side),
        6,
        billboardX,
        55,
        SPAWN_Z + 20
      );
    }

    this._buildDust(scene);
  }

  _buildDust(scene) {
    const count = 120;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = Math.random() * 3.5;
      positions[i * 3 + 2] = SPAWN_Z + Math.random() * (DESPAWN_Z - SPAWN_Z);
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      map: createDustTexture(),
      size: 1.1,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.dust = new THREE.Points(geometry, material);
    scene.add(this.dust);
    this._dustCount = count;
  }

  update(delta, speedRatio) {
    this.palms.update(delta);
    this.lights.update(delta);
    if (this.billboards) this.billboards.update(delta);

    const positions = this.dust.geometry.attributes.position;
    for (let i = 0; i < this._dustCount; i++) {
      let z = positions.getZ(i) + delta * (0.6 + speedRatio * 0.6);
      if (z > DESPAWN_Z) z = SPAWN_Z + Math.random() * 30;
      positions.setZ(i, z);
    }
    positions.needsUpdate = true;
  }
}
