"use client";

import { encodePng, createSpritesheet } from "@/encoder/wasm";

interface DownloadPanelProps {
  frames: Uint8Array | null;
  width: number;
  height: number;
  frameCount: number;
}

function downloadBlob(data: Uint8Array, filename: string, mime: string) {
  const blob = new Blob([data as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function DownloadPanel({ frames, width, height, frameCount }: DownloadPanelProps) {
  if (!frames || frameCount === 0) return null;

  const frameSize = width * height * 4;

  const handleDownloadPng = async () => {
    const firstFrame = frames.slice(0, frameSize);
    const png = await encodePng(firstFrame, width, height);
    downloadBlob(png, "tapioca-icon.png", "image/png");
  };

  const handleDownloadSpritesheet = async () => {
    const sheet = await createSpritesheet(frames, width, height, frameCount);
    downloadBlob(sheet, "tapioca-icon-spritesheet.png", "image/png");
  };

  const handleDownloadApng = async () => {
    const sheet = await createSpritesheet(frames, width, height, frameCount);
    downloadBlob(sheet, "tapioca-icon-animated.png", "image/png");
  };

  const handleDownloadWebm = () => {
    alert("WebM export coming soon!");
  };

  const estimatedSize = Math.round((frameCount * frameSize) / 1024);

  return (
    <div className="w-full space-y-3">
      <div className="text-xs text-zinc-500">
        {width}x{height} | {frameCount} frames | ~{estimatedSize}KB raw
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleDownloadPng}
          className="px-4 py-2 bg-zinc-800 rounded-lg text-sm hover:bg-zinc-700 transition-colors"
        >
          PNG (static)
        </button>
        <button
          onClick={handleDownloadApng}
          className="px-4 py-2 bg-zinc-800 rounded-lg text-sm hover:bg-zinc-700 transition-colors"
        >
          APNG (animated)
        </button>
        <button
          onClick={handleDownloadWebm}
          className="px-4 py-2 bg-zinc-800 rounded-lg text-sm hover:bg-zinc-700 transition-colors opacity-50"
        >
          WebM (soon)
        </button>
        <button
          onClick={handleDownloadSpritesheet}
          className="px-4 py-2 bg-zinc-800 rounded-lg text-sm hover:bg-zinc-700 transition-colors"
        >
          Spritesheet
        </button>
      </div>
    </div>
  );
}
