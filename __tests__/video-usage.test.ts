import { describe, it, expect } from "vitest";
import { getProviderLimit, isWithinVideoLimit, shouldResetDaily } from "@/lib/video-usage";

describe("video usage", () => {
  it("returns correct limits per provider", () => {
    expect(getProviderLimit("huggingface")).toEqual({ daily: Infinity, monthly: 100 });
  });

  it("allows when under limit", () => {
    expect(isWithinVideoLimit(5, 10, { daily: 66, monthly: Infinity })).toEqual({ allowed: true });
  });

  it("blocks when daily limit exceeded", () => {
    const result = isWithinVideoLimit(66, 10, { daily: 66, monthly: Infinity });
    expect(result.allowed).toBe(false);
  });

  it("resets daily count after 24 hours", () => {
    const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000);
    expect(shouldResetDaily(yesterday)).toBe(true);
  });

  it("does not reset within 24 hours", () => {
    const recent = new Date(Date.now() - 1 * 60 * 60 * 1000);
    expect(shouldResetDaily(recent)).toBe(false);
  });
});
