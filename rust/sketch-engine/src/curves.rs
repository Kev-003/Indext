use crate::point::Point;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BezierSegment {
    pub start: Point,
    pub cp1: Point,
    pub cp2: Point,
    pub end: Point,
}

pub struct FitCubicResult {
    pub beziers: Vec<BezierSegment>,
}

pub fn fit_bezier(points: &[Point], error_tolerance: f64) -> Vec<BezierSegment> {
    if points.len() < 2 {
        return vec![];
    }

    let n = points.len();

    if n == 2 {
        return vec![BezierSegment {
            start: points[0],
            cp1: points[0].lerp(&points[1], 1.0 / 3.0),
            cp2: points[0].lerp(&points[1], 2.0 / 3.0),
            end: points[1],
        }];
    }

    let mut beziers = Vec::new();
    let mut start_idx = 0usize;

    while start_idx < n - 1 {
        let remaining = &points[start_idx..n];

        if remaining.len() <= 4 {
            // Directly fit a single cubic to the remaining points
            let segs = fit_cubic_to_segment(remaining, error_tolerance);
            beziers.extend(segs);
            break;
        }

        // Try fitting a cubic to the first max_len points
        let max_fit_len = remaining.len().min(8);
        let seg_result = try_fit_segment(&remaining[..max_fit_len], error_tolerance);

        if seg_result.fit_ok {
            beziers.extend(seg_result.segments);
            start_idx += seg_result.consumed;
        } else {
            // Subdivide at the point of max error
            start_idx += seg_result.consumed;
        }
    }

    // Merge collinear adjacent segments
    merge_collinear(&mut beziers);

    beziers
}

struct SegmentFitResult {
    segments: Vec<BezierSegment>,
    consumed: usize,
    fit_ok: bool,
}

fn try_fit_segment(points: &[Point], error_tolerance: f64) -> SegmentFitResult {
    let fit = fit_cubic_to_segment(points, error_tolerance);

    if fit.is_empty() {
        return SegmentFitResult {
            segments: vec![],
            consumed: 1,
            fit_ok: false,
        };
    }

    // Find max error
    let mut max_err = 0.0;
    let mut max_err_idx = 0usize;

    for (i, &p) in points.iter().enumerate() {
        if i == 0 || i == points.len() - 1 {
            continue;
        }
        for seg in &fit {
            let d = point_to_bezier_distance(&p, seg);
            if d > max_err {
                max_err = d;
                max_err_idx = i;
            }
        }
    }

    let consumed = if max_err <= error_tolerance {
        points.len()
    } else {
        std::cmp::max(max_err_idx, 2)
    };

    let fit_ok = max_err <= error_tolerance || consumed == points.len();

    SegmentFitResult {
        segments: fit,
        consumed,
        fit_ok,
    }
}

fn fit_cubic_to_segment(points: &[Point], _error_tolerance: f64) -> Vec<BezierSegment> {
    let n = points.len();
    if n < 2 {
        return vec![];
    }
    if n == 2 {
        return vec![BezierSegment {
            start: points[0],
            cp1: points[0].lerp(&points[1], 1.0 / 3.0),
            cp2: points[0].lerp(&points[1], 2.0 / 3.0),
            end: points[n - 1],
        }];
    }

    // Chord-length parameterization
    let mut params = vec![0.0];
    let mut total_len = 0.0;
    for i in 1..n {
        let d = points[i - 1].distance(&points[i]);
        total_len += d;
        params.push(total_len);
    }
    if total_len > 1e-10 {
        for p in &mut params {
            *p /= total_len;
        }
    }

    let _first = points[0];
    let _last = points[n - 1];

    // Estimate control points using the tangent at endpoints
    let tan1 = estimate_tangent(&points, 1, false);
    let tan2 = estimate_tangent(&points, n - 2, true);

    let mut segments = Vec::new();
    fit_cubic_recursive(
        points,
        0,
        n - 1,
        &params,
        &tan1,
        &tan2,
        _error_tolerance,
        &mut segments,
    );

    segments
}

fn estimate_tangent(points: &[Point], index: usize, reversed: bool) -> Point {
    let prev_idx = if reversed {
        index.saturating_sub(1)
    } else {
        index.saturating_sub(1)
    };

    if reversed {
        // Tangent at the end: use points[index-1] and points[index-2]
        if index > 1 {
            let d = points[index - 1].distance(&points[index - 2]);
            if d > 1e-10 {
                let t = (points[index - 2] - points[index - 1]) / d;
                return Point::new(t.x, t.y);
            }
        }
    } else {
        if index < points.len() && index > 0 {
            let d = points[index].distance(&points[index - 1]);
            if d > 1e-10 {
                let t = (points[index] - points[index - 1]) / d;
                return Point::new(t.x, t.y);
            }
        }
    }

    // Fallback
    if reversed {
        let d = points[index].distance(&points[index.saturating_sub(1)]);
        if d > 1e-10 {
            let t = (points[index.saturating_sub(1)] - points[index]) / d;
            return Point::new(t.x, t.y);
        }
    } else if index + 1 < points.len() {
        let d = points[index + 1].distance(&points[index]);
        if d > 1e-10 {
            let t = (points[index + 1] - points[index]) / d;
            return Point::new(t.x, t.y);
        }
    }

    Point::new(1.0, 0.0)
}

impl std::ops::Neg for Point {
    type Output = Point;

    fn neg(self) -> Point {
        Point::new(-self.x, -self.y)
    }
}

impl std::ops::Sub for Point {
    type Output = Point;

    fn sub(self, other: Point) -> Point {
        Point::new(self.x - other.x, self.y - other.y)
    }
}

impl std::ops::Div<f64> for Point {
    type Output = Point;

    fn div(self, scalar: f64) -> Point {
        Point::new(self.x / scalar, self.y / scalar)
    }
}

fn fit_cubic_recursive(
    points: &[Point],
    first: usize,
    last: usize,
    params: &[f64],
    tan1: &Point,
    tan2: &Point,
    error_tolerance: f64,
    segments: &mut Vec<BezierSegment>,
) {
    if last - first < 1 {
        return;
    }

    let p1 = points[first];
    let p2 = points[last];
    let seg_len = last - first + 1;

    // For 2 points: straight line
    if seg_len == 2 {
        let d = p1.distance(&p2);

        if d > 1e-10 {
            segments.push(BezierSegment {
                start: p1,
                cp1: p1.lerp(&p2, 1.0 / 3.0),
                cp2: p1.lerp(&p2, 2.0 / 3.0),
                end: p2,
            });
        } else {
            segments.push(BezierSegment {
                start: p1,
                cp1: p1,
                cp2: p2,
                end: p2,
            });
        }
        return;
    }

    // For small segments (3-4 points): fit directly using least squares
    let seg_points: Vec<Point> = points[first..=last].to_vec();
    let seg_params: Vec<f64> = params[0..seg_len].to_vec();

    let (d1, d2) = compute_control_point_lengths(&seg_points, &seg_params, tan1, tan2);

    if d1.abs() < 1e-10 && d2.abs() < 1e-10 {
        // Collinear — output as line
        segments.push(BezierSegment {
            start: seg_points[0],
            cp1: seg_points[0],
            cp2: seg_points[seg_points.len() - 1],
            end: seg_points[seg_points.len() - 1],
        });
    } else {
        let p1 = seg_points[0];
        let p2 = seg_points[seg_points.len() - 1];
        let new_seg = BezierSegment {
            start: p1,
            cp1: Point::new(p1.x + d1 * tan1.x, p1.y + d1 * tan1.y),
            cp2: Point::new(p2.x - d2 * tan2.x, p2.y - d2 * tan2.y),
            end: p2,
        };

        // Check max error before committing
        let (max_err, max_idx) = compute_max_error(&seg_points, &[new_seg.clone()]);

        if max_err < error_tolerance {
            segments.push(new_seg);
            return;
        }

        // Split at max error point
        let split_local_idx = max_idx;
        if split_local_idx == 0 || split_local_idx >= seg_len - 1 {
            segments.push(new_seg);
            return;
        }

        let split_idx = first + split_local_idx;
        let split_t = params[split_local_idx];

        let left_params: Vec<f64> = params[0..=split_local_idx]
            .iter()
            .map(|&p| if split_t > 1e-10 { p / split_t } else { p })
            .collect();
        let right_params: Vec<f64> = params[split_local_idx..seg_len]
            .iter()
            .map(|&p| if split_t < 1.0 - 1e-10 { (p - split_t) / (1.0 - split_t) } else { p })
            .collect();

        let rev_tan = estimate_tangent_at(points, split_idx, true);
        let fwd_tan = estimate_tangent_at(points, split_idx, false);

        fit_cubic_recursive(
            points,
            first,
            split_idx,
            &left_params,
            tan1,
            &(-rev_tan),
            error_tolerance,
            segments,
        );
        fit_cubic_recursive(
            points,
            split_idx,
            last,
            &right_params,
            &fwd_tan,
            tan2,
            error_tolerance,
            segments,
        );
    }
}

fn estimate_tangent_at(points: &[Point], index: usize, reversed: bool) -> Point {
    if reversed {
        if index > 0 {
            let prev = &points[index.saturating_sub(1)];
            let curr = &points[index];
            let d = prev.distance(curr);
            if d > 1e-10 {
            return Point::new(
                (prev.x - curr.x) / d,
                (prev.y - curr.y) / d,
            );
            }
        }
    } else {
        if index + 1 < points.len() {
            let curr = &points[index];
            let next = &points[index + 1];
            let d = curr.distance(next);
            if d > 1e-10 {
                return Point::new(
                    (next.x - curr.x) / d,
                    (next.y - curr.y) / d,
                );
            }
        }
    }

    if reversed {
        if index + 1 < points.len() {
            let curr = &points[index];
            let next = &points[index + 1];
            let d = curr.distance(next);
            if d > 1e-10 {
                return Point::new(
                    (next.x - curr.x) / d,
                    (next.y - curr.y) / d,
                );
            }
        }
    } else if index > 0 {
        let prev = &points[index.saturating_sub(1)];
        let curr = &points[index];
        let d = prev.distance(curr);
        if d > 1e-10 {
            return Point::new(
                (curr.x - prev.x) / d,
                (curr.y - prev.y) / d,
            );
        }
    }

    Point::new(1.0, 0.0)
}

fn compute_control_point_lengths(
    points: &[Point],
    params: &[f64],
    tan1: &Point,
    tan2: &Point,
) -> (f64, f64) {
    let n = points.len();
    if n < 2 {
        return (0.0, 0.0);
    }

    // Build the matrix for least squares
    let mut c = [[0.0; 2], [0.0; 2]];
    let mut d = [0.0; 2];

    for i in 0..n {
        let t = params[i];
        let b0 = (1.0 - t).powi(3);
        let b1 = 3.0 * (1.0 - t).powi(2) * t;
        let b2 = 3.0 * (1.0 - t) * t * t;
        let b3 = t.powi(3);

        // This loop is vestigial; the real computation is below
        let _ = (b0, b1, b2, b3);
    }

    // Rebuild properly
    c = [[0.0; 2], [0.0; 2]];
    d = [0.0; 2];

    let p0 = points[0];
    let p3 = points[n - 1];

    for i in 0..n {
        let t = params[i];
        let b0 = (1.0 - t).powi(3);
        let b1 = 3.0 * (1.0 - t).powi(2) * t;
        let b2 = 3.0 * (1.0 - t) * t * t;
        let b3 = t.powi(3);

        let diff = Point::new(
            points[i].x - b0 * p0.x - b3 * p3.x,
            points[i].y - b0 * p0.y - b3 * p3.y,
        );

        let dot1 = diff.x * tan1.x + diff.y * tan1.y;
        let dot2 = diff.x * tan2.x + diff.y * tan2.y;

        c[0][0] += b1 * b1;
        c[0][1] += b1 * b2;
        c[1][0] += b1 * b2;
        c[1][1] += b2 * b2;

        d[0] += b1 * dot1;
        d[1] += b2 * dot2;
    }

    // Solve 2x2 system
    let det = c[0][0] * c[1][1] - c[0][1] * c[1][0];
    if det.abs() < 1e-10 {
        return (0.0, 0.0);
    }

    let d1 = (c[1][1] * d[0] - c[0][1] * d[1]) / det;
    let d2 = (c[0][0] * d[1] - c[1][0] * d[0]) / det;

    (d1, d2)
}

fn compute_max_error(points: &[Point], beziers: &[BezierSegment]) -> (f64, usize) {
    let mut max_err = 0.0;
    let mut max_idx = 0;

    for (i, p) in points.iter().enumerate() {
        for seg in beziers {
            let d = point_to_bezier_distance(p, seg);
            if d > max_err {
                max_err = d;
                max_idx = i;
            }
        }
    }

    (max_err, max_idx)
}

fn point_to_bezier_distance(p: &Point, seg: &BezierSegment) -> f64 {
    // Simple: check at several parameter values (t=0..1 in steps of 0.1)
    // For production, this would use Bezier clipping, but this is sufficient
    let mut min_dist = p.distance(&seg.start);
    for i in 1..=10 {
        let t = i as f64 / 10.0;
        let q = eval_cubic_bezier(
            &seg.start,
            &seg.cp1,
            &seg.cp2,
            &seg.end,
            t,
        );
        let d = p.distance(&q);
        if d < min_dist {
            min_dist = d;
        }
    }
    min_dist
}

fn eval_cubic_bezier(p0: &Point, p1: &Point, p2: &Point, p3: &Point, t: f64) -> Point {
    let mt = 1.0 - t;
    let b0 = mt * mt * mt;
    let b1 = 3.0 * mt * mt * t;
    let b2 = 3.0 * mt * t * t;
    let b3 = t * t * t;

    Point::new(
        b0 * p0.x + b1 * p1.x + b2 * p2.x + b3 * p3.x,
        b0 * p0.y + b1 * p1.y + b2 * p2.y + b3 * p3.y,
    )
}

fn merge_collinear(segs: &mut Vec<BezierSegment>) {
    if segs.len() < 2 {
        return;
    }

    let mut i = 0;
    while i < segs.len() - 1 {
        let curr = &segs[i];
        let next = &segs[i + 1];

        // Check if the control points are nearly collinear
        let v1 = Point::new(
            curr.cp2.x - curr.start.x,
            curr.cp2.y - curr.start.y,
        );
        let v2 = Point::new(
            next.cp1.x - next.end.x,
            next.cp1.y - next.end.y,
        );

        let cross = v1.x * v2.y - v1.y * v2.x;
        let mag1 = (v1.x * v1.x + v1.y * v1.y).sqrt();
        let mag2 = (v2.x * v2.x + v2.y * v2.y).sqrt();

        if mag1 > 1e-10 && mag2 > 1e-10 && cross.abs() / (mag1 * mag2) < 0.1 {
            // Merge: replace both with a straight line
            let merged = BezierSegment {
                start: curr.start,
                cp1: curr.start.lerp(&next.end, 1.0 / 3.0),
                cp2: curr.start.lerp(&next.end, 2.0 / 3.0),
                end: next.end,
            };
            segs[i] = merged;
            segs.remove(i + 1);
        } else {
            i += 1;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_straight_line_two_points() {
        let points = vec![Point::new(0.0, 0.0), Point::new(10.0, 0.0)];
        let result = fit_bezier(&points, 1.0);
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].start, points[0]);
        assert_eq!(result[0].end, points[1]);
    }

    #[test]
    fn test_straight_line_many_points() {
        let mut points = Vec::new();
        for i in 0..11 {
            points.push(Point::new(i as f64, 0.0));
        }
        let result = fit_bezier(&points, 0.1);
        // Should produce mostly straight segments
        assert!(!result.is_empty());
    }

    #[test]
    fn test_arc_points() {
        // Points on a semicircle
        let mut points = Vec::new();
        for i in 0..21 {
            let t = i as f64 / 20.0 * std::f64::consts::PI;
            points.push(Point::new(t.cos(), t.sin()));
        }
        let result = fit_bezier(&points, 0.5);
        assert!(!result.is_empty());
        // Start and end should match original points
        assert_eq!(result[0].start, points[0]);
        assert_eq!(result[result.len() - 1].end, points[points.len() - 1]);
    }

    #[test]
    fn test_empty_input() {
        let result = fit_bezier(&[], 1.0);
        assert!(result.is_empty());
    }

    #[test]
    fn test_single_point() {
        let points = vec![Point::new(0.0, 0.0)];
        let result = fit_bezier(&points, 1.0);
        assert!(result.is_empty());
    }
}
