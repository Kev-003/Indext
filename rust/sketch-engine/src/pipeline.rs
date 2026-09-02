use crate::corner::{detect_corners, get_sharp_corner_indices};
use crate::curves::fit_bezier;
pub use crate::output::{generate_svg_path, to_primitive_points, RefineResult as RefineResultData};
use crate::point::{parse_points, Point};
use crate::snapping::detect_primitives;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RefineOptions {
    #[serde(default = "default_epsilon")]
    pub epsilon: f64,

    #[serde(default = "default_angle_threshold")]
    pub angle_threshold_deg: f64,

    #[serde(default = "default_fit_tolerance")]
    pub fit_tolerance: f64,

    #[serde(default = "default_snap_tolerance")]
    pub snap_tolerance: f64,

    #[serde(default = "default_min_segment_len")]
    pub min_segment_length: f64,
}

fn default_epsilon() -> f64 {
    2.0
}

fn default_angle_threshold() -> f64 {
    30.0
}

fn default_fit_tolerance() -> f64 {
    1.5
}

fn default_snap_tolerance() -> f64 {
    3.0
}

fn default_min_segment_len() -> f64 {
    2.0
}

impl Default for RefineOptions {
    fn default() -> Self {
        RefineOptions {
            epsilon: default_epsilon(),
            angle_threshold_deg: default_angle_threshold(),
            fit_tolerance: default_fit_tolerance(),
            snap_tolerance: default_snap_tolerance(),
            min_segment_length: default_min_segment_len(),
        }
    }
}

pub fn refine_sketch(
    flat_points: &[f64],
    stride: usize,
    opts: &RefineOptions,
) -> RefineResultData {
    if flat_points.is_empty() || stride < 2 {
        return RefineResultData {
            svg_path: String::new(),
            control_points: vec![],
            primitives: vec![],
        };
    }

    // Stage 1: Parse raw points
    let mut points = parse_points(flat_points, stride);

    // Deduplicate consecutive identical points
    points = deduplicate(points);

    if points.len() < 2 {
        return RefineResultData {
            svg_path: String::new(),
            control_points: vec![],
            primitives: vec![],
        };
    }

    // Stage 2: Path simplification (RDP)
    let simplified = crate::simplify::rdp_simplify(&points, opts.epsilon);

    // Stage 3: Corner detection
    let angle_threshold_rad = opts.angle_threshold_deg.to_radians();
    let corners = detect_corners(&simplified, angle_threshold_rad);
    let sharp_indices = get_sharp_corner_indices(&corners);

    // Stage 4: Split at corners and fit bezier curves
    let segments = split_at_corners(&simplified, &sharp_indices, opts.min_segment_length);

    let mut all_beziers = Vec::new();
    for seg in &segments {
        if seg.len() >= 2 {
            let beziers = fit_bezier(seg, opts.fit_tolerance);
            all_beziers.extend(beziers);
        }
    }

    // Stage 5: Geometric primitive detection (snapping)
    let primitives = detect_primitives(&all_beziers, opts.snap_tolerance);

    // Generate output
    let svg_path = generate_svg_path(&all_beziers);
    let control_points = to_primitive_points(&all_beziers);

    RefineResultData {
        svg_path,
        control_points,
        primitives,
    }
}

fn deduplicate(points: Vec<Point>) -> Vec<Point> {
    if points.is_empty() {
        return points;
    }

    let mut result = Vec::with_capacity(points.len());
    result.push(points[0]);

    for p in points.iter().skip(1) {
        if p.distance(&result[result.len() - 1]) > 1e-6 {
            result.push(*p);
        }
    }

    result
}

fn split_at_corners(
    points: &[Point],
    corner_indices: &[usize],
    min_len: f64,
) -> Vec<Vec<Point>> {
    if corner_indices.is_empty() {
        return vec![points.to_vec()];
    }

    let mut segments = Vec::new();
    let mut start = 0usize;

    for &idx in corner_indices {
        if idx <= start || idx >= points.len() - 1 {
            continue;
        }

        let seg: Vec<Point> = points[start..=idx].to_vec();
        if seg.len() >= 2 {
            let span = seg[0].distance(&seg[seg.len() - 1]);
            if span >= min_len {
                segments.push(seg);
                start = idx;
            }
        }
    }

    // Add the final segment
    if start < points.len() - 1 {
        let seg: Vec<Point> = points[start..points.len()].to_vec();
        if seg.len() >= 2 {
            let span = seg[0].distance(&seg[seg.len() - 1]);
            if span >= min_len {
                segments.push(seg);
            }
        }
    }

    segments
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_empty_input() {
        let result = refine_sketch(&[], 2, &RefineOptions::default());
        assert!(result.svg_path.is_empty());
        assert!(result.control_points.is_empty());
    }

    #[test]
    fn test_simple_straight_line() {
        let flat = [0.0, 0.0, 1.0, 0.0, 2.0, 0.0, 3.0, 0.0, 4.0, 0.0];
        let result = refine_sketch(&flat, 2, &RefineOptions::default());
        assert!(!result.svg_path.is_empty());
        assert!(result.svg_path.starts_with("M"));
    }

    #[test]
    fn test_circle_approximation() {
        // Points approximating a circle
        let mut flat = Vec::new();
        for i in 0..32 {
            let theta = i as f64 / 32.0 * 2.0 * std::f64::consts::PI;
            flat.push(theta.cos());
            flat.push(theta.sin());
        }

        let result = refine_sketch(&flat, 2, &RefineOptions::default());
        assert!(!result.svg_path.is_empty());
        assert!(!result.control_points.is_empty() || !result.primitives.is_empty());
    }

    #[test]
    fn test_stride4_input() {
        let flat = [0.0, 0.0, 1.0, 100.0, 1.0, 0.0, 1.0, 200.0, 2.0, 0.0, 1.0, 300.0];
        let result = refine_sketch(&flat, 4, &RefineOptions::default());
        assert!(!result.svg_path.is_empty());
    }

    #[test]
    fn test_deduplication() {
        let pts = vec![
            Point::new(0.0, 0.0),
            Point::new(0.0, 0.0),
            Point::new(1.0, 0.0),
            Point::new(1.0, 0.0),
            Point::new(2.0, 0.0),
        ];
        let deduped = deduplicate(pts);
        assert_eq!(deduped.len(), 3);
    }

    #[test]
    fn test_split_at_corners() {
        let points = vec![
            Point::new(0.0, 0.0),
            Point::new(1.0, 0.0),
            Point::new(1.0, 0.0), // corner
            Point::new(1.0, 1.0),
            Point::new(1.0, 2.0),
            Point::new(0.0, 2.0), // corner
            Point::new(0.0, 3.0),
        ];
        let corners = vec![2usize, 5];
        let segments = split_at_corners(&points, &corners, 0.5);
        assert!(segments.len() >= 2);
    }

    #[test]
    fn test_default_options() {
        let opts = RefineOptions::default();
        assert!((opts.epsilon - 2.0).abs() < 1e-10);
        assert!((opts.angle_threshold_deg - 30.0).abs() < 1e-10);
    }
}
