import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { filterPrompt } from "@/lib/content-filter";
import { checkAndIncrementRateLimit } from "@/lib/rate-limit";
import { checkVideoUsage, incrementVideoUsage } from "@/lib/video-usage";
import { generateVideo, VideoProvider } from "@/lib/ai/generate-video";

export const maxDuration = 300;

const videoSchema = z.object({
  prompt: z.string().min(1).max(200),
  provider: z.enum(["huggingface"]),
  duration: z.union([z.literal(2), z.literal(3)]).optional(),
});

function buildVideoPrompt(subject: string): string {
  return `3D animated icon of ${subject}, smooth looping animation, clay matte finish, soft studio lighting, isometric view, white background, 3 second loop`;
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = videoSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const body = parsed.data;

  const filtered = filterPrompt(body.prompt);
  if (!filtered.ok) {
    return NextResponse.json({ error: filtered.reason }, { status: 400 });
  }

  const rateCheck = await checkAndIncrementRateLimit(userId);
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: rateCheck.reason }, { status: 429 });
  }

  const videoCheck = await checkVideoUsage(userId, body.provider);
  if (!videoCheck.allowed) {
    const reason = "reason" in videoCheck ? videoCheck.reason : "Video limit reached";
    return NextResponse.json({ error: reason }, { status: 429 });
  }

  try {
    const videoPrompt = buildVideoPrompt(filtered.sanitized);
    const result = await generateVideo(videoPrompt, body.provider as VideoProvider);

    await incrementVideoUsage(userId, body.provider);

    if (result.videoUrl) {
      return NextResponse.json({ videoUrl: result.videoUrl, provider: result.provider });
    }

    if (result.videoBlob) {
      const arrayBuffer = await result.videoBlob.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      return NextResponse.json({ videoBase64: base64, provider: result.provider });
    }

    return NextResponse.json({ error: "No video generated" }, { status: 500 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Video generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
