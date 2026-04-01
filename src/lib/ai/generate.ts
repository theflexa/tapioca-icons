import { generateWithOpenRouter } from "./openrouter";
import { generateWithPollinations, PollinationsOptions } from "./pollinations";

export type GenerateResult = {
  base64: string;
  provider: "openrouter" | "pollinations";
};

export async function generateImage(
  prompt: string,
  pollinationsOptions?: PollinationsOptions
): Promise<GenerateResult> {
  if (process.env.OPENROUTER_API_KEY) {
    try {
      const base64 = await generateWithOpenRouter(prompt);
      return { base64, provider: "openrouter" };
    } catch (error) {
      console.warn("OpenRouter failed, falling back to Pollinations:", error);
    }
  }

  const base64 = await generateWithPollinations(prompt, pollinationsOptions);
  return { base64, provider: "pollinations" };
}
