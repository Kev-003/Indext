# Project Decision Log & Active Context

## Architecture & Tech Stack

- [x] Tech Stack selection: Laravel + React (Inertia.js) over Python for primary backend.
- [x] Component Tool-Calling Schema: Defined in `.kilocode/rules/memory-bank/systemPatterns.md`
- [x] AI Layer: Replaced hand-rolled `LLMProvider` / `BrandChatStore` / `ToolRegistry` / `SystemPromptBuilder` with first-party `laravel/ai` SDK (`^0.10.3`). Agent uses `Promptable` + `RemembersConversations` traits. Tools ported to SDK `Tool` classes under `app/Ai/Tools/`. Conversation state lives in SDK tables `agent_conversations` / `agent_conversation_messages` (published via `Laravel\Ai\Migrations\AiMigration`).

## Resolved Edge Cases & Quirks

- **Workspace double-layout bug**: Workspace page was wrapped in two `AppLayout` components. Fixed by removing the redundant wrapper; layout is set via `Workspace.layout` only.
- **Dashboard prompt errors silent**: `useForm` `errors` object was not read/displayed. Fixed ? errors now shown inline below the prompt input immediately after submission.
- **Workspace navigation missing**: No link to workspace from the UI. Fixed ? dashboard brand cards link to `/{team}/workspace?brand={id}`.
- **AI endpoint 500 showed raw error page**: `use-chat-stream.ts` now intercepts `text/html` responses and converts to readable user-facing messages.
- **Brand ownership not checked in WorkspaceController**: Open security issue ? the controller does not verify that `brand.team_id` matches the authenticated team.
- **Laravel test client does not auto-consume streams**: `TestResponse` does not execute `StreamedResponse` callbacks. Any test hitting a streamed endpoint must call `$response->baseResponse->sendContent()` so the `RememberConversation` middleware persists messages. Without this, `agent_conversation_messages` stays empty in tests.

## Core Architecture & Stack Rules

- **Backend**: Laravel (PHP) handling data, authentication, brand state, and API endpoints.
- **Frontend / Generative UI**: React integrated via Inertia.js. The main page is a single prompt input that dynamically mounts React UI components based on AI orchestration responses.
- **Sketch Refinement Engine**: Deterministic geometry processing (RDP algorithm, Schneider bezier fitting, geometric snapping) executed via a Rust-to-WASM module loaded in the browser. It operates completely independently of the LLM pipeline.
- **Core Product Boundary**: The AI directs and surfaces interactive UI tools (mind-map canvas, geometric constructor, palette picker). The AI NEVER outputs finished logo marks or final assets directly.
- **Execution Modes**:
    - _Beginner Mode_: Scaffolding via constructive geometry, grid guides, and real-time sketch beautification.
    - _Experienced Mode_: Guided freeform canvas with creative direction briefs.
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
