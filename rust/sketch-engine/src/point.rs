use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct Point {
    pub x: f64,
    pub y: f64,
}

impl Point {
    pub fn new(x: f64, y: f64) -> Self {
        Point { x, y }
    }

    pub fn from_array(arr: &[f64], stride: usize, idx: usize) -> Self {
        let base = idx * stride;
        Point {
            x: arr[base],
            y: arr[base + 1],
        }
    }

    pub fn to_array(&self) -> [f64; 2] {
        [self.x, self.y]
    }

    pub fn distance_sq(&self, other: &Point) -> f64 {
        let dx = self.x - other.x;
        let dy = self.y - other.y;
        dx * dx + dy * dy
    }

    pub fn distance(&self, other: &Point) -> f64 {
        self.distance_sq(other).sqrt()
    }

    pub fn lerp(&self, other: &Point, t: f64) -> Point {
        Point {
            x: self.x + (other.x - self.x) * t,
            y: self.y + (other.y - self.y) * t,
        }
    }
}

impl PartialEq for Point {
    fn eq(&self, other: &Self) -> bool {
        (self.x - other.x).abs() < 1e-10 && (self.y - other.y).abs() < 1e-10
    }
}

impl From<kurbo::Point> for Point {
    fn from(p: kurbo::Point) -> Self {
        Point { x: p.x, y: p.y }
    }
}

impl From<Point> for kurbo::Point {
    fn from(p: Point) -> Self {
        kurbo::Point::new(p.x, p.y)
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Stroke {
    pub points: Vec<Point>,
    pub color: String,
    pub width: f32,
}

pub fn parse_points(flat: &[f64], stride: usize) -> Vec<Point> {
    flat.chunks(stride)
        .map(|chunk| Point::new(chunk[0], chunk[1]))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_point_distance() {
        let p1 = Point::new(0.0, 0.0);
        let p2 = Point::new(3.0, 4.0);
        assert!((p1.distance(&p2) - 5.0).abs() < 1e-10);
    }

    #[test]
    fn test_point_lerp() {
        let p1 = Point::new(0.0, 0.0);
        let p2 = Point::new(10.0, 20.0);
        let mid = p1.lerp(&p2, 0.5);
        assert!((mid.x - 5.0).abs() < 1e-10);
        assert!((mid.y - 10.0).abs() < 1e-10);
    }

    #[test]
    fn test_parse_points_stride2() {
        let flat = [0.0, 0.0, 3.0, 4.0, 6.0, 8.0];
        let pts = parse_points(&flat, 2);
        assert_eq!(pts.len(), 3);
        assert!((pts[0].x - 0.0).abs() < 1e-10);
        assert!((pts[2].y - 8.0).abs() < 1e-10);
    }

    #[test]
    fn test_parse_points_stride4() {
        let flat = [0.0, 0.0, 1.0, 100.0, 3.0, 4.0, 2.0, 200.0];
        let pts = parse_points(&flat, 4);
        assert_eq!(pts.len(), 2);
        assert!((pts[1].x - 3.0).abs() < 1e-10);
    }
}
