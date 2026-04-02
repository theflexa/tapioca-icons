import { SignJWT } from "jose";

const KLING_BASE = "https://api.klingai.com/v1";

interface KlingTaskResponse {
  code: number;
  data: {
    task_id: string;
    task_status: string;
  };
}

interface KlingResultResponse {
  code: number;
  data: {
    task_id: string;
    task_status: string;
    task_result?: {
      videos?: Array<{ url: string; duration: number }>;
    };
  };
}

async function getKlingToken(): Promise<string> {
  const accessKey = process.env.KLING_API_ACCESS_KEY;
  const secretKey = process.env.KLING_API_SECRET_KEY;

  if (!accessKey || !secretKey) {
    throw new Error("KLING_API_ACCESS_KEY and KLING_API_SECRET_KEY must be set");
  }

  const now = Math.floor(Date.now() / 1000);
  const secret = new TextEncoder().encode(secretKey);

  const token = await new SignJWT({
    iss: accessKey,
    exp: now + 1800, // 30 minutes
    nbf: now - 5,
    iat: now,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .sign(secret);

  return token;
}

export async function createKlingVideoTask(prompt: string): Promise<string> {
  const token = await getKlingToken();

  const res = await fetch(`${KLING_BASE}/videos/text2video`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model_name: "kling-v1",
      prompt,
      duration: "5",
      aspect_ratio: "1:1",
      mode: "std",
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Kling API error: ${res.status} ${text}`);
  }

  const data: KlingTaskResponse = await res.json();
  if (data.code !== 0) {
    throw new Error(`Kling task creation failed: code ${data.code}`);
  }

  return data.data.task_id;
}

export async function pollKlingTask(taskId: string, maxWaitMs = 600000): Promise<string> {
  const start = Date.now();

  while (Date.now() - start < maxWaitMs) {
    const token = await getKlingToken();

    const res = await fetch(`${KLING_BASE}/videos/text2video/${taskId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      throw new Error(`Kling poll error: ${res.status}`);
    }

    const data: KlingResultResponse = await res.json();
    const status = data.data.task_status;

    if (status === "succeed" && data.data.task_result?.videos?.[0]) {
      return data.data.task_result.videos[0].url;
    }

    if (status === "failed") {
      throw new Error("Kling video generation failed");
    }

    // Wait 15 seconds before next poll
    await new Promise((r) => setTimeout(r, 15000));
  }

  throw new Error("Kling video generation timed out");
}

export async function generateKlingVideo(prompt: string): Promise<string> {
  const taskId = await createKlingVideoTask(prompt);
  const videoUrl = await pollKlingTask(taskId);
  return videoUrl;
}
