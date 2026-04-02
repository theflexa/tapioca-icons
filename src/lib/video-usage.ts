interface ProviderLimit {
  daily: number;
  monthly: number;
}

const LIMITS: Record<string, ProviderLimit> = {
  huggingface: { daily: Infinity, monthly: 100 },
};

export function getProviderLimit(provider: string): ProviderLimit {
  return LIMITS[provider] ?? { daily: 0, monthly: 0 };
}

export function shouldResetDaily(lastReset: Date): boolean {
  return Date.now() - lastReset.getTime() >= 24 * 60 * 60 * 1000;
}

function shouldResetMonthly(lastReset: Date): boolean {
  const now = new Date();
  return now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear();
}

export function isWithinVideoLimit(
  dailyCount: number,
  monthlyCount: number,
  limit: ProviderLimit
): { allowed: true } | { allowed: false; reason: string } {
  if (limit.daily !== Infinity && dailyCount >= limit.daily) {
    return { allowed: false, reason: `Daily limit reached (${limit.daily}/day)` };
  }
  if (limit.monthly !== Infinity && monthlyCount >= limit.monthly) {
    return { allowed: false, reason: `Monthly limit reached (${limit.monthly}/month)` };
  }
  return { allowed: true };
}

// DB functions use dynamic imports to avoid issues in test environment
export async function checkVideoUsage(userId: string, provider: string) {
  const { db } = await import("@/lib/db");
  const { videoUsage } = await import("@/lib/db/schema");
  const { eq, and } = await import("drizzle-orm");

  const limit = getProviderLimit(provider);
  const rows = await db
    .select()
    .from(videoUsage)
    .where(and(eq(videoUsage.userId, userId), eq(videoUsage.provider, provider)));

  if (rows.length === 0) {
    return { allowed: true, dailyRemaining: limit.daily, monthlyRemaining: limit.monthly };
  }

  const record = rows[0];
  let daily = record.dailyCount;
  let monthly = record.monthlyCount;

  if (shouldResetDaily(record.lastResetDaily)) daily = 0;
  if (shouldResetMonthly(record.lastResetMonthly)) monthly = 0;

  const check = isWithinVideoLimit(daily, monthly, limit);
  if (!check.allowed) return check;

  return {
    allowed: true,
    dailyRemaining: limit.daily === Infinity ? -1 : limit.daily - daily,
    monthlyRemaining: limit.monthly === Infinity ? -1 : limit.monthly - monthly,
  };
}

export async function incrementVideoUsage(userId: string, provider: string) {
  const { db } = await import("@/lib/db");
  const { videoUsage } = await import("@/lib/db/schema");
  const { eq, and } = await import("drizzle-orm");

  const now = new Date();
  const rows = await db
    .select()
    .from(videoUsage)
    .where(and(eq(videoUsage.userId, userId), eq(videoUsage.provider, provider)));

  if (rows.length === 0) {
    await db.insert(videoUsage).values({
      userId,
      provider,
      dailyCount: 1,
      monthlyCount: 1,
      lastResetDaily: now,
      lastResetMonthly: now,
    });
    return;
  }

  const record = rows[0];
  const resetD = shouldResetDaily(record.lastResetDaily);
  const resetM = shouldResetMonthly(record.lastResetMonthly);

  await db
    .update(videoUsage)
    .set({
      dailyCount: resetD ? 1 : record.dailyCount + 1,
      monthlyCount: resetM ? 1 : record.monthlyCount + 1,
      lastResetDaily: resetD ? now : record.lastResetDaily,
      lastResetMonthly: resetM ? now : record.lastResetMonthly,
    })
    .where(and(eq(videoUsage.userId, userId), eq(videoUsage.provider, provider)));
}

export async function getVideoUsageForUser(userId: string) {
  const { db } = await import("@/lib/db");
  const { videoUsage } = await import("@/lib/db/schema");
  const { eq } = await import("drizzle-orm");

  const rows = await db.select().from(videoUsage).where(eq(videoUsage.userId, userId));

  const result: Record<string, { dailyRemaining: number; monthlyRemaining: number }> = {};

  for (const provider of Object.keys(LIMITS)) {
    const limit = LIMITS[provider];
    const record = rows.find((r) => r.provider === provider);

    if (!record) {
      result[provider] = {
        dailyRemaining: limit.daily === Infinity ? -1 : limit.daily,
        monthlyRemaining: limit.monthly === Infinity ? -1 : limit.monthly,
      };
      continue;
    }

    let daily = record.dailyCount;
    let monthly = record.monthlyCount;
    if (shouldResetDaily(record.lastResetDaily)) daily = 0;
    if (shouldResetMonthly(record.lastResetMonthly)) monthly = 0;

    result[provider] = {
      dailyRemaining: limit.daily === Infinity ? -1 : limit.daily - daily,
      monthlyRemaining: limit.monthly === Infinity ? -1 : limit.monthly - monthly,
    };
  }

  return result;
}
