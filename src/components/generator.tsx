"use client";

import { useState, useEffect, useRef } from "react";
import { PromptInput } from "./prompt-input";
import { StyleOptions, StyleParams, VideoUsageInfo } from "./style-options";
import { CategorySelector, IconCategory } from "./category-selector";
import { ThreePreview } from "./three-preview";
import { DownloadPanel } from "./download-panel";
import { removeImageBackground } from "@/lib/background-removal";
import { extractFramesFromVideo } from "@/lib/video-frames";

const DEFAULT_STYLE: StyleParams = {
  animationType: "float",
  duration: 2,
  fps: 60,
  accentColor: "#FF6B6B",
  exportResolution: 1024,
  aiModel: "flux",
  videoProvider: "kling" as const,
};

type ProgressStage = "generating" | "removing-bg" | "generating-video" | "extracting";

function VideoFramePreview({ frames, width, height, frameCount, fps }: {
  frames: Uint8Array;
  width: number;
  height: number;
  frameCount: number;
  fps: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(true);
  const frameIndexRef = useRef(0);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef(0);
  const frameSize = width * height * 4;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || frameCount === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!playing) return;

    const interval = 1000 / fps;
    const animate = (timestamp: number) => {
      if (timestamp - lastTimeRef.current >= interval) {
        frameIndexRef.current = (frameIndexRef.current + 1) % frameCount;
        const offset = frameIndexRef.current * frameSize;
        const frameData = frames.slice(offset, offset + frameSize);
        const offscreen = document.createElement("canvas");
        offscreen.width = width;
        offscreen.height = height;
        const offCtx = offscreen.getContext("2d")!;
        offCtx.putImageData(new ImageData(new Uint8ClampedArray(frameData), width, height), 0, 0);
        // Draw checkerboard background
        const size = 10;
        for (let y = 0; y < height; y += size) {
          for (let x = 0; x < width; x += size) {
            const isLight = ((x / size) + (y / size)) % 2 === 0;
            ctx.fillStyle = isLight ? "#2a2a2a" : "#1a1a1a";
            ctx.fillRect(x, y, size, size);
          }
        }
        ctx.drawImage(offscreen, 0, 0);
        lastTimeRef.current = timestamp;
      }
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [playing, fps, frameCount, frames, width, height, frameSize]);

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="rounded-lg border border-zinc-800"
        style={{ width: 400, height: 400, imageRendering: "auto" }}
      />
      <button
        onClick={() => setPlaying(!playing)}
        className="px-3 py-1 bg-zinc-800 rounded text-sm hover:bg-zinc-700"
      >
        {playing ? "Pause" : "Play"}
      </button>
    </div>
  );
}

export function Generator() {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<StyleParams>(DEFAULT_STYLE);
  const [category, setCategory] = useState<IconCategory>("2d");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<ProgressStage | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [textureUrl, setTextureUrl] = useState<string | null>(null);
  const [frames, setFrames] = useState<Uint8Array | null>(null);
  const [frameCount, setFrameCount] = useState(0);
  const [videoUsage, setVideoUsage] = useState<VideoUsageInfo | null>(null);

  useEffect(() => {
    fetch("/api/video-usage")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data) setVideoUsage(data); })
      .catch(() => {});
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);
    setTextureUrl(null);
    setFrames(null);
    setFrameCount(0);
    setProgress(0);

    try {
      if (category === "2d") {
        // 2D path: generate image -> remove bg -> texture
        setStage("generating");

        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            animationType: style.animationType,
            duration: style.duration,
            fps: style.fps,
            accentColor: style.accentColor,
            aiModel: style.aiModel,
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
      } else {
        // 3D Animated path: generate video -> extract frames
        setStage("generating-video");

        const res = await fetch("/api/generate-video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            provider: style.videoProvider,
            duration: style.duration,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Video generation failed");
        }

        const data = await res.json();
        setProgress(30);
        setStage("extracting");

        let videoSource: string | Blob;
        if (data.videoUrl) {
          videoSource = data.videoUrl;
        } else if (data.videoBase64) {
          const videoBinary = atob(data.videoBase64);
          const videoBytes = new Uint8Array(videoBinary.length);
          for (let j = 0; j < videoBinary.length; j++) videoBytes[j] = videoBinary.charCodeAt(j);
          videoSource = new Blob([videoBytes], { type: "video/mp4" });
        } else {
          throw new Error("No video data received");
        }

        const result = await extractFramesFromVideo(
          videoSource,
          style.fps,
          (stageName, current, total) => {
            if (stageName === "extracting") {
              setStage("extracting");
              setProgress(30 + Math.round((current / total) * 20));
            } else if (stageName === "removing-bg") {
              setStage("removing-bg");
              setProgress(50 + Math.round((current / total) * 50));
            }
          }
        );

        setFrames(result.frames);
        setFrameCount(result.frameCount);
        setProgress(100);

        // Refresh video usage after generation
        fetch("/api/video-usage")
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => { if (data) setVideoUsage(data); })
          .catch(() => {});
      }
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
    "generating-video": "AI is generating 3D video (this may take several minutes)...",
    extracting: "Extracting and processing frames...",
  };

  const buttonLabels: Record<ProgressStage, string> = {
    generating: "Generating...",
    "removing-bg": "Removing background...",
    "generating-video": "Generating video...",
    extracting: "Extracting frames...",
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-2xl">
      <div className="w-full space-y-3">
        <CategorySelector value={category} onChange={setCategory} disabled={loading} />
        <PromptInput value={prompt} onChange={setPrompt} disabled={loading} />
        <StyleOptions
          value={style}
          onChange={setStyle}
          disabled={loading}
          category={category}
          videoUsage={videoUsage}
        />
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

      {category === "2d" && (
        <ThreePreview
          textureUrl={textureUrl}
          animationType={style.animationType}
          duration={style.duration}
          fps={style.fps}
        />
      )}

      {category === "3d-animated" && frames && frameCount > 0 && (
        <VideoFramePreview
          frames={frames}
          width={200}
          height={200}
          frameCount={frameCount}
          fps={style.fps}
        />
      )}

      <DownloadPanel
        textureUrl={category === "2d" ? textureUrl : undefined}
        animationType={style.animationType}
        duration={style.duration}
        fps={style.fps}
        exportResolution={style.exportResolution}
        frames={category === "3d-animated" ? frames : undefined}
        frameCount={category === "3d-animated" ? frameCount : undefined}
      />
    </div>
  );
}
