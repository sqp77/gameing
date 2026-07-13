import * as THREE from 'three';

// Procedurally generated canvas textures — keeps the game a single bundle
// with zero external image assets to download.

export function createRoadTexture() {
  const w = 256;
  const h = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // Asphalt base with subtle noise
  ctx.fillStyle = '#2b2d30';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const shade = Math.random() * 20 - 10;
    ctx.fillStyle = `rgba(${20 + shade + 20},${21 + shade + 20},${24 + shade + 20},0.5)`;
    ctx.fillRect(x, y, 1.4, 1.4);
  }

  // Shoulder lines
  ctx.fillStyle = '#f4e9c9';
  ctx.fillRect(6, 0, 5, h);
  ctx.fillRect(w - 11, 0, 5, h);

  // Lane dashes (2 dividers for 3 lanes)
  ctx.fillStyle = '#f4e9c9';
  const dashH = 60;
  const gap = 50;
  for (let laneLine = 1; laneLine <= 2; laneLine++) {
    const x = (w / 3) * laneLine - 3;
    for (let y = 0; y < h; y += dashH + gap) {
      ctx.fillRect(x, y, 6, dashH);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 24);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createSandTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#d9b877';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const shade = Math.random() * 26 - 13;
    ctx.fillStyle = `rgba(${180 + shade},${145 + shade},${95 + shade},0.4)`;
    ctx.fillRect(x, y, 1.6, 1.6);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(40, 200);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createCloudTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.6, 'rgba(255,255,255,0.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createDustTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(size / 2, size / 2, 1, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(216,190,140,0.8)');
  grad.addColorStop(1, 'rgba(216,190,140,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
