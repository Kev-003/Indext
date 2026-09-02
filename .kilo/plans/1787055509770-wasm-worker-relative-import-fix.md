# Fix: WASM Worker Relative Import Resolves to Wrong Origin

## Root Cause

The `createWorkerFromUrl` approach (fetch+blob) works for the worker's own script URL,
but the worker source fetched from Vite contains a **path-relative import**:

```javascript
const mod = await import("/rust/sketch-engine/pkg/sketch_engine.js");
```

When the blob-ified worker runs (origin `127.0.0.1:8000`), this relative import
resolves to the **Laravel server** (port 8000), not the **Vite dev server** (port 5173).
The Laravel server returns a 404 HTML page, causing a module parse error that
triggers `worker.onerror` → `"Worker error"` (empty error message).

## Changes

### 1. `resources/js/lib/sketch-engine.worker.ts` (line 7)

Replace the bare dynamic import with `new URL()` so Vite resolves it to an
**absolute URL** at compile time:

**Before:**
```typescript
const mod = await import('@wasm/sketch_engine');
```

**After:**
```typescript
const wasmUrl = new URL('@wasm/sketch_engine', import.meta.url);
const mod = await import(wasmUrl.href);
```

Vite's `import` plugin transforms `new URL(specifier, import.meta.url)` at compile
time, resolving the `@wasm` alias and `import.meta.url` into a string literal
like `"http://127.0.0.1:5173/rust/sketch-engine/pkg/sketch_engine.js"`. This
absolute URL is embedded in the fetched source, so the blob-ified worker
correctly fetches WASM from the Vite dev server regardless of the worker's own origin.

### 2. `resources/js/hooks/use-sketch-refiner.ts` (line 53-60)

In `getWorker()`'s `onmessage` handler, also handle `msg.type === 'error'` so
that if the worker fails to initialize WASM (e.g., import fails in prod for
unexpected reasons), the promise rejects with a meaningful message instead of
timing out:

**Before:**
```typescript
worker.onmessage = (event: MessageEvent) => {
    const msg = event.data as { type?: string; id?: string };
    if (msg.type === 'ready' && !settled) {
        settled = true;
        resolve(worker);
    }
};
```

**After:**
```typescript
worker.onmessage = (event: MessageEvent) => {
    const msg = event.data as { type?: string; id?: string; error?: string };
    if (msg.type === 'ready' && !settled) {
        settled = true;
        resolve(worker);
    } else if (msg.type === 'error' && !settled) {
        settled = true;
        reject(new Error(msg.error || 'Worker reported initialization error'));
    }
};
```

## Validation

1. `npx tsc --noEmit` — confirm no TypeScript errors
2. `npx eslint resources/js/lib/sketch-engine.worker.ts resources/js/hooks/use-sketch-refiner.ts`
3. Restart `composer run dev`, navigate to workspace page
4. Open DevTools → Network tab → "All" filter, filter for `sketch_engine`
5. Verify:
   - No `SecurityError` or `Worker error` in console
   - The WASM module loads with a 200 response
   - `GeometricConstructor` refines without error
