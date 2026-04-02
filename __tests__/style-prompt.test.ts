import { buildStylePrompt, buildNegativePrompt } from "@/lib/style-prompt";

describe("style prompt builder", () => {
  it("wraps user subject in professional FLUX prompt", () => {
    const result = buildStylePrompt("floating house with balloons");
    expect(result).toContain("floating house with balloons");
    expect(result).toContain("isometric");
    expect(result).toContain("matte clay");
    expect(result).toContain("white background");
    expect(result).not.toContain("transparent background");
  });

  it("includes accent color when provided", () => {
    const result = buildStylePrompt("a cute cat", { accentColor: "#FF6B6B" });
    expect(result).toContain("#FF6B6B");
  });

  it("includes animation type when provided without keyframe", () => {
    const result = buildStylePrompt("a rocket", { animationType: "bounce" });
    expect(result).toContain("bounce");
  });

  it("generates keyframe variation prompt", () => {
    const result = buildStylePrompt("a star", {
      keyframeIndex: 3,
      totalKeyframes: 8,
      animationType: "rotate",
    });
    expect(result).toContain("rotated");
    expect(result).toContain("same icon");
  });

  it("accepts new 3D animation types", () => {
    const result = buildStylePrompt("a box", { animationType: "flip" });
    expect(result).toContain("flip");
  });

  it("returns a negative prompt for default style", () => {
    const result = buildNegativePrompt();
    expect(result).toContain("realistic");
    expect(result).toContain("photographic");
  });

  it("builds 8-bit pixel art style prompt", () => {
    const result = buildStylePrompt("a sword", { visualStyle: "pixel-8bit" });
    expect(result).toContain("pixel art");
    expect(result).toContain("8-bit");
    expect(result).toContain("chunky pixels");
    expect(result).not.toContain("matte clay");
  });

  it("builds 16-bit pixel art style prompt", () => {
    const result = buildStylePrompt("a sword", { visualStyle: "pixel-16bit" });
    expect(result).toContain("pixel art");
    expect(result).toContain("16-bit");
    expect(result).toContain("SNES");
  });

  it("builds 32-bit pixel art style prompt", () => {
    const result = buildStylePrompt("a sword", { visualStyle: "pixel-32bit" });
    expect(result).toContain("pixel art");
    expect(result).toContain("32-bit");
    expect(result).toContain("dithering");
  });

  it("builds realistic style prompt", () => {
    const result = buildStylePrompt("a car", { visualStyle: "realistic" });
    expect(result).toContain("photorealistic");
    expect(result).toContain("studio photography");
  });

  it("builds retro style prompt", () => {
    const result = buildStylePrompt("a phone", { visualStyle: "retro" });
    expect(result).toContain("retro vintage");
    expect(result).toContain("1970s");
  });

  it("returns style-specific negative prompts", () => {
    expect(buildNegativePrompt("pixel-8bit")).toContain("smooth");
    expect(buildNegativePrompt("pixel-16bit")).toContain("anti-aliased");
    expect(buildNegativePrompt("realistic")).toContain("cartoon");
    expect(buildNegativePrompt("retro")).toContain("modern");
  });
});
