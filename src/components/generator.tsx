"use client";

import { useState } from "react";
import { PromptInput } from "./prompt-input";
import { StyleOptions, StyleParams } from "./style-options";
import { IconPreview } from "./icon-preview";
import { DownloadPanel } from "./download-panel";
import { interpolateFrames } from "@/encoder/wasm";
import { removeImageBackground } from "@/lib/background-removal";

const ICON_SIZE = 200;

const DEFAULT_STYLE: StyleParams = {
  animationType: "float",
  duration: 2,
  fps: 24,
  accentColor: "#FF6B6B",
};

type ProgressStage = "generating" | "removing-bg" | "processing";

export function Generator() {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<StyleParams>(DEFAULT_STYLE);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<ProgressStage | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [frames, setFrames] = useState<Uint8Array | null>(null);
  const [frameCount, setFrameCount] = useState(0);

  const totalFrames = style.duration * style.fps;

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);
    setFrames(null);
    setStage("generating");
    setProgress(0);

    try {
      // Step 1: Generate keyframes via API
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          animationType: style.animationType,
          duration: style.duration,
          fps: style.fps,
          accentColor: style.accentColor,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Generation failed");
      }

      const data = await res.json();
      const keyframes: string[] = data.keyframes;
      setProgress(33);

      // Step 2: Remove background from each keyframe
      setStage("removing-bg");
      const processedPixels: Uint8Array[] = [];

      for (let i = 0; i < keyframes.length; i++) {
        // Convert base64 to blob
        const binary = atob(keyframes[i]);
        const bytes = new Uint8Array(binary.length);
        for (let j = 0; j < binary.length; j++) {
          bytes[j] = binary.charCodeAt(j);
        }
        const blob = new Blob([bytes], { type: "image/png" });

        // Remove background
        const cleanBlob = await removeImageBackground(blob);

        // Decode to canvas, resize to ICON_SIZE
        const img = new Image();
        const url = URL.createObjectURL(cleanBlob);
        img.src = url;
        await new Promise((resolve) => (img.onload = resolve));
        URL.revokeObjectURL(url);

        const canvas = document.createElement("canvas");
        canvas.width = ICON_SIZE;
        canvas.height = ICON_SIZE;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, ICON_SIZE, ICON_SIZE);
        processedPixels.push(
          new Uint8Array(ctx.getImageData(0, 0, ICON_SIZE, ICON_SIZE).data)
        );

        setProgress(33 + Math.round(((i + 1) / keyframes.length) * 34));
      }

      // Step 3: Interpolate keyframes via WASM
      setStage("processing");
      const keyframesBuffer = new Uint8Array(
        processedPixels.length * ICON_SIZE * ICON_SIZE * 4
      );
      processedPixels.forEach((kf, i) => {
        keyframesBuffer.set(kf, i * ICON_SIZE * ICON_SIZE * 4);
      });

      const allFrames = await interpolateFrames(
        keyframesBuffer,
        ICON_SIZE,
        ICON_SIZE,
        processedPixels.length,
        totalFrames
      );

      setProgress(100);
      setFrames(allFrames);
      setFrameCount(totalFrames);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
      setStage(null);
      setProgress(0);
    }
  };

  const stageLabels: Record<ProgressStage, string> = {
    generating: "AI is generating keyframes...",
    "removing-bg": "Removing background with AI...",
    processing: "Building animation frames...",
  };

  const buttonLabels: Record<ProgressStage, string> = {
    generating: "Generating frames...",
    "removing-bg": "Removing backgrounds...",
    processing: "Processing...",
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-2xl">
      {/* Input Area */}
      <div className="w-full space-y-3">
        <PromptInput value={prompt} onChange={setPrompt} disabled={loading} />
        <StyleOptions value={style} onChange={setStyle} disabled={loading} />
        <button
          onClick={handleGenerate}
          disabled={loading || !prompt.trim()}
          className="w-full py-3 bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-lg font-medium transition-colors"
        >
          {loading && stage ? buttonLabels[stage] : "Generate Icon"}
        </button>
        {loading && (
          <div className="w-full">
            <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-orange-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(progress, 3)}%` }}
              />
            </div>
            <p className="text-xs text-zinc-500 mt-1 text-center">
              {stage ? stageLabels[stage] : "Starting..."}
            </p>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="w-full p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Preview */}
      <IconPreview
        frames={frames ?? new Uint8Array(0)}
        width={ICON_SIZE}
        height={ICON_SIZE}
        frameCount={frameCount}
        fps={style.fps}
      />

      {/* Download */}
      <DownloadPanel
        frames={frames}
        width={ICON_SIZE}
        height={ICON_SIZE}
        frameCount={frameCount}
        fps={style.fps}
      />
    </div>
  );
}
