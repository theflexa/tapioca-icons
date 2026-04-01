"use client";

import { useRef, useEffect, useState, useCallback } from "react";

interface IconPreviewProps {
  frames: Uint8Array;
  width: number;
  height: number;
  frameCount: number;
  fps: number;
}

export function IconPreview({ frames, width, height, frameCount, fps }: IconPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const frameIndexRef = useRef(0);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef(0);

  const frameSize = width * height * 4;

  const drawCheckerboard = useCallback((ctx: CanvasRenderingContext2D) => {
    const size = 10;
    for (let y = 0; y < height; y += size) {
      for (let x = 0; x < width; x += size) {
        const isLight = ((x / size) + (y / size)) % 2 === 0;
        ctx.fillStyle = isLight ? "#2a2a2a" : "#1a1a1a";
        ctx.fillRect(x, y, size, size);
      }
    }
  }, [width, height]);

  const drawFrame = useCallback((ctx: CanvasRenderingContext2D, index: number) => {
    drawCheckerboard(ctx);
    const offset = index * frameSize;
    const frameData = frames.slice(offset, offset + frameSize);
    const imageData = new ImageData(new Uint8ClampedArray(frameData), width, height);
    ctx.putImageData(imageData, 0, 0);
  }, [frames, frameSize, width, height, drawCheckerboard]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || frameCount === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!playing) {
      drawFrame(ctx, frameIndexRef.current);
      return;
    }

    const interval = 1000 / (fps * speed);

    const animate = (timestamp: number) => {
      if (timestamp - lastTimeRef.current >= interval) {
        frameIndexRef.current = (frameIndexRef.current + 1) % frameCount;
        drawFrame(ctx, frameIndexRef.current);
        lastTimeRef.current = timestamp;
      }
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [playing, speed, fps, frameCount, drawFrame]);

  if (frameCount === 0) {
    return (
      <div className="flex items-center justify-center w-[400px] h-[400px] bg-zinc-900 rounded-lg border border-zinc-800">
        <p className="text-zinc-500">Generate an icon to preview</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="rounded-lg border border-zinc-800"
        style={{ width: 400, height: 400, imageRendering: "pixelated" }}
      />
      <div className="flex items-center gap-4">
        <button
          onClick={() => setPlaying(!playing)}
          className="px-3 py-1 bg-zinc-800 rounded text-sm hover:bg-zinc-700"
        >
          {playing ? "Pause" : "Play"}
        </button>
        <label className="flex items-center gap-2 text-sm text-zinc-400">
          Speed
          <select
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="bg-zinc-800 rounded px-2 py-1 text-zinc-100"
          >
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={2}>2x</option>
          </select>
        </label>
      </div>
    </div>
  );
}
