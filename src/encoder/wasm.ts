let wasmModule: typeof import("./pkg/tapioca_encoder") | null = null;

async function getWasm() {
  if (!wasmModule) {
    wasmModule = await import("./pkg/tapioca_encoder");
    await wasmModule.default();
  }
  return wasmModule;
}

export async function interpolateFrames(
  keyframesData: Uint8Array,
  width: number,
  height: number,
  keyframeCount: number,
  totalFrames: number
): Promise<Uint8Array> {
  const wasm = await getWasm();
  return wasm.interpolate(keyframesData, width, height, keyframeCount, totalFrames);
}

export async function createSpritesheet(
  framesData: Uint8Array,
  width: number,
  height: number,
  frameCount: number
): Promise<Uint8Array> {
  const wasm = await getWasm();
  return wasm.create_spritesheet(framesData, width, height, frameCount);
}

export async function encodePng(
  frameData: Uint8Array,
  width: number,
  height: number
): Promise<Uint8Array> {
  const wasm = await getWasm();
  return wasm.encode_png(frameData, width, height);
}
