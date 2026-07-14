import * as THREE from 'three';

// A literal 3D finish-line arch, dressed with the brand mark, that the truck
// crosses as the 60-second run winds down.u7

export class FinishBanner {
  constructor(scene, roadHalfWidth, logoTexture) {
    this.group = new THREE.Group();
    this.group.visible = false;

    const poleMat = new THREE.MeshStandardMaterial({ color: 0x1c1e22, metalness: 0.5, roughness: 0.4 });
    const poleHeight = 6.4;
    for (const x of [-roadHalfWidth - 0.3, roadHalfWidth + 0.3]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, poleHeight, 10), poleMat);
      pole.position.set(x, poleHeight / 2, 0);
      pole.castShadow = true;
      this.group.add(pole);
    }

    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(roadHalfWidth * 2 + 0.9, 0.4, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x17a45f, roughness: 0.5 })
    );
    beam.position.set(0, poleHeight, 0);
    beam.castShadow = true;
    this.group.add(beam);

    // Checkered strip
    const checker = document.createElement('canvas');
    checker.width = 256;
    checker.height = 32;
    const cctx = checker.getContext('2d');
    const cell = 16;
    for (let x = 0; x < checker.width; x += cell) {
      for (let y = 0; y < checker.height; y += cell) {
        const even = (x / cell + y / cell) % 2 === 0;
        cctx.fillStyle = even ? '#ffffff' : '#111111';
        cctx.fillRect(x, y, cell, cell);
      }
    }
    const checkerTex = new THREE.CanvasTexture(checker);
    checkerTex.wrapS = THREE.RepeatWrapping;
    checkerTex.repeat.set(4, 1);
    const checkerStrip = new THREE.Mesh(
      new THREE.PlaneGeometry(roadHalfWidth * 2 + 0.9, 0.55),
      new THREE.MeshBasicMaterial({ map: checkerTex })
    );
    checkerStrip.position.set(0, poleHeight - 0.55, 0.22);
    this.group.add(checkerStrip);

    // Center banner with the brand mark
    const bannerW = 2.6;
    const banner = new THREE.Mesh(
      new THREE.PlaneGeometry(bannerW, 1.3),
      new THREE.MeshStandardMaterial({ color: 0xf5f2e8, roughness: 0.5 })
    );
    banner.position.set(0, poleHeight - 1.55, 0.22);
    this.group.add(banner);

    const mark = new THREE.Mesh(
      new THREE.PlaneGeometry(0.95, 0.95),
      new THREE.MeshBasicMaterial({ map: logoTexture, transparent: true, alphaTest: 0.4 })
    );
    mark.position.set(0, poleHeight - 1.55, 0.23);
    this.group.add(mark);

    scene.add(this.group);
  }

  spawnAhead(vehicleZ, distanceAhead = 46) {
    this.group.position.z = vehicleZ - distanceAhead;
    this.group.visible = true;
  }

  update(delta) {
    if (!this.group.visible) return;
    this.group.position.z += delta;
  }

  reset() {
    this.group.visible = false;
  }
}
