import * as THREE from 'three';
import { createRoadTexture, createSandTexture } from './Textures.js';
import { LANES } from '../core/Constants.js';

const ROAD_HALF_WIDTH = Math.abs(LANES[0]) + 2.6; // lane center + half lane + shoulder
const ROAD_LENGTH = 420;

export class Road {
  constructor(scene) {
    this.scene = scene;
    this.distance = 0;

    this.roadTexture = createRoadTexture();
    const roadGeo = new THREE.PlaneGeometry(ROAD_HALF_WIDTH * 2, ROAD_LENGTH, 1, 1);
    const roadMat = new THREE.MeshStandardMaterial({
      map: this.roadTexture,
      roughness: 0.95,
      metalness: 0.05,
    });
    this.roadMesh = new THREE.Mesh(roadGeo, roadMat);
    this.roadMesh.rotation.x = -Math.PI / 2;
    this.roadMesh.position.set(0, 0, -ROAD_LENGTH / 2 + 60);
    this.roadMesh.receiveShadow = true;
    scene.add(this.roadMesh);

    // Sand on both sides
    this.sandTexture = createSandTexture();
    const sandGeo = new THREE.PlaneGeometry(600, ROAD_LENGTH, 1, 1);
    const sandMat = new THREE.MeshStandardMaterial({ map: this.sandTexture, roughness: 1 });

    this.sandLeft = new THREE.Mesh(sandGeo, sandMat);
    this.sandLeft.rotation.x = -Math.PI / 2;
    this.sandLeft.position.set(-ROAD_HALF_WIDTH - 300, -0.02, this.roadMesh.position.z);
    this.sandLeft.receiveShadow = true;
    scene.add(this.sandLeft);

    this.sandRight = this.sandLeft.clone();
    this.sandRight.material = sandMat;
    this.sandRight.position.x = ROAD_HALF_WIDTH + 300;
    scene.add(this.sandRight);

    // Raised curbs
    const curbGeo = new THREE.BoxGeometry(0.35, 0.18, ROAD_LENGTH);
    const curbMat = new THREE.MeshStandardMaterial({ color: 0xcfc6ab, roughness: 0.8 });
    this.curbLeft = new THREE.Mesh(curbGeo, curbMat);
    this.curbLeft.position.set(-ROAD_HALF_WIDTH, 0.08, this.roadMesh.position.z);
    this.curbLeft.castShadow = true;
    scene.add(this.curbLeft);
    this.curbRight = this.curbLeft.clone();
    this.curbRight.position.x = ROAD_HALF_WIDTH;
    scene.add(this.curbRight);
  }

  get halfWidth() {
    return ROAD_HALF_WIDTH;
  }

  update(distanceDelta) {
    this.distance += distanceDelta;
    this.roadTexture.offset.y = (this.distance / 6) % 1;
    this.sandTexture.offset.y = (this.distance / 30) % 1;
  }
}
