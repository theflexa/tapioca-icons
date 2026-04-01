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

  it("returns a negative prompt", () => {
    const result = buildNegativePrompt();
    expect(result).toContain("realistic");
    expect(result).toContain("photographic");
  });
});
