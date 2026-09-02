export interface PrimitivePoint {
    x: number;
    y: number;
    cp1x: number;
    cp1y: number;
    cp2x: number;
    cp2y: number;
}

export type SnappedPrimitive =
    | { type: 'circle'; center: { x: number; y: number }; radius: number }
    | { type: 'line'; start: { x: number; y: number }; end: { x: number; y: number } }
    | { type: 'rectangle'; top_left: { x: number; y: number }; bottom_right: { x: number; y: number } }
    | { type: 'regular_polygon'; center: { x: number; y: number }; radius: number; sides: number }
    | { type: 'none' };

export interface RefineOptions {
    epsilon?: number;
    angle_threshold_deg?: number;
    fit_tolerance?: number;
    snap_tolerance?: number;
    min_segment_length?: number;
}

export interface RefineResult {
    svg_path: string;
    control_points: PrimitivePoint[];
    primitives: SnappedPrimitive[];
}

export interface RefineRequest {
    id: string;
    action: 'refine';
    stride: number;
    options: RefineOptions;
    points: Float64Array;
}

export interface RefineResponse {
    id: string;
    action: 'refine';
    result: RefineResult;
}

export interface ErrorResponse {
    id: string;
    action: string;
    error: string;
}

export type WorkerMessage = RefineRequest | RefineResponse | ErrorResponse;
