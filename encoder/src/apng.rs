use std::io::Write;
use png::{BitDepth, ColorType, Encoder};
use std::io::Cursor;

fn crc32(data: &[u8]) -> u32 {
    let mut crc: u32 = 0xFFFFFFFF;
    for &byte in data {
        crc ^= byte as u32;
        for _ in 0..8 {
            if crc & 1 != 0 {
                crc = (crc >> 1) ^ 0xEDB88320;
            } else {
                crc >>= 1;
            }
        }
    }
    !crc
}

fn write_chunk(out: &mut Vec<u8>, chunk_type: &[u8; 4], data: &[u8]) {
    out.extend_from_slice(&(data.len() as u32).to_be_bytes());
    out.extend_from_slice(chunk_type);
    out.extend_from_slice(data);
    let mut crc_input = Vec::with_capacity(4 + data.len());
    crc_input.extend_from_slice(chunk_type);
    crc_input.extend_from_slice(data);
    out.extend_from_slice(&crc32(&crc_input).to_be_bytes());
}

pub fn encode_single_frame_png(frame: &[u8], width: u32, height: u32) -> Vec<u8> {
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

fn compress_frame(frame: &[u8], width: u32, height: u32) -> Vec<u8> {
    let row_size = (width * 4) as usize;
    let mut filtered = Vec::with_capacity((row_size + 1) * height as usize);
    for y in 0..height as usize {
        filtered.push(0u8); // filter: None
        filtered.extend_from_slice(&frame[y * row_size..(y + 1) * row_size]);
    }

    let mut encoder = flate2::write::ZlibEncoder::new(Vec::new(), flate2::Compression::default());
    encoder.write_all(&filtered).expect("Failed to compress");
    encoder.finish().expect("Failed to finish compression")
}

pub fn encode_apng(
    frames: &[&[u8]],
    width: u32,
    height: u32,
    fps: u32,
) -> Vec<u8> {
    let mut out = Vec::new();

    // PNG signature
    out.extend_from_slice(&[137, 80, 78, 71, 13, 10, 26, 10]);

    // IHDR
    let mut ihdr = Vec::with_capacity(13);
    ihdr.extend_from_slice(&width.to_be_bytes());
    ihdr.extend_from_slice(&height.to_be_bytes());
    ihdr.push(8);  // bit depth
    ihdr.push(6);  // color type: RGBA
    ihdr.push(0);  // compression
    ihdr.push(0);  // filter
    ihdr.push(0);  // interlace
    write_chunk(&mut out, b"IHDR", &ihdr);

    // acTL (animation control)
    let num_frames = frames.len() as u32;
    let mut actl = Vec::with_capacity(8);
    actl.extend_from_slice(&num_frames.to_be_bytes());
    actl.extend_from_slice(&0u32.to_be_bytes()); // loop forever
    write_chunk(&mut out, b"acTL", &actl);

    let mut seq_num: u32 = 0;

    for (i, frame) in frames.iter().enumerate() {
        // fcTL (frame control)
        let mut fctl = Vec::with_capacity(26);
        fctl.extend_from_slice(&seq_num.to_be_bytes());
        seq_num += 1;
        fctl.extend_from_slice(&width.to_be_bytes());
        fctl.extend_from_slice(&height.to_be_bytes());
        fctl.extend_from_slice(&0u32.to_be_bytes()); // x_offset
        fctl.extend_from_slice(&0u32.to_be_bytes()); // y_offset
        fctl.extend_from_slice(&1u16.to_be_bytes());  // delay_num
        fctl.extend_from_slice(&(fps as u16).to_be_bytes()); // delay_den
        fctl.push(0); // dispose_op: none
        fctl.push(0); // blend_op: source
        write_chunk(&mut out, b"fcTL", &fctl);

        let compressed = compress_frame(frame, width, height);

        if i == 0 {
            write_chunk(&mut out, b"IDAT", &compressed);
        } else {
            let mut fdat = Vec::with_capacity(4 + compressed.len());
            fdat.extend_from_slice(&seq_num.to_be_bytes());
            seq_num += 1;
            fdat.extend_from_slice(&compressed);
            write_chunk(&mut out, b"fdAT", &fdat);
        }
    }

    // IEND
    write_chunk(&mut out, b"IEND", &[]);

    out
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

    #[test]
    fn test_apng_has_correct_signature_and_chunks() {
        let frame1 = vec![255u8; 4 * 4 * 4];
        let frame2 = vec![0u8; 4 * 4 * 4];
        let result = encode_apng(&[&frame1, &frame2], 4, 4, 24);

        assert_eq!(&result[0..8], &[137, 80, 78, 71, 13, 10, 26, 10]);

        let actl_pos = result.windows(4).position(|w| w == b"acTL");
        assert!(actl_pos.is_some(), "APNG must contain acTL chunk");

        let fctl_pos = result.windows(4).position(|w| w == b"fcTL");
        assert!(fctl_pos.is_some(), "APNG must contain fcTL chunk");

        let idat_pos = result.windows(4).position(|w| w == b"IDAT");
        assert!(idat_pos.is_some(), "APNG must contain IDAT chunk");

        let fdat_pos = result.windows(4).position(|w| w == b"fdAT");
        assert!(fdat_pos.is_some(), "APNG must contain fdAT chunk");

        let iend_pos = result.windows(4).position(|w| w == b"IEND");
        assert!(iend_pos.is_some(), "APNG must contain IEND chunk");
    }
}
