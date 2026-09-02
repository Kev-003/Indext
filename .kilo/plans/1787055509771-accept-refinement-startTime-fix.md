# Implementation Prompt for Antigravity

You are a senior full-stack engineer working in the Nomentra codebase at `C:\Users\User's\Desktop\Kevern\Indext`. Your job is to implement the following UI/UX bug fixes and the Cloudflare R2 storage migration. The previous plan rounds (2026-09-01 data-layer fixes, 2026-09-02-A through -E tool-component fixes, 2026-09-02 brand-completion plan) are partially applied — verify with `git status` and read `DECISIONS.md` before starting. **Do not re-do work that is already correct.**

## Project Conventions (must follow)

- Memory bank: treat `DECISIONS.md` as canonical. Begin every session log with `[Memory Bank: Active]`. Do not attempt to read `.env`.
- Project name: **Nomentra**.
- Design tokens: CMYK-grounded hex tokens; Space Grotesk (display) + JetBrains Mono (mono).
- Do not modify the `elkjs` installation approach.
- Do not write comments in code unless asked.
- Verify with: `npx tsc --noEmit`, `npx eslint <modified files>`, `npx vite build`, `php artisan test`.

## Two new things to address

1. **Wizards render as "already completed" on first mount** (visual-only — the user cannot tell if the step is actually done or if the form is genuinely blank).
2. **Migrate the Cloudflare R2 storage layer to the Laravel `filesystems.php` convention** so the disk can be reached via the `Storage` facade and is consistent with how the rest of the Laravel app handles files.

---

### Task A — Fix the "starts as already completed" wizard bug

**Why:** A new `ClientInterviewWizard` (and other tool components) is being mounted with `completed=true` even when the user has not actually completed the step. The user reports the form "starts as already completed (maybe only visually)".

**Where to investigate:**

- `resources/js/components/chat/chat-message.tsx:68-78` — the `isCompleted` derivation. After the 2026-09-01 fix, this uses `resolveComponentName(toolName)` and accepts both `result_id` and `tool_call_id`. The `discoveryData` lookup is `brand.discovery[stepKey]`. The `strategyData` lookup is `brand.strategy.interview` for the interview wizard.
- `resources/js/components/dynamic/tools/discovery.tsx:21-29` — `ClientInterviewWizard` initializes `submitted = completed ?? false`. The `completed` prop comes from `props.completed`, which `chat-message.tsx` sets to `isCompleted` (lines 90-91 of `chat-message.tsx`).
- `app/Http/Controllers/WorkspaceController.php` (around lines 95-105) — the brand payload now includes `'discovery' => $brand->discovery ?? []` and `'strategy' => $brand->strategy ?? []`. **A brand that has never had any tool invoked will have an empty `discovery` object `{}` and an empty `strategy` object `{}`** — these are passed verbatim.
- `resources/js/pages/workspace/index.tsx:562-563` — passes `brandDiscovery={brand?.discovery ?? null}` and `brandStrategy={brand?.strategy ?? null}` to `<ChatMessage>`.

**The bug:** the `COMPONENT_STEP_MAP[resolvedName]` lookup in `chat-message.tsx` is returning a `stepKey` like `interview` even when the assistant has **just emitted** the interview tool in the current stream and the user has not yet answered. The `brand.discovery` is `{}` (empty), so `discoveryData` is correctly `null`. So `isCompleted` should be `false` on a fresh mount. But if the AI calls the interview tool a second time (re-render) and `brand.discovery` is still `{}`, the `submitted` state from a prior mount may have stuck around due to React's component-reuse behavior.

**Likely actual bug:** when the AI re-invokes `invoke_client_interview_wizard` (because it lost context or the user said "let's restart the interview"), the new assistant message includes a `tool_call` for that component. The frontend renders a fresh `<ClientInterviewWizard>` instance, but the **brand.discovery** is the same `{}` as before. The `discoveryData` is `null`, `strategyData` is `null`, `toolResult` is `null` — so `isCompleted` is correctly `false`. So the bug must be elsewhere.

**Re-investigate these specific paths before writing code:**

1. **Race condition on initial mount:** The workspace passes `brand.discovery` to `<ChatMessage>` via the `brandDiscovery` prop. If `brand.discovery` is hydrated asynchronously (e.g. a second Inertia partial reload after the user accepts a step), the `chat-message.tsx` derivation will re-run. While `brand.discovery` is in flight between `null` and the truthy object, the component may render with stale `completed=true` from a prior conversation. **Fix:** when `brandDiscovery` is `null` (not yet hydrated), do NOT derive `isCompleted === true`. Only consider a step completed when **both** the server-derived `discoveryData`/`strategyData` is truthy **and** the local `result` is also present.
2. **`strategy.interview` may be `{ businessName: '', mission: '', audience: '', tone: '' }`** (empty object) instead of `null`. The current derivation `!!strategyData` is `true` for any truthy object, including `{}`. **Fix:** change the strategy data derivation to `brandStrategy?.interview && Object.values(brandStrategy.interview).some(v => v)` or simply: treat the step as completed only when the persisted object has a meaningful key (e.g. `interview_data` is not just an empty `{}`).
3. **`completed` prop short-circuit:** the wizard itself does `useState(completed ?? false)`. If `completed` flips from `false` to `true` mid-conversation, React will NOT re-run the initial state setter (initializers only run once). Add a `useEffect(() => { if (completed) setSubmitted(true); }, [completed])` so a completion that arrives from the server takes effect. But — guard against it un-submitting if the user is in the middle of editing.

**How to fix:**

1. In `chat-message.tsx:71-78`, harden the `isCompleted` derivation:
    - Replace `const discoveryData = stepKey && brandDiscovery ? brandDiscovery[stepKey] : null;` with code that returns the data only if the stored object has at least one non-empty value:
        ```ts
        const discoveryData =
            stepKey &&
            brandDiscovery &&
            brandDiscovery[stepKey] &&
            hasContent(brandDiscovery[stepKey])
                ? brandDiscovery[stepKey]
                : null;
        const strategyData =
            (resolvedName === 'ClientInterviewWizard' ||
                toolName === 'ClientInterviewWizard') &&
            brandStrategy?.interview &&
            hasContent(brandStrategy.interview)
                ? brandStrategy.interview
                : null;
        ```
    - Add a small helper at the top of the file:
        ```ts
        function hasContent(obj: any): boolean {
            if (!obj) return false;
            if (typeof obj !== 'object') return Boolean(obj);
            return Object.values(obj).some((v) => {
                if (v == null) return false;
                if (typeof v === 'string') return v.trim().length > 0;
                if (Array.isArray(v)) return v.length > 0;
                if (typeof v === 'object') return Object.keys(v).length > 0;
                return true;
            });
        }
        ```
2. In `discovery.tsx:29` and any other wizard that takes a `completed` prop, add a useEffect that synchronizes `submitted` only when the prop changes from `false` to `true`:
    ```ts
    useEffect(() => {
        if (completed) setSubmitted(true);
    }, [completed]);
    ```
3. In `renderer.tsx`, also forward the `result` prop in a stable way so the wizard's read-only branch renders the persisted answer (which Task A from the 2026-09-02 plan covers, but make sure it is not regressed by the new useEffect).

**Validation:**

- Create a brand, navigate to its workspace, ask the AI to "start the interview". The wizard must appear in **editable** form, NOT as "Interview Complete".
- Complete the wizard. Navigate to dashboard and back. The wizard must re-render in the **read-only** view with the answers.
- Trigger the AI to re-invoke the wizard ("let's redo the interview"). The new instance must appear in editable form again, regardless of prior state.

---

### Task B — Migrate R2 storage to the `filesystems.php` disk convention

**Why:** The current `CloudflareR2StorageService` reads its config from `config('services.cloudflare-r2.*')`, which means it cannot use Laravel's `Storage` facade. The Laravel convention is to register a disk in `config/filesystems.php` and use `Storage::disk('r2')`. The user wants to align with the convention.

**Env variables required (do not put in `.env.example` unless asked, just document them):**

```
CLOUDFLARE_R2_KEY=
CLOUDFLARE_R2_SECRET=
CLOUDFLARE_R2_BUCKET=brand-assets
CLOUDFLARE_R2_ENDPOINT=https://s3.us-east-1.cloudflare.com
CLOUDFLARE_CDN_DOMAIN=https://assets.yourbrand.com
```

**Where to change:**

- `config/filesystems.php` — add a new `r2` disk and (optionally) make it the default
- `app/Services/CloudflareR2StorageService.php` — refactor to read from `config('filesystems.disks.r2')` and delegate to the `Storage` facade where possible
- `app/Http/Controllers/Api/StorageController.php` — no change in signature, but verify the service still works
- `config/services.php` — remove the `cloudflare-r2` block (no longer the source of truth)
- A new feature test in `tests/Feature/` to verify the disk config is loaded

**How:**

1. **Add the `r2` disk to `config/filesystems.php`:**
    - Insert a new disk entry inside the `'disks'` array (after `s3`):
        ```php
        'r2' => [
            'driver' => 's3',
            'key' => env('CLOUDFLARE_R2_KEY'),
            'secret' => env('CLOUDFLARE_R2_SECRET'),
            'region' => 'us-east-1',
            'bucket' => env('CLOUDFLARE_R2_BUCKET', 'brand-assets'),
            'endpoint' => env('CLOUDFLARE_R2_ENDPOINT', 'https://s3.us-east-1.cloudflare.com'),
            'url' => env('CLOUDFLARE_CDN_DOMAIN'),
            'use_path_style_endpoint' => env('CLOUDFLARE_R2_USE_PATH_STYLE', true),
            'throw' => false,
            'report' => false,
        ],
        ```
    - Do NOT change `'default' => env('FILESYSTEM_DISK', 'local')` to `'r2'`. The default stays `local` so test environments do not hit R2. The brand-asset code paths will use `Storage::disk('r2')` explicitly.

2. **Refactor `CloudflareR2StorageService` to use the disk:**
    - Replace the constructor with:
        ```php
        public function __construct() {
            $this->disk = Storage::disk('r2');
            $this->bucket = config('filesystems.disks.r2.bucket');
            $this->cdnDomain = rtrim((string) config('filesystems.disks.r2.url'), '/');
        }
        ```
    - Add `use Illuminate\Support\Facades\Storage;` and `protected \Illuminate\Contracts\Filesystem\Filesystem $disk;`.
    - Replace `generatePresignedPutUrl` so it uses the underlying S3 client's `getCommand` + `createPresignedRequest`, but pulls bucket/region/endpoint/credentials from the disk config (via `config('filesystems.disks.r2.*')`):
        ```php
        $client = $this->disk->getClient();
        $cmd = $client->getCommand('PutObject', [
            'Bucket' => $this->bucket,
            'Key'    => $objectKey,
            'ContentType' => $contentType,
            'Metadata' => ['brand-id' => (string) $brandId, 'team-id' => (string) $teamId],
        ]);
        $request = $client->createPresignedRequest($cmd, '+5 minutes');
        return [
            'url' => (string) $request->getUri(),
            'key' => $objectKey,
            'expires_in' => 300,
        ];
        ```
    - Replace `getPublicUrl` with:
        ```php
        return $this->disk->url($objectKey);  // honors the disk's 'url' (CDN domain) when set
        ```
        Note: Laravel's `Storage::disk('s3')->url($key)` returns the `url` config when set; this matches the desired behavior. Verify by inspecting the actual return — if it returns the raw S3 endpoint instead, fall back to `rtrim($this->cdnDomain, '/').'/'.$objectKey`.
    - Replace `deleteObject` with `$this->disk->delete($objectKey)`.
    - Replace `getObjectContent` with:
        ```php
        try {
            return (string) $this->disk->get($objectKey, ['Range' => 'bytes=0-'.($length - 1)]);
        } catch (\Throwable $e) {
            return '';
        }
        ```
        Note: Laravel's `Storage::get` does not pass the `Range` option directly. Either:
        - (a) Use the underlying S3 client (`$this->disk->getClient()->getObject([...])`) for the ranged read (preserves current behavior), OR
        - (b) Read the full object via `$this->disk->get($objectKey)` and `substr` locally (simpler, fine for the 12-byte magic-bytes check).
          Prefer (a) for parity with the existing implementation.
    - Replace `getObjectMetadata` with the same `$this->disk->getClient()->headObject([...])` approach to preserve behavior.

3. **Remove the `cloudflare-r2` block from `config/services.php`** if it exists. The disk is now the single source of truth.

4. **Verify the controller still works.** `StorageController` does not need to change because it depends on the service. Run the existing test suite — if any test mocks `config('services.cloudflare-r2.*')`, update it to mock `config('filesystems.disks.r2.*')` instead.

5. **Add a new feature test** at `tests/Feature/R2DiskConfigTest.php`:
    - Assert that `Storage::disk('r2')->getConfig()->get('bucket')` matches `env('CLOUDFLARE_R2_BUCKET')`.
    - Assert that the disk driver is `s3` (the underlying S3-compatible client).
    - Assert that `getPublicUrl('brands/1/test.svg')` returns a URL beginning with `config('filesystems.disks.r2.url')` (i.e. the CDN domain) when that env var is set.
    - Use `Storage::fake('r2')` to mock the disk and assert `Storage::disk('r2')->put('key', 'contents')` writes through.

6. **Add the env keys to `.env.example`** (the user explicitly listed the env contents they need). Append at the bottom:

    ```
    CLOUDFLARE_R2_BUCKET=brand-assets
    CLOUDFLARE_R2_ENDPOINT=https://s3.us-east-1.cloudflare.com
    CLOUDFLARE_CDN_DOMAIN=https://assets.yourbrand.com
    ```

    And add a small inline comment block above them explaining which Laravel disk they map to.

7. **Append to `DECISIONS.md`** a "R2 Disk Migration (2026-09-02)" section summarizing the refactor and the new env variables. Run the `sync-decisions` skill to mirror to memory.

**Validation:**

- `php artisan test` — must report 0 failures and the new `R2DiskConfigTest` must pass.
- `npx tsc --noEmit` — must report 0 errors.
- `npx vite build` — must succeed (no frontend changes here, but run to confirm nothing else broke).
- Manual: log into the workspace, upload a brand asset via the existing `POST /api/storage/presigned-url` endpoint (or via the UI if there is one), confirm the upload goes to R2 (check the bucket in the Cloudflare dashboard) and that `getPublicUrl` returns the CDN URL.

---

## Out of Scope (do not touch)

- Tasks A-E from the 2026-09-02 tool-component plan (SpecimenSheet, Google Fonts, moodboard grid, LogoCompositionBuilder icon, BrandGuidelineDocument, GSAP loading). Those are separate work; only reference them if the new Task A here touches the same file.
- The 2026-09-02 brand-completion flow (Tasks 7-11 of that plan). Not part of this round.
- The `elkjs` installation.
- The `react-compiler` opt-out directives on existing files.
- The Rust engine output.
- The `use-sketch-refiner` WASM worker plumbing.
- Re-keying the database. No new migrations are needed for either task here.

## Report Format

When done, reply with:

- A bullet list of every file created or modified (path + one-line summary).
- The exact output of `npx tsc --noEmit` and `npx vite build` (last 5 lines each).
- The exact output of `php artisan test` (summary line only).
- A list of new decisions appended to `DECISIONS.md`.
- Anything you deliberately did NOT do and why, with file:line references.
