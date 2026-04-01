import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { filterPrompt } from "@/lib/content-filter";
import { checkAndIncrementRateLimit } from "@/lib/rate-limit";
import { buildStylePrompt, AnimationType } from "@/lib/style-prompt";
import { generateImage } from "@/lib/ai/generate";
import { db } from "@/lib/db";
import { generations } from "@/lib/db/schema";

const generateSchema = z.object({
  prompt: z.string().min(1).max(200),
  animationType: z.enum(["bounce", "float", "rotate", "pulse"]).optional(),
  duration: z.union([z.literal(2), z.literal(3)]).optional(),
  fps: z.union([z.literal(24), z.literal(30)]).optional(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
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

  // Stream keyframes one by one using NDJSON
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const keyframes: string[] = [];
        let provider: string | undefined;

        for (let i = 0; i < totalKeyframes; i++) {
          const styledPrompt = buildStylePrompt(filtered.sanitized, {
            accentColor: body.accentColor,
            animationType,
            keyframeIndex: i,
            totalKeyframes,
          });

          // Send progress event
          controller.enqueue(
            encoder.encode(
              JSON.stringify({ type: "progress", current: i + 1, total: totalKeyframes }) + "\n"
            )
          );

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

        // Send final result
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              type: "result",
              id: generation.id,
              keyframes,
              params: styleParams,
            }) + "\n"
          )
        );
        controller.close();
      } catch {
        await db
          .update(generations)
          .set({ status: "failed" })
          .where(eq(generations.id, generation.id));

        controller.enqueue(
          encoder.encode(
            JSON.stringify({ type: "error", error: "Failed to generate icon" }) + "\n"
          )
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Transfer-Encoding": "chunked",
    },
  });
}
