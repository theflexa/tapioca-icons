import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { filterPrompt } from "@/lib/content-filter";
import { checkAndIncrementRateLimit } from "@/lib/rate-limit";
import { buildStylePrompt, buildNegativePrompt, AnimationType, VisualStyle } from "@/lib/style-prompt";
import { generateImage } from "@/lib/ai/generate";
import { db } from "@/lib/db";
import { generations } from "@/lib/db/schema";

// Vercel serverless function timeout (free tier max: 60s)
export const maxDuration = 60;

const generateSchema = z.object({
  prompt: z.string().min(1).max(200),
  animationType: z.enum(["bounce", "float", "rotate", "pulse"]).optional(),
  duration: z.union([z.literal(2), z.literal(3)]).optional(),
  fps: z.union([z.literal(60), z.literal(120)]).optional(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  aiModel: z.string().max(50).optional(),
  visualStyle: z.enum(["3d", "pixel-8bit", "pixel-16bit", "pixel-32bit", "realistic", "retro"]).optional(),
});

export async function POST(request: NextRequest) {
  // Auth check
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse body
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Validate body
  const parsed = generateSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const body = parsed.data;

  // Content filter
  const filtered = filterPrompt(body.prompt);
  if (!filtered.ok) {
    return NextResponse.json({ error: filtered.reason }, { status: 400 });
  }

  // Rate limit (atomic check + increment)
  const rateCheck = await checkAndIncrementRateLimit(userId);
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: rateCheck.reason }, { status: 429 });
  }

  const animationType = body.animationType ?? "float";
  const styleParams = {
    animationType,
    duration: body.duration ?? 2,
    fps: body.fps ?? 60,
    accentColor: body.accentColor,
  };

  // Create generation record
  const [generation] = await db
    .insert(generations)
    .values({
      userId,
      prompt: filtered.sanitized,
      styleParams,
      status: "processing",
    })
    .returning();

  try {
    // Generate a single base frame (avoids Pollinations rate limiting)
    const visualStyle = (body.visualStyle ?? "3d") as VisualStyle;
    const styledPrompt = buildStylePrompt(filtered.sanitized, {
      accentColor: body.accentColor,
      animationType,
      visualStyle,
    });

    const baseSeed = Math.floor(Math.random() * 1000000);
    const result = await generateImage(styledPrompt, {
      negative: buildNegativePrompt(visualStyle),
      seed: baseSeed,
      model: body.aiModel,
    });

    const keyframes = [result.base64];
    const provider = result.provider;

    // Update generation status
    await db
      .update(generations)
      .set({
        status: "completed",
        framesCount: 1,
        provider,
      })
      .where(eq(generations.id, generation.id));

    return NextResponse.json({
      id: generation.id,
      keyframes,
      params: styleParams,
    });
  } catch {
    await db
      .update(generations)
      .set({ status: "failed" })
      .where(eq(generations.id, generation.id));

    return NextResponse.json(
      { error: "Failed to generate icon" },
      { status: 500 }
    );
  }
}
