# Plan: Rust-to-WASM Sketch Refinement Engine — Architectural Design

## Status: Planning — Awaiting user approval before implementation

---

## 1. System & Build Impact Assessment

### Current Build Pipeline Context
- **Frontend**: Vite 8 + React 19 plugin (`@vitejs/plugin-react`) + Inertia.js
- **Backend**: Laravel 13 (PHP 8.3) with `laravel/vite-plugin`
- **No Rust toolchain detected** — no `Cargo.toml`, `.cargo/`, or `rust-toolchain.toml` in the workspace
- **Existing web-worker shim**: `vite.config.ts` already has a `webWorkerShim()` plugin (lines 9–32) that provides a `Worker` fallback for SSR. It creates a virtual `web-worker` module that resolves to a no-op `Worker` class on the server. This is used by `elkjs` but could be reused for WASM worker isolation.
- **HMR**: Vite's dev server serves source modules and hot-reloads on file changes. WASM modules compiled with `wasm-pack` produce static `.wasm` + `.js` binding files that need to be treated as assets.

### Build Tooling Decision: wasm-pack + Vite pre-build (per user approval)
**Approach**: Use `wasm-pack build` to pre-compile the Rust crate into `pkg/` directory, then integrate the output into the Vite asset pipeline.

**How it fits into the existing pipeline**:

```
┌─────────┐    wasm-pack build     ┌──────────┐    Vite vite-plugin-fs     ┌──────────┐
│  Rust   │  → (wasm32-unk...)    │  pkg/     │  → (resolve .wasm + .js)   │  Vite     │
│  crate  │                        │  (gen)    │                             │  build    │
└─────────┘                        └──────────┘                             └────┬─────┘
                                                                                │
                                                                                ▼
                                                                         ┌──────────┐
                                                                         │  React    │
                                                                         │  (WASM    │
                                                                         │  module)  │
                                                                         └──────────┘
```

**Why not on-the-fly compilation** (e.g., `vite-plugin-rust`): On-the-fly compilation via `wasm-pack watch` or similar would recompile Rust on every file save, adding 3–10s latency to HMR cycles and potentially breaking the React HMR pipeline. Instead, we treat the WASM module as a **pre-built artifact**:

- **Dev**: `wasm-pack build` is run once before `npm run dev`. During dev, if the Rust source changes, the developer runs `wasm-pack build` again (manual step). The Vite dev server serves the `.wasm` and `.js` files from the pre-built `pkg/` directory.
- **Production**: The `npm run build` script chains `wasm-pack build` → `vite build`. The `.wasm` file is bundled as a Vite asset with content hashing, and the JS bindings are imported normally.

**Vite configuration changes** (`vite.config.ts`):

1. Add `pkg/` to `resolve.alias` so imports like `@/wasm/sketch_engine` resolve to `./pkg/sketch_engine.js`:
   ```ts
   resolve: {
       alias: {
           '@wasm/sketch-engine': path.resolve(__dirname, 'rust/sketch-engine/pkg/sketch_engine.js'),
       },
   },
   ```

2. Add `.wasm` to `assetsInclude` so Vite treats `.wasm` files as assets:
   ```ts
   assetsInclude: ['**/*.wasm'],
   ```

3. Add a `watch` handler for Rust source files that triggers a rebuild notification (non-blocking — just logs a reminder).

**No breaking changes to existing HMR**: The Vue/Vite React plugin handles `.tsx` files normally. The WASM module is imported only inside the `GeometricConstructor` component (lazy-loaded), so changes to the Rust crate don't trigger React HMR — they require a manual `wasm-pack build` + page refresh.

### SSR Considerations
- The existing `webWorkerShim()` already handles the case where `Worker` is undefined during SSR.
- The WASM module should be **conditionally loaded** — check `typeof WebAssembly !== 'undefined'` before importing.
- During SSR, the `GeometricConstructor` component renders the placeholder ("Awaiting WASM module initialization...") and the actual WASM import happens only on the client via `useEffect` / dynamic `import()`.

### Dependency: Rust toolchain
- The developer must install: `rustc`, `cargo`, `wasm-pack`, and the `wasm32-unknown-unknown` target (`rustup target add wasm32-unknown-unknown`).
- This is a **local dev dependency only** — the compiled WASM is checked into version control (or built in CI).

---

## 2. Memory & Interop Strategy (JS ↔ WASM)

### Execution Context
**Decision**: Run WASM calculations in a **Web Worker** for all sketch refinement operations. This ensures zero UI jank, even for complex path simplification on dense point clouds (e.g., 5,000+ points).

**Worker setup**:
- The WASM JS bindings (`sketch_engine.js`) are imported inside a dedicated worker script (`sketch-engine.worker.ts`).
- The worker is instantiated via `new Worker(new URL('./sketch-engine.worker', import.meta.url), { type: 'module' })`.
- The existing `webWorkerShim()` in `vite.config.ts` provides an SSR-safe `Worker` fallback (no-op), so SSR rendering of `GeometricConstructor` won't crash.

**Message protocol** between main thread and worker:
```
Main thread → Worker (postMessage):
{
  id: string,           // request ID for async response matching
  action: 'refine',     // or 'snap', 'simplify', 'fit_curves'
  payload: Float64Array | Transferable // raw point data
}

Worker → Main thread (postMessage):
{
  id: string,
  action: string,
  payload: {
    svg_path: string,           // SVG d attribute
    control_points: Point[],    // structured Bezier control points
    primitives: Primitive[]     // detected geometric primitives (circle, line, rect)
  }
}
```

### Data Transfer: Zero-Copy
- **Raw points**: Passed as `Float64Array` buffers using `postMessage(payload, [payload.buffer])` (Transferable) — **zero-copy** between JS and worker.
- **Point layout**: `[x0, y0, pressure0, ts0, x1, y1, pressure1, ts1, ...]` — flat array where every 2–4 elements is one point. The `pressure` and `timestamp` fields are optional (can be omitted for a stride of 2).
- **Results**: Returned as structured objects (not buffers). Results are typically small (SVG path strings, a few control points), so JSON serialization overhead is negligible.

### TypeScript Type Generation
- Use `tsify` crate (or `wasm-bindgen` + hand-written types) to generate TypeScript `.d.ts` files during `wasm-pack build`.
- The `wasm-pack build --target web` output already includes `.d.ts` files for exported types.

### Memory management
- WASM linear memory grows as needed — no manual allocation.
- The Rust heap is garbage-collected when the WASM instance is destroyed (on component unmount).
- Large point arrays are transferred as `Float64Array` views into WASM memory — no copying on the Rust side if we use `wasm-bindgen`'s typed array imports.

---

## 3. Pipeline Technical Design (Math & Crate Usage)

### Rust Crate Architecture

**Directory structure**:
```
rust/sketch-engine/
├── Cargo.toml
├── src/
│   ├── lib.rs           // wasm-bindgen entry point, exports
│   ├── pipeline.rs      // 5-stage pipeline orchestration
│   ├── point.rs         // Point struct, PointCloud collection
│   ├── simplify.rs      // RDP implementation
│   ├── corner.rs        // Angle-based corner detection
│   ├── curves.rs        // Schneider bezier fitting (using kurbo)
│   ├── snapping.rs      // Geometric primitive detection & snapping
│   └── output.rs        // SVG path string generation, result serialization
├── tests/
│   └── integration.rs   // Integration tests
└── pkg/                 // Generated by wasm-pack (gitignored)
```

### Dependency & Crate Selection

| Crate | Purpose | Why |
|-------|---------|-----|
| `kurbo` | 2D curve mathematics: `Beziers`, `Line`, `Circle`, `Path`, `Tangent`, `Curvature` | Industry-standard Rust 2D geometry library, well-tested, WASM-compatible. Provides `Bezier`, `Circle`, `Path` primitives. |
| `lyon` | Path tessellation, stroke tessellation, contour flattening | Needed for converting simplified paths to SVG-compatible output and for tessellation if we ever render to bitmap. Provides `Path`, `Builder`, `Tessellator`. |
| `wasm-bindgen` | Rust-to-JS FFI | Standard bridge between Rust and JS. Handles type conversions. |
| `serde` + `serde_json` | Serialization (internal) | For structuring config and debug output. |
| `tsify` | TypeScript type generation | Generates `.d.ts` from Rust types so the TS side gets typed interfaces. |
| `web-sys` | Browser API access (optional) | For accessing canvas APIs if needed. Likely not needed if all data crosses via postMessage. |

**Note**: `kurbo` and `lyon` overlap in some functionality. Strategy:
- **kurbo**: Primary for curve math — cubic bezier fitting (Schneider algorithm), distance calculations, angle computations, primitive detection (circle/rectangle fitting).
- **lyon**: Used only for path tessellation if we need to render to canvas/bitmap. For SVG path string generation, we can use `kurbo::Path` and format `d` attribute manually, avoiding `lyon` entirely. Consider making `lyon` an optional/dev dependency.

### Stage 1: Raw Input Capture
```rust
pub struct SketchPoint {
    pub x: f64,
    pub y: f64,
    pub pressure: Option<f32>,
    pub timestamp: Option<f64>,
}

pub struct Stroke {
    pub points: Vec<SketchPoint>,
    pub color: String,       // hex color
    pub width: f32,          // stroke width in pixels
}
```

- **Input format**: Flat `Float64Array` with stride configurable (2 for xy, 4 for xyp+t).
- **Memory**: Pre-allocate `Vec<SketchPoint>` with `with_capacity` based on array length to avoid reallocations.
- **Edge cases**: Deduplicate consecutive points with identical coordinates. Filter out points that are too close together (< 0.5px).

### Stage 2: Path Simplification (RDP)
```rust
pub fn rdp_simplify(points: &[SketchPoint], epsilon: f64) -> Vec<SketchPoint>
```

- **Algorithm**: Ramer–Douglas–Peucker recursive implementation.
- **Epsilon**: Configurable tolerance (default: 2.0px for typical canvas resolution).
- **kurbo usage**: Use `kurbo::Point` and `kurbo::Line` from the `points` module for distance calculations.
- **Edge cases**: 
  - If `points.len() < 3`, return unchanged.
  - If all points are collinear, RDP reduces to 2 endpoints.
  - Iterative (non-recursive) implementation preferred to avoid stack overflow on large inputs.

### Stage 3: Corner Detection
```rust
pub struct Corner {
    pub index: usize,
    pub point: Point,
    pub angle: f64,  // radians
    pub is_sharp: bool,
}

pub fn detect_corners(points: &[Point], angle_threshold: f64) -> Vec<Corner>
```

- **Algorithm**: For each consecutive triple of points (A, B, C), compute the angle at B using vector dot product:
  ```
  angle = acos((AB·BC) / (|AB| × |BC|))
  ```
- **Threshold**: Default 30° (π/6 radians). Angles below this are "sharp corners".
- **kurbo usage**: `kurbo::Point` implements `Sub` for vector math. `kurbo::angle` or manual `atan2`.
- **Edge cases**: 
  - Handle zero-length segments (skip).
  - Merge nearby corners (within 5px) to avoid over-segmentation.
  - Return a `Vec<usize>` of corner indices for path splitting.

### Stage 4: Curve Fitting (Schneider Algorithm)
```rust
pub struct BezierFit {
    pub start: Point,
    pub cp1: Point,     // control point 1
    pub cp2: Point,     // control point 2
    pub end: Point,
}

pub fn fit_bezier(points: &[Point], error_tolerance: f64) -> Vec<BezierFit>
```

- **Algorithm**: Philip J. Schneider's "Algorithm for Automatically Fitting Digitized Curves" (Graphics Gems V).
  - Split simplified path at detected corners into segments.
  - For smooth segments (>3 points): Fit cubic Bézier using the iterative algorithm (chord-length parameterization, Newton's method for parameter refinement).
  - For corner-to-corner segments: If segment has only 2 points, output a straight line. If 3 points, use a quadratic or simple cubic.
- **kurbo usage**: `kurbo::CubicBez` for the output representation. `kurbo::Point` for coordinates.
- **Edge cases**:
  - Segments with < 2 points: skip.
  - Segments with exactly 2 points: emit `kurbo::Line`.
  - Segments where fitting error exceeds tolerance: recursively subdivide at the point of maximum deviation.

### Stage 5: Geometric Snapping
```rust
pub enum SnappedPrimitive {
    Circle { center: Point, radius: f64 },
    Line { start: Point, end: Point },
    Rectangle { corners: [Point; 4] },
    RegularPolygon { center: Point, radius: f64, sides: usize },
    None,
}

pub fn snap_to_primitives(beziers: &[BezierFit], tolerance: f64) -> Vec<SnappedPrimitive>
```

- **Circle detection**: For a sequence of 3+ connected Bézier curves forming a closed loop, fit a circle using least-squares to all points. If the residual error is below `tolerance`, emit a `Circle`.
  - **kurbo**: `kurbo::Circle::from_circumference_3_points(a, b, c)` for 3-point circles, or custom least-squares for >3 points.

- **Line detection**: For Bézier curves where both control points are nearly collinear with the endpoints (distance from control points to the line < `tolerance`), replace with a straight `Line`.
  - **kurbo**: `kurbo::Line` and `kurbo::Line::distance()` for point-line distance.

- **Right angle detection**: When two consecutive line segments form an angle within 5° of 90°, snap to a perfect right angle.

- **Rectangle detection**: Four connected lines forming two pairs of parallel segments with right angles → snap to `Rectangle`.

- **Regular polygon detection**: N connected lines of equal length forming equal interior angles → snap to `RegularPolygon`.

### Output: SVG Path Generation
```rust
pub struct RefineResult {
    pub svg_path: String,           // e.g., "M10 10 C 20 20, 40 20, 50 10"
    pub beziers: Vec<BezierPoint>,  // structured control points for UI
    pub primitives: Vec<Primitive>, // geometric primitives for snapping UI
}
```

- **SVG path string**: Generate using `kurbo::Path` → format as SVG `d` attribute. `kurbo::Path` has a `to_svg()` method.
- **Structured output**: Return JSON-serializable structs with explicit field names for the TypeScript side.

---

## 4. Data Flow & JS Interop Design

### TypeScript Interface Boundary

**Input** (sent to WASM worker):
```typescript
interface RefineRequest {
    id: string;
    action: 'refine' | 'simplify' | 'snap';
    stride: 2 | 4;  // 2 = xy, 4 = xy+pressure+timestamp
    epsilon: number;       // RDP tolerance (default: 2.0)
    angleThreshold: number; // corner angle in degrees (default: 30)
    fitTolerance: number;  // max fitting error (default: 1.5)
    snapTolerance: number;  // snapping threshold (default: 3.0)
    points: Float64Array;   // flat array, transferable
}
```

**Output** (from WASM worker):
```typescript
interface BezierPoint {
    x: number;
    y: number;
    cp1x: number;
    cp1y: number;
    cp2x: number;
    cp2x2: number;
}

interface Primitive {
    type: 'circle' | 'line' | 'rectangle' | 'polygon';
    // ... shape-specific fields
}

interface RefineResult {
    svgPath: string;
    beziers: BezierPoint[];
    primitives: Primitive[];
}
```

### Component Integration

The `GeometricConstructor` component will:
1. On mount: dynamically import the WASM worker (only on client, after SSR)
2. On "beautify" click: serialize canvas stroke points into a `Float64Array`, post to worker
3. On worker message: receive `RefineResult`, render the SVG path on the canvas
4. Provide "accept" / "adjust" / "re-draw" options

**Hook**: `useSketchRefiner` — encapsulates worker lifecycle, message routing, and state management.

---

## 5. Phase-by-Phase Implementation Roadmap

### Phase 1: Rust Crate Scaffolding & Build Pipeline
- Install Rust toolchain + `wasm-pack` + `wasm32-unknown-unknown` target
- Create `rust/sketch-engine/Cargo.toml` with `kurbo`, `lyon` (optional), `wasm-bindgen`, `serde`, `tsify`
- Create `src/lib.rs` with `#[wasm_bindgen]` exports for `refine_sketch()` entry point
- Add `wasm-pack build` to `package.json` scripts (`build:wasm`, `build:wasm:dev`)
- Add Vite config: alias `@wasm/sketch-engine`, `assetsInclude: ['**/*.wasm']`
- Create `sketch-engine.worker.ts` — worker that imports WASM bindings
- **Smoke test**: WASM module loads in browser, returns "hello" string

### Phase 2: Core Geometry Pipeline (Rust-only)
- Implement `Point`/`Stroke` structs
- Implement RDP path simplification (`simplify.rs`)
- Implement corner detection (`corner.rs`)
- Implement Schneider bezier fitting (`curves.rs`)
- Export `refine_sketch()` that runs all 3 stages
- Write Rust integration tests (`cargo test -- --nocapture`):
  - Circle trace → should produce closed bezier chain
  - Straight line → should produce 2-point result
  - Zigzag → should detect corners and fit curves between them
- **Deliverable**: `cargo test` passes with 10+ test cases

### Phase 3: Geometric Snapping & SVG Output
- Implement `snapping.rs` with circle/line/rectangle/polygon detection
- Implement `output.rs` with SVG path string generation (using `kurbo::Path::to_svg()`)
- Add `SnapResult` to the WASM export
- Write Rust tests for snapping (circle from points, rectangle detection)
- **Deliverable**: Full `refine_sketch()` produces SVG path strings + primitives

### Phase 4: React Integration & Worker Hook
- Create `useSketchRefiner` hook:
  - Lazy-initializes WASM worker
  - `refine(points: Float64Array, options?) → Promise<RefineResult>`
  - Handles error fallback (returns null)
- Replace `GeometricConstructor` placeholder with real implementation:
  - Canvas for freehand drawing (mouse/touch events)
  - "Beautify" button → calls `useSketchRefiner`
  - Renders refined SVG overlay
  - "Accept" button → saves to `BrandAsset`
- **Test**: End-to-end — draw, beautify, SVG renders correctly
- Update `InvokeGeometricConstructor.php` schema if needed

### Phase 5: Production Hardening
- Add `.wasm` file to version control (or CI build step)
- Add `wasm-pack build` to CI pipeline (before `npm run build`)
- Add error boundaries around WASM import
- Add retry logic for worker initialization
- **Deliverable**: Production build includes WASM assets, HMR works for TS changes, Rust changes require manual `wasm-pack build`

---

## 6. Risks & Mitigation Matrix

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Rust toolchain unavailable in dev/CI | Medium | High — blocks entire feature | Add `rust-toolchain.toml` pinning stable; CI installs Rust before npm install |
| WASM worker fails to initialize | Low | Medium — GeometricConstructor broken | Graceful fallback to placeholder UI with error message; user can still use primitive tools |
| HMR breaks for TS changes when WASM is imported | Medium | Medium — dev experience degraded | Import WASM only in `useEffect` (client-only), never at module top-level; use dynamic `import()` |
| Large point arrays cause memory pressure | Low | Medium — browser tab crash | Cap max points (e.g., 10k), downsample at input; use Transferable buffers |
| kurbo/lyon compile slowly for wasm32 target | Medium | Low — build time | Use feature flags to disable unused kurbo modules; cache Cargo build artifacts |
| SVG path output incompatible with existing canvas rendering | Low | Low | Output both SVG string and structured points; component renders SVG overlay on top of canvas |
| wasm-bindgen version mismatch with Vite | Medium | High — build failure | Pin versions; use `wasm-pack build --target web` (ESM-compatible) |

---

## 7. What NOT to Touch
- Backend PHP (Laravel controllers, models) — the WASM engine is purely frontend
- The existing `webWorkerShim` in `vite.config.ts` — extend it if needed, don't break existing elkjs worker support
- The `GeometricConstructor` tool registration in `registry.ts` and `app/Ai/Tools/InvokeGeometricConstructor.php` — the schema already supports `mode`, `primitives`, `gridSize`, `canvasSize`
- The `elkjs` virtual module plugin (already fixed)
- The Nomentra color tokens in `app.css`