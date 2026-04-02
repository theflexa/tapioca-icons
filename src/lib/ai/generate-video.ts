import { generateKlingVideo } from "./video-kling";
import { generateHuggingFaceVideo } from "./video-huggingface";

export type VideoProvider = "kling" | "huggingface";

export interface VideoResult {
  videoUrl?: string;
  videoBlob?: Blob;
  provider: VideoProvider;
}

export async function generateVideo(
  prompt: string,
  provider: VideoProvider
): Promise<VideoResult> {
  switch (provider) {
    case "kling": {
      const videoUrl = await generateKlingVideo(prompt);
      return { videoUrl, provider: "kling" };
    }
    case "huggingface": {
      const videoBlob = await generateHuggingFaceVideo(prompt);
      return { videoBlob, provider: "huggingface" };
    }
    default:
      throw new Error(`Unknown video provider: ${provider}`);
  }
}
