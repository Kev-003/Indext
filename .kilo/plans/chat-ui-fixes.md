# Plan: Chat UI Fixes — Message Ordering, Rendering, Loading States, Emoji Removal

## Status: Implementation Complete ✓

---

## Background & Context

The workspace chat (`resources/js/pages/workspace/index.tsx`) renders messages from the `useChatStream` hook (`resources/js/hooks/use-chat-stream.ts`). Messages come from two sources:
1. **Initial messages** — loaded from server via Inertia `messages` prop, backed by `agent_conversation_messages` table (persisted by laravel/ai SDK's `RememberConversation` trait via `SanitizedConversationStore`).
2. **Streaming messages** — appended client-side during SSE streaming.

The backend stores **raw prompts** in `agent_conversation_messages.content` (see `SanitizedConversationStore::storeUserMessage()` at App/Ai/Storage/SanitizedConversationStore.php:53). The frontend `use-chat-stream.ts:63-88` has a `displayContent` function that prettifies `STEP_COMPLETE`/`INTERVIEW_COMPLETE` prefixes into human-readable text (using ✓ and ↺ emoji), but this transformation is ONLY applied in `sendMessage()`, not when loading initial messages.

---

## Issue Analysis

### Issue 1: User chats get shifted down (chronological order)

**Root cause** (two contributing factors):

- **Factor A — `displayContent` mismatch in auto-trigger dedup**: When the auto-trigger fires and sends `lastMessage.content` to `sendMessage`, the content is the raw JSON from the server (e.g., `INTERVIEW_COMPLETE {json}`). `sendMessage` re-applies `displayContent`, producing a different string (e.g., `✓ Interview submitted`). The dedup check at `use-chat-stream.ts:99` compares `last.content === displayContent` — since raw JSON ≠ prettified text, the check fails, and a NEW user message is appended after the previous turn's assistant response (including tool call results).

- **Factor B — Client-side `hasAssistantReply` check missing `tool_calls`**: At `workspace/index.tsx:227-230`:
  ```js
  const hasAssistantReply = messages.some(
      (m) => m.role === 'assistant' && m.content?.trim(),
  );
  ```
  This omits `tool_calls`. If an assistant message has `tool_calls` but no text content, the client thinks there's "no assistant reply" and may fire the auto-trigger when the server already set `autoTrigger = false` (server correctly checks `tool_calls` at `WorkspaceController.php:75`).

**Fix**:
1. Export `formatUserPrompt()` from `use-chat-stream.ts` (extracted from inline `displayContent`), strip emoji (use text labels per Issue 6)
2. In the `Workspace` component, apply `formatUserPrompt()` to all initial user messages when loading from the server — this ensures the client-side content matches what `sendMessage` produces, so the dedup check works
3. Fix the client-side `hasAssistantReply` check to include `tool_calls`:
   ```js
   const hasAssistantReply = messages.some(
       (m) => m.role === 'assistant' && (m.content?.trim() || (m.tool_calls?.length ?? 0) > 0),
   );
   ```

### Issue 2: User response chats revert to raw JSON when returning to chat

**Root cause**: Same as Issue 1, Factor A. The server stores raw prompts (e.g., `INTERVIEW_COMPLETE {"step":"interview_complete",...}`). On page reload, `WorkspaceController.php:43` returns `'content' => $msg->content` (the raw value). The client renders this raw JSON because `formatUserPrompt` was never applied to initial messages.

**Fix**: Same as Issue 1 — apply `formatUserPrompt()` to initial messages in the `Workspace` component.

### Issue 3: No clear chat bubbles/boxes for AI and user messages

**Current state** (`workspace/index.tsx:536-620`):
- User: `flex justify-end` > `max-w-[80%] rounded-[14px] bg-nm-cyan px-4 py-3 text-white`
- Assistant content: `flex justify-start` > `max-w-[80%] rounded-[14px] bg-nm-paper px-4 py-3 text-nm-ink dark:bg-nm-paper-dark`
- Assistant tool_calls: full-width `<div className="w-full">` wrapping `SpecimenSheet` components

The bubbles lack:
- Visual borders or shadows for depth
- Consistent max-width containers
- Clear separation between conversation turns
- Distinction between text content and tool surfaces

**Fix**: Create a `ChatMessage` component (`resources/js/components/chat/chat-message.tsx`) that:
- Wraps user and assistant messages in clearly styled bubbles
- Uses border + shadow for depth on the Nomentra paper stock: `border border-nm-grid shadow-[0_1px_3px_rgba(0,0,0,0.04)]`
- Maintains right-alignment for user, left-alignment for assistant
- Wraps tool_call rendering within the assistant message container (so tool surfaces are visually connected to the assistant's turn)
- Ensures proper gap between message groups (e.g., `mb-4` on each message)

### Issue 4: Skeleton loading while chats are fetched

**Current state**: When the workspace page loads, `messages` is empty until Inertia provides `initialMessages`. There's no loading indicator — users see the welcome screen or empty state even when messages are being loaded from the server.

**Fix**:
1. Add `isInitialLoading` state to `use-chat-stream.ts` `ChatState` interface (default `true`, set to `false` after initial messages are loaded)
2. Create a `ChatMessageSkeleton` component (`resources/js/components/chat/chat-message-skeleton.tsx`) using the existing `Skeleton` component from `@/components/ui/skeleton`
3. In the Workspace component, when `isInitialLoading` is true, render 3-4 skeleton placeholders instead of the message list

### Issue 5: Loading animation for AI responses

**Current state** (`workspace/index.tsx:620-637`): The bouncing dots only show when:
```js
isStreaming && messages[messages.length - 1]?.role !== 'assistant'
```
But `sendMessage` appends the assistant message BEFORE the stream starts (line 114 of `use-chat-stream.ts`). So during streaming, the last message IS always 'assistant', and the bouncing dots never appear.

**Fix**: Change the condition to show the loading indicator when `isStreaming` is true AND the last assistant message has no content/tool_calls yet:
```js
const lastMessage = messages[messages.length - 1];
const showLoadingIndicator = isStreaming &&
    (!lastMessage || lastMessage.role === 'user' ||
     (lastMessage.role === 'assistant' && !lastMessage.content?.trim() && !(lastMessage.tool_calls?.length ?? 0) > 0));
```

### Issue 6: Remove all emoji, replace with Phosphor icons

**User decision**: Install `@phosphor-icons/react` (confirmed by user).

**Emoji locations and replacement plan**:

| File | Line(s) | Emoji | Replacement |
|------|---------|-------|-------------|
| `use-chat-stream.ts` | 71, 77, 79, 81, 85 | ✓ | Text-only (plain text label) |
| `use-chat-stream.ts` | 74 | ↺ | Text-only (plain text label) |
| `review.tsx` | 12 | ✓ | `<Check size={14} />` |
| `review.tsx` | 254 | ✓ | `<Check size={14} />` |
| `review.tsx` | 109, 206 | ★ | `<Star size={16} />` |
| `concept-mapping.tsx` | 213 | ✓ | `<Check size={14} />` |
| `concept-mapping.tsx` | 142 | 🎯 | `<Target size={24} />` |
| `composition.tsx` | 272 | ✕ | `<X size={14} />` |
| `guidelines.tsx` | 164 | ✓/✗ | `<Check size={14} />` / `<X size={14} />` |
| `specimen-sheet.tsx` | 77 | `&#10003;` (✓) | `<Check size={12} />` |

**Note on string-based emoji in `use-chat-stream.ts`**: The `formatUserPrompt` function returns strings stored as message `content`, rendered by `MessageContent` as Markdown. Markdown cannot render React components. **Decision**: Use plain text labels (e.g., `"Selected concept: ${name}"` instead of `"✓ Selected concept: ${name}"`).

### Issue 7: Completed state of wizards not persisting

**Root cause**: The `workspace/index.tsx` rendering at lines 586-587 marks a tool call as completed via:
```js
const toolResult = message.tool_results?.find(tr => tr.tool_call_id === toolCall.id);
const isCompleted = !!toolResult;
```
But `tool_results` are **always empty** because the AI's tools are UI components (not server-side function executions). The laravel/ai SDK's `storeAssistantMessage()` stores `$response->toolResults->values()` (SanitizedConversationStore.php:91), which is empty for UI-component tools. So `isCompleted` is always `false`, and wizard components never render their completed state on page reload.

The `Brand` model DOES persist step completion data:
- `ChatController.php:155-180` stores `STEP_COMPLETE` JSON in `brand.discovery[stepName]` and `INTERVIEW_COMPLETE` JSON in `brand.strategy.interview`
- `WorkspaceController.php:97` passes `discovery` in the `brand` prop

The data exists but is never checked when rendering.

**Fix**:
1. Add a `COMPONENT_STEP_MAP` to `registry.ts` mapping each component name to its step key
2. In `workspace/index.tsx`, replace the `isCompleted`/`toolResult` logic — check `brand.discovery[stepKey]` (or `brand.strategy.interview` for `ClientInterviewWizard`) instead
3. **Fix `mindmap_confirm` action**: `placeholder-tools.tsx:405` sends `mindmap_confirm` without a `step` field. Add `step: 'mindmap_confirm'` to the payload so `ChatController` stores it in `brand.discovery`.

**Component-to-step mapping**:
```
ClientInterviewWizard → 'interview' (check brand.strategy)
MindMapCanvas → 'mindmap_confirm' (check brand.discovery)
KeywordMindMap → 'keyword_mindmap'
SemanticObjectMapper → 'semantic_mapper'
DesignConceptExplorer → 'concept_explorer'
VisualPillarExtractor → 'visual_pillars'
BrandStrategyOverview → 'brand_strategy'
TypographyPairingSelector → 'typography_pairing'
ColorHierarchyBuilder → 'color_hierarchy'
LogoCompositionBuilder → 'logo_composition'
DirectionComparator → 'direction_compare'
FeedbackCollector → 'feedback_collect'
ResonanceConfirmator → 'resonance_confirm'
MoodboardComposer → 'moodboard'
DevHandoffPackage → 'dev_handoff'
```

---

## Implementation Tasks

### Phase 1: Fix message ordering and raw JSON display
1. `resources/js/hooks/use-chat-stream.ts`: Export `formatUserPrompt()` function (renamed from inline `displayContent`), strip emoji (use text labels per Issue 6)
2. `resources/js/pages/workspace/index.tsx`: Import `formatUserPrompt`, apply it to initial `messages` prop when loading
3. `resources/js/pages/workspace/index.tsx`: Fix client-side `hasAssistantReply` check to include `tool_calls`

### Phase 2: Create ChatMessage component
4. `resources/js/components/chat/chat-message.tsx`: New component wrapping user/assistant bubbles with clear styling, borders, shadows
5. `resources/js/components/chat/chat-message-skeleton.tsx`: Skeleton placeholder using existing `Skeleton`
6. `resources/js/pages/workspace/index.tsx`: Replace inline bubble rendering with `ChatMessage` component; show tool_calls inside assistant message container

### Phase 3: Loading states
7. `resources/js/hooks/use-chat-stream.ts`: Add `isInitialLoading` to `ChatState` interface
8. `resources/js/pages/workspace/index.tsx`: Use `isInitialLoading` to show skeleton placeholders

### Phase 4: Loading animation for streaming
9. `resources/js/pages/workspace/index.tsx`: Fix the `isStreaming` loading indicator condition

### Phase 5: Remove emoji, install & use Phosphor icons
10. `package.json` + `npm install`: Add `@phosphor-icons/react` dependency
11. `resources/js/components/dynamic/tools/review.tsx`: Replace ✓ (lines 12, 254), ★ (lines 109, 206) with `<Check />` and `<Star />`
12. `resources/js/components/dynamic/tools/concept-mapping.tsx`: Replace ✓ (line 213), 🎯 (line 142) with `<Check />` and `<Target />`
13. `resources/js/components/dynamic/tools/composition.tsx`: Replace ✕ (line 272) with `<X />`
14. `resources/js/components/dynamic/tools/guidelines.tsx`: Replace ✓/✗ (line 164) with `<Check />`/`<X />`
15. `resources/js/components/specimen-sheet.tsx`: Replace `&#10003;` (line 77) with `<Check size={12} />`

### Phase 6: Wizard completion state persistence
16. `resources/js/components/dynamic/tools/placeholder-tools.tsx`: Add `step: 'mindmap_confirm'` to the `mindmap_confirm` action payload (line 405)
17. `resources/js/components/dynamic/registry.ts`: Add `COMPONENT_STEP_MAP` export mapping component names to step keys
18. `resources/js/pages/workspace/index.tsx`: Replace `isCompleted` logic — check `brand.discovery[stepKey]` instead of `tool_results`

---

## Open Questions

1. **ChatMessage tool_call scope**: Should the `ChatMessage` component wrap tool_call rendering inside the assistant message container (making it visually clear that the tool belongs to that assistant turn), or keep tool_calls as full-width standalone panels below the assistant message? **Recommendation**: Wrap inside the assistant container — it creates clearer visual grouping.

---

## Affected Files (Frontend-only)

| File | Changes |
|------|---------|
| `resources/js/hooks/use-chat-stream.ts` | Export `formatUserPrompt`, add `isInitialLoading` to `ChatState`, strip emoji from formatUserPrompt |
| `resources/js/pages/workspace/index.tsx` | Apply `formatUserPrompt` to initial messages, fix `hasAssistantReply` check, fix streaming loading indicator, use `ChatMessage` component, add skeleton loading, replace `isCompleted` logic with `brand.discovery` check |
| `resources/js/components/chat/chat-message.tsx` | NEW — reusable chat bubble wrapper |
| `resources/js/components/chat/chat-message-skeleton.tsx` | NEW — skeleton placeholder |
| `resources/js/components/specimen-sheet.tsx` | Replace `&#10003;` with `<Check />` |
| `resources/js/components/dynamic/tools/review.tsx` | Replace ✓, ★ with Phosphor icons |
| `resources/js/components/dynamic/tools/concept-mapping.tsx` | Replace ✓, 🎯 with Phosphor icons |
| `resources/js/components/dynamic/tools/composition.tsx` | Replace ✕ with Phosphor icon |
| `resources/js/components/dynamic/tools/guidelines.tsx` | Replace ✓/✗ with Phosphor icons |
| `resources/js/components/dynamic/tools/placeholder-tools.tsx` | Add `step` field to `mindmap_confirm` action |
| `resources/js/components/dynamic/registry.ts` | Add `COMPONENT_STEP_MAP` export |
| `package.json` | Add `@phosphor-icons/react` dependency |

## What NOT to Touch
- Backend PHP files (ChatController, WorkspaceController, BrandController, SanitizedConversationStore) — frontend-only fixes
- The elkjs Vite plugin setup (already fixed, do not modify)
- The Nomentra color tokens in `app.css` (already implemented)
- Database schema or migrations

## Validation Plan
1. `npx vite build` — production build succeeds
2. `npx tsc --noEmit` — TypeScript compiles (no new errors beyond pre-existing `composition.tsx:201`)
3. `npm run lint` — no ESLint errors
4. Manual verification:
   - Navigate away and back: user messages show prettified text (not raw JSON)
   - Auto-trigger does not create duplicate messages
   - Chat bubbles have clear visual containers (borders, shadows)
   - Skeleton loading shows while initial messages load
   - Streaming AI response shows loading animation (spinner or bouncing dots)
   - No emoji characters anywhere in the UI
   - Phosphor icons render correctly for check, star, target, X
   - Wizard completed state persists after navigation away and back

## Related Decisions (from DECISIONS.md)
- **"Step Completion Protocol"**: `INTERVIEW_COMPLETE` prefix sends JSON interview data to the AI. `STEP_COMPLETE` prefix sends JSON confirming a completed step. BrandingAgent instructions parse both prefixes.
- **"onAction injection into MDX-rendered components"**: `MessageContent` accepts `onAction` prop, injected into MDX components via `useMDXComponents` callback.
- **"Shared onAction handler in workspace"**: The workspace has a single `handleAction` callback passed to both `MessageContent` and `DynamicRenderer`.