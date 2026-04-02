import { generateHuggingFaceVideo } from "./video-huggingface";

export type VideoProvider = "huggingface";

export interface VideoResult {
  videoUrl?: string;
  videoBlob?: Blob;
  provider: VideoProvider;
}

export async function generateVideo(
  prompt: string,
  provider: VideoProvider = "huggingface"
): Promise<VideoResult> {
  const videoBlob = await generateHuggingFaceVideo(prompt);
  return { videoBlob, provider: "huggingface" };
}
