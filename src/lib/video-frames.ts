import { removeImageBackground } from "./background-removal";

const ICON_SIZE = 200;

export async function extractFramesFromVideo(
  videoSource: string | Blob,
  fps: number,
  onProgress?: (stage: string, current: number, total: number) => void
): Promise<{ frames: Uint8Array; frameCount: number }> {
  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.muted = true;
  video.playsInline = true;

  if (videoSource instanceof Blob) {
    video.src = URL.createObjectURL(videoSource);
  } else {
    video.src = videoSource;
  }

  await new Promise<void>((resolve, reject) => {
    video.onloadeddata = () => resolve();
    video.onerror = () => reject(new Error("Failed to load video"));
  });

  const duration = video.duration;
  const totalFrames = Math.floor(duration * fps);
  const frameInterval = 1 / fps;

  const canvas = document.createElement("canvas");
  canvas.width = ICON_SIZE;
  canvas.height = ICON_SIZE;
  const ctx = canvas.getContext("2d")!;

  const rawFrames: Blob[] = [];

  onProgress?.("extracting", 0, totalFrames);

  for (let i = 0; i < totalFrames; i++) {
    video.currentTime = i * frameInterval;
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
    });

    ctx.clearRect(0, 0, ICON_SIZE, ICON_SIZE);
    ctx.drawImage(video, 0, 0, ICON_SIZE, ICON_SIZE);
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), "image/png");
    });
    rawFrames.push(blob);

    if (i % 5 === 0) onProgress?.("extracting", i + 1, totalFrames);
  }

  const processedPixels = new Uint8Array(totalFrames * ICON_SIZE * ICON_SIZE * 4);

  for (let i = 0; i < rawFrames.length; i++) {
    onProgress?.("removing-bg", i + 1, rawFrames.length);

    const cleanBlob = await removeImageBackground(rawFrames[i]);
    const cleanImg = await createImageBitmap(cleanBlob);

    const frameCanvas = document.createElement("canvas");
    frameCanvas.width = ICON_SIZE;
    frameCanvas.height = ICON_SIZE;
    const frameCtx = frameCanvas.getContext("2d")!;
    frameCtx.drawImage(cleanImg, 0, 0, ICON_SIZE, ICON_SIZE);

    const imageData = frameCtx.getImageData(0, 0, ICON_SIZE, ICON_SIZE);
    processedPixels.set(
      new Uint8Array(imageData.data.buffer),
      i * ICON_SIZE * ICON_SIZE * 4
    );
  }

  if (videoSource instanceof Blob) {
    URL.revokeObjectURL(video.src);
  }

  return { frames: processedPixels, frameCount: totalFrames };
}
