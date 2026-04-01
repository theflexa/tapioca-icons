"use client";

import { useState } from "react";
import { encodePng, createSpritesheet, encodeApng } from "@/encoder/wasm";
import { encodeWebM, isWebMSupported } from "@/encoder/webm";

interface DownloadPanelProps {
  frames: Uint8Array | null;
  width: number;
  height: number;
  frameCount: number;
  fps: number;
}

function downloadBlob(data: Uint8Array | Blob, filename: string, mime: string) {
  const blob = data instanceof Blob ? data : new Blob([data as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function DownloadPanel({
  frames,
  width,
  height,
  frameCount,
  fps,
}: DownloadPanelProps) {
  const [exporting, setExporting] = useState<string | null>(null);

  if (!frames || frameCount === 0) return null;

  const frameSize = width * height * 4;
  const webmSupported = typeof window !== "undefined" && isWebMSupported();

  const handleDownloadPng = async () => {
    setExporting("png");
    try {
      const firstFrame = frames.slice(0, frameSize);
      const png = await encodePng(firstFrame, width, height);
      downloadBlob(png, "tapioca-icon.png", "image/png");
    } finally {
      setExporting(null);
    }
  };

  const handleDownloadApng = async () => {
    setExporting("apng");
    try {
      // APNG capped at 60fps (browser rendering limitation)
      const apngFps = Math.min(fps, 60);
      const step = Math.round(fps / apngFps);
      const apngFrameCount = Math.ceil(frameCount / step);

      // Sample frames at the target fps
      const sampledFrames = new Uint8Array(apngFrameCount * frameSize);
      for (let i = 0; i < apngFrameCount; i++) {
        const srcOffset = (i * step) * frameSize;
        sampledFrames.set(
          frames.slice(srcOffset, srcOffset + frameSize),
          i * frameSize
        );
      }

      const apng = await encodeApng(sampledFrames, width, height, apngFrameCount, apngFps);
      downloadBlob(apng, "tapioca-icon.apng", "image/apng");
    } finally {
      setExporting(null);
    }
  };

  const handleDownloadWebm = async () => {
    if (!webmSupported) {
      alert("WebM with alpha is not supported in this browser. Try Chrome or Firefox.");
      return;
    }
    setExporting("webm");
    try {
      const blob = await encodeWebM(frames, width, height, frameCount, fps);
      downloadBlob(blob, "tapioca-icon.webm", "video/webm");
    } finally {
      setExporting(null);
    }
  };

  const handleDownloadSpritesheet = async () => {
    setExporting("spritesheet");
    try {
      const sheet = await createSpritesheet(frames, width, height, frameCount);
      downloadBlob(sheet, "tapioca-icon-spritesheet.png", "image/png");
    } finally {
      setExporting(null);
    }
  };

  const estimatedSize = Math.round((frameCount * frameSize) / 1024);

  return (
    <div className="w-full space-y-3">
      <div className="text-xs text-zinc-500">
        {width}x{height} | {frameCount} frames | {fps}fps | ~{estimatedSize}KB raw
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleDownloadPng}
          disabled={!!exporting}
          className="px-4 py-2 bg-zinc-800 rounded-lg text-sm hover:bg-zinc-700 transition-colors disabled:opacity-50"
        >
          {exporting === "png" ? "Exporting..." : "PNG (static)"}
        </button>
        <button
          onClick={handleDownloadApng}
          disabled={!!exporting}
          className="px-4 py-2 bg-zinc-800 rounded-lg text-sm hover:bg-zinc-700 transition-colors disabled:opacity-50"
        >
          {exporting === "apng" ? "Exporting..." : "APNG (animated)"}
        </button>
        <button
          onClick={handleDownloadWebm}
          disabled={!!exporting || !webmSupported}
          className={`px-4 py-2 bg-zinc-800 rounded-lg text-sm hover:bg-zinc-700 transition-colors disabled:opacity-50 ${
            !webmSupported ? "opacity-50" : ""
          }`}
        >
          {exporting === "webm"
            ? "Exporting..."
            : webmSupported
              ? "WebM (video)"
              : "WebM (not supported)"}
        </button>
        <button
          onClick={handleDownloadSpritesheet}
          disabled={!!exporting}
          className="px-4 py-2 bg-zinc-800 rounded-lg text-sm hover:bg-zinc-700 transition-colors disabled:opacity-50"
        >
          {exporting === "spritesheet" ? "Exporting..." : "Spritesheet"}
        </button>
      </div>
    </div>
  );
}
