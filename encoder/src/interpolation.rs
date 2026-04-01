/// Linearly interpolate between two RGBA frames.
pub fn interpolate_frames(
    frame_a: &[u8],
    frame_b: &[u8],
    t: f32,
) -> Vec<u8> {
    frame_a
        .iter()
        .zip(frame_b.iter())
        .map(|(&a, &b)| {
            let blended = (a as f32) * (1.0 - t) + (b as f32) * t;
            blended.round() as u8
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_interpolate_midpoint() {
        let a = vec![0, 0, 0, 255, 200, 200, 200, 255];
        let b = vec![100, 100, 100, 255, 0, 0, 0, 255];
        let result = interpolate_frames(&a, &b, 0.5);
        assert_eq!(result, vec![50, 50, 50, 255, 100, 100, 100, 255]);
    }

    #[test]
    fn test_interpolate_at_zero() {
        let a = vec![10, 20, 30, 255];
        let b = vec![200, 200, 200, 255];
        let result = interpolate_frames(&a, &b, 0.0);
        assert_eq!(result, vec![10, 20, 30, 255]);
    }

    #[test]
    fn test_interpolate_at_one() {
        let a = vec![10, 20, 30, 255];
        let b = vec![200, 200, 200, 255];
        let result = interpolate_frames(&a, &b, 1.0);
        assert_eq!(result, vec![200, 200, 200, 255]);
    }
}
