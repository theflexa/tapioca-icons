"use client";

import { useState } from "react";
import { encodePng, createSpritesheet, encodeApng } from "@/encoder/wasm";
import { encodeWebM, isWebMSupported } from "@/encoder/webm";
import { renderFrames, getEffectiveFps } from "@/lib/three-renderer";
import type { AnimationType } from "@/lib/style-prompt";

interface DownloadPanelProps {
  textureUrl: string | null;
  animationType: AnimationType;
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
}: DownloadPanelProps) {
  const [exporting, setExporting] = useState<string | null>(null);

  if (!textureUrl) return null;

  const effectiveFps = getEffectiveFps(exportResolution, fps);
  const totalFrames = duration * effectiveFps;
  const frameSize = exportResolution * exportResolution * 4;
  const webmSupported = typeof window !== "undefined" && isWebMSupported();

  const getFrames = async () => {
    return renderFrames({
      textureUrl,
      animationType,
      width: exportResolution,
      height: exportResolution,
      fps: effectiveFps,
      duration,
    });
  };

  const handleDownloadPng = async () => {
    setExporting("png");
    try {
      const frames = await getFrames();
      const firstFrame = frames.slice(0, frameSize);
      const png = await encodePng(firstFrame, exportResolution, exportResolution);
      downloadBlob(png, `tapioca-icon-${exportResolution}x${exportResolution}.png`, "image/png");
    } finally {
      setExporting(null);
    }
  };

  const handleDownloadApng = async () => {
    setExporting("apng");
    try {
      const apngFps = Math.min(effectiveFps, 60);
      const apngFrames = duration * apngFps;
      const frames = await renderFrames({
        textureUrl,
        animationType,
        width: exportResolution,
        height: exportResolution,
        fps: apngFps,
        duration,
      });
      const apng = await encodeApng(frames, exportResolution, exportResolution, apngFrames, apngFps);
      downloadBlob(apng, `tapioca-icon-${exportResolution}x${exportResolution}.apng`, "image/apng");
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
      const frames = await getFrames();
      const blob = await encodeWebM(frames, exportResolution, exportResolution, totalFrames, effectiveFps);
      downloadBlob(blob, `tapioca-icon-${exportResolution}x${exportResolution}.webm`, "video/webm");
    } finally {
      setExporting(null);
    }
  };

  const handleDownloadSpritesheet = async () => {
    setExporting("spritesheet");
    try {
      const sheetFps = 30;
      const sheetFrames = duration * sheetFps;
      const frames = await renderFrames({
        textureUrl,
        animationType,
        width: exportResolution,
        height: exportResolution,
        fps: sheetFps,
        duration,
      });
      const sheet = await createSpritesheet(frames, exportResolution, exportResolution, sheetFrames);
      downloadBlob(sheet, `tapioca-icon-spritesheet-${exportResolution}x${exportResolution}.png`, "image/png");
    } finally {
      setExporting(null);
    }
  };

  const fpsNote = exportResolution >= 2048 && fps > 60 ? " (capped to 60fps at 2048)" : "";

  return (
    <div className="w-full space-y-3">
      <div className="text-xs text-zinc-500">
        {exportResolution}x{exportResolution} | {totalFrames} frames | {effectiveFps}fps{fpsNote}
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
