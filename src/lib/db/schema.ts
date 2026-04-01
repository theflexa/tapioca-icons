import { pgTable, uuid, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";

export const generations = pgTable("generations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  prompt: text("prompt").notNull(),
  styleParams: jsonb("style_params"),
  provider: text("provider"),
  status: text("status").default("pending").notNull(),
  framesCount: integer("frames_count"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const rateLimits = pgTable("rate_limits", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().unique(),
  hourlyCount: integer("hourly_count").default(0).notNull(),
  dailyCount: integer("daily_count").default(0).notNull(),
  lastResetHourly: timestamp("last_reset_hourly").defaultNow().notNull(),
  lastResetDaily: timestamp("last_reset_daily").defaultNow().notNull(),
});
