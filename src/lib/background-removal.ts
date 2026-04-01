import { removeBackground } from "@imgly/background-removal";

export async function removeImageBackground(
  imageBlob: Blob
): Promise<Blob> {
  return removeBackground(imageBlob, {
    output: { format: "image/png", quality: 1 },
  });
}
