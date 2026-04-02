import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getVideoUsageForUser } from "@/lib/video-usage";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const usage = await getVideoUsageForUser(userId);
  return NextResponse.json(usage);
}
