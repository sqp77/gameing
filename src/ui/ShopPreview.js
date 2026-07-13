/*
 * MASAR
 * Owner: Saud Alqhtani
 * GitHub: sqp77
 * =============
 */

import * as THREE from 'three';
import { createCarModel } from '../entities/Car.js';

// v1.2.0 Vehicle Showroom — a small, fully self-contained 3D preview (its own renderer, scene,
// and canvas) reusing createCarModel verbatim. Deliberately decoupled from GameManager's main
// render loop/scene: start()/stop() are called from UIManager only while the Shop screen is
// visible, so this costs nothing during actual driving (the one place performance matters most).
export class ShopPreview {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
    this.camera.position.set(4.6, 2.6, 4.6);
    this.camera.lookAt(0, 0.6, 0);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x22283a, 1.1));
    const dir = new THREE.DirectionalLight(0xffffff, 1.4);
    dir.position.set(3, 6, 4);
    this.scene.add(dir);

    this._modelGroup = null;
    this._angle = 0;
    this._running = false;
    this._raf = null;
  }

  _resize() {
    const { clientWidth, clientHeight } = this.canvas;
    if (!clientWidth || !clientHeight) return;
    this.renderer.setSize(clientWidth, clientHeight, false);
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();
  }

  showVehicle(preset) {
    if (this._modelGroup) {
      this.scene.remove(this._modelGroup);
      this._disposeGroup(this._modelGroup);
    }
    const model = createCarModel(preset);
    this._modelGroup = model.group;
    this.scene.add(this._modelGroup);
  }

  _disposeGroup(group) {
    group.traverse((node) => {
      if (node.geometry) node.geometry.dispose();
      if (node.material) {
        const mats = Array.isArray(node.material) ? node.material : [node.material];
        for (const m of mats) m.dispose();
      }
    });
  }

  start() {
    if (this._running) return;
    this._running = true;
    this._resize();
    const loop = () => {
      if (!this._running) return;
      this._angle += 0.012;
      if (this._modelGroup) this._modelGroup.rotation.y = this._angle;
      this.renderer.render(this.scene, this.camera);
      this._raf = requestAnimationFrame(loop);
    };
    loop();
  }

  stop() {
    this._running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
  }
}
