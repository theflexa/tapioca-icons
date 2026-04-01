import { Muxer, ArrayBufferTarget } from "webm-muxer";

export function isWebMSupported(): boolean {
  return typeof VideoEncoder !== "undefined";
}

export async function encodeWebM(
  frames: Uint8Array,
  width: number,
  height: number,
  frameCount: number,
  fps: number
): Promise<Blob> {
  const frameSize = width * height * 4;
  const frameDuration = 1_000_000 / fps; // microseconds per frame

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: {
      codec: "V_VP9",
      width,
      height,
      alpha: true,
      frameRate: fps,
    },
  });

  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => { throw e; },
  });

  encoder.configure({
    codec: "vp09.00.10.08.01",
    width,
    height,
    bitrate: 4_000_000,
    framerate: fps,
    alpha: "keep",
  });

  for (let i = 0; i < frameCount; i++) {
    const offset = i * frameSize;
    const frameData = frames.slice(offset, offset + frameSize);

    const videoFrame = new VideoFrame(
      new Uint8ClampedArray(frameData.buffer, frameData.byteOffset, frameData.length),
      {
        format: "RGBA",
        codedWidth: width,
        codedHeight: height,
        timestamp: i * frameDuration,
        duration: frameDuration,
      }
    );

    encoder.encode(videoFrame, { keyFrame: i % (fps * 2) === 0 });
    videoFrame.close();
  }

  await encoder.flush();
  encoder.close();
  muxer.finalize();

  return new Blob([target.buffer], { type: "video/webm" });
}
