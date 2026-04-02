export interface PollinationsOptions {
  negative?: string;
  seed?: number;
  model?: string;
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retries = MAX_RETRIES
): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(60000) });

    if (res.ok) return res;

    if ((res.status >= 500 || res.status === 429) && attempt < retries) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
      continue;
    }

    let errorDetail = "";
    try {
      errorDetail = `: ${await res.text()}`;
    } catch {}

    throw new Error(
      `Pollinations error: ${res.status} ${res.statusText} (after ${attempt} attempts)${errorDetail}`
    );
  }

  throw new Error("Pollinations: max retries exceeded");
}

export async function generateWithPollinations(
  prompt: string,
  options: PollinationsOptions = {}
): Promise<string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (process.env.POLLINATIONS_API_KEY) {
    headers["Authorization"] = `Bearer ${process.env.POLLINATIONS_API_KEY}`;
  }

  const body: Record<string, unknown> = {
    prompt,
    model: options.model || "flux",
    width: 1024,
    height: 1024,
    nologo: true,
    quality: "hd",
    response_format: "b64_json",
  };

  if (options.negative) {
    body.negative_prompt = options.negative;
  }
  if (options.seed !== undefined) {
    body.seed = options.seed;
  }

  const res = await fetchWithRetry("https://gen.pollinations.ai/v1/images/generations", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return data.data[0].b64_json;
}
