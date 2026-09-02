use crate::point::Point;
use crate::curves::BezierSegment;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum SnappedPrimitive {
    Circle {
        center: Point,
        radius: f64,
    },
    Line {
        start: Point,
        end: Point,
    },
    Rectangle {
        top_left: Point,
        bottom_right: Point,
    },
    RegularPolygon {
        center: Point,
        radius: f64,
        sides: usize,
    },
    None,
}

pub fn detect_primitives(beziers: &[BezierSegment], tolerance: f64) -> Vec<SnappedPrimitive> {
    if beziers.is_empty() {
        return vec![];
    }

    let mut primitives = Vec::new();

    // Try to detect a closed shape from the chain of beziers
    let is_closed = check_chain_closed(beziers, tolerance);

    if is_closed {
        // Collect all control points for fitting
        let all_points: Vec<Point> = beziers
            .iter()
            .flat_map(|seg| [seg.start, seg.cp1, seg.cp2, seg.end])
            .collect();

        if let Some(circle) = try_fit_circle(&all_points, tolerance) {
            primitives.push(circle);
        } else if let Some(rect) = try_fit_rectangle(&all_points, tolerance) {
            primitives.push(rect);
        }
    } else {
        // Open chain: check each segment
        for seg in beziers {
            if let Some(prim) = classify_segment(seg, tolerance) {
                primitives.push(prim);
            } else {
                primitives.push(SnappedPrimitive::None);
            }
        }
    }

    primitives
}

fn check_chain_closed(beziers: &[BezierSegment], tolerance: f64) -> bool {
    if beziers.len() < 3 {
        return false;
    }

    let start = beziers[0].start;
    let end = beziers[beziers.len() - 1].end;

    start.distance(&end) < tolerance
}

fn try_fit_circle(points: &[Point], tolerance: f64) -> Option<SnappedPrimitive> {
    if points.len() < 3 {
        return None;
    }

    // Use the first 3 non-collinear points to define a circle, then check all points
    let mut center: Option<Point> = None;
    let mut radius: f64 = 0.0;

    // Find 3 non-collinear points
    for i in 0..points.len().saturating_sub(2) {
        let a = &points[i];
        let b = &points[i + 1];
        let c = &points[i + 2];

        if let Some((cx, cy, r)) = circle_from_3_points(a, b, c) {
            if r > 1e-6 {
                let circ_center = Point::new(cx, cy);
                // Check how many points are close to this circle
                let mut fit_count = 0;
                let mut total_err_sq = 0.0;
                for p in points {
                    let d = p.distance(&circ_center);
                    let err = (d - r).abs();
                    if err < tolerance {
                        fit_count += 1;
                        total_err_sq += err * err;
                    }
                }
                let ratio = fit_count as f64 / points.len() as f64;
                if ratio > 0.7 {
                    let rms = (total_err_sq / fit_count as f64).sqrt();
                    if center.is_none() || rms < radius {
                        center = Some(circ_center);
                        radius = r;
                    }
                }
            }
        }
    }

    center.map(|c| SnappedPrimitive::Circle {
        center: c,
        radius,
    })
}

fn circle_from_3_points(a: &Point, b: &Point, c: &Point) -> Option<(f64, f64, f64)> {
    let d = 2.0 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
    if d.abs() < 1e-10 {
        return None; // Collinear
    }

    let a_sq = a.x * a.x + a.y * a.y;
    let b_sq = b.x * b.x + b.y * b.y;
    let c_sq = c.x * c.x + c.y * c.y;

    let cx = (a_sq * (b.y - c.y) + b_sq * (c.y - a.y) + c_sq * (a.y - b.y)) / d;
    let cy = (a_sq * (c.x - b.x) + b_sq * (a.x - c.x) + c_sq * (b.x - a.x)) / d;

    let r = a.distance(&Point::new(cx, cy));

    if r > 1e-10 {
        Some((cx, cy, r))
    } else {
        None
    }
}

fn try_fit_rectangle(points: &[Point], tolerance: f64) -> Option<SnappedPrimitive> {
    if points.len() < 4 {
        return None;
    }

    // Find axis-aligned bounding box and check if points snap to corners
    let mut min_x = f64::MAX;
    let mut max_x = f64::MIN;
    let mut min_y = f64::MAX;
    let mut max_y = f64::MIN;

    for p in points {
        min_x = min_x.min(p.x);
        max_x = max_x.max(p.x);
        min_y = min_y.min(p.y);
        max_y = max_y.max(p.y);
    }

    let w = max_x - min_x;
    let h = max_y - min_y;

    if w < 1e-6 || h < 1e-6 {
        return None;
    }

    // Four corners of the bounding box
    let _corners = [
        Point::new(min_x, min_y),
        Point::new(max_x, min_y),
        Point::new(max_x, max_y),
        Point::new(min_x, max_y),
    ];

    // Check if all points are close to one of the four edges
    let mut on_edge_count = 0;
    for p in points {
        let dist_to_left = (p.x - min_x).abs();
        let dist_to_right = (p.x - max_x).abs();
        let dist_to_top = (p.y - min_y).abs();
        let dist_to_bottom = (p.y - max_y).abs();

        let min_dist = dist_to_left.min(dist_to_right).min(dist_to_top).min(dist_to_bottom);
        if min_dist < tolerance {
            on_edge_count += 1;
        }
    }

    let ratio = on_edge_count as f64 / points.len() as f64;
    if ratio > 0.6 {
        let tl = Point::new(min_x, min_y);
        let br = Point::new(max_x, max_y);
        Some(SnappedPrimitive::Rectangle {
            top_left: tl,
            bottom_right: br,
        })
    } else {
        None
    }
}

fn classify_segment(seg: &BezierSegment, tolerance: f64) -> Option<SnappedPrimitive> {
    // Check if the segment is nearly a straight line
    let p0 = &seg.start;
    let p3 = &seg.end;
    let d_total = p0.distance(p3);

    if d_total < 1e-10 {
        return None;
    }

    // Check if control points are near the line from p0 to p3
    let cp1_dist = perpendicular_dist(&seg.cp1, p0, p3, d_total);
    let cp2_dist = perpendicular_dist(&seg.cp2, p0, p3, d_total);

    if cp1_dist < tolerance && cp2_dist < tolerance {
        // Nearly straight — could be a line
        return Some(SnappedPrimitive::Line {
            start: *p0,
            end: *p3,
        });
    }

    // Check if it's part of a circle (check angle sweep)
    None
}

fn perpendicular_dist(p: &Point, a: &Point, b: &Point, line_len: f64) -> f64 {
    if line_len < 1e-10 {
        return p.distance(a);
    }

    let cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    cross.abs() / line_len
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_straight_line_classification() {
        let seg = BezierSegment {
            start: Point::new(0.0, 0.0),
            cp1: Point::new(1.0, 0.0),
            cp2: Point::new(2.0, 0.0),
            end: Point::new(3.0, 0.0),
        };
        let result = classify_segment(&seg, 0.1);
        match result {
            Some(SnappedPrimitive::Line { start, end }) => {
                assert_eq!(start, Point::new(0.0, 0.0));
                assert_eq!(end, Point::new(3.0, 0.0));
            }
            _ => panic!("Expected Line primitive"),
        }
    }

    #[test]
    fn test_circle_from_3_points() {
        // Points on unit circle at 0°, 90°, 180°
        let a = Point::new(1.0, 0.0);
        let b = Point::new(0.0, 1.0);
        let c = Point::new(-1.0, 0.0);
        let (cx, cy, r) = circle_from_3_points(&a, &b, &c).unwrap();
        assert!((cx - 0.0).abs() < 1e-10);
        assert!((cy - 0.0).abs() < 1e-10);
        assert!((r - 1.0).abs() < 1e-10);
    }

    #[test]
    fn test_collinear_points_no_circle() {
        let a = Point::new(0.0, 0.0);
        let b = Point::new(1.0, 0.0);
        let c = Point::new(2.0, 0.0);
        assert!(circle_from_3_points(&a, &b, &c).is_none());
    }

    #[test]
    fn test_closed_chain_detection() {
        let beziers = vec![
            BezierSegment {
                start: Point::new(0.0, 0.0),
                cp1: Point::new(0.0, 0.0),
                cp2: Point::new(1.0, 0.0),
                end: Point::new(1.0, 0.0),
            },
            BezierSegment {
                start: Point::new(1.0, 0.0),
                cp1: Point::new(1.0, 0.0),
                cp2: Point::new(1.0, 1.0),
                end: Point::new(1.0, 1.0),
            },
            BezierSegment {
                start: Point::new(1.0, 1.0),
                cp1: Point::new(1.0, 1.0),
                cp2: Point::new(0.0, 1.0),
                end: Point::new(0.0, 0.0),
            },
        ];
        assert!(check_chain_closed(&beziers, 0.1));
    }

    #[test]
    fn test_open_chain_not_closed() {
        let beziers = vec![
            BezierSegment {
                start: Point::new(0.0, 0.0),
                cp1: Point::new(0.0, 0.0),
                cp2: Point::new(1.0, 0.0),
                end: Point::new(1.0, 0.0),
            },
            BezierSegment {
                start: Point::new(1.0, 0.0),
                cp1: Point::new(1.0, 0.0),
                cp2: Point::new(2.0, 0.0),
                end: Point::new(2.0, 0.0),
            },
        ];
        assert!(!check_chain_closed(&beziers, 0.1));
    }
}
