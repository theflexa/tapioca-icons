export function isWebMSupported(): boolean {
  if (typeof MediaRecorder === "undefined") return false;
  return MediaRecorder.isTypeSupported("video/webm;codecs=vp9");
}

export async function encodeWebM(
  frames: Uint8Array,
  width: number,
  height: number,
  frameCount: number,
  fps: number
): Promise<Blob> {
  const frameSize = width * height * 4;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  const stream = canvas.captureStream(0);
  const recorder = new MediaRecorder(stream, {
    mimeType: "video/webm;codecs=vp9",
    videoBitsPerSecond: 2_000_000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const done = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: "video/webm" }));
    };
  });

  recorder.start();

  const interval = 1000 / fps;

  for (let i = 0; i < frameCount; i++) {
    const offset = i * frameSize;
    const frameData = frames.slice(offset, offset + frameSize);
    const imageData = new ImageData(new Uint8ClampedArray(frameData), width, height);
    ctx.putImageData(imageData, 0, 0);

    const track = stream.getVideoTracks()[0] as MediaStreamTrack & {
      requestFrame?: () => void;
    };
    if (track.requestFrame) {
      track.requestFrame();
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  recorder.stop();
  return done;
}
