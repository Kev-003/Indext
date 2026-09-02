use crate::point::Point;

pub fn rdp_simplify(points: &[Point], epsilon: f64) -> Vec<Point> {
    if points.len() < 3 {
        return points.to_vec();
    }

    let (idx, max_dist) = find_farthest(points, epsilon);

    if max_dist < epsilon {
        let mut result = Vec::with_capacity(2);
        result.push(points[0]);
        result.push(points[points.len() - 1]);
        result
    } else {
        let mut left = rdp_simplify(&points[..=idx], epsilon);
        let right = rdp_simplify(&points[idx..], epsilon);
        left.pop();
        left.extend(right);
        left
    }
}

fn find_farthest(points: &[Point], epsilon: f64) -> (usize, f64) {
    let start = points[0];
    let end = points[points.len() - 1];

    let mut max_idx = 0;
    let mut max_dist = 0.0;

    for i in 1..points.len() - 1 {
        let d = perpendicular_distance(&points[i], &start, &end);
        if d > max_dist {
            max_dist = d;
            max_idx = i;
        }
    }

    (max_idx, max_dist)
}

fn perpendicular_distance(p: &Point, a: &Point, b: &Point) -> f64 {
    let line_len_sq = a.distance_sq(b);

    if line_len_sq < 1e-20 {
        return p.distance(a);
    }

    // Using the formula: |(b-a) × (p-a)| / |b-a|
    let cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    cross.abs() / line_len_sq.sqrt()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simple_line() {
        let points = vec![
            Point::new(0.0, 0.0),
            Point::new(1.0, 0.0),
            Point::new(2.0, 0.0),
            Point::new(3.0, 0.0),
            Point::new(4.0, 0.0),
        ];
        let result = rdp_simplify(&points, 0.5);
        assert_eq!(result.len(), 2);
        assert_eq!(result[0], points[0]);
        assert_eq!(result[1], points[4]);
    }

    #[test]
    fn test_staircase() {
        // Points forming a step pattern
        let points = vec![
            Point::new(0.0, 0.0),
            Point::new(1.0, 0.0),
            Point::new(1.0, 1.0),
            Point::new(2.0, 1.0),
            Point::new(2.0, 2.0),
        ];
        let result = rdp_simplify(&points, 0.5);
        assert!(result.len() >= 3);
    }

    #[test]
    fn test_collinear_with_noise() {
        let points = vec![
            Point::new(0.0, 0.0),
            Point::new(1.0, 0.1),
            Point::new(2.0, -0.05),
            Point::new(3.0, 0.1),
            Point::new(4.0, 0.0),
        ];
        let result = rdp_simplify(&points, 0.2);
        assert_eq!(result.len(), 2);
    }

    #[test]
    fn test_too_few_points() {
        let points = vec![Point::new(0.0, 0.0), Point::new(1.0, 1.0)];
        let result = rdp_simplify(&points, 0.5);
        assert_eq!(result.len(), 2);
    }

    #[test]
    fn test_triangle() {
        let points = vec![
            Point::new(0.0, 0.0),
            Point::new(0.1, 0.05),
            Point::new(1.0, 0.0),
            Point::new(0.5, 1.0),
            Point::new(0.0, 1.0),
        ];
        let result = rdp_simplify(&points, 0.1);
        assert!(result.len() >= 3);
        assert_eq!(result[0], points[0]);
        assert_eq!(result[result.len() - 1], points[points.len() - 1]);
    }
}
