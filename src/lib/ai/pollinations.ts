export interface PollinationsOptions {
  negative?: string;
  seed?: number;
  model?: string;
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
  });

  if (options.negative) {
    params.set("negative", options.negative);
  }
  if (options.seed !== undefined) {
    params.set("seed", String(options.seed));
  }

  const encoded = encodeURIComponent(prompt);
  const url = `https://image.pollinations.ai/prompt/${encoded}?${params.toString()}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(60000) });

  if (!res.ok) {
    throw new Error(`Pollinations error: ${res.status} ${res.statusText}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  return base64;
}
