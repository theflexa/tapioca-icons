use std::io::Cursor;
use png::{BitDepth, ColorType, Encoder};

pub fn encode_single_frame_png(
    frame: &[u8],
    width: u32,
    height: u32,
) -> Vec<u8> {
    let mut buf = Cursor::new(Vec::new());
    {
        let mut encoder = Encoder::new(&mut buf, width, height);
        encoder.set_color(ColorType::Rgba);
        encoder.set_depth(BitDepth::Eight);
        let mut writer = encoder.write_header().expect("Failed to write PNG header");
        writer.write_image_data(frame).expect("Failed to write PNG data");
    }
    buf.into_inner()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_single_frame_png() {
        let frame = vec![0u8; 2 * 2 * 4];
        let result = encode_single_frame_png(&frame, 2, 2);
        assert_eq!(&result[0..4], &[137, 80, 78, 71]);
    }
}
