"use client";

import { useState } from "react";
import { encodePng, createSpritesheet, encodeApng } from "@/encoder/wasm";
import { encodeWebM, isWebMSupported } from "@/encoder/webm";
import { renderFrames, getEffectiveFps } from "@/lib/three-renderer";
import type { AnimationType } from "@/lib/style-prompt";

interface DownloadPanelProps {
  // 2D mode
  textureUrl?: string | null;
  animationType?: AnimationType;
  // 3D mode
  frames?: Uint8Array | null;
  frameCount?: number;
  // Common
  duration: number;
  fps: number;
  exportResolution: number;
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
  textureUrl,
  animationType,
  duration,
  fps,
  exportResolution,
  frames: directFrames,
  frameCount: directFrameCount,
}: DownloadPanelProps) {
  const [exporting, setExporting] = useState<string | null>(null);

  const is3D = !!directFrames && (directFrameCount ?? 0) > 0;
  const is2D = !!textureUrl;

  if (!is3D && !is2D) return null;

  const effectiveFps = is3D ? fps : getEffectiveFps(exportResolution, fps);
  const totalFrames = is3D ? (directFrameCount ?? 0) : duration * effectiveFps;
  // For 3D mode, frame size comes from the extracted frames (200x200)
  const frameWidth = is3D ? 200 : exportResolution;
  const frameHeight = is3D ? 200 : exportResolution;
  const frameSize = frameWidth * frameHeight * 4;
  const webmSupported = typeof window !== "undefined" && isWebMSupported();

  const getFrames = async (): Promise<Uint8Array> => {
    if (is3D) {
      return directFrames!;
    }
    return renderFrames({
      textureUrl: textureUrl!,
      animationType: animationType!,
      width: exportResolution,
      height: exportResolution,
      fps: effectiveFps,
      duration,
    });
  };

  const handleDownloadPng = async () => {
    setExporting("png");
    try {
      const allFrames = await getFrames();
      const firstFrame = allFrames.slice(0, frameSize);
      const png = await encodePng(firstFrame, frameWidth, frameHeight);
      downloadBlob(png, `tapioca-icon-${frameWidth}x${frameHeight}.png`, "image/png");
    } finally {
      setExporting(null);
    }
  };

  const handleDownloadApng = async () => {
    setExporting("apng");
    try {
      let allFrames: Uint8Array;
      let apngFps: number;
      let apngFrames: number;

      if (is3D) {
        allFrames = directFrames!;
        apngFps = Math.min(fps, 60);
        apngFrames = directFrameCount!;
      } else {
        apngFps = Math.min(effectiveFps, 60);
        apngFrames = duration * apngFps;
        allFrames = await renderFrames({
          textureUrl: textureUrl!,
          animationType: animationType!,
          width: exportResolution,
          height: exportResolution,
          fps: apngFps,
          duration,
        });
      }

      const apng = await encodeApng(allFrames, frameWidth, frameHeight, apngFrames, apngFps);
      downloadBlob(apng, `tapioca-icon-${frameWidth}x${frameHeight}.apng`, "image/apng");
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
      const allFrames = await getFrames();
      const blob = await encodeWebM(allFrames, frameWidth, frameHeight, totalFrames, effectiveFps);
      downloadBlob(blob, `tapioca-icon-${frameWidth}x${frameHeight}.webm`, "video/webm");
    } finally {
      setExporting(null);
    }
  };

  const handleDownloadSpritesheet = async () => {
    setExporting("spritesheet");
    try {
      let allFrames: Uint8Array;
      let sheetFrames: number;

      if (is3D) {
        allFrames = directFrames!;
        sheetFrames = directFrameCount!;
      } else {
        const sheetFps = 30;
        sheetFrames = duration * sheetFps;
        allFrames = await renderFrames({
          textureUrl: textureUrl!,
          animationType: animationType!,
          width: exportResolution,
          height: exportResolution,
          fps: sheetFps,
          duration,
        });
      }

      const sheet = await createSpritesheet(allFrames, frameWidth, frameHeight, sheetFrames);
      downloadBlob(sheet, `tapioca-icon-spritesheet-${frameWidth}x${frameHeight}.png`, "image/png");
    } finally {
      setExporting(null);
    }
  };

  const fpsNote = !is3D && exportResolution >= 2048 && fps > 60 ? " (capped to 60fps at 2048)" : "";

  return (
    <div className="w-full space-y-3">
      <div className="text-xs text-zinc-500">
        {frameWidth}x{frameHeight} | {totalFrames} frames | {effectiveFps}fps{fpsNote}
        {is3D && " | 3D Animated"}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={handleDownloadPng} disabled={!!exporting} className="px-4 py-2 bg-zinc-800 rounded-lg text-sm hover:bg-zinc-700 transition-colors disabled:opacity-50">
          {exporting === "png" ? "Rendering..." : "PNG (static)"}
        </button>
        <button onClick={handleDownloadApng} disabled={!!exporting} className="px-4 py-2 bg-zinc-800 rounded-lg text-sm hover:bg-zinc-700 transition-colors disabled:opacity-50">
          {exporting === "apng" ? "Rendering..." : "APNG (animated)"}
        </button>
        <button onClick={handleDownloadWebm} disabled={!!exporting || !webmSupported}
          className={`px-4 py-2 bg-zinc-800 rounded-lg text-sm hover:bg-zinc-700 transition-colors disabled:opacity-50 ${!webmSupported ? "opacity-50" : ""}`}>
          {exporting === "webm" ? "Rendering..." : webmSupported ? "WebM (video)" : "WebM (not supported)"}
        </button>
        <button onClick={handleDownloadSpritesheet} disabled={!!exporting} className="px-4 py-2 bg-zinc-800 rounded-lg text-sm hover:bg-zinc-700 transition-colors disabled:opacity-50">
          {exporting === "spritesheet" ? "Rendering..." : "Spritesheet"}
        </button>
      </div>
    </div>
  );
}
