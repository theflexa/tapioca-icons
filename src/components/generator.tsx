"use client";

import { useState } from "react";
import { PromptInput } from "./prompt-input";
import { StyleOptions, StyleParams } from "./style-options";
import { IconPreview } from "./icon-preview";
import { DownloadPanel } from "./download-panel";
import { removeImageBackground } from "@/lib/background-removal";

const ICON_SIZE = 200;

const DEFAULT_STYLE: StyleParams = {
  animationType: "float",
  duration: 2,
  fps: 60,
  accentColor: "#FF6B6B",
};

type ProgressStage = "generating" | "removing-bg" | "animating";

// Ease-in-out cubic bezier approximation
function easeInOut(t: number): number {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

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
      // Step 1: Generate base frame via API
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
      const baseFrameB64: string = data.keyframes[0];
      setProgress(20);

      // Step 2: Remove background
      setStage("removing-bg");
      const binary = atob(baseFrameB64);
      const bytes = new Uint8Array(binary.length);
      for (let j = 0; j < binary.length; j++) {
        bytes[j] = binary.charCodeAt(j);
      }
      const blob = new Blob([bytes], { type: "image/png" });
      const cleanBlob = await removeImageBackground(blob);
      const cleanImg = await createImageBitmap(cleanBlob);
      setProgress(50);

      // Step 3: Generate ALL animation frames directly via canvas transforms
      setStage("animating");
      const allPixels = new Uint8Array(totalFrames * ICON_SIZE * ICON_SIZE * 4);
      const canvas = document.createElement("canvas");
      canvas.width = ICON_SIZE;
      canvas.height = ICON_SIZE;
      const ctx = canvas.getContext("2d")!;

      for (let i = 0; i < totalFrames; i++) {
        const t = i / totalFrames; // 0 to 1 (normalized time in loop)
        const phase = t * Math.PI * 2; // full cycle

        ctx.clearRect(0, 0, ICON_SIZE, ICON_SIZE);
        ctx.save();
        ctx.translate(ICON_SIZE / 2, ICON_SIZE / 2);

        switch (style.animationType) {
          case "rotate": {
            const angle = t * Math.PI * 2;
            ctx.rotate(angle);
            break;
          }
          case "bounce": {
            // Smooth bounce using eased sine
            const raw = Math.sin(phase);
            const eased = raw >= 0 ? easeInOut(raw) : -easeInOut(-raw);
            ctx.translate(0, -eased * 15);
            break;
          }
          case "float": {
            const tilt = Math.sin(phase) * 0.04;
            const easeT = easeInOut((Math.sin(phase) + 1) / 2);
            ctx.translate(0, -(easeT * 2 - 1) * 10);
            ctx.rotate(tilt);
            break;
          }
          case "pulse": {
            const scaleAmount = 1 + Math.sin(phase) * 0.1;
            ctx.scale(scaleAmount, scaleAmount);
            break;
          }
        }

        ctx.drawImage(cleanImg, -ICON_SIZE / 2, -ICON_SIZE / 2, ICON_SIZE, ICON_SIZE);
        ctx.restore();

        const imageData = ctx.getImageData(0, 0, ICON_SIZE, ICON_SIZE);
        allPixels.set(new Uint8Array(imageData.data.buffer), i * ICON_SIZE * ICON_SIZE * 4);

        // Update progress every 10%
        if (i % Math.ceil(totalFrames / 10) === 0) {
          setProgress(50 + Math.round((i / totalFrames) * 50));
          // Yield to UI thread
          await new Promise((r) => setTimeout(r, 0));
        }
      }

      setProgress(100);
      setFrames(allPixels);
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
    generating: "AI is generating the icon...",
    "removing-bg": "Removing background with AI...",
    animating: `Rendering ${totalFrames} animation frames...`,
  };

  const buttonLabels: Record<ProgressStage, string> = {
    generating: "Generating...",
    "removing-bg": "Removing background...",
    animating: "Rendering frames...",
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-2xl">
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

      {error && (
        <div className="w-full p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      <IconPreview
        frames={frames ?? new Uint8Array(0)}
        width={ICON_SIZE}
        height={ICON_SIZE}
        frameCount={frameCount}
        fps={style.fps}
      />

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
