# Fix: WASM SSR Hydration + Hooks Order Crash

## Problem

After integrating the Rust-to-WASM sketch engine, the `GeometricConstructor` crashes with:

1. **Hooks order violation**: The `if (!mounted) return` early return in `GeometricConstructor` placed `useCallback` calls after a conditional return, violating the Rules of Hooks. On the first render (`mounted=false`), hooks after the return weren't called; on the second render (`mounted=true`), they were — causing `Rendered more hooks than during the previous render`.

## Root Cause

The `mounted` state guard that was added to prevent SSR/client hydration mismatch was implemented incorrectly — the early return was placed BETWEEN hooks, not after all hooks. React requires ALL hooks to be called unconditionally in the same order on every render.

## Current State (already fixed)

1. **Worker lazy import** — `sketch-engine.worker.ts` already uses dynamic `import('@wasm/sketch_engine')` inside `onmessage` instead of top-level import. ✅
2. **SSR guard in hook** — `useSketchRefiner.getWorker()` already checks `typeof Worker === 'undefined'` before creating worker. ✅
3. **Vite ssr.external** — `vite.config.ts` already has `ssr.external = ['@wasm/sketch_engine', '@wasm/sketch_engine_bg.wasm']`. ✅
4. **TypeScript types** — `tsconfig.json` already has `@wasm/*` path mapping. ✅

## Fix Required

### Remove `mounted` guard from `GeometricConstructor`

**File**: `resources/js/components/dynamic/tools/placeholder-tools.tsx`

**Remove**:
- `const [mounted, setMounted] = useState(false);` (line 480)
- `useEffect(() => { setMounted(true); }, []);` (lines 493-495)
- `if (!mounted) { return (...); }` block (lines 497-517)

**Keep all other hooks in place** — they are already SSR-safe because:
- `useSketchRefiner()` only creates the Worker inside `useEffect` (which doesn't run during SSR)
- `useCanvas` operations (`useEffect` for canvas redraw) don't run during SSR
- `useCallback` functions are created but not invoked during SSR

The component will render its JSX during SSR (canvas element with placeholder), and the client will hydrate and attach event handlers. No hydration mismatch because the rendered output is identical between SSR and client — both render the same DOM structure.

### Why this works without `mounted`

- The `useSketchRefiner` hook returns `{ workerReady: false, ... }` during SSR (no worker created)
- The `handleBeautify` callback checks `workerReady` before proceeding
- If the user clicks "Beautify" without the worker being ready, it waits for initialization
- The canvas `useEffect` for redrawing only runs when `strokes` or `currentPath` change (both empty on mount), so it's a no-op during SSR
- The `mounted` guard was only needed because the original approach tried to prevent WASM import during SSR — but the lazy import already solves that problem
