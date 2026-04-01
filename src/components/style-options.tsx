"use client";

import { useState } from "react";
import type { AnimationType } from "@/lib/style-prompt";

export interface StyleParams {
  animationType: AnimationType;
  duration: 2 | 3;
  fps: 24 | 30;
  accentColor: string;
}

interface StyleOptionsProps {
  value: StyleParams;
  onChange: (value: StyleParams) => void;
  disabled?: boolean;
}

export function StyleOptions({ value, onChange, disabled }: StyleOptionsProps) {
  const [open, setOpen] = useState(false);

  const update = (patch: Partial<StyleParams>) => {
    onChange({ ...value, ...patch });
  };

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
          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-400">Animation</span>
            <select
              value={value.animationType}
              onChange={(e) => update({ animationType: e.target.value as AnimationType })}
              disabled={disabled}
              className="bg-zinc-800 rounded px-2 py-1.5 text-sm text-zinc-100"
            >
              <option value="bounce">Bounce</option>
              <option value="float">Float</option>
              <option value="rotate">Rotate</option>
              <option value="pulse">Pulse</option>
            </select>
          </label>

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
              onChange={(e) => update({ fps: Number(e.target.value) as 24 | 30 })}
              disabled={disabled}
              className="bg-zinc-800 rounded px-2 py-1.5 text-sm text-zinc-100"
            >
              <option value={24}>24 fps</option>
              <option value={30}>30 fps</option>
            </select>
          </label>

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
        </div>
      )}
    </div>
  );
}
