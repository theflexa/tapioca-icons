"use client";

import { useState } from "react";
import { PromptInput } from "./prompt-input";
import { StyleOptions, StyleParams } from "./style-options";
import { ThreePreview } from "./three-preview";
import { DownloadPanel } from "./download-panel";
import { removeImageBackground } from "@/lib/background-removal";

const DEFAULT_STYLE: StyleParams = {
  animationType: "float",
  duration: 2,
  fps: 60,
  accentColor: "#FF6B6B",
  exportResolution: 1024,
};

type ProgressStage = "generating" | "removing-bg";

export function Generator() {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<StyleParams>(DEFAULT_STYLE);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<ProgressStage | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [textureUrl, setTextureUrl] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);
    setTextureUrl(null);
    setStage("generating");
    setProgress(0);

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
        const data = await res.json();
        throw new Error(data.error || "Generation failed");
      }

      const data = await res.json();
      const baseFrameB64: string = data.keyframes[0];
      setProgress(40);

      setStage("removing-bg");
      const binary = atob(baseFrameB64);
      const bytes = new Uint8Array(binary.length);
      for (let j = 0; j < binary.length; j++) {
        bytes[j] = binary.charCodeAt(j);
      }
      const blob = new Blob([bytes], { type: "image/png" });
      const cleanBlob = await removeImageBackground(blob);
      setProgress(90);

      const url = URL.createObjectURL(cleanBlob);
      setTextureUrl(url);
      setProgress(100);
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
  };

  const buttonLabels: Record<ProgressStage, string> = {
    generating: "Generating...",
    "removing-bg": "Removing background...",
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

      <ThreePreview
        textureUrl={textureUrl}
        animationType={style.animationType}
        duration={style.duration}
        fps={style.fps}
      />

      <DownloadPanel
        textureUrl={textureUrl}
        animationType={style.animationType}
        duration={style.duration}
        fps={style.fps}
        exportResolution={style.exportResolution}
      />
    </div>
  );
}
