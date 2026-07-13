import * as THREE from 'three';

export const LOGO_URL = '/brand/icon.svg';

let _cached = null;

// Rasterizes the official SVG mark onto a transparent canvas once, at a size
// sharp enough for both the tailgate decal (viewed up close) and billboards
// (viewed from a distance). Reused everywhere in 3D via one shared texture.
export async function loadLogoTexture(size = 512) {
  if (_cached) return _cached;

  const svgText = await (await fetch(LOGO_URL)).text();
  const blob = new Blob([svgText], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);

  const img = await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
  URL.revokeObjectURL(url);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  const pad = size * 0.08;
  ctx.drawImage(img, pad, pad, size - pad * 2, size - pad * 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;

  _cached = texture;
  return texture;
}

// A simple round decal plate: light backing disc + the logo mark on top,
// tinted to match the brand mark's usual presentation on merchandise/signage.
export function buildLogoDecal(logoTexture, { size = 0.6, backingColor = 0xf5f2e8 } = {}) {
  const group = new THREE.Group();

  const backing = new THREE.Mesh(
    new THREE.CircleGeometry(size * 0.56, 32),
    new THREE.MeshStandardMaterial({ color: backingColor, roughness: 0.5, metalness: 0.15 })
  );
  group.add(backing);

  const mark = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({
      map: logoTexture,
      transparent: true,
      alphaTest: 0.4,
      depthWrite: false,
    })
  );
  mark.position.z = 0.005;
  group.add(mark);

  return group;
}
