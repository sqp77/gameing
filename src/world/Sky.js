import * as THREE from 'three';
import { createCloudTexture } from './Textures.js';

const skyVertex = /* glsl */ `
  varying vec3 vWorldPosition;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const skyFragment = /* glsl */ `
  varying vec3 vWorldPosition;
  uniform vec3 topColor;
  uniform vec3 middleColor;
  uniform vec3 horizonColor;
  uniform float offset;
  uniform float exponent;
  void main() {
    float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;
    float t = max(pow(max(h, 0.0), exponent), 0.0);
    vec3 col = mix(horizonColor, middleColor, smoothstep(0.0, 0.35, h));
    col = mix(col, topColor, smoothstep(0.2, 1.0, h));
    gl_FragColor = vec4(col, 1.0);
  }
`;

export class Sky {
  constructor(scene) {
    this.scene = scene;

    const geometry = new THREE.SphereGeometry(500, 32, 16);
    this.uniforms = {
      topColor: { value: new THREE.Color(0x2f7fd6) },
      middleColor: { value: new THREE.Color(0x9fd3f0) },
      horizonColor: { value: new THREE.Color(0xf5e3bd) },
      offset: { value: 20 },
      exponent: { value: 0.6 },
    };
    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: skyVertex,
      fragmentShader: skyFragment,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    scene.add(this.mesh);

    // Sun
    const sunGeo = new THREE.SphereGeometry(9, 24, 24);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff2c9 });
    this.sun = new THREE.Mesh(sunGeo, sunMat);
    this.sun.position.set(-120, 90, -220);
    scene.add(this.sun);

    const sunGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this._glowTexture(),
        color: 0xfff2c9,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      })
    );
    sunGlow.scale.set(120, 120, 1);
    this.sun.add(sunGlow);

    this._buildClouds();
  }

  _glowTexture() {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
  }

  _buildClouds() {
    const tex = createCloudTexture();
    const material = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });

    this.clouds = [];
    const count = 22;
    for (let i = 0; i < count; i++) {
      const sprite = new THREE.Sprite(material.clone());
      const scale = 30 + Math.random() * 45;
      sprite.scale.set(scale * 1.8, scale, 1);
      sprite.position.set(
        (Math.random() - 0.5) * 500,
        55 + Math.random() * 40,
        -Math.random() * 400 + 50
      );
      sprite.material.opacity = 0.55 + Math.random() * 0.3;
      sprite.userData.speed = 0.4 + Math.random() * 0.6;
      this.scene.add(sprite);
      this.clouds.push(sprite);
    }
  }

  update(dt) {
    for (const cloud of this.clouds) {
      cloud.position.x += cloud.userData.speed * dt * 3;
      if (cloud.position.x > 300) cloud.position.x = -300;
    }
  }
}
