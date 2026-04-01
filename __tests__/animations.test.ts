import { getAnimation } from "@/lib/animations";

describe("animation functions", () => {
  it("returns identity transform at t=0 for float", () => {
    const anim = getAnimation("float");
    const result = anim(0);
    expect(result.position).toBeDefined();
    expect(result.rotation).toBeDefined();
    expect(result.scale).toBeDefined();
  });

  it("rotate completes full rotation at t=1", () => {
    const anim = getAnimation("rotate");
    const start = anim(0);
    const end = anim(0.999);
    expect(end.rotation[1]).toBeGreaterThan(start.rotation[1]);
  });

  it("bounce returns to start position at t=1", () => {
    const anim = getAnimation("bounce");
    const start = anim(0);
    const end = anim(0.999);
    expect(Math.abs(end.position[1] - start.position[1])).toBeLessThan(0.1);
  });

  it("all 8 animation types are available", () => {
    const types = ["float", "rotate", "flip", "page-turn", "bounce", "pulse", "orbit", "tilt"] as const;
    for (const type of types) {
      const anim = getAnimation(type);
      expect(typeof anim).toBe("function");
      const result = anim(0.5);
      expect(result.position).toHaveLength(3);
      expect(result.rotation).toHaveLength(3);
      expect(result.scale).toHaveLength(3);
    }
  });

  it("orbit affects camera instead of object", () => {
    const anim = getAnimation("orbit");
    const result = anim(0.25);
    expect(result.cameraPosition).toBeDefined();
  });

  it("shadow properties change with animation", () => {
    const anim = getAnimation("bounce");
    const mid = anim(0.25);
    expect(mid.shadowOpacity).toBeDefined();
    expect(mid.shadowScale).toBeDefined();
  });
});
