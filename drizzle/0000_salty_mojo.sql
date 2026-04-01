CREATE TABLE "generations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"prompt" text NOT NULL,
	"style_params" jsonb,
	"provider" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"frames_count" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"hourly_count" integer DEFAULT 0 NOT NULL,
	"daily_count" integer DEFAULT 0 NOT NULL,
	"last_reset_hourly" timestamp DEFAULT now() NOT NULL,
	"last_reset_daily" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rate_limits_user_id_unique" UNIQUE("user_id")
);
