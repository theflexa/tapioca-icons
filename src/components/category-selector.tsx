"use client";

export type IconCategory = "2d" | "3d-animated";

interface CategorySelectorProps {
  value: IconCategory;
  onChange: (category: IconCategory) => void;
  disabled?: boolean;
}

export function CategorySelector({ value, onChange, disabled }: CategorySelectorProps) {
  return (
    <div className="w-full grid grid-cols-2 gap-3">
      <button
        onClick={() => onChange("2d")}
        disabled={disabled}
        className={`p-4 rounded-lg border text-left transition-all ${
          value === "2d"
            ? "border-orange-500 bg-orange-500/10"
            : "border-zinc-700 bg-zinc-900 hover:border-zinc-600"
        } disabled:opacity-50`}
      >
        <div className="text-sm font-medium text-zinc-100">2D Icon</div>
        <div className="text-xs text-zinc-400 mt-1">
          AI generates image, animated with 3D transforms
        </div>
      </button>
      <button
        onClick={() => onChange("3d-animated")}
        disabled={disabled}
        className={`p-4 rounded-lg border text-left transition-all ${
          value === "3d-animated"
            ? "border-orange-500 bg-orange-500/10"
            : "border-zinc-700 bg-zinc-900 hover:border-zinc-600"
        } disabled:opacity-50`}
      >
        <div className="text-sm font-medium text-zinc-100">3D Animated</div>
        <div className="text-xs text-zinc-400 mt-1">
          AI generates 3D animated video (~5 min)
        </div>
      </button>
    </div>
  );
}
