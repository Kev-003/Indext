# Project Decision Log & Active Context

## Architecture & Tech Stack

- [x] Tech Stack selection: Laravel + React (Inertia.js) over Python for primary backend.
- [x] Component Tool-Calling Schema: Defined in `.kilocode/rules/memory-bank/systemPatterns.md`
- [x] AI Layer: Replaced hand-rolled `LLMProvider` / `BrandChatStore` / `ToolRegistry` / `SystemPromptBuilder` with first-party `laravel/ai` SDK (`^0.10.3`). Agent uses `Promptable` + `RemembersConversations` traits. Tools ported to SDK `Tool` classes under `app/Ai/Tools/`. Conversation state lives in SDK tables `agent_conversations` / `agent_conversation_messages` (published via `Laravel\Ai\Migrations\AiMigration`).
- [x] MDX Runtime Rendering: Use `@mdx-js/mdx` `evaluate()` for runtime MDX compilation (not `vite-plugin-mdx`, which requires Vite <3 and is incompatible with Vite 8). `@mdx-js/react` used only for `MDXProvider` context. Runtime compilation adds ~800KB to bundle but enables the AI to emit React components inline in message text. Components registered at runtime via `registerMessageComponent()` in `message-content.tsx`. Fallback to `react-markdown` when no JSX detected or evaluation fails.
- [x] Graph Visualization: Use `elkjs` (^0.11.1) for automatic graph layout (Sugiyama algorithm) in `MindMapCanvas`. Vite configured to alias `elkjs/lib/main.js` to `elkjs/lib/elk.bundled.js` for browser compatibility. `web-worker` shim provided at `resources/js/shims/web-worker.ts` since elkjs's bundled worker path references Node's Web Worker polyfill.
- [x] Sketch Refinement Engine: Rust crate at `rust/sketch-engine/` compiled to WASM via `wasm-pack build --target web`. Output goes to `pkg/` (gitignored). Vite alias `@wasm/*` resolves to pkg. Worker isolation provided via `webWorkerShim()` plugin. Pipeline: RDP simplification (epsilon 2.0) -> angle-based corner detection (30� threshold) -> Schneider cubic Bezier fitting -> geometric primitive snapping (circle/line/rectangle). Output: SVG path d-attribute + structured control points for canvas overlay rendering. All 33 Rust unit tests pass.
- [x] WASM Build Pipeline: Added `build:wasm`, `build:wasm:dev`, `build:prod`, and `dev` (concurrent) scripts to `package.json`. Vite config updated with `@wasm` alias and `assetsInclude: ['**/*.wasm']`. Rust toolchain: stable-x86_64-pc-windows-msvc with wasm32-unknown-unknown target. `msvcrt.lib` resolved from VS 2022 installation for native build scripts.

## Resolved Edge Cases & Quirks

- **Workspace double-layout bug**: Workspace page was wrapped in two `AppLayout` components. Fixed by removing the redundant wrapper; layout is set via `Workspace.layout` only.
- **Dashboard prompt errors silent**: `useForm` `errors` object was not read/displayed. Fixed ? errors now shown inline below the prompt input immediately after submission.
- **Workspace navigation missing**: No link to workspace from the UI. Fixed ? dashboard brand cards link to `/{team}/workspace?brand={id}`.
- **AI endpoint 500 showed raw error page**: `use-chat-stream.ts` now intercepts `text/html` responses and converts to readable user-facing messages.
- **Brand ownership not checked in WorkspaceController**: Open security issue ? the controller does not verify that `brand.team_id` matches the authenticated team.
- **Laravel test client does not auto-consume streams**: `TestResponse` does not execute `StreamedResponse` callbacks. Any test hitting a streamed endpoint must call `$response->baseResponse->sendContent()` so the `RememberConversation` middleware persists messages. Without this, `agent_conversation_messages` stays empty in tests.
- **SSE streaming display issues**: ChatController SSE stream added `ob_implicit_flush(true)` alongside existing `set_time_limit(300)` to ensure PHP buffers are flushed immediately, preventing incomplete assistant message rendering.
- **Step completion flow**: Step 2 components (KeywordMindMap, SemanticObjectMapper, DesignConceptExplorer) now emit `complete_step` / `mindmap_confirm` actions via `onAction`, which the workspace handles by sending `STEP_COMPLETE` prefixed messages to the AI. BrandingAgent instructions include a `STEP_COMPLETE` handling section that directs the agent to acknowledge the completed step and proceed to the next tool.
- **Gemini fragmented tool-call streaming**: Gemini's API streams function calls across multiple SSE chunks, each emitted as a separate `ToolCallEvent` with a newly generated UUID (because `mapToolCalls()` in `vendor/laravel/ai` generates `Str::uuid7()` when `$fc['id']` is absent). `useChatStream` previously matched by `id` only, creating duplicate component instances? the first with empty arguments and only the last with complete data. Fixed by adding a name-based fallback merge: when no `id` match is found, the hook matches by `name` and spreads new arguments into the existing entry.
- **MDX component registration for all wizard components**: Only `MindMapCanvas` and `PalettePicker` were registered in `MDX_COMPONENTS` via `PreloadComponents` in `app.tsx`, causing all other 17 wizard components (ColorHierarchyBuilder, MoodboardComposer, DesignConceptExplorer, etc.) to render as invisible custom HTML elements when the AI emitted them as inline JSX in message text. Fixed by registering all 19 components from `ComponentRegistry` (registry.ts) at startup via a loop, including the `MindMap` ?? `MindMapCanvas` alias.
- **onAction injection into MDX-rendered components**: `MessageContent` now accepts an optional `onAction` prop. The `useMDXComponents` callback in `evaluate()` wraps each registered component with `React.createElement(comp, { ...props, onAction })`, so MDX-embedded components can trigger `complete_step` / `submit_interview` actions back to the AI? matching the behavior of `DynamicRenderer`-rendered tool-call components.
- **Shared onAction handler in workspace**: The workspace extracted the inline `onAction` handler (previously duplicated in each `DynamicRenderer` instance) into a single `useCallback`-wrapped `handleAction`. This is passed to both `MessageContent` and `DynamicRenderer`, ensuring consistent step-completion behavior across both MDX-inline and tool-call rendering paths.
- **MoodboardComposer UX fixes**: `brandId` now properly destructured from props (was previously undefined in `onAction` calls). Asset cards constrained with `max-w-[100px]` and compact `p-2` padding. Dark mode text contrast fixed on all `<select>` elements (`dark:text-gray-200 dark:border-gray-600 dark:bg-gray-900`). Gray-400 fallback (`#9ca3af`) added for missing `color.hex` values. Empty palette placeholder message added when `suggestedPalette` is empty. Unused `exportFormats` replaced with `...rest` pattern.
- **MoodboardComposer SSR crash (`useEffect` not defined)**: Production error `useEffect is not defined` at `moodboard.tsx:31` during Inertia server-side rendering. Root cause: line 1 imported only `{ useState }` but the component used `useEffect` in two effect hooks. SSR has no React hooks in scope; when SSR fails, client-side fallback also crashed because the minified bundle referenced the unimported `useEffect` identifier. Fix: added `useEffect` to the import at line 1: `import React, { useState, useEffect } from 'react'`. The other 5 tool components were verified: `composition.tsx` uses `React.useEffect` (namespace access, safe), `placeholder-tools.tsx` correctly imports `useEffect`, and `discovery.tsx`, `review.tsx`, `guidelines.tsx`, `concept-mapping.tsx` only import `{ useState }` with no missing hooks.
- **ChatStreamingTest semantic filter re-mock**: `test_regular_prompt_after_discovery_is_filtered` asserted 400 but got 200 because calling `$this->app->forgetInstance()` + `$this->mock()` mid-test didn't reliably re-bind the `SemanticIntentFilter` singleton for already-instantiated controller instances within the test process. Fix: replaced the two-phase re-mock with a single `andReturnUsing()` closure that returns `false` for off-topic prompts containing "garden" and `true` otherwise. Set up before the conversation loop, works reliably for all requests.
- **ChatStreamingTest rate-limit retry fake**: `test_retry_after_rate_limit_sends_new_request` failed because `BrandingAgent::fake()` with an array of Closures doesn't increment `currentResponseIndex` when a Closure throws ? subsequent calls re-invoke the same throwing Closure, so the retry never produces a successful response. Fix: replaced array-based fake with a single stateful Closure using `&$attempt` reference counter: throws `RateLimitedException` on `$attempt === 1`, returns `'Retry succeeded'` on subsequent calls. Also changed conversation ID retrieval: after a rate-limit error, no `done` SSE event is emitted (the `catch` block only emits `error`), so `extractConversationId()` returns null. Instead, the `Conversation` model is queried directly via `Conversation::where('brand_id', $brand->id)->first()`.
- **WASM Web Worker cross-origin construction (Vite dev server)**: Vite dev server runs on `http://127.0.0.1:5173` while Laravel serves the app on `http://127.0.0.1:8000`. The `Worker()` spec requires its top-level script URL to be same-origin (or `blob:`/`data:`) ? no CORS opt-in exists for the worker's own script. All `server.headers`/`server.cors` config cannot override this browser-side check. Fix: use `import SketchEngineWorkerUrl from '@/lib/sketch-engine.worker?worker&url'` to get the resolved worker URL as a string, then `fetch()` it (subject to CORS via `server.headers`), wrap in a `Blob`, create `URL.createObjectURL()` (same-origin to the page), and construct `new Worker(blobUrl, { type: 'module' })` from that. Production uses `new Worker(url)` directly since built assets share the app's origin. Also fixed `APP_URL` in `.env` from `http://localhost:8000` to `http://127.0.0.1:8000` to match the server address for `laravel-vite-plugin` CORS origin list. Also fixed a nested Promise bug in `getWorker()` where an inner `new Promise` was returned from the outer Promise's executor, disconnecting resolve/reject.
- **WASM Worker inner import URL resolution**: ... Additionally, `getWorker()`'s `onmessage` handler now also handles `msg.type === 'error'` messages so that initialization failures produce a descriptive error instead of an empty `worker.onerror` or timeout.
- **startTime error in Accept Refinement (`reportAllChanges`)**: After the WASM worker cross-origin fix, "Accept Refinement" fails with `Uncaught TypeError: Cannot read properties of undefined (reading 'startTime')` at `et.reportAllChanges`. Root cause: `handleAction()` in `resources/js/pages/workspace/index.tsx` only handled `submit_interview`, `complete_step`, and `mindmap_confirm` actions ? it did NOT handle `geometric_refine` or `geometric_accept` actions emitted by `GeometricConstructor` in `placeholder-tools.tsx`, so the React compiler runtime's `reportAllChanges` callback (part of its internal timer/scheduler object graph) received undefined state and threw. Fix: added an `else if` branch in `handleAction()` to handle `geometric_refine` and `geometric_accept` actions, routing them through the same `sendMessage(STEP_COMPLETE ...)` path as `complete_step`.
- **React Compiler instrumentation in sketch engine**: Added `// @no-react-compiler` directive to `resources/js/hooks/use-sketch-refiner.ts` and `resources/js/components/dynamic/tools/placeholder-tools.tsx` to prevent the React compiler from inserting timer/scheduler instrumentation (`reportAllChanges`, `startTime`) into hook code that manages manual Web Worker lifecycle and DOM mutations via `GeometricConstructor`. The React compiler's `reportAllChanges` is triggered by component state changes and expects scheduler timer objects; applying it to imperative worker code causes the undefined `startTime` TypeError. Opting out of compilation for these specific modules preserves the original runtime semantics.

## Workspace Bug Fixes (2026-09-01)

- **Unique public slugs on `brands` and `conversations` (decoupling from auto-increment IDs)**: Soft-deleted rows do not get reused by the auto-increment counter (sequence is monotonic by design), so new brand/conversation IDs would visibly skip forward after deletions. Fix: added a unique `slug` column to both tables (migration `2026_09_01_000000_add_slug_to_brands_and_conversations.php`), backfilled existing rows with `Str::slug($name) . '-' . Str::random(6)`, and set `getRouteKeyName() => 'slug'` on both `Brand` and `Conversation` models. Models now auto-generate a unique slug on `creating` (collision retry up to 10 attempts). `Brand::resolveRouteBinding()` accepts either a slug OR a numeric ID for backward compatibility with existing route patterns (`/api/brands/{brand}`). Frontend `Link` hrefs in `workspace/index.tsx` and `dashboard.tsx` now use `brand.slug ?? brand.id` so internal ID gaps are invisible to users.
- **Deterministic message ordering on re-navigation**: `WorkspaceController::index()` previously ordered messages with `orderByDesc('created_at')->limit(50)->reverse()`. When two records shared the same second (user prompt + assistant reply), the order was non-deterministic. Fix: changed to `orderBy('created_at')->orderBy('id')` ascending, removed the `limit(50)->reverse()` pattern. The `agent_conversation_messages.id` is UUIDv7 (time-ordered) so it serves as a stable tie-breaker.
- **Interview wizard completion reverting after re-navigation**: Three layered bugs. (a) `WorkspaceController` never sent `brand.strategy` to the Inertia page, but the interview is persisted to `brand.strategy.interview`. (b) `chat-message.tsx` looked up `COMPONENT_STEP_MAP[toolName]` with the raw AI name (`invoke_client_interview`) but the map is keyed by PascalCase component names. (c) `chat-message.tsx` matched `tr.tool_call_id === toolCall.id` but the Laravel AI `ToolResult::toArray()` serializes the back-reference as `result_id`. Fix: added `'strategy' => $brand->strategy ?? []` to the brand payload in `WorkspaceController`; imported `resolveComponentName` from `renderer.tsx` and use the resolved name for the `COMPONENT_STEP_MAP` lookup; updated the `toolResult` lookup to match on `result_id ?? tool_call_id`; the `Message` interface in `use-chat-stream.ts` now accepts both `result_id` and `tool_call_id`. `WorkspaceController` also normalizes `result_id` ? `tool_call_id` when serializing `tool_results` to the page so older client code (and the tool's own `data.result_id` field) still resolves.
- **`TypographyPairingSelector` dead-end fix**: The "Save Pairing" button was only revealed after a card click, and the empty-state had no actionable control at all. Fix: added a "Use top recommendation" outline button and a "Save Top Recommendation" / "Save Pairing" primary button that is always rendered when at least one pair is available. Clicking either sends `complete_step` with `step: 'typography_pairing'` and the selected or top pair. Also added a `normalizePair()` helper that accepts `heading|headingFont|display|heading_name` and `body|bodyFont|subhead|body_name` so the AI's payload-key variation does not blank out the cards.
- **`TypographyHierarchyDoc` dead-end fix**: Previously had no `onAction` wiring and only an unwired "Export Specimen" button. Fix: added an "Accept & Continue" primary button (always visible) that sends `complete_step` with `step: 'typography_hierarchy'`, and a "Skip" outline button (visible when `pairings` is empty) that sends the same with `skipped: true`. Also added a `normalizeTypographyHierarchy()` helper that accepts the same key variants as `TypographyPairingSelector`.
- **`geometric_accept` / `geometric_refine` raw-JSON echo fix**: The payloads sent by `GeometricConstructor.handleAccept` and the refine callback in `placeholder-tools.tsx` did not include a `step` field, so `ChatController::message()` never persisted them to `brand.discovery` and the AI had no way to identify which step was completed (it fell back to echoing the raw JSON). Fix: both payloads now include `step: 'geometric_constructor'` plus an `action` field (`'accept'` or `'refine'`). `use-chat-stream.ts` `formatUserPrompt` was extended to render a meaningful label (`'Accepted geometric construction'` or `'Refining geometric construction?'`) instead of the generic `Completed: Step` fallback.

## Conversations table

- **Conversation now soft-deletes**: `App\Models\Conversation` now uses the `SoftDeletes` trait (matching the `conversations` table schema, which has had a `deleted_at` column since the `2026_08_18_150004_create_conversations_table.php` migration). The trait was previously unused, so `BrandController::destroy()` was calling `$brand->conversations()->delete()` which performed hard deletes on the conversations table while soft-deleting the brand itself. This created a state where a soft-deleted brand could be restored with no associated conversation records. Now all conversation removals from brand deletion go through the same soft-delete path. Two `BrandDeletionTest` cases were updated to use `assertSoftDeleted` for the conversation record instead of `assertDatabaseMissing`.


## Core Architecture & Stack Rules

- **Backend**: Laravel (PHP) handling data, authentication, brand state, and API endpoints.
- **Frontend / Generative UI**: React integrated via Inertia.js. The main page is a single prompt input that dynamically mounts React UI components based on AI orchestration responses.
- **Sketch Refinement Engine**: Deterministic geometry processing (RDP algorithm, Schneider bezier fitting, geometric snapping) executed via a Rust-to-WASM module loaded in the browser. It operates completely independently of the LLM pipeline.
- **Core Product Boundary**: The AI directs and surfaces interactive UI tools (mind-map canvas, geometric constructor, palette picker). The AI NEVER outputs finished logo marks or final assets directly.
- **Execution Modes**:
   - **Beginner Mode**: Scaffolding via constructive geometry, grid guides, and real-time sketch beautification.
   - **Experienced Mode**: Guided freeform canvas with creative direction briefs.
- **Step Completion Protocol**: `INTERVIEW_COMPLETE` prefix sends JSON interview data to the AI. `STEP_COMPLETE` prefix sends JSON confirming a completed step (e.g., keywords confirmed, concept selected). BrandingAgent instructions parse both prefixes and proceed to the appropriate next tool.
- **State Unit**: Brands are top-level project objects containing all transcripts, keywords, vectors, guidelines, and assets.
- **AI Provider**: Gemini (`gemini-3.5-flash`) is primary. `BrandingAgent` defaults to `gemini` provider/model via `config('ai.default')` / `config('ai.providers.gemini.model')`.

## Open Architectural Decisions

- Keyword expansion mechanism: Testing Thesaurus+Rules vs. Graph Algorithm vs. Grounded AI Semantic Expansion.
- Final deliverables schema: Defined in `docs/architecture.md` ? Consultation Notes, Logo System, Color System, Design Language & Assets, Typography System, Future Plans & Governance.

## Component Library Registry (Authoritative)

See `.kilocode/rules/memory-bank/systemPatterns.md` for the full specification.

### Discovery & Strategy

- `ClientInterviewWizard` -> `Brand.strategy.mission`, `Brand.discovery.audience_profile`, `Brand.discovery.tone_attributes`
- `VisualPillarExtractor` -> `Brand.strategy.visual_pillars[]`
- `BrandStrategyOverview` -> `Brand.strategy.*`, `Brand.discovery.*`

### Concept Mapping & Discovery

- `KeywordMindMap` -> `Brand.discovery.keyword_map`, `Brand.discovery.mind_map.nodes[]`
- `SemanticObjectMapper` -> `Brand.discovery.semantic_mappings[]`
- `DesignConceptExplorer` -> `Brand.discovery.design_concepts[]`, `Brand.discovery.shortlisted_direction_ids[]`

### Constructive Design & Composition

- `GeometricConstructor` -> `BrandAsset` (logo_icon), `Brand.discovery.geometric_preferences`
- `TypographyPairingSelector` -> `Brand.strategy.typography_pairing`, `Brand.discovery.typography_preferences`
- `ColorHierarchyBuilder` -> `Brand.strategy.color_system`, `Brand.discovery.color_preferences`
- `LogoCompositionBuilder` -> `BrandAsset` (logo_lockup), `BrandGuideline.logo_guidelines`

### Review & Narrowing

- `DirectionComparator` -> `Brand.discovery.direction_feedback`, `Brand.discovery.selected_direction_id`
- `FeedbackCollector` -> `Brand.discovery.feedback_entries[]`, `Brand.discovery.iteration_count`
- `ResonanceConfirmator` -> `Brand.status` -> `delivered`, `Brand.discovery.locked_direction_id`

### Guidelines & Handoff

- `BrandGuidelineDocument` -> `BrandGuideline` record, `Brand.status = delivered`
- `LogoUsageGuide` -> `BrandGuideline.logo_guidelines`, `BrandGuideline.asset_guidelines`
- `ColorSystemDocument` -> `BrandGuideline.color_guidelines`
- `AssetPatternLibrary` -> `BrandAsset` (pattern/texture), `BrandGuideline.asset_guidelines`
- `TypographyHierarchyDoc` -> `BrandGuideline.typography_guidelines`
- `DevHandoffPackage` -> `Brand.status = delivered`, `BrandGuideline.future_plans`

## Core Architecture to Add to Stack

- Redis - for rate-limiting the prompting and caching DB calls and asset retrievals
- Semantic Routing and Guardrails - to avoid stray prompts
- Structured input formats and input sanitization
- Cloudflare R2; for its generous free tier and API - for storing final assets, draft assets, and moodboard uploads; make sure to use signed URLs, signed by teams so entire team can still be accessed
- For moodboard: 1. Use presigned or signed URLs, 2. Strict content length constraints, 3. Cloudflare CDN
- Ability for the AI to give signed, one time download URLs for assets the user asks for in the prompt, suppose assets and complete; still scoped to that brand only (TENANCY)

[ User Prompt ]
�
?
[ Redis Rate Limiter ] --? (Exceeded?) --? [ Block Request ]
�
?
[ Semantic Filter / Guardrail ] --? (Irrelevant?) --? [ Return Standard 400 Error ]
�
?
[ Your Primary SaaS LLM ] (Gemini/DeepSeek)

## Brand Completion Flow (2026-09-02)

- **Persistent Brand Asset Materialization**: Geometric constructor marks accepted by users via STEP_COMPLETE (or geometric_accept) are now committed to the database as BrandAsset rows (	ype='logo_icon') with auto-incrementing version numbers, approved status, and full SVG/primitives payload using AssetCommitter.
- **Deterministic Step-Completion & Geometric Discovery Key**: rand.discovery.geometric_constructor is always recorded upon refinement or acceptance, providing a guaranteed progress checkpoint so the AI agent advances deterministically without looping or re-rendering completed tools.
- **Concept Skeleton Guidance Palette**: GeometricConstructor now incorporates a curated concept library (SHAPE_CONCEPTS across 12 archetypes) with SVG previews, ghost guide projection onto the canvas, and one-click direct WASM refinement (Use Concept).
- **Brand Finalization & Published Guidelines**: Added InvokeBrandFinalization tool and POST /api/brands/{brand}/finalize endpoint to aggregate discovery, strategy, logo vector mark, and color/typography rules into a published BrandGuideline record (Brand.status = delivered).
- **Brand Complete Banner & Export Terminal**: Workspace displays a delivery status banner when a brand is finalized, and BrandGuidelineDocument renders the interactive full guideline with live vector mark rendering and JSON brand kit export.

## Wizard Initial State Hardening (2026-09-02)

- **Deep Content Validation for Step Completion**: Added hasContent recursive validation in chat-message.tsx before deriving isCompleted from brandDiscovery or brandStrategy.interview. Freshly mounted tools with empty objects or whitespace-only keys now correctly render in editable mode.
- **Reactive Completion State Sync**: Added useEffect in ClientInterviewWizard to sync submitted state when completed prop changes from false to true mid-stream.

## R2 Disk Migration (2026-09-02)

- **Native Laravel Filesystem Disk Convention**: Migrated Cloudflare R2 storage configuration from services.cloudflare-r2 into Laravels native config/filesystems.php r2 disk using the s3 driver.
- **Storage Facade Delegation**: Refactored CloudflareR2StorageService to configure from filesystems.disks.r2 while preserving S3 client command generation and presigned PUT request capabilities.
- **Environment Variables & Test Coverage**: Documented R2 environment variable disk mapping in .env.example and added R2DiskConfigTest.
