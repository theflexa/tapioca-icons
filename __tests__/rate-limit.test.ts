import { describe, it, expect } from "vitest";
import { shouldReset, isWithinLimits } from "@/lib/rate-limit";

describe("rate limit logic", () => {
  it("resets hourly count after 1 hour", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    expect(shouldReset(twoHoursAgo, "hourly")).toBe(true);
  });

  it("does not reset hourly count within 1 hour", () => {
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
    expect(shouldReset(thirtyMinAgo, "hourly")).toBe(false);
  });

  it("resets daily count after 24 hours", () => {
    const twoDaysAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
    expect(shouldReset(twoDaysAgo, "daily")).toBe(true);
  });

  it("does not reset daily count within 24 hours", () => {
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    expect(shouldReset(twelveHoursAgo, "daily")).toBe(false);
  });

  it("allows when under both limits", () => {
    expect(isWithinLimits(5, 20)).toEqual({ allowed: true });
  });

  it("blocks when hourly limit exceeded", () => {
    const result = isWithinLimits(10, 20);
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reason).toContain("hourly");
  });

  it("blocks when daily limit exceeded", () => {
    const result = isWithinLimits(5, 50);
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reason).toContain("daily");
  });
});
