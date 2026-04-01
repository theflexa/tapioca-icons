import { generations, rateLimits } from "@/lib/db/schema";

describe("database schema", () => {
  it("generations table has required columns", () => {
    const cols = Object.keys(generations);
    expect(cols).toContain("id");
    expect(cols).toContain("userId");
    expect(cols).toContain("prompt");
    expect(cols).toContain("styleParams");
    expect(cols).toContain("provider");
    expect(cols).toContain("status");
    expect(cols).toContain("framesCount");
    expect(cols).toContain("createdAt");
  });

  it("rateLimits table has required columns", () => {
    const cols = Object.keys(rateLimits);
    expect(cols).toContain("id");
    expect(cols).toContain("userId");
    expect(cols).toContain("hourlyCount");
    expect(cols).toContain("dailyCount");
    expect(cols).toContain("lastResetHourly");
    expect(cols).toContain("lastResetDaily");
  });
});
