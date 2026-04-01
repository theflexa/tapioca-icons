export async function generateWithOpenRouter(prompt: string): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      n: 1,
      size: "256x256",
      response_format: "b64_json",
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenRouter error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data.data[0].b64_json;
}
