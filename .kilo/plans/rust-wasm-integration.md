# Rust + WASM Integration: Setup, Issues, and Troubleshooting Guide

## Overview

The Nomentra workspace includes a **Rust-to-WASM sketch refinement engine** that converts
hand-drawn strokes into clean geometric SVG paths. It runs in the browser via a Web Worker,
separate from the Laravel AI pipeline. Invoked when the user draws on the canvas in the
`GeometricConstructor` component and clicks "Beautify".

---

## 1. Architecture

### 1.1 Rust Crate (`rust/sketch-engine/`)

**Build target:** `wasm32-unknown-unknown` (pinned via `rust-toolchain.toml`)
**Toolchain:** `stable-x86_64-pc-windows-msvc`

```
rust/sketch-engine/
  Cargo.toml              # crate-type = ["cdylib", "rlib"]
  rust-toolchain.toml     # stable + wasm32 target
  build-wasm.cmd          # wrapper: sets LIB env, calls wasm-pack
  src/
    lib.rs                # #[wasm_bindgen] entry: refine_sketch_js()
    pipeline.rs           # refine_sketch(): orchestration of 5 stages
    point.rs              # Point struct, parse_points, distance
    simplify.rs           # RDP (Ramer-Douglas-Peucker) simplification
    corner.rs             # Angle-based corner detection
    curves.rs             # Schneider's cubic Bezier curve fitting
    snapping.rs           # Geometric primitive detection
    output.rs             # SVG path generation, RefineResult struct
```

**Key Rust types** (defined in `pipeline.rs` and `output.rs`):

- `RefineOptions` — epsilon, angle_threshold_deg, fit_tolerance, snap_tolerance, min_segment_length
  (all with serde defaults)
- `RefineResultData` — `svg_path: String`, `control_points: Vec<PrimitivePoint>`, `primitives: Vec<SnappedPrimitive>`
- `SnappedPrimitive` — tagged enum (`#[serde(tag = "type", rename_all = "snake_case")]`):
  Circle, Line, Rectangle, RegularPolygon, None
- `PrimitivePoint` — x, y, cp1x, cp1y, cp2x, cp2y (cubic Bezier control points)
- `Point` — internal struct with x, y; `distance()` method

**Exported `#[wasm_bindgen]` functions** (in `lib.rs`):

- `refine_sketch_js(flat_points: &[f64], stride: usize, opts: &JsValue) -> JsValue`
    - Calls `console_error_panic_hook::set_once()` first
    - Parses options via `serde_wasm_bindgen::from_value::<RefineOptions>(opts.into())`
    - Returns `JsValue::NULL` on parse failure (logs to console)
    - Calls `refine_sketch(&points, stride, &options)` pipeline
    - Serializes result via `serde_wasm_bindgen::to_value(&result)`
    - Returns `JsValue::NULL` on serialize failure (logs to console)
- `version() -> String` — returns "0.1.0"

**Pipeline stages** (`pipeline.rs`):

1. Parse raw points: `flat_points: &[f64]` → `Vec<Point>` (stride=2 → x,y pairs)
2. Deduplicate consecutive identical points (threshold 1e-6)
3. RDP simplification (`simplify.rs: rdp_simplify`) with epsilon
4. Corner detection (`corner.rs: detect_corners`) with angle threshold
5. Split at corners and fit Bezier curves (`curves.rs: fit_bezier` — Schneider's algorithm)
6. Geometric primitive snapping (`snapping.rs: detect_primitives`) with snap tolerance
7. Generate SVG path string + control points (`output.rs`)

**33 unit tests** covering: empty input, straight lines, circle approximation, stride=4,
deduplication, corner splitting, default options.

### 1.2 WASM Build Pipeline

**Scripts in `package.json`:**

```json
"build:wasm": "rust\\sketch-engine\\build-wasm.cmd",
"build:wasm:dev": "rust\\sketch-engine\\build-wasm.cmd --dev",
"dev": "concurrently \"npm run build:wasm:dev\" \"vite\"",
```

**`build-wasm.cmd`** (wrapper script at `rust/sketch-engine/build-wasm.cmd`):

```cmd
@echo off
setlocal
set "RUST_BIN=%USERPROFILE%\.cargo\bin"
set "TOOLCHAIN=%USERPROFILE%\.rustup\toolchains\stable-x86_64-pc-windows-msvc"
set "LIB=%TOOLCHAIN%\lib\rustlib\x86_64-pc-windows-msvc\lib;...\ucrt\x64;...\um\x64;...\onecore\x64"
cd /d "%~dp0"
"%RUST_BIN%\wasm-pack.exe" build --target web %*
```

The `LIB` env var is critical — it provides the MSVC library paths that `wasm-pack` needs
when compiling native build scripts (proc-macros) for the host target. Without it,
`LNK1104: cannot open file 'msvcrt.lib'` occurs.

**Output** (`rust/sketch-engine/pkg/` — gitignored, not tracked):

- `sketch_engine.js` — JS glue with `__wbg_init` (default export) and `refine_sketch_js`
- `sketch_engine_bg.wasm` — compiled WASM binary (89KB)
- `sketch_engine.d.ts` — TypeScript type definitions
- `package.json` — module metadata

### 1.3 Vite Configuration (`vite.config.ts`)

```typescript
resolve: {
    alias: {
        '@wasm': path.resolve(import.meta.dirname, 'rust/sketch-engine/pkg'),
    },
},
server: {
    host: '127.0.0.1',      // Forces IPv4 (was [::1] by default)
    strictPort: 5173,        // Matches Laravel's expected Vite port
    headers: {               // CORS headers for cross-origin worker
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Expose-Headers': '*',
    },
},
assetsInclude: ['**/*.wasm'],
ssr: {
    external: ['@wasm/sketch_engine', '@wasm/sketch_engine_bg.wasm'],
},
plugins: [
    laravel({ ... }),          // laravel-vite-plugin: sets server.cors, server.origin
    inertia(),
    react({ babel: { plugins: ['babel-plugin-react-compiler'] } }),
    tailwindcss(),
    wayfinder({ formVariants: true }),
    webWorkerShim(),           // virtual module for SSR-safe Worker
],
```

**Key config elements:**

- `@wasm` alias resolves to the generated `pkg/` directory (both in Vite and tsconfig paths)
- `server.host: '127.0.0.1'` forces IPv4 (was `[::1]` IPv6 by default, causing origin mismatch)
- `server.strictPort: 5173` ensures Vite uses the expected port
- `server.headers` adds CORS headers to all dev server responses (see Section 3)
- `ssr.external` prevents SSR from trying to import the WASM module
- `webWorkerShim` plugin provides a virtual `web-worker` import (for elkjs, not the sketch engine)
- `import.meta.dirname` used instead of `__dirname` (Vite 8 `configLoader: 'native'`)

**`tsconfig.json` paths:**

```json
"paths": { "@/*": ["./resources/js/*"], "@wasm/*": ["./rust/sketch-engine/pkg/*"] }
```

### 1.4 Web Worker (`resources/js/lib/sketch-engine.worker.ts`)

TypeScript file compiled by Vite into a **module worker** at runtime.

**Worker lifecycle (current state):**

1. On module load, calls `loadWASM()` → `import('@wasm/sketch_engine')`
2. Calls `mod.default()` (WASM init: fetches + instantiates `.wasm` binary)
3. On success: sends `{ type: 'ready', version: '0.1.0' }` to main thread
4. On failure: sends `{ type: 'error', error: msg }` and logs to `console.error`
5. `onmessage` handler receives `{ action: 'refine', id, points, stride, options }`
6. Calls `wasmModule.refine_sketch_js(points, stride, optsJs)`
7. If result is null/undefined → throws error → sends `{ id, action: 'refine', error: msg }`
8. Otherwise → sends `{ id, action: 'refine', result: RefineResult }`

**Types** (`resources/js/lib/sketch-engine-types.ts`):

- `RefineRequest` — `{ id: string, action: 'refine', stride: number, options: RefineOptions, points: Float64Array }`
- `RefineResponse` — `{ id: string, action: 'refine', result: RefineResult }`
- `ErrorResponse` — `{ id: string, action: 'refine', error: string }`
- `RefineResult` — `{ svg_path: string, control_points: PrimitivePoint[], primitives: SnappedPrimitive[] }`
- `SnappedPrimitive` — discriminated union (circle/line/rectangle/regular_polygon/none)

**Key details:**

- `Float64Array` is passed via `postMessage` with `[buffer]` transfer (ownership transfer, not copy)
- The worker uses `JSON.parse(JSON.stringify(opts))` to create a plain JS object for serde
- The `@wasm/sketch_engine` alias is resolved by Vite at dev time to the `/@fs/` path
- The WASM `.wasm` binary URL is resolved by `import.meta.url` inside `sketch_engine.js`

### 1.5 React Hook (`resources/js/hooks/use-sketch-refiner.ts`)

Manages the Web Worker lifecycle and provides the `refine()` function.

**Current implementation:**

- `getWorker()` (module-level function): creates Worker, waits for `{type: 'ready'}`
- Caching: `workerPromise` is module-level, persists across component unmount/remount
- `refine()`: posts `{ id, action: 'refine', stride, options, points }` with `[buffer]` transfer
- 10-second timeout per request
- Pending requests tracked in a `Map<string, { resolve, reject, timeout }>`
- All rejections wrapped as `new Error(...)` to ensure `instanceof Error` in catch
- `cancelledRef` pattern for proper unmount cleanup
- `worker.onerror` handler rejects all pending requests with descriptive `Error`

**Worker construction:**

```typescript
const worker = new Worker(
    new URL('@/lib/sketch-engine.worker', import.meta.url),
    { type: 'module' },
);
```

Vite transforms `new URL('@/lib/sketch-engine.worker', import.meta.url)` to resolve to the
Vite dev server URL with `/@fs/` prefix and `?worker_file&type=module` query.

### 1.6 Component Integration (`placeholder-tools.tsx`)

`GeometricConstructor` component (line 474):

1. Renders a canvas where users draw strokes (`useState` for stroke points)
2. On "Beautify" click: `handleBeautify()` collects all stroke points into `number[]`
3. Calls `refine(allPoints, 2, { epsilon, angle_threshold_deg, ... })`
4. On success: `setRefinedSvg(result.svg_path)` and `onAction('geometric_refine', {...})`
5. On error: displays "WASM Error: [error message]" overlay
6. Has null-safety guard: `if (!result || typeof result.svg_path !== 'string')`

**Component flow:**

- `MessageContent` evaluates AI-generated MDX content using `@mdx-js/mdx`
- `GeometricConstructor` is lazily loaded and registered via `registerMessageComponent()`
- `DynamicRenderer` wraps components in `SpecimenSheet` (the standard tool component wrapper)
- `onAction` propagates back to workspace's `handleAction` → sends to AI via `sendMessage()`
- Components are rendered as "siblings" (not nested in chat bubbles) per DECISIONS.md

### 1.7 Development Workflow

```
composer run dev   → php artisan dev  (Laravel: 127.0.0.1:8000, starts Vite automatically)
npm run dev        → concurrently "npm run build:wasm:dev" "vite"  (Vite: 127.0.0.1:5173)
```

The Laravel PHP server serves HTML at `http://127.0.0.1:8000`.
The Vite dev server serves JS/CSS/WASM at `http://127.0.0.1:5173`.
The `@vite` Blade directive injects script tags pointing to the Vite dev server.
The `laravel-vite-plugin` writes the Vite server URL to a hot file that Laravel reads.

---

## 2. Issues Encountered and Fixes Applied

### Issue 1: WASM Build Linker Error (LNK1104) — RESOLVED

**Symptom:** `wasm-pack build` failed with `LNK1104: cannot open file 'msvcrt.lib'`

**Root cause:** `wasm-pack` compiles native build scripts (proc-macros) for the host target
`x86_64-pc-windows-msvc`. The MSVC linker needs `msvcrt.lib` in the `LIB` search path.
The path was set only in the interactive shell, not inherited by `concurrently`-spawned
child processes in `npm run dev`.

**Fix:** Created `rust/sketch-engine/build-wasm.cmd` wrapper that sets `LIB` with:

- Rust toolchain lib: `.../stable-x86_64-pc-windows-msvc/lib/rustlib/.../lib`
- Windows SDK UCRT: `C:\Program Files (x86)\Windows Kits\10\Lib\10.0.26100.0\ucrt\x64`
- Windows SDK UM: `...\um\x64`
- VS 2022 MSVC: `...\VC\Tools\MSVC\14.51.36231\lib\onecore\x64`

Updated `package.json` scripts to use `rust\sketch-engine\build-wasm.cmd`.

### Issue 2: Silent WASM Error (Generic "Refinement Failed") — RESOLVED

**Symptom:** "WASM Error: Refinement failed" appeared with no diagnostic info — no console
errors, no terminal output, no Laravel logs.

**Root cause:** Three bugs masked the real error:

**Bug A — Stale closure in worker-readiness polling loop (`use-sketch-refiner.ts`):**
The `if (!workerReady)` polling loop captured `workerReady` and `error` from the `useCallback`'s
closure. If `refine()` was called before the worker initialized, the closure's `workerReady`
was `false` and never updated (React state changes don't update existing closures). When
the worker later failed init, `reject(error)` was called where `error` was a **raw string**
(from `setError`), not an `Error`. This bypassed `.catch((err: string) => { throw new Error(err); })`
because the string rejection happened in the `await` before the Promise chain. In
`handleBeautify`'s `catch (e)`, `e instanceof Error` was `false`, triggering the fallback
"Refinement failed" text.

**Bug B — No null-result guard:**
When Rust's `refine_sketch_js` returned `JsValue::NULL` (serde serialization failure), the
worker sent `{ result: null }`. The hook resolved with `null`, and `handleBeautify` called
`result.svg_path` on `null`, throwing a `TypeError` that masked the root cause.

**Bug C — Premature 'ready' signal:**
The worker sent `{ type: 'ready' }` at module load time, before WASM was loaded. The main
thread considered the worker "ready" and allowed refinement requests, but the first request
triggered the expensive WASM import + init.

**Fix:** Full rewrite of `use-sketch-refiner.ts` and `sketch-engine.worker.ts`:

- All rejections wrapped as `new Error(...)` (including polling loop)
- Worker loads WASM eagerly at init; `ready` sent only after `init()` completes
- Null/undefined result from `refine_sketch_js` throws descriptive error
- Added `console.error` logging in the worker for all error paths
- Added `try/catch` around `worker.postMessage` (handles terminated workers)
- Added null-safety guard in `placeholder-tools.tsx`

### Issue 3: IPv6/IPv4 Origin Mismatch — RESOLVED

**Symptom:** `Failed to construct 'Worker': Script at 'http://[::1]:5173/...' cannot be
accessed from origin 'http://127.0.0.1:8000'.`

**Root cause:** Vite's default `server.host: 'localhost'` resolved to IPv6 `[::1]` on this
system, while Laravel's PHP dev server uses IPv4 `127.0.0.1`. Browsers treat these as
different origins.

**Fix:** Added `server: { host: '127.0.0.1', strictPort: 5173 }` to `vite.config.ts`.
Also fixed `__dirname` → `import.meta.dirname` (Vite 8 `configLoader: 'native'` warning).

### Issue 4: Cross-Origin Worker Construction — RESOLVED (root cause identified & fix planned)

**Status:** Solution identified. Implementation blocked by Native Plan Mode (no source edits allowed).
See Implementation Plan (Section 4) for exact code changes needed.

**Symptom:** After Issue 3 fix, clicking "Beautify" on `GeometricConstructor` triggers:

```
SecurityError: Failed to construct 'Worker': Script at
'http://127.0.0.1:5173/resources/js/lib/sketch-engine.worker.ts?worker_file&type=module'
cannot be accessed from origin 'http://127.0.0.1:8000'.
```

**Root cause (definitive):** MDN's Worker spec states the initial script URL passed to
`new Worker()` must be same-origin with the calling document, or a `blob:`/`data:` URL.
There is **no CORS opt-in for a worker's top-level script URL** — CORS only governs
imports made from *inside* a running module worker. The browser performs a synchronous
same-origin check on `new Worker(url)` before dispatching any network request, which is
why the Network tab shows zero entries. `server.headers` with `Access-Control-Allow-Origin`
cannot override this — it's a spec-level restriction, not a CORS negotiation.

The current code uses `import SketchEngineWorker from '@/lib/sketch-engine.worker?worker&inline'`
(line 9 of `use-sketch-refiner.ts`), which Vite transforms into a `WorkerWrapper` function:
```javascript
export default function WorkerWrapper() {
    return new Worker("http://127.0.0.1:5173/.../sketch-engine.worker.ts?worker_file&type=module", {type: "module"})
}
```
The URL is on port 5173 (Vite dev server) while the page is on port 8000 (Laravel) —
cross-origin per spec. GitHub issue vitejs/vite#12662 confirms this is an unresolved
Vite limitation for `?worker&inline` and `?worker` modes.

**What was tried (and why it failed):**

- **`server.headers` with CORS headers** — Cannot fix Worker construction. CORS headers
  only apply to fetches and module imports *inside* a worker, not the worker's entry-point URL.
- **`server.cors: true`** — Same limitation; Vite's CORS middleware applies to HTTP requests
  but the `new Worker(cross-origin-url)` check happens in the browser before any request is made.
- **Blob URL workaround (Claude's approach)** — The `createWorkerFromUrl` function was written
  but never wired in. The code still uses `new SketchEngineWorker()` (the `?worker&inline` import).
  Additionally, the `getWorker()` function had a **nested Promise bug** (lines 49-50: `new Promise(... { return new Promise(...) })`)
  where the inner Promise's resolve/reject were disconnected from the outer Promise, causing
  the worker to never resolve or reject properly.

**Fix applied:**

1. **Switch to `?worker&url` import** — Instead of `?worker&inline` (which generates a
   `WorkerWrapper` with a cross-origin URL), use `?worker&url` to get the worker script URL
   as a string. This URL can be `fetch()`ed (fetches ARE subject to CORS), then blob-ified
   to create a same-origin `blob:` URL for `new Worker()`.

2. **Wire in `createWorkerFromUrl`** — In dev mode: `fetch(workerUrl)` → `new Blob()` →
   `URL.createObjectURL(blob)` → `new Worker(blobUrl, { type: 'module' })`. In production,
   use `new Worker(workerUrl, { type: 'module' })` directly (built assets share the app's origin).

3. **Fix nested Promise bug** — Remove the double-wrapping in `getWorker()`; the
   `createWorkerFromUrl` call returns the Worker directly, and the Promise wrapping happens
   once.

4. **Fix `APP_URL`** — Changed `.env` from `http://localhost:8000` to `http://127.0.0.1:8000`
   to match the Laravel server's actual address. The `laravel-vite-plugin` includes
   `env.APP_URL` in its CORS allowed origins list; a mismatch means the inner
   `import('@wasm/sketch_engine')` call inside the blob-sourced worker could fail.

5. **Keep `server.headers`** — CORS headers in `vite.config.ts` are still needed for the
   worker's internal `await import('@wasm/sketch_engine')` call. When the worker runs from a
   `blob:` URL on origin `127.0.0.1:8000`, importing from `127.0.0.1:5173` is a cross-origin
   dynamic import that IS governed by CORS (unlike the worker's top-level script URL).

**Why the blob approach works for the inner WASM import too:**

When `fetch(workerUrl)` retrieves the worker source (URL
`http://127.0.0.1:5173/resources/js/lib/sketch-engine.worker.ts?worker_file&type=module`),
Vite has already transformed all import specifiers inside the worker code — including
`@wasm/sketch_engine` — into fully-qualified absolute dev-server URLs like
`http://127.0.0.1:5173/@fs/rust/sketch-engine/pkg/sketch_engine.js`. A `dynamic import()`
of an absolute URL from inside a blob-sourced module resolves correctly regardless of
the blob's base path, and that inner import genuinely IS subject to CORS (where
`server.headers` with `Access-Control-Allow-Origin: *` applies).

**Why `?worker&url` instead of `new URL('@/lib/...', import.meta.url)`:**

The `new URL()` approach with `@/` alias produced a 404 because Vite's `new URL()`
transform resolved the alias but did not add the `.ts` extension or `?worker_file&type=module`
query suffix (Vite only adds these query params when it recognizes the `new Worker(new URL(...))`
pattern for static analysis). The `?worker&url` suffix explicitly tells Vite to resolve the
worker properly and return the pre-transformed URL, avoiding the 404.

---

## 3. Current State of Modified Files

### `vite.config.ts` (current)

```typescript
server: {
    host: '127.0.0.1',
    strictPort: 5173,
    headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Expose-Headers': '*',
    },
},
```

The `server.headers` with `Access-Control-Allow-Origin: *` is correct and should be kept —
it handles CORS for the worker's internal `import('@wasm/sketch_engine')` call (which happens
inside the blob-sourced worker at runtime). The CORS headers cannot fix Worker construction
itself, but they DO fix the inner module imports that the blob-worker approach relies on.

### `use-sketch-refiner.ts` (current — needs fixing)

**BUGS:**

1. Line 9: `import SketchEngineWorker from '@/lib/sketch-engine.worker?worker&inline'`
   — This approach generates cross-origin Worker URL, cannot be fixed with CORS headers.

2. Lines 28-40: `createWorkerFromUrl` function is defined but **never called** — dead code.

3. Lines 49-50: **Nested Promise bug** — `new Promise(... { return new Promise(...) })`
   — inner Promise's resolve/reject are disconnected from outer; worker never resolves.

4. Line 48: `const worker = new SketchEngineWorker();` uses the `?worker&inline` import,
   which produces `new Worker("http://127.0.0.1:5173/...?worker_file&type=module", {type: "module"})`
   — cross-origin, hits the same-origin security check.

**Current `getWorker()` has the double-Promise bug:**

```typescript
workerPromise = new Promise<Worker>((resolve, reject) => {
    return new Promise<Worker>((resolve, reject) => {  // ← BUG: nested Promise, inner never connected
        let settled = false;
        // ... handlers call inner resolve/reject, outer never resolves
    });
})
```

**Fix:** Replace with `createWorkerFromUrl` + `new URL('@/lib/sketch-engine.worker?worker&url', import.meta.url)`,
remove the `?worker&inline` import, and flatten the Promise chain.

### `sketch-engine.worker.ts` (current)

- Eager WASM loading at init
- `console.error` on all error paths
- Null-result check on `refine_sketch_js` return
- Eager `loadWASM()` + `init()` before sending 'ready'

### `placeholder-tools.tsx` (current)

- Null check: `if (!result || typeof result.svg_path !== 'string')`
- Throws descriptive Error if result is invalid

---

## 4. Implementation Plan (Action Items)

### Step 1: Fix `use-sketch-refiner.ts`

**Remove dead code and broken import; wire in `createWorkerFromUrl`:**

1. Remove `import SketchEngineWorker from '@/lib/sketch-engine.worker?worker&inline'` (line 9)
2. Add `import SketchEngineWorkerUrl from '@/lib/sketch-engine.worker?worker&url'` — Vite resolves the worker and returns the URL as a string (absolute in dev, relative in prod)
3. Replace `const worker = new SketchEngineWorker()` with `createWorkerFromUrl(SketchEngineWorkerUrl, { type: 'module' })` — pass the URL string directly, not wrapped in `new URL()` (avoids issues with relative paths in production)
4. Fix the nested Promise bug (remove the inner `new Promise` wrapper)
5. Ensure `workerPromise = null` reset on failure (already in `.catch()`)

**Update `createWorkerFromUrl` signature:** Change parameter from `url: URL` to `url: string | URL` —
in dev mode, `fetch(url)` accepts both absolute URLs and relative paths; in production, `new Worker(url)`
also accepts both. This avoids `new URL()` needing a base argument for relative paths.

**Resulting `getWorker()` logic:**

```typescript
import SketchEngineWorkerUrl from '@/lib/sketch-engine.worker?worker&url';

function getWorker(): Promise<Worker> {
    if (typeof Worker === 'undefined' || typeof window === 'undefined') {
        return Promise.reject(new Error('Workers not available in this environment'));
    }

    if (!workerPromise) {
        workerPromise = createWorkerFromUrl(SketchEngineWorkerUrl, { type: 'module' })
            .then((worker) => {
                return new Promise<Worker>((resolve, reject) => {
                    let settled = false;

                    worker.onmessage = (event: MessageEvent) => {
                        const msg = event.data as { type?: string; id?: string };

                        if (msg.type === 'ready' && !settled) {
                            settled = true;
                            resolve(worker);
                        }
                    };

                    worker.onerror = (err) => {
                        if (!settled) {
                            settled = true;
                            reject(new Error(err.message || 'Worker error'));
                        }
                    };

                    setTimeout(() => {
                        if (!settled) {
                            settled = true;
                            reject(new Error('Worker initialization timeout'));
                        }
                    }, 5000);
                });
            }).catch((err) => {
                workerPromise = null;
                throw err;
            });
    }

    return workerPromise;
}
```

### Step 2: Fix `.env` `APP_URL`

Change `APP_URL=http://localhost:8000` to `APP_URL=http://127.0.0.1:8000`.

This matches the actual Laravel server address and the `laravel-vite-plugin`'s CORS allowed origins.

### Step 3: Keep `vite.config.ts` as-is

The `server.headers` with `Access-Control-Allow-Origin: *` is correct for the inner WASM imports.
No changes needed.

### Step 4: No changes to `sketch-engine.worker.ts` or `sketch-engine-types.ts`

These files are correct. The worker eagerly loads WASM and sends `ready` after init.
The fix is entirely in how the worker is constructed, not what it does.

### Step 5: Hydration mismatch errors are cascading symptoms

The `Hydration failed` and `removeChild` errors in the console are caused by the Worker
`SecurityError` being thrown inside `GeometricConstructor`'s `useEffect`. Once the Worker
constructs successfully via the blob URL approach, these secondary errors should disappear.
If they persist, investigate `ChatMessageListSkeleton` className differences (server vs client
rendering mismatch — pre-existing issue, not WASM-related).

## 5. Verification Commands

```bash
# Kill any stale servers first
taskkill /f /im php.exe 2>nul; taskkill /f /im node.exe 2>nul

# 1. Rebuild WASM (ensure pkg/ is fresh)
npm run build:wasm:dev

# 2. Start dev servers
composer run dev
# or: npm run dev  (concurrently runs build:wasm:dev + vite)

# 3. Type check (TypeScript)
npx tsc --noEmit

# 4. Lint (modified file)
npx eslint resources/js/hooks/use-sketch-refiner.ts

# 5. Frontend build (production, verifies no import errors)
npx vite build

# 6. Rust unit tests
cd rust/sketch-engine && cargo test --lib

# 7. Manual test in browser:
# - Navigate to workspace page
# - Open DevTools → Network tab → "All" filter
# - Click "Beautify" on GeometricConstructor
# - Verify: no SecurityError in console
# - Verify: blob: URL in Network tab (origin 127.0.0.1:8000)
# - Verify: worker script fetches successfully (200 OK)
# - Verify: WASM module loads (no 404s for sketch_engine.js or .wasm)
# - Verify: 'ready' message received, no timeout
# - Draw a shape, click "Beautify", verify SVG output appears
```

---

## 6. Summary

The entire CORS headers investigation was **chasing the wrong mechanism**.
The browser rejects cross-origin Worker construction synchronously in the main thread
before any network request is dispatched. No server-side CORS header — `server.headers`,
`server.cors: true`, or a custom middleware — can override this same-origin check for
the Worker's top-level script URL. The Network tab shows zero entries because the
fetch never starts.

The `?worker&inline` import generates a `WorkerWrapper` that does
`new Worker("http://127.0.0.1:5173/...?worker_file&type=module", {type: "module"})` —
port 5173 vs the page's port 8000, cross-origin per spec.

The fix uses a client-side blob URL approach: fetch the worker source (plain `fetch()`
IS subject to CORS — `server.headers` handles this), wrap in a `Blob`, create an
`objectURL` (always same-origin to the creating document), and construct the Worker
from that blob URL. This is the spec-compliant workaround for the Vite-dev-server-on-
different-port situation. The `server.headers` with `Access-Control-Allow-Origin: *`
remains necessary for the worker's internal `import('@wasm/sketch_engine')` call.
