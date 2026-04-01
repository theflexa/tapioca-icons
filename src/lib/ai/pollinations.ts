export async function generateWithPollinations(prompt: string): Promise<string> {
  const encoded = encodeURIComponent(prompt);
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=200&height=200&nologo=true`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Pollinations error: ${res.status} ${res.statusText}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  return base64;
}
