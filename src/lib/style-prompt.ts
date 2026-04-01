export type AnimationType = "bounce" | "float" | "rotate" | "pulse";

interface StyleOptions {
  accentColor?: string;
  animationType?: AnimationType;
  keyframeIndex?: number;
  totalKeyframes?: number;
}

const BASE_STYLE = [
  "isometric 3D icon",
  "high-angle 60 degree downward view",
  "matte clay finish",
  "soft studio lighting with subtle shadows",
  "bright neutral colors",
  "toy-like proportions",
  "clean minimal design",
  "smooth bevels",
  "single centered object",
  "plain white background",
].join(", ");

const ANIMATION_VARIATIONS: Record<
  AnimationType,
  (index: number, total: number) => string
> = {
  rotate: (i, t) =>
    `same icon, rotated ${Math.round((360 / t) * i)} degrees around vertical axis`,
  bounce: (i, t) => {
    const phase = (i / t) * Math.PI * 2;
    const offset = Math.round(Math.sin(phase) * 10);
    return `same icon, shifted ${Math.abs(offset)}px ${offset >= 0 ? "up" : "down"} from center`;
  },
  float: (i, t) => {
    const phase = (i / t) * Math.PI * 2;
    const offset = Math.round(Math.sin(phase) * 6);
    return `same icon, floating ${Math.abs(offset)}px ${offset >= 0 ? "up" : "down"} with slight tilt`;
  },
  pulse: (i, t) => {
    const phase = (i / t) * Math.PI * 2;
    const scale = 100 + Math.round(Math.sin(phase) * 8);
    return `same icon, scaled to ${scale}% of original size`;
  },
};

export function buildStylePrompt(
  subject: string,
  options: StyleOptions = {}
): string {
  const parts = [BASE_STYLE, `Subject: ${subject}`];

  if (options.accentColor) {
    parts.push(
      `accent color ${options.accentColor} used sparingly (max 10% of composition)`
    );
  }

  if (options.animationType && options.keyframeIndex === undefined) {
    parts.push(`designed for ${options.animationType} animation`);
  }

  if (
    options.keyframeIndex !== undefined &&
    options.totalKeyframes !== undefined &&
    options.animationType
  ) {
    const variation = ANIMATION_VARIATIONS[options.animationType](
      options.keyframeIndex,
      options.totalKeyframes
    );
    parts.push(variation);
  }

  return parts.join(". ") + ".";
}

export function buildNegativePrompt(): string {
  return "realistic, photographic, complex, detailed texture, noisy, blurry, dark, multiple objects, text, watermark";
}
