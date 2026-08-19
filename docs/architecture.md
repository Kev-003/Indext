# Architecture Overview — Indext Brand Development Platform

> Last updated: 2026-08-18

## Stack

| Layer | Technology | Notes |
|---|---|---|
| Backend | Laravel (PHP) | API routes, auth, brand/conversation state |
| Frontend | React via Inertia.js | No full SPA routing — Inertia handles page transitions |
| Styling | Tailwind CSS + shadcn/ui | Component primitives from shadcn |
| Bundler | Vite | TypeScript, React plugin |
| AI Pipeline | OpenAI-compatible SSE stream | `/api/brands/{brand}/chat/message` endpoint |
| Sketch Engine | Rust → WASM (planned) | In-browser geometry; independent of LLM pipeline |

---

## Core Constraint

> **The AI orchestrates and surfaces interactive UI tools. It NEVER generates finished logo marks or final assets directly.**

---

## Key Routes

| Route | Controller | Notes |
|---|---|---|
| `GET /{team}/dashboard` | `DashboardController` | Recent brands grid + prompt dispatch |
| `POST /{team}/brands` | `BrandController@store` | Smart prompt → find or create brand, redirect to workspace |
| `GET /{team}/workspace` | `WorkspaceController@index` | Generative workspace; `?brand=id` query param |
| `POST /api/brands/{brand}/chat/message` | `Api/ChatController` | SSE stream endpoint |

---

## Data Model (Relational)

```
Team
 └── Brand (top-level project object)
      ├── guidelines (JSONB or separate table)
      ├── Conversation (1+ per Brand)
      │    └── Message (role: user/assistant/tool)
      └── BrandAsset (deliverable files)
```

### Brand Status Flow
`consultation` → `ideation` → `refinement` → `delivered`

---

## Frontend Architecture

### Pages
- **`dashboard.tsx`** — Recent brands grid + smart prompt input. Uses Inertia `useForm` so validation errors surface inline immediately after submission.
- **`workspace/index.tsx`** — Generative chat UI. Accepts `brand`, `conversation`, `messages`, and `availableTools` props from the server.

### Key Hooks
- **`use-chat-stream.ts`** — Manages SSE fetch, incremental message state, tool-call accumulation, and error handling. Surfaces errors as readable strings (not raw HTTP errors or error pages).

### Dynamic Component System
- **`components/dynamic/renderer.tsx`** — Receives `{ id, name, props }` tuples and dynamically mounts the matching tool component.
- Tool components live under `components/tools/` (e.g., `MindMapCanvas`, `PalettePicker`, `GeometricConstructor`).

---

## AI Tool-Calling Contract

The SSE stream emits JSON lines in one of these shapes:

```jsonc
// Text delta
{ "content": "Here is a palette..." }

// Tool invocation
{ "id": "tc_abc", "name": "PalettePicker", "arguments": { "colors": ["#1a1a2e", "#e94560"] } }

// Stream complete
data: [DONE]
```

---

## Error Handling

| Location | Behaviour |
|---|---|
| Dashboard prompt | Inline error below input via Inertia `errors.prompt` |
| Workspace chat | Error string shown above the input bar; also echoed into the assistant message bubble |
| HTTP 500 from AI endpoint | Caught in `use-chat-stream.ts`; user sees a readable message, not an error page |
