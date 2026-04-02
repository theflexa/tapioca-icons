export interface PollinationsOptions {
  negative?: string;
  seed?: number;
  model?: string;
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

async function fetchWithRetry(url: string, headers: HeadersInit = {}, retries = MAX_RETRIES): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(60000) });

    if (res.ok) return res;

    // Retry on server errors (500, 502, 503, 504) and rate limits (429)
    if ((res.status >= 500 || res.status === 429) && attempt < retries) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
      continue;
    }

    // Get error details for non-retryable errors
    let errorDetail = "";
    try {
      const body = await res.text();
      errorDetail = `: ${body}`;
    } catch {}

    throw new Error(`Pollinations error: ${res.status} ${res.statusText} (after ${attempt} attempts)${errorDetail}`);
  }

  throw new Error("Pollinations: max retries exceeded");
}

export async function generateWithPollinations(
  prompt: string,
  options: PollinationsOptions = {}
): Promise<string> {
  const params = new URLSearchParams({
    width: "1024",
    height: "1024",
    model: options.model || "flux",
    nologo: "true",
    quality: "hd",
  });

  if (options.negative) {
    params.set("negative_prompt", options.negative);
  }
  if (options.seed !== undefined) {
    params.set("seed", String(options.seed));
  }

  const encoded = encodeURIComponent(prompt);
  const url = `https://gen.pollinations.ai/image/${encoded}?${params.toString()}`;

  const headers: HeadersInit = {};
  if (process.env.POLLINATIONS_API_KEY) {
    headers["Authorization"] = `Bearer ${process.env.POLLINATIONS_API_KEY}`;
  }

  const res = await fetchWithRetry(url, headers);

  const arrayBuffer = await res.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  return base64;
}
