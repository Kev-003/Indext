# Fix ElkJS Module Default Export Error

## Problem

```
Uncaught SyntaxError: The requested module '/node_modules/elkjs/lib/main.js?v=6340ebef' does not provide an export named 'default' (at placeholder-tools.tsx:5:8)
```

`placeholder-tools.tsx` uses `import ELK from 'elkjs'` (line 5). The `elkjs@0.11.1` package has `"main": "lib/main"` in its `package.json`, so Vite resolves `'elkjs'` → `lib/main.js`.

### Root Cause

The Vite alias at `vite.config.ts:58-62` is:

```typescript
{
    find: 'elkjs/lib/main.js',
    replacement: 'elkjs/lib/elk.bundled.js',
}
```

This alias **never fires** because it matches the literal string `'elkjs/lib/main.js'`, but the import specifier is `'elkjs'` (the package name). Vite resolves `'elkjs'` through the `main` field and never hits the alias.

Since `elkjs` is in `optimizeDeps.exclude` (line 66), Vite serves `lib/main.js` as a runtime CJS file. That file has a **broken CJS export pattern** (`lib/main.js:61-65`):

```javascript
Object.defineProperty(module.exports, "__esModule", { value: true });
module.exports = ELKNode;        // REASSIGNS module.exports — __esModule is lost
ELKNode["default"] = ELKNode;   // Sets `default` on ELKNode itself
```

The `module.exports = ELKNode` reassignment discards the `__esModule` flag set on lines 61-63. Vite's runtime CJS→ESM wrapper cannot find a `default` export and throws the error.

The `lib/elk.bundled.js` file is a browserify UMD bundle that Vite's CJS interop handles correctly — the alias was intended to redirect to it, but the alias key is wrong.

## Fix

### Step 1: Fix the Vite alias to match the package-level import

**File:** `vite.config.ts` (line 60)

Change:
```typescript
find: 'elkjs/lib/main.js',
```
To:
```typescript
find: 'elkjs',
```

This ensures `import ELK from 'elkjs'` is resolved to `elkjs/lib/elk.bundled.js` (the UMD bundle), which Vite's CJS interop correctly exposes as `export default ELKNode`.

### Step 2: Verify

Run:
```bash
npx vite build
```

Confirm the build succeeds and the runtime error is resolved.

## Affected Files

1. `vite.config.ts` — fix alias `find` key (line 60)
2. `placeholder-tools.tsx` — no change needed (import stays as `import ELK from 'elkjs'`)

## Risk Assessment

- **Low risk**: Only changes the Vite resolve alias key from a non-matching literal to the package name. No behavioral changes to application code.
- The `elk.bundled.js` UMD bundle was already the intended target (per the existing alias configuration) — this fix simply makes the alias actually work.
- `optimizeDeps.exclude: ['elkjs']` remains — the bundled file is still excluded from pre-bundling and served at runtime, but as a UMD-compatible file that Vite processes correctly.
