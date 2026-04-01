import * as THREE from "three";
import { getAnimation } from "./animations";
import type { AnimationType } from "./style-prompt";

export interface RenderOptions {
  textureUrl: string;
  animationType: AnimationType;
  width: number;
  height: number;
  fps: number;
  duration: number;
}

export async function renderFrames(
  options: RenderOptions
): Promise<Uint8Array> {
  const { textureUrl, animationType, width, height, fps, duration } = options;

  const effectiveFps = width >= 2048 ? Math.min(fps, 60) : fps;
  const totalFrames = duration * effectiveFps;
  const frameSize = width * height * 4;

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  renderer.setSize(width, height);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0, 3);
  camera.lookAt(0, 0, 0);

  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);
  const directional = new THREE.DirectionalLight(0xffffff, 0.8);
  directional.position.set(2, 3, 4);
  scene.add(directional);

  const texture = await new Promise<THREE.Texture>((resolve) => {
    new THREE.TextureLoader().load(textureUrl, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      resolve(tex);
    });
  });

  const geometry = new THREE.PlaneGeometry(1.5, 1.5);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.01,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  const animFn = getAnimation(animationType);

  const allPixels = new Uint8Array(totalFrames * frameSize);
  const readBuffer = new Uint8Array(frameSize);

  for (let i = 0; i < totalFrames; i++) {
    const t = i / totalFrames;
    const anim = animFn(t);

    mesh.position.set(...anim.position);
    mesh.rotation.set(...anim.rotation);
    mesh.scale.set(...anim.scale);

    if (anim.cameraPosition) {
      camera.position.set(...anim.cameraPosition);
      camera.lookAt(0, 0, 0);
    }

    renderer.render(scene, camera);

    const gl = renderer.getContext();
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, readBuffer);

    // WebGL reads bottom-to-top, flip vertically
    for (let y = 0; y < height; y++) {
      const srcRow = (height - 1 - y) * width * 4;
      const dstRow = y * width * 4;
      allPixels.set(
        readBuffer.subarray(srcRow, srcRow + width * 4),
        i * frameSize + dstRow
      );
    }

    // Yield every 10 frames to avoid blocking the main thread
    if (i % 10 === 0) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  renderer.dispose();
  geometry.dispose();
  material.dispose();
  texture.dispose();

  return allPixels;
}

export function getEffectiveFps(width: number, requestedFps: number): number {
  return width >= 2048 ? Math.min(requestedFps, 60) : requestedFps;
}
