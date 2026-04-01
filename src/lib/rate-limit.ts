import { eq } from "drizzle-orm";

const HOURLY_LIMIT = 10;
const DAILY_LIMIT = 50;
const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = 24 * 60 * 60 * 1000;

export function shouldReset(lastReset: Date, period: "hourly" | "daily"): boolean {
  const elapsed = Date.now() - lastReset.getTime();
  return period === "hourly" ? elapsed >= ONE_HOUR : elapsed >= ONE_DAY;
}

export function isWithinLimits(
  hourlyCount: number,
  dailyCount: number
): { allowed: true } | { allowed: false; reason: string } {
  if (hourlyCount >= HOURLY_LIMIT) {
    return { allowed: false, reason: "hourly generation limit reached (10/hour)" };
  }
  if (dailyCount >= DAILY_LIMIT) {
    return { allowed: false, reason: "daily generation limit reached (50/day)" };
  }
  return { allowed: true };
}

async function getDb() {
  const { db } = await import("@/lib/db");
  const { rateLimits } = await import("@/lib/db/schema");
  return { db, rateLimits };
}

export async function checkRateLimit(userId: string) {
  const { db, rateLimits } = await getDb();

  const rows = await db
    .select()
    .from(rateLimits)
    .where(eq(rateLimits.userId, userId));

  if (rows.length === 0) {
    await db.insert(rateLimits).values({ userId });
    return { allowed: true } as const;
  }

  const record = rows[0];
  let hourlyCount = record.hourlyCount;
  let dailyCount = record.dailyCount;

  if (shouldReset(record.lastResetHourly, "hourly")) {
    hourlyCount = 0;
  }
  if (shouldReset(record.lastResetDaily, "daily")) {
    dailyCount = 0;
  }

  return isWithinLimits(hourlyCount, dailyCount);
}

export async function incrementRateLimit(userId: string) {
  const { db, rateLimits } = await getDb();

  const rows = await db
    .select()
    .from(rateLimits)
    .where(eq(rateLimits.userId, userId));

  if (rows.length === 0) return;

  const record = rows[0];
  const now = new Date();

  const newHourly = shouldReset(record.lastResetHourly, "hourly") ? 1 : record.hourlyCount + 1;
  const newDaily = shouldReset(record.lastResetDaily, "daily") ? 1 : record.dailyCount + 1;

  await db
    .update(rateLimits)
    .set({
      hourlyCount: newHourly,
      dailyCount: newDaily,
      lastResetHourly: shouldReset(record.lastResetHourly, "hourly") ? now : record.lastResetHourly,
      lastResetDaily: shouldReset(record.lastResetDaily, "daily") ? now : record.lastResetDaily,
    })
    .where(eq(rateLimits.userId, userId));
}
