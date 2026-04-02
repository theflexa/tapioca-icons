"use client";

import { useState } from "react";
import type { AnimationType } from "@/lib/style-prompt";
import type { IconCategory } from "./category-selector";

export type VideoProvider = "huggingface";
export type ExportResolution = 200 | 512 | 1024 | 2048;

export interface StyleParams {
  animationType: AnimationType;
  duration: 2 | 3;
  fps: 60 | 120;
  accentColor: string;
  exportResolution: ExportResolution;
  aiModel: string;
  videoProvider: VideoProvider;
}

export interface VideoUsageInfo {
  [provider: string]: {
    dailyRemaining: number;
    monthlyRemaining: number;
  };
}

interface StyleOptionsProps {
  value: StyleParams;
  onChange: (value: StyleParams) => void;
  disabled?: boolean;
  category: IconCategory;
  videoUsage?: VideoUsageInfo | null;
}

function formatLimit(value: number, total: number, period: string): string {
  if (value === -1) return "Unlimited";
  return `${value}/${total} ${period}`;
}

export function StyleOptions({ value, onChange, disabled, category, videoUsage }: StyleOptionsProps) {
  const [open, setOpen] = useState(false);

  const update = (patch: Partial<StyleParams>) => {
    onChange({ ...value, ...patch });
  };

  const is3D = category === "3d-animated";

  return (
    <div className="w-full">
      <button
        onClick={() => setOpen(!open)}
        className="text-sm text-zinc-400 hover:text-zinc-300 flex items-center gap-1"
      >
        {open ? "▼" : "▶"} Style Options
      </button>

      {open && (
        <div className="mt-3 grid grid-cols-2 gap-4 p-4 bg-zinc-900 rounded-lg border border-zinc-800">
          {is3D && (
            <div className="flex flex-col gap-1">
              <span className="text-xs text-zinc-400">Video Provider</span>
              <div className="bg-zinc-800 rounded px-2 py-1.5 text-sm text-zinc-100">
                HuggingFace (free, rate-limited)
              </div>
            </div>
          )}

          {!is3D && (
            <label className="flex flex-col gap-1">
              <span className="text-xs text-zinc-400">AI Model</span>
              <select
                value={value.aiModel}
                onChange={(e) => update({ aiModel: e.target.value })}
                disabled={disabled}
                className="bg-zinc-800 rounded px-2 py-1.5 text-sm text-zinc-100"
              >
                <option value="flux">FLUX (balanced)</option>
                <option value="flux-pro">FLUX Pro (quality)</option>
                <option value="turbo">Turbo (fast)</option>
                <option value="gptimage">GPT Image</option>
              </select>
            </label>
          )}

          {!is3D && (
            <label className="flex flex-col gap-1">
              <span className="text-xs text-zinc-400">Animation</span>
              <select
                value={value.animationType}
                onChange={(e) => update({ animationType: e.target.value as AnimationType })}
                disabled={disabled}
                className="bg-zinc-800 rounded px-2 py-1.5 text-sm text-zinc-100"
              >
                <option value="float">Float</option>
                <option value="bounce">Bounce</option>
                <option value="rotate">Rotate</option>
                <option value="pulse">Pulse</option>
                <option value="flip">Flip</option>
                <option value="page-turn">Page Turn</option>
                <option value="orbit">Orbit</option>
                <option value="tilt">Tilt</option>
              </select>
            </label>
          )}

          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-400">Duration</span>
            <select
              value={value.duration}
              onChange={(e) => update({ duration: Number(e.target.value) as 2 | 3 })}
              disabled={disabled}
              className="bg-zinc-800 rounded px-2 py-1.5 text-sm text-zinc-100"
            >
              <option value={2}>2 seconds</option>
              <option value={3}>3 seconds</option>
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-400">FPS</span>
            <select
              value={value.fps}
              onChange={(e) => update({ fps: Number(e.target.value) as 60 | 120 })}
              disabled={disabled}
              className="bg-zinc-800 rounded px-2 py-1.5 text-sm text-zinc-100"
            >
              <option value={60}>60 fps</option>
              <option value={120}>120 fps</option>
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-400">Export Resolution</span>
            <select
              value={value.exportResolution}
              onChange={(e) => update({ exportResolution: Number(e.target.value) as ExportResolution })}
              disabled={disabled}
              className="bg-zinc-800 rounded px-2 py-1.5 text-sm text-zinc-100"
            >
              <option value={200}>200x200 (Web icon)</option>
              <option value={512}>512x512 (Social)</option>
              <option value={1024}>1024x1024 (HD)</option>
              <option value={2048}>2048x2048 (2K)</option>
            </select>
          </label>

          {!is3D && (
            <label className="flex flex-col gap-1">
              <span className="text-xs text-zinc-400">Accent Color</span>
              <input
                type="color"
                value={value.accentColor}
                onChange={(e) => update({ accentColor: e.target.value })}
                disabled={disabled}
                className="h-8 w-full bg-zinc-800 rounded cursor-pointer"
              />
            </label>
          )}
        </div>
      )}
    </div>
  );
}
