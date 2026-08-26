# Project Decision Log & Active Context

## Architecture & Tech Stack

- [x] Tech Stack selection: Laravel + React (Inertia.js) over Python for primary backend.
- [x] Component Tool-Calling Schema: Defined in `.kilocode/rules/memory-bank/systemPatterns.md`
- [x] AI Layer: Replaced hand-rolled `LLMProvider` / `BrandChatStore` / `ToolRegistry` / `SystemPromptBuilder` with first-party `laravel/ai` SDK (`^0.10.3`). Agent uses `Promptable` + `RemembersConversations` traits. Tools ported to SDK `Tool` classes under `app/Ai/Tools/`. Conversation state lives in SDK tables `agent_conversations` / `agent_conversation_messages` (published via `Laravel\Ai\Migrations\AiMigration`).
- [x] MDX Runtime Rendering: Use `@mdx-js/mdx` `evaluate()` for runtime MDX compilation (not `vite-plugin-mdx`, which requires Vite <3 and is incompatible with Vite 8). `@mdx-js/react` used only for `MDXProvider` context. Runtime compilation adds ~800KB to bundle but enables the AI to emit React components inline in message text. Components registered at runtime via `registerMessageComponent()` in `message-content.tsx`. Fallback to `react-markdown` when no JSX detected or evaluation fails.
- [x] Graph Visualization: Use `elkjs` (^0.11.1) for automatic graph layout (Sugiyama algorithm) in `MindMapCanvas`. Vite configured to alias `elkjs/lib/main.js` to `elkjs/lib/elk.bundled.js` for browser compatibility. `web-worker` shim provided at `resources/js/shims/web-worker.ts` since elkjs's bundled worker path references Node's Web Worker polyfill.

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
- **Gemini HTTP 400 at `resonance_confirm` (duplicate user messages)**: Production Gemini API returned HTTP 400 during direction confirmation (`STEP_COMPLETE` for `resonance_confirm`). Root cause: ChatController stored user messages in `agent_conversation_messages` lines 130-146 reuse case, 159-175 new case), AND the Laravel AI `RememberConversation` middleware also stored them via `storeUserMessage()`. This created duplicate consecutive user messages in the conversation history. Gemini requires strict role alternation (no two consecutive user messages) and `functionResponse` messages must immediately follow `functionCall` messages. The duplicates broke the message sequence, causing the 400. Additionally, on the first request, ChatController called `$agent->forUser()` (setting `conversationId = null`) while having already created `agent_conversations` record X ? the RememberConversation middleware then created a separate record Y, fragmenting the conversation so AI responses were stored in Y while Conversation->agent_conversation_id pointed to X. **Fix**: (1) Removed all agent_conversation_messages insert calls from ChatController's DB transaction ? the RememberConversation middleware handles user message persistence, and StreamsText::stream() adds the current prompt in-memory via `$messages[] = new UserMessage()`. (2) Changed the agent continuation condition from `if ($conversationId && $conversation->agent_conversation_id)` to `if ($conversation->agent_conversation_id)` so `$agent->continue(X, $user)` is called on the first request, ensuring RememberConversation stores in X (not Y). (3) Added `RequestException` checking in the error catch block to log `api_status` and `api_response_body` for future Gemini error debugging.

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
¦
?
[ Redis Rate Limiter ] --? (Exceeded?) --? [ Block Request ]
¦
?
[ Semantic Filter / Guardrail ] --? (Irrelevant?) --? [ Return Standard 400 Error ]
¦
?
[ Your Primary SaaS LLM ] (Gemini/DeepSeek)
