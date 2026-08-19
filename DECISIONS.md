# Project Decision Log & Active Context

## Architecture & Tech Stack

- [x] Tech Stack selection: Laravel + React (Inertia.js) over Python for primary backend.
- [ ] NUKE Scope definition: [Details here...]

## Resolved Edge Cases & Quirks

- **Workspace double-layout bug**: Workspace page was wrapped in two `AppLayout` components. Fixed by removing the redundant wrapper; layout is set via `Workspace.layout` only.
- **Dashboard prompt errors silent**: `useForm` `errors` object was not read/displayed. Fixed — errors now shown inline below the prompt input immediately after submission.
- **Workspace navigation missing**: No link to workspace from the UI. Fixed — dashboard brand cards link to `/{team}/workspace?brand={id}`.
- **AI endpoint 500 showed raw error page**: `use-chat-stream.ts` now intercepts `text/html` responses and converts to readable user-facing messages.
- **Brand ownership not checked in WorkspaceController**: Open security issue — the controller does not verify that `brand.team_id` matches the authenticated team.


## Core Architecture & Stack Rules

- **Backend**: Laravel (PHP) handling data, authentication, brand state, and API endpoints.
- **Frontend / Generative UI**: React integrated via Inertia.js (replacing Blazor Server)[cite: 1]. The main page is a single prompt input that dynamically mounts React UI components based on AI orchestration responses[cite: 1].
- **Sketch Refinement Engine**: Deterministic geometry processing (RDP algorithm, Schneider bezier fitting, geometric snapping) executed via a Rust-to-WASM module loaded in the browser[cite: 1]. It operates completely independently of the LLM pipeline[cite: 1].
- **Core Product Boundary**: The AI directs and surfaces interactive UI tools (mind-map canvas, geometric constructor, palette picker)[cite: 1]. The AI NEVER outputs finished logo marks or final assets directly[cite: 1].
- **Execution Modes**:
    - _Beginner Mode_: Scaffolding via constructive geometry, grid guides, and real-time sketch beautification[cite: 1].
    - _Experienced Mode_: Guided freeform canvas with creative direction briefs[cite: 1].
- **State Unit**: Brands are top-level project objects containing all transcripts, keywords, vectors, guidelines, and assets[cite: 1].

## Open Architectural Decisions

- Keyword expansion mechanism: Testing Thesaurus+Rules vs. Graph Algorithm vs. Grounded AI Semantic Expansion[cite: 1].
- Component Tool-Calling Schema: Defining the JSON contract for the AI to summon specific React components dynamically[cite: 1].
