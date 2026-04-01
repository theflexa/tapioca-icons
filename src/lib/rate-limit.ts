import { eq, and, lt, sql } from "drizzle-orm";

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

/**
 * Atomically check and increment rate limit in a single operation.
 * First resets expired windows, then attempts a conditional UPDATE
 * that only increments if within limits. If 0 rows affected, the limit was exceeded.
 */
export async function checkAndIncrementRateLimit(userId: string): Promise<
  { allowed: true } | { allowed: false; reason: string }
> {
  const { db, rateLimits } = await getDb();

  const rows = await db
    .select()
    .from(rateLimits)
    .where(eq(rateLimits.userId, userId));

  const now = new Date();

  if (rows.length === 0) {
    // First request ever: insert with count=1 (already consumed this request)
    await db.insert(rateLimits).values({
      userId,
      hourlyCount: 1,
      dailyCount: 1,
      lastResetHourly: now,
      lastResetDaily: now,
    });
    return { allowed: true };
  }

  const record = rows[0];
  const hourlyExpired = shouldReset(record.lastResetHourly, "hourly");
  const dailyExpired = shouldReset(record.lastResetDaily, "daily");

  // If windows expired, reset them first
  if (hourlyExpired || dailyExpired) {
    await db
      .update(rateLimits)
      .set({
        hourlyCount: hourlyExpired ? 0 : record.hourlyCount,
        dailyCount: dailyExpired ? 0 : record.dailyCount,
        lastResetHourly: hourlyExpired ? now : record.lastResetHourly,
        lastResetDaily: dailyExpired ? now : record.lastResetDaily,
      })
      .where(eq(rateLimits.userId, userId));
  }

  // Atomic conditional increment: only succeeds if both counts are under limits
  const result = await db
    .update(rateLimits)
    .set({
      hourlyCount: sql`${rateLimits.hourlyCount} + 1`,
      dailyCount: sql`${rateLimits.dailyCount} + 1`,
    })
    .where(
      and(
        eq(rateLimits.userId, userId),
        lt(rateLimits.hourlyCount, HOURLY_LIMIT),
        lt(rateLimits.dailyCount, DAILY_LIMIT)
      )
    )
    .returning();

  if (result.length === 0) {
    // Re-read to determine which limit was hit
    const updated = await db
      .select()
      .from(rateLimits)
      .where(eq(rateLimits.userId, userId));

    if (updated.length > 0 && updated[0].hourlyCount >= HOURLY_LIMIT) {
      return { allowed: false, reason: "hourly generation limit reached (10/hour)" };
    }
    return { allowed: false, reason: "daily generation limit reached (50/day)" };
  }

  return { allowed: true };
}
