const HF_MODEL = "ali-vilab/text-to-video-ms-1.7b";

export async function generateHuggingFaceVideo(prompt: string): Promise<Blob> {
  const res = await fetch(
    `https://router.huggingface.co/hf-inference/models/${HF_MODEL}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: prompt }),
      signal: AbortSignal.timeout(120000),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HuggingFace error: ${res.status} ${text}`);
  }

  return res.blob();
}
