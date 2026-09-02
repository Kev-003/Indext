use crate::point::Point;

#[derive(Clone, Debug)]
pub struct Corner {
    pub index: usize,
    pub point: Point,
    pub angle: f64,
    pub is_sharp: bool,
}

pub fn detect_corners(points: &[Point], angle_threshold_rad: f64) -> Vec<Corner> {
    if points.len() < 3 {
        return vec![];
    }

    let mut corners = Vec::new();

    for i in 1..points.len() - 1 {
        let a = &points[i - 1];
        let b = &points[i];
        let c = &points[i + 1];

        let ba = Point::new(b.x - a.x, b.y - a.y);
        let bc = Point::new(c.x - b.x, c.y - b.y);

        let dot = ba.x * bc.x + ba.y * bc.y;
        let mag_ba = (ba.x * ba.x + ba.y * ba.y).sqrt();
        let mag_bc = (bc.x * bc.x + bc.y * bc.y).sqrt();

        if mag_ba < 1e-10 || mag_bc < 1e-10 {
            continue;
        }

        let cos_angle = (dot / (mag_ba * mag_bc)).clamp(-1.0, 1.0);
        let angle = cos_angle.acos();

        let is_sharp = angle > angle_threshold_rad;

        corners.push(Corner {
            index: i,
            point: *b,
            angle,
            is_sharp,
        });
    }

    corners
}

pub fn get_sharp_corner_indices(corners: &[Corner]) -> Vec<usize> {
    corners
        .iter()
        .filter(|c| c.is_sharp)
        .map(|c| c.index)
        .collect()
}

pub fn merge_nearby_corners(corners: &[Corner], min_distance: f64) -> Vec<Corner> {
    if corners.is_empty() {
        return vec![];
    }

    let sharp: Vec<Corner> = corners.iter().filter(|c| c.is_sharp).cloned().collect();

    if sharp.is_empty() {
        return vec![];
    }

    let mut merged: Vec<Corner> = vec![sharp[0].clone()];

    for c in &sharp[1..] {
        let last = merged.last().unwrap();
        if c.point.distance(&last.point) < min_distance {
            if c.angle < last.angle {
                merged.push(c.clone());
            }
        } else {
            merged.push(c.clone());
        }
    }

    merged
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_perfect_right_angle() {
        let points = vec![
            Point::new(0.0, 0.0),
            Point::new(1.0, 0.0),
            Point::new(1.0, 1.0),
        ];
        let threshold = (30.0_f64).to_radians();
        let corners = detect_corners(&points, threshold);
        assert!(!corners.is_empty());
        let sharp: Vec<_> = corners.iter().filter(|c| c.is_sharp).collect();
        assert_eq!(sharp.len(), 1);
    }

    #[test]
    fn test_smooth_curve() {
        // Points on a circle arc — angles are large
        let mut points = Vec::new();
        for i in 0..9 {
            let t = i as f64 * std::f64::consts::PI / 8.0;
            points.push(Point::new(t.cos(), t.sin()));
        }
        let threshold = (30.0_f64).to_radians();
        let corners = detect_corners(&points, threshold);
        let sharp: Vec<_> = corners.iter().filter(|c| c.is_sharp).collect();
        assert_eq!(sharp.len(), 0);
    }

    #[test]
    fn test_zigzag() {
        // Points forming a zigzag — sharp angles at each peak
        let points = vec![
            Point::new(0.0, 0.0),
            Point::new(1.0, 1.0),
            Point::new(2.0, 0.0),
            Point::new(3.0, 1.0),
            Point::new(4.0, 0.0),
        ];
        let threshold = (30.0_f64).to_radians();
        let corners = detect_corners(&points, threshold);
        let sharp = get_sharp_corner_indices(&corners);
        assert_eq!(sharp.len(), 3);
    }
}
