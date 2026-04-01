mod apng;
mod interpolation;
mod spritesheet;

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn interpolate(
    keyframes_data: &[u8],
    width: u32,
    height: u32,
    keyframe_count: u32,
    total_frames: u32,
) -> Vec<u8> {
    let frame_size = (width * height * 4) as usize;
    let keyframes: Vec<&[u8]> = (0..keyframe_count as usize)
        .map(|i| &keyframes_data[i * frame_size..(i + 1) * frame_size])
        .collect();

    let mut output = Vec::with_capacity(total_frames as usize * frame_size);

    for i in 0..total_frames {
        let t = i as f32 / total_frames as f32 * (keyframes.len() - 1) as f32;
        let idx_a = t.floor() as usize;
        let idx_b = (idx_a + 1).min(keyframes.len() - 1);
        let frac = t - t.floor();

        let frame = interpolation::interpolate_frames(keyframes[idx_a], keyframes[idx_b], frac);
        output.extend_from_slice(&frame);
    }

    output
}

#[wasm_bindgen]
pub fn create_spritesheet(
    frames_data: &[u8],
    width: u32,
    height: u32,
    frame_count: u32,
) -> Vec<u8> {
    let frame_size = (width * height * 4) as usize;
    let frames: Vec<Vec<u8>> = (0..frame_count as usize)
        .map(|i| frames_data[i * frame_size..(i + 1) * frame_size].to_vec())
        .collect();

    spritesheet::encode_spritesheet(&frames, width, height)
}

#[wasm_bindgen]
pub fn encode_png(frame_data: &[u8], width: u32, height: u32) -> Vec<u8> {
    apng::encode_single_frame_png(frame_data, width, height)
}
