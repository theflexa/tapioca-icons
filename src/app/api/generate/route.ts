import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { filterPrompt } from "@/lib/content-filter";
import { checkRateLimit, incrementRateLimit } from "@/lib/rate-limit";
import { buildStylePrompt, AnimationType } from "@/lib/style-prompt";
import { generateImage } from "@/lib/ai/generate";
import { db } from "@/lib/db";
import { generations } from "@/lib/db/schema";

interface GenerateRequest {
  prompt: string;
  animationType?: AnimationType;
  duration?: 2 | 3;
  fps?: 24 | 30;
  accentColor?: string;
}

export async function POST(request: NextRequest) {
  // Auth check
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse body
  const body: GenerateRequest = await request.json();

  // Content filter
  const filtered = filterPrompt(body.prompt);
  if (!filtered.ok) {
    return NextResponse.json({ error: filtered.reason }, { status: 400 });
  }

  // Rate limit
  const rateCheck = await checkRateLimit(userId);
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: rateCheck.reason }, { status: 429 });
  }

  const animationType = body.animationType ?? "float";
  const totalKeyframes = 6;
  const styleParams = {
    animationType,
    duration: body.duration ?? 2,
    fps: body.fps ?? 24,
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
    // Generate keyframes
    const keyframes: string[] = [];
    let provider: string | undefined;

    for (let i = 0; i < totalKeyframes; i++) {
      const styledPrompt = buildStylePrompt(filtered.sanitized, {
        accentColor: body.accentColor,
        animationType,
        keyframeIndex: i,
        totalKeyframes,
      });

      const result = await generateImage(styledPrompt);
      keyframes.push(result.base64);

      if (i === 0) {
        provider = result.provider;
      }
    }

    // Update generation status
    await db
      .update(generations)
      .set({
        status: "completed",
        framesCount: totalKeyframes,
        provider: provider,
      })
      .where(eq(generations.id, generation.id));

    // Increment rate limit
    await incrementRateLimit(userId);

    return NextResponse.json({
      id: generation.id,
      keyframes,
      params: styleParams,
    });
  } catch (error) {
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
