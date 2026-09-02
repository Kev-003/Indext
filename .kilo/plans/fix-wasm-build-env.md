# Fix: WASM Worker cross-origin construction error

## Current Error

```
Failed to initialize worker: Failed to construct 'Worker': Script at
'http://127.0.0.1:5173/@fs/resources/js/lib/sketch-engine.worker?worker_file&type=module'
cannot be accessed from origin 'http://127.0.0.1:8000'.
```

## Status: PLANNING

## Setup Description: Rust+WASM → JavaScript

### 1. Rust Crate (`rust/sketch-engine/`)
- `Cargo.toml` defines a `cdylib` crate with dependencies:
  - `wasm-bindgen` — JS<->Rust interop
  - `serde` + `serde-wasm-bindgen` — serializing `RefineResult` struct to JS objects
  - `console_error_panic_hook` — surfaces Rust panics to JS console
  - `kurbo` — geometric curve/path computation for SVG generation
- 7 modules: `lib.rs` (entry), `pipeline.rs` (orchestration), `point.rs`, `simplify.rs`, `corner.rs`, `curves.rs`, `snapping.rs`, `output.rs`
- `#[wasm_bindgen]` exports `refine_sketch_js` (accepts `&[f64]`, `usize`, `&JsValue`; returns `JsValue`)
- `rust-toolchain.toml` pins stable toolchain
- Built with `wasm-pack build --target web` → outputs to `rust/sketch-engine/pkg/`

### 2. WASM Package (`rust/sketch-engine/pkg/`)
- `sketch_engine.js` — JS glue with `__wbg_init` (default export), `refine_sketch_js` function
- `sketch_engine_bg.wasm` — compiled WASM binary
- `sketch_engine.d.ts` — TypeScript type definitions

### 3. Vite Configuration (`vite.config.ts`)
- `@wasm` alias → `rust/sketch-engine/pkg`
- `assetsInclude: ['**/*.wasm']` — allows WASM imports
- `ssr.external` for WASM modules (SSR safety)
- `webWorkerShim` plugin — provides a virtual `web-worker` module shim for SSR

### 4. Web Worker (`resources/js/lib/sketch-engine.worker.ts`)
- Loads WASM module eagerly at init: `import('@wasm/sketch_engine')`
- Calls `mod.default()` (WASM init) before sending `{type: 'ready'}`
- Handles `refine` action: calls `refine_sketch_js(points, stride, opts)`
- Sends back `{id, result}` or `{id, error}`

### 5. React Hook (`resources/js/hooks/use-sketch-refiner.ts`)
- Creates Worker via `new Worker(new URL('@/lib/sketch-engine.worker', import.meta.url), {type: 'module'})`
- Listens for `{type: 'ready'}` to resolve worker readiness
- `refine()` posts `{id, action: 'refine', stride, options, points}` to the worker
- Response handler in `useEffect` resolves/rejects pending requests by ID

### 6. Component Integration (`placeholder-tools.tsx`)
- `GeometricConstructor` calls `refine(allPoints, 2, options)` on Beautify click
- Result's `svg_path` rendered to canvas; `onAction` sends data back to chat

### 7. Dev Workflow
- `composer run dev` → `php artisan dev` (starts PHP server on `127.0.0.1:8000` + may start Vite)
- `npm run dev` → `concurrently "npm run build:wasm:dev" "vite"` (starts Vite on `127.0.0.1:5173`)

## What Was Tried So Far

### Attempt 1: Force IPv4 host (`server.host: '127.0.0.1'`)
**Problem:** Vite bound to `[::1]` (IPv6) while Laravel was on `127.0.0.1` (IPv4). Different hosts → different origins.
**Fix:** Added `host: '127.0.0.1'` and `strictPort: 5173` to `vite.config.ts`.
**Result:** Fixed the IPv6/IPv4 mismatch. Both now use `127.0.0.1`. But ports still differ (5173 vs 8000), which is still a cross-origin request.

### Attempt 2: CORS response headers (`server.headers`)
**Fix:** Added `headers: { 'Access-Control-Allow-Origin': '*', ... }` to `vite.config.ts`.
**Root cause analysis (source code investigation):**
- `laravel-vite-plugin` sets `server.cors` with `origin` as `[defaultAllowedOrigins, APP_URL]`
- `defaultAllowedOrigins` = `/^https?:\/\/(?:(?:[^:]+\.)?localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/`
- This regex **should** match `http://127.0.0.1:8000` (it matches `127.0.0.1` with any port)
- Vite's CORS middleware (line 26554 in Vite source) should add `Access-Control-Allow-Origin` header
- Vite's `serveRawFsMiddleware` (line 20404) and `transformMiddleware` (line 25080) both apply `server.headers` via `getHeaders: () => server.config.server.headers`
- `send$1` function (line 19643) uses `res.setHeader(name, headers[name])` which **replaces** (not appends) headers
- So the final response should have `Access-Control-Allow-Origin: *`

**Result:** Error persists. Possible explanations:
1. `server.headers` might not be applied if `transformRequest` fails (error responses from `errorMiddleware` don't include `server.headers`)
2. The CORS middleware might be interfering with the `server.headers` (Vite's `mergeConfig` might not merge `server` correctly with the plugin's `enforce: "post"` config hook)
3. Vite 8 might handle `server.headers` differently than expected for `/@fs/` paths
4. The Vite dev server might need to be restarted to pick up config changes (user might not have restarted)
5. Browser might cache the failed Worker construction

### Attempt 3: Eager WASM loading in worker
**Problem:** Original worker code loaded WASM lazily on each `refine` request, sent 'ready' before WASM was loaded.
**Fix:** Rewrote `sketch-engine.worker.ts` to load WASM eagerly at worker init, send 'ready' only after `init()` completes.
**Result:** This fixes worker lifecycle issues but doesn't address the cross-origin Worker construction error.

### Attempt 4: Error handling improvements
**Fix:** Rewrote `useSketchRediner.ts` to:
- Wrap all rejections as `Error` instances (no raw strings)
- Handle null results from WASM
- Add `try/catch` around `worker.postMessage`
- Add `worker.onerror` handler for all pending requests
**Result:** Properly surfaces the actual error message ("Failed to initialize worker: ...") instead of the generic "Refinement failed". This is what revealed the cross-origin issue.

## Proposed Solutions

### Option A: Explicit `server.cors` config (Recommended)
Override the `laravel-vite-plugin`'s CORS config by explicitly setting `server.cors` in the user's Vite config.

```typescript
server: {
    host: '127.0.0.1',
    strictPort: 5173,
    cors: { origin: '*' },  // Overrides plugin's default, allows all origins
    headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Expose-Headers': '*',
    },
},
```

The `laravel-vite-plugin` uses `userConfig.server?.cors ?? { origin: [...] }`, so setting `cors` in the user config overrides the plugin's default. `cors: { origin: '*' }` tells Vite's CORS middleware to allow all origins.

**Files:** `vite.config.ts`

### Option B: Set `APP_URL` in `.env`
Add `APP_URL=http://127.0.0.1:8000` to `.env`. The `laravel-vite-plugin` reads `APP_URL` and includes it in the CORS allowed origins:

```
...env.APP_URL ? [env.APP_URL] : [],
```

This would add `http://127.0.0.1:8000` to the allowed origins list. The existing `defaultAllowedOrigins` regex already matches this, but explicitly including `APP_URL` ensures the origin is allowed.

**Files:** `.env`

### Option C: Vite proxy (bypass CORS entirely)
Configure Vite to proxy API requests through itself, or configure Laravel to proxy Vite requests through itself.

```typescript
server: {
    host: '127.0.0.1',
    strictPort: 5173,
    proxy: {
        // Proxy the Vue dev server's /@fs/ path through Laravel's origin
    },
},
```

This is more complex and not recommended for this issue.

### Option D: Inline worker as Blob URL
Instead of loading the worker from a cross-origin URL, inline the worker code as a Blob and use `URL.createObjectURL(blob)` to create a same-origin URL.

```typescript
const workerSource = `... worker code as string ...`;
const blob = new Blob([workerSource], { type: 'application/javascript' });
const workerUrl = URL.createObjectURL(blob);  // same-origin
const worker = new Worker(workerUrl, { type: 'module' });
```

This completely bypasses the CORS issue because the worker script is served from the same origin (Blob URLs inherit the origin of the creating document). However, this requires inlining all worker code, which is impractical for a worker that dynamically imports a WASM module.

### Option E: Combine `server.cors` with explicit origin
```typescript
server: {
    host: '127.0.0.1',
    strictPort: 5173,
    cors: true,  // Allows all origins
},
```

Setting `cors: true` tells Vite to enable CORS with default settings (which allows all origins). This overrides the `laravel-vite-plugin`'s default CORS config.

## Files That May Need Modification

1. `vite.config.ts` — Add `server.cors` option (Option A or E)
2. `.env` — Add `APP_URL=http://127.0.0.1:8000` (Option B)

## Verification Steps

1. Update config
2. **Restart Vite dev server** (important: Vite doesn't hot-reload server config changes)
3. Open `http://127.0.0.1:5000` (Laravel) in Chrome DevTools
4. Navigate to Network tab → WS tab → observe Worker requests
5. Check response headers for `Access-Control-Allow-Origin`
6. Trigger `GeometricConstructor` component
7. Draw on canvas and click "Beautify"
8. Worker should initialize → WASM loads → refinement runs
