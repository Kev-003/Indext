# Plan: Interview Wizard — Timeout Fix, Retry, Summary Display, Tone UX

## Problem Analysis

### Root Cause: AI Producing Zero Output Tokens (from laravel.log)

Log entries on 2026-08-24 06:14:25 & 2026-08-23 07:17:15 both show:

```
Chat stream complete {
  "reason":"length",
  "prompt_tokens":3582,
  "completion_tokens":0,
  "reasoning_tokens":486
}
```

- **`maxTokens(500)`** on `BrandingAgent` gives the AI only 500 output tokens
- ~486 reasoning tokens consume the entire 500-token budget
- `completion_tokens: 0` — AI produces no actual text or tool calls
- User sees an empty response bubble — appears as "no response"

### Three Requested Improvements

1. **Resend prompt on failure** — When the AI response fails/produces empty output, offer a retry button
2. **Close wizard + show summary** — After form submission, replace the form with a summary of submitted data
3. **Better tone UX** — Expand tone options beyond 5 presets and allow custom input

## Files Currently Modified (from prior implementations)

- `app/Ai/Agents/BrandingAgent.php` — Has `#[MaxTokens(500)]`, `#[MaxSteps(3)]`, `#[Temperature(0.3)]`, `maxConversationMessages(): 10`
- `app/Http/Controllers/Api/ChatController.php` — Has `set_time_limit(300)` in streaming callback, `INTERVIEW_COMPLETE` filter bypass, `StreamEnd` usage logging
- `resources/js/components/dynamic/tools/discovery.tsx` — Has client-side stage navigation, `submit_interview` action, completion gating
- `resources/js/pages/workspace/index.tsx` — Has `onAction` callback for `INTERVIEW_COMPLETE`
- `resources/js/components/dynamic/renderer.tsx` — Passes `onAction` to components
- `resources/js/components/dynamic/registry.ts` — Has `onAction` in `DynamicComponentProps`

## Design Decisions

### Decision 1: Increase maxTokens and reduce conversation history

**Rationale**: The AI spent ~486 of 500 output tokens on reasoning. With only 14 tokens left, it couldn't generate any output (0 `completion_tokens`).

- Change `#[MaxTokens(500)]` → `#[MaxTokens(1500)]` — gives the AI 1500 - 486 = ~1014 tokens for actual output
- Change `maxConversationMessages()` from 10 → 6 — reduces input tokens (~800 saved), giving the AI more context window for output
- Keep `#[MaxSteps(3)]` and `#[Temperature(0.3)]` as-is

**Risk**: Larger output token budget increases cost per request. But producing 0 output (current state) is worse — the user gets nothing and must retry, doubling the cost.

### Decision 2: Retry mechanism in use-chat-stream hook

**Rationale**: When the AI times out, produces empty output, or encounters an API error, the user needs a way to resend the exact same prompt without retyping it.

**Implementation in `use-chat-stream.ts`**:
- Add `lastPromptRef`, `lastBrandIdRef`, `lastConversationIdRef` — store before each `sendMessage()` call
- Add `emptyResponseRef` — set to `true` when stream ends with no content and no tool calls
- Expose `retryLastMessage: () => Promise<void>` from the hook
- In `retryLastMessage()`:
  1. Remove the failed assistant message from state (using `setMessages`)
  2. Clear the error state
  3. Call `sendMessage(lastPromptRef.current, ...)` with the stored values

**Implementation in `workspace/index.tsx`**:
- Destructure `retryLastMessage` from `useChatStream`
- When the last assistant message has empty content AND the stream has ended (`!isStreaming`), show a "Retry" button below the message
- Also show retry when `error` is set

### Decision 3: Close wizard + display summary

**Rationale**: After form submission, the user should see their submitted data immediately (not wait for the AI to respond). This also prevents the AI from re-rendering the wizard.

**Implementation in `discovery.tsx`**:
- Add `const [submitted, setSubmitted] = useState(false)` state
- Change Continue button handler:
  ```tsx
  onClick={() => {
      setSubmitted(true);
      onAction?.('submit_interview', formData);
  }}
  ```
- When `submitted === true`, render a summary card instead of the form:
  ```
  Interview Complete ✓
  
  Business: Indext
  Mission: To eliminate...
  Audience: Small business owners...
  Tone: minimal
  
  Your brand director is processing your interview...
  ```
- Keep the summary visible — the AI's response (next tool call) renders below it

### Decision 4: Better tone UX

**Rationale**: 5 preset options (professional, playful, minimal, bold, warm) are too limiting. The DECISIONS.md says tone maps to `Brand.discovery.tone_attributes` (plural — suggests multiple tones).

**Implementation**:
- Replace single-select buttons with a multi-select tag system
- Expanded curated tone list: professional, friendly, sophisticated, playful, quirky, bold, confident, minimal, modern, classic, rustic, luxury, accessible, serious, casual, vintage, contemporary, edgy, authentic, refined
- Add a text input for custom tone keywords (comma-separated)
- Selected tones shown as removable tags below the input
- `formData.tone` becomes a comma-separated string (e.g., "minimal, sophisticated, confident")

**Implementation in `discovery.tsx`**:
- `formData.tone` type changes from `string` to `string` (still a single string, but can be comma-separated)
- Add `customTone` local state for the text input
- Add `toggleTone(tone)` to add/remove tones from the comma-separated string
- Add `addCustomTone()` to parse comma-separated input and add to tone string
- Show selected tones as tags with remove buttons
- The summary (Decision 3) displays the tone string as-is

## Files to Modify

| # | File | Change |
|---|---|---|
| 1 | `app/Ai/Agents/BrandingAgent.php` | `#[MaxTokens(500)]` → `#[MaxTokens(1500)]`; `maxConversationMessages()` 10 → 6 |
| 2 | `resources/js/hooks/use-chat-stream.ts` | Add last-prompt refs, `retryLastMessage()`, empty-response detection, expose from hook |
| 3 | `resources/js/pages/workspace/index.tsx` | Show retry button when assistant message is empty/error, wire up `retryLastMessage` |
| 4 | `resources/js/components/dynamic/tools/discovery.tsx` | Add `submitted` state + summary view; replace tone buttons with multi-select tag system |

## Implementation Details

### BrandingAgent.php
```php
#[MaxTokens(1500)]  // was 500
#[MaxSteps(3)]
#[Temperature(0.3)]
class BrandingAgent implements Agent, Conversational, HasTools
{
    // ...
    protected function maxConversationMessages(): int
    {
        return 6;  // was inherited default of 100, now 6
    }
}
```

### use-chat-stream.ts
- Add refs: `lastPromptRef`, `lastBrandIdRef`, `lastConversationIdRef`, `lastAssistantMessageIdRef`
- In `sendMessage()`: store refs before sending
- After stream ends: check if `accumulatedContent === ''` and `toolCalls.length === 0` → set `emptyResponseRef.current = true`
- Add `retryLastMessage()`:
  - Removes last assistant message from state
  - Clears error
  - Calls `sendMessage()` with stored refs
- Add `retryLastMessage` to `ChatState` interface and return value

### workspace/index.tsx
- Destructure `retryLastMessage` from `useChatStream`
- In the messages map, when rendering an assistant message:
  - If `message.content` is empty AND `!isStreaming` → show "No response received" with a Retry button
  - If `error` is set → show error with a Retry button
- Retry button calls `retryLastMessage()`

### discovery.tsx
- Add `const [submitted, setSubmitted] = useState(false)`
- Continue button: `onClick={() => { setSubmitted(true); onAction?.('submit_interview', formData); }}`
- After `submitted === true`, render summary:
  ```tsx
  <div className="p-6 border-l-4 border-l-green-500">
      <h3 className="text-lg font-semibold text-green-700">Interview Complete</h3>
      <div className="mt-4 space-y-3 text-sm">
          <div><span className="font-medium">Business:</span> {formData.businessName}</div>
          <div><span className="font-medium">Mission:</span> {formData.mission}</div>
          <div><span className="font-medium">Audience:</span> {formData.audience}</div>
          <div><span className="font-medium">Tone:</span> {formData.tone}</div>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">Your brand director is processing your interview...</p>
  </div>
  ```
- Tone stage: Replace `['professional', 'playful', 'minimal', 'bold', 'warm']` with expanded list + text input + tag display

## Validation Steps

1. `php artisan test` — All 110 tests pass (verify `set_time_limit` doesn't break tests)
2. `npx tsc --noEmit` — TypeScript compiles with new `retryLastMessage` interface
3. `npx vite build` — Frontend builds with new components
4. **Manual**: Fill wizard → click Continue → verify summary appears immediately, AI processes in background
5. **Manual**: Trigger AI error (e.g., API down) → verify Retry button appears → click retry → verify prompt resends
6. **Manual**: Select multiple tones → verify comma-separated string in summary
7. **Log verification**: Check laravel.log shows `completion_tokens > 0` and `reason: "stop"` (not `"length"`)
8. **Verify**: Existing chat flow (non-wizard) still works with `maxTokens(1500)`

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| `maxTokens(1500)` increases API costs | Only triggered by user actions, not background processing. 1500 is still modest. Current 500 produces 0 output (wasted spend), so 1500 is actually more cost-effective. |
| `maxConversationMessages` reduced to 6 might lose context | 6 messages is ~3 user/AI exchanges. The wizard submission is typically within the first 6 messages. If more context is needed, the AI can request it. |
| Retry could spam the API | The retry button only appears on failed/empty responses. No automatic retry. User must explicitly click. |
| Tone as comma-separated string changes the data format | The `INTERVIEW_COMPLETE` JSON includes `tone` as a string. Comma-separated is backward-compatible with single-value strings. |
| Summary display doesn't update if AI re-renders wizard | The `submitted` state prevents the form from re-rendering. If the AI invokes the wizard tool again, it will be a fresh component instance. |
