use crate::curves::BezierSegment;
use crate::point::Point;
use crate::snapping::SnappedPrimitive;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PrimitivePoint {
    pub x: f64,
    pub y: f64,
    pub cp1x: f64,
    pub cp1y: f64,
    pub cp2x: f64,
    pub cp2y: f64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RefineResult {
    pub svg_path: String,
    pub control_points: Vec<PrimitivePoint>,
    pub primitives: Vec<SnappedPrimitive>,
}

pub fn generate_svg_path(beziers: &[BezierSegment]) -> String {
    if beziers.is_empty() {
        return String::new();
    }

    let mut path = String::new();

    for (i, seg) in beziers.iter().enumerate() {
        if i == 0 {
            path.push_str(&format!(
                "M {},{}",
                fmt_num(seg.start.x),
                fmt_num(seg.start.y)
            ));
        }

        path.push_str(&format!(
            " C {},{} {},{} {},{}",
            fmt_num(seg.cp1.x),
            fmt_num(seg.cp1.y),
            fmt_num(seg.cp2.x),
            fmt_num(seg.cp2.y),
            fmt_num(seg.end.x),
            fmt_num(seg.end.y)
        ));
    }

    path
}

fn fmt_num(v: f64) -> String {
    let rounded = round4(v);
    if rounded.abs() < 1e-10 {
        return "0".to_string();
    }
    format!("{}", rounded)
}

fn round4(v: f64) -> f64 {
    (v * 10000.0).round() / 10000.0
}

pub fn to_primitive_points(beziers: &[BezierSegment]) -> Vec<PrimitivePoint> {
    beziers
        .iter()
        .map(|seg| PrimitivePoint {
            x: round4(seg.start.x),
            y: round4(seg.start.y),
            cp1x: round4(seg.cp1.x),
            cp1y: round4(seg.cp1.y),
            cp2x: round4(seg.cp2.x),
            cp2y: round4(seg.cp2.y),
        })
        .collect()
}

pub fn point_to_svg(p: &Point) -> String {
    format!("{:.4},{:.4}", round4(p.x), round4(p.y))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_svg_path_single() {
        let seg = BezierSegment {
            start: Point::new(0.0, 0.0),
            cp1: Point::new(1.0, 1.0),
            cp2: Point::new(2.0, 1.0),
            end: Point::new(3.0, 0.0),
        };
        let path = generate_svg_path(&[seg]);
        assert!(path.starts_with("M 0,0"));
        assert!(path.contains("C"));
        assert!(path.contains("3,0"));
    }

    #[test]
    fn test_generate_svg_path_empty() {
        let path = generate_svg_path(&[]);
        assert_eq!(path, "");
    }

    #[test]
    fn test_generate_svg_path_multiple() {
        let seg1 = BezierSegment {
            start: Point::new(0.0, 0.0),
            cp1: Point::new(1.0, 0.0),
            cp2: Point::new(2.0, 0.0),
            end: Point::new(3.0, 0.0),
        };
        let seg2 = BezierSegment {
            start: Point::new(3.0, 0.0),
            cp1: Point::new(4.0, 0.0),
            cp2: Point::new(5.0, 0.0),
            end: Point::new(6.0, 0.0),
        };
        let path = generate_svg_path(&[seg1, seg2]);
        assert_eq!(path.matches("C").count(), 2);
    }

    #[test]
    fn test_to_primitive_points() {
        let seg = BezierSegment {
            start: Point::new(0.0, 0.0),
            cp1: Point::new(1.0, 1.0),
            cp2: Point::new(2.0, 1.0),
            end: Point::new(3.0, 0.0),
        };
        let pts = to_primitive_points(&[seg]);
        assert_eq!(pts.len(), 1);
        assert_eq!(pts[0].x, 0.0);
        assert_eq!(pts[0].y, 0.0);
        assert_eq!(pts[0].cp1x, 1.0);
        assert_eq!(pts[0].cp2y, 1.0);
    }
}
