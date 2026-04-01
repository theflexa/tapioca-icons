use png::{BitDepth, ColorType, Encoder};
use std::io::Cursor;

pub fn encode_spritesheet(
    frames: &[Vec<u8>],
    width: u32,
    height: u32,
) -> Vec<u8> {
    let count = frames.len() as u32;
    let cols = (count as f32).sqrt().ceil() as u32;
    let rows = (count + cols - 1) / cols;

    let sheet_width = cols * width;
    let sheet_height = rows * height;
    let mut sheet = vec![0u8; (sheet_width * sheet_height * 4) as usize];

    for (i, frame) in frames.iter().enumerate() {
        let col = (i as u32) % cols;
        let row = (i as u32) / cols;

        for y in 0..height {
            for x in 0..width {
                let src_idx = ((y * width + x) * 4) as usize;
                let dst_x = col * width + x;
                let dst_y = row * height + y;
                let dst_idx = ((dst_y * sheet_width + dst_x) * 4) as usize;

                if src_idx + 3 < frame.len() && dst_idx + 3 < sheet.len() {
                    sheet[dst_idx..dst_idx + 4].copy_from_slice(&frame[src_idx..src_idx + 4]);
                }
            }
        }
    }

    let mut buf = Cursor::new(Vec::new());
    {
        let mut encoder = Encoder::new(&mut buf, sheet_width, sheet_height);
        encoder.set_color(ColorType::Rgba);
        encoder.set_depth(BitDepth::Eight);
        let mut writer = encoder.write_header().expect("Failed to write PNG header");
        writer.write_image_data(&sheet).expect("Failed to write PNG data");
    }
    buf.into_inner()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_spritesheet_creates_valid_png() {
        let frame = vec![255u8; 4 * 4 * 4]; // 4x4 white RGBA
        let result = encode_spritesheet(&[frame.clone(), frame], 4, 4);
        assert_eq!(&result[0..4], &[137, 80, 78, 71]); // PNG magic bytes
    }
}
