export type AnimationType = "bounce" | "float" | "rotate" | "pulse" | "flip" | "page-turn" | "orbit" | "tilt";

export type VisualStyle = "3d" | "pixel" | "realistic" | "retro";

interface StyleOptions {
  accentColor?: string;
  animationType?: AnimationType;
  visualStyle?: VisualStyle;
  keyframeIndex?: number;
  totalKeyframes?: number;
}

const VISUAL_STYLES: Record<VisualStyle, string> = {
  "3d": [
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
  ].join(", "),
  pixel: [
    "pixel art icon",
    "16-bit retro game style",
    "crisp sharp pixels",
    "limited color palette",
    "no anti-aliasing",
    "isometric pixel view",
    "bright saturated colors",
    "single centered object",
    "plain white background",
  ].join(", "),
  realistic: [
    "photorealistic 3D rendered icon",
    "studio photography lighting",
    "high detail materials and textures",
    "realistic shadows and reflections",
    "product photography style",
    "shallow depth of field",
    "single centered object",
    "plain white background",
  ].join(", "),
  retro: [
    "retro vintage icon",
    "1970s 1980s aesthetic",
    "warm faded color palette",
    "rounded shapes",
    "slight grain texture",
    "nostalgic design style",
    "bold outlines",
    "single centered object",
    "plain white background",
  ].join(", "),
};

const NEGATIVE_PROMPTS: Record<VisualStyle, string> = {
  "3d": "realistic, photographic, complex, detailed texture, noisy, blurry, dark, multiple objects, text, watermark",
  pixel: "smooth, anti-aliased, 3D, photographic, blurry, gradient, multiple objects, text, watermark",
  realistic: "cartoon, anime, pixel art, low quality, blurry, deformed, multiple objects, text, watermark",
  retro: "modern, minimalist, photographic, 3D render, blurry, multiple objects, text, watermark",
};

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
  flip: () => "same icon",
  "page-turn": () => "same icon",
  orbit: () => "same icon",
  tilt: () => "same icon",
};

export function buildStylePrompt(
  subject: string,
  options: StyleOptions = {}
): string {
  const visualStyle = options.visualStyle ?? "3d";
  const parts = [VISUAL_STYLES[visualStyle], `Subject: ${subject}`];

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

export function buildNegativePrompt(visualStyle: VisualStyle = "3d"): string {
  return NEGATIVE_PROMPTS[visualStyle];
}
