"use client";

import { useState } from "react";
import { PromptInput } from "./prompt-input";
import { StyleOptions, StyleParams } from "./style-options";
import { IconPreview } from "./icon-preview";
import { DownloadPanel } from "./download-panel";
import { interpolateFrames } from "@/encoder/wasm";

const ICON_SIZE = 200;

const DEFAULT_STYLE: StyleParams = {
  animationType: "float",
  duration: 2,
  fps: 24,
  accentColor: "#FF6B6B",
};

export function Generator() {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<StyleParams>(DEFAULT_STYLE);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [frames, setFrames] = useState<Uint8Array | null>(null);
  const [frameCount, setFrameCount] = useState(0);

  const totalFrames = style.duration * style.fps;

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);
    setFrames(null);
    setProgress(null);

    try {
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
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          throw new Error(data.error || "Generation failed");
        } catch {
          throw new Error("Generation failed");
        }
      }

      // Read NDJSON stream
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let keyframes: string[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop()!;

        for (const line of lines) {
          if (!line.trim()) continue;
          const msg = JSON.parse(line);

          if (msg.type === "progress") {
            setProgress({ current: msg.current, total: msg.total });
          } else if (msg.type === "result") {
            keyframes = msg.keyframes;
          } else if (msg.type === "error") {
            throw new Error(msg.error);
          }
        }
      }

      // Decode base64 keyframes to raw RGBA pixel data
      const keyframePixels: Uint8Array[] = await Promise.all(
        keyframes.map(async (b64: string) => {
          const img = new Image();
          img.src = `data:image/png;base64,${b64}`;
          await new Promise((resolve) => (img.onload = resolve));

          const canvas = document.createElement("canvas");
          canvas.width = ICON_SIZE;
          canvas.height = ICON_SIZE;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0, ICON_SIZE, ICON_SIZE);
          return new Uint8Array(ctx.getImageData(0, 0, ICON_SIZE, ICON_SIZE).data);
        })
      );

      // Concatenate keyframes into a single buffer
      const keyframesBuffer = new Uint8Array(keyframePixels.length * ICON_SIZE * ICON_SIZE * 4);
      keyframePixels.forEach((kf, i) => {
        keyframesBuffer.set(kf, i * ICON_SIZE * ICON_SIZE * 4);
      });

      // Interpolate keyframes into full frame sequence via WASM
      const allFrames = await interpolateFrames(
        keyframesBuffer,
        ICON_SIZE,
        ICON_SIZE,
        keyframePixels.length,
        totalFrames
      );

      setFrames(allFrames);
      setFrameCount(totalFrames);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
      setProgress(null);
    }
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
          {loading
            ? progress
              ? `Generating keyframe ${progress.current}/${progress.total}...`
              : "Starting..."
            : "Generate Icon"}
        </button>
        {loading && progress && (
          <div className="w-full">
            <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
            <p className="text-xs text-zinc-500 mt-1 text-center">
              Generating keyframe {progress.current} of {progress.total}
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
      />
    </div>
  );
}
