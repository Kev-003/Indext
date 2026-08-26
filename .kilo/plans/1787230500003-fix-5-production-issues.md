# Plan: Fix 5 Production Issues in Indext Brand Development Workflow

## Context
The antigravity agent should be able to read all files in the project except `.env` files and should not ask permission for simple tasks like writing code and reading files.

---

## Issue 1: No AI Response at Direction Confirmation (resonance_confirm)

### Status: Already Fixed (from previous plan)

The Gemini HTTP 400 error was caused by **duplicate user messages** in the conversation history. Both `ChatController` (DB transaction) and the `RememberConversation` middleware were storing the same user message. Fixed by:
- Removing `agent_conversation_messages` insert calls from `ChatController`
- Changing `$agent->forUser()` to `$agent->continue()` on first request to prevent conversation fragmentation
- Adding `RequestException` logging to capture API response bodies

### Verification Needed
Confirm the fix resolves the 400 error at the `resonance_confirm` stage. The error was caused by consecutive user messages violating Gemini's message role alternation requirement.

### Files Already Changed
- `app/Http/Controllers/Api/ChatController.php`

---

## Issue 2: Brand ID Not Resetting After Deletion

### Root Cause
`BrandController::store()` (lines 43-68) attempts to reuse soft-deleted brand IDs:
```php
$reusableBrand = Brand::withTrashed()
    ->whereNotNull('deleted_at')
    ->orderBy('id')
    ->first();

if ($reusableBrand) {
    $reusableBrand->forceDelete();
    $brand = new Brand([...]);
    $brand->id = $reusableBrand->id;
    $brand->save();
}
```

The `forceDelete()` likely fails or the ID reuse path is skipped because:
1. **Foreign key constraints**: `brand_assets` and `brand_guidelines` tables have `foreignId('brand_id')->constrained()->cascadeOnDelete()`. When `BrandController::destroy()` soft-deletes the brand and its relations, the related records remain in the DB (soft-deleted). When `forceDelete()` is then called, the DB-level cascade should delete them — but if FK enforcement is off (e.g., SQLite), or if the `BrandController::destroy()` doesn't properly clean up related tables, the force delete fails.
2. **No error handling**: The `forceDelete()` / `save()` calls are inside a `DB::transaction()` with no `try-catch`. If `forceDelete()` throws, the exception propagates and the fallback `Brand::create()` path creates a brand with a new auto-increment ID.
3. **Missing `agent_conversations` cleanup**: The `BrandController::store()` creates a new `agent_conversations` record, but if the old brand's conversation records in `agent_conversations` and `agent_conversation_messages` are not cleaned up during deletion, there could be FK conflicts.

### Fix
**File**: `app/Http/Controllers/BrandController.php`

1. Add `try-catch` around the `forceDelete()` to fall through gracefully to `Brand::create()` if force deletion fails.
2. Clean up `agent_conversations` and `agent_conversation_messages` for the reusable brand before `forceDelete()`.
3. Also clean up `agent_conversations` and `agent_conversation_messages` in `BrandController::destroy()` (currently only deletes `conversations`, not the Laravel AI tables).
4. Consider resetting the auto-increment counter after `forceDelete()` for SQLite/MySQL.

### Secondary: BrandController::store() also stores a duplicate user message
Line 81-97: `BrandController::store()` stores the initial user message directly in `agent_conversation_messages`. This should be removed to avoid the same duplicate-message issue that was fixed in `ChatController`. The `RememberConversation` middleware will handle storing the user message when the first chat message is sent.

---

## Issue 3: Conversation/Brand Titled "New Brand"

### Root Cause
`BrandController::store()` (line 38):
```php
$name = 'New Brand';
if (preg_match('/(?:brand|logo)\s+for\s+(.+)/i', $prompt, $matches)) {
    $name = trim($matches[1]);
}
```

This regex only matches prompts like "brand for Coffee Co" or "logo for Acme". If the user types something like "Create a coffee brand" or "I want to build a brand for my coffee shop", the name defaults to "New Brand".

The conversation title is also set to `$name . ' Discovery'` (lines 76, 104), so it's also "New Brand Discovery".

### Fix
**File**: `app/Http/Controllers/BrandController.php`

1. Broaden the name extraction to handle more prompt patterns:
   - "Create a brand for X"
   - "I want to build a brand for X"
   - "Brand for X"
   - "Logo for X"
   - Fallback: extract key nouns from the prompt using a more flexible regex
2. If no name can be extracted, use a truncated version of the prompt (first 30 chars) as the brand name.
3. The conversation title should be derived from the brand name: `{brand_name} Discovery` or just the brand name.

---

## Issue 4: User Message Shows Weird JSON After Form Confirmation

### Root Cause
When a component fires `onAction('complete_step', data)`, the `handleAction` callback in `workspace/index.tsx` (line 203) sends:
```typescript
void sendMessage(`STEP_COMPLETE ${JSON.stringify(data)}`, ...);
```

The `useChatStream` hook (line 59) stores this as the user message `content`:
```typescript
const userMessage: Message = {
    content: prompt, // "STEP_COMPLETE {\"step\":\"resonance_confirm\",...}"
    ...
};
```

When the workspace renders messages, `MessageContent` displays this raw string. The user sees the raw JSON, not a human-readable message.

### Fix
**File**: `app/Http/Controllers/Api/ChatController.php`

1. Before storing/processing the prompt, if it starts with `STEP_COMPLETE` or `INTERVIEW_COMPLETE`, transform the message content into a readable summary.
2. Example: "Completed: Direction Confirmation" or "User confirmed direction: concept-geometric-precision"
3. Keep the original JSON for the `Brand` persistence logic (lines 155-180), but use the readable summary as the user message content stored in the conversation.

**Alternative Fix** (frontend):
**File**: `resources/js/hooks/use-chat-stream.ts`
1. In `sendMessage()`, detect if the prompt starts with `STEP_COMPLETE` or `INTERVIEW_COMPLETE`
2. If so, store a readable summary as the user message content instead of the raw JSON

### Recommended: Backend Fix
Modify the `ChatController` to sanitize the user message content before the agent processes it. The `RememberConversation` middleware stores `$prompt->prompt` (the raw prompt). We can modify the prompt passed to `$agent->stream()` to be a readable summary:

```php
if (str_starts_with(trim($prompt), 'STEP_COMPLETE')) {
    $jsonStr = trim(substr(trim($prompt), strlen('STEP_COMPLETE')));
    $data = json_decode($jsonStr, true);
    if (is_array($data)) {
        // ... existing Brand persistence ...
        
        // Create a readable summary for the conversation
        $readablePrompt = $this->summarizeStepComplete($data);
    }
}
```

Then pass `$readablePrompt` to `$agent->stream()` and the `RememberConversation` middleware stores the readable message.

---

## Issue 5: Completed Forms Becoming Fillable Again

### Root Cause
When the workspace page loads (or is refreshed), it retrieves messages from the `WorkspaceController` (lines 30-46). The assistant message has `tool_calls` (e.g., `invoke_resonance_confirmator`). The `DynamicRenderer` (lines 517-546 of workspace/index.tsx) renders the component with the original props.

But there is:
1. **No `tool_results` in the response**: `WorkspaceController` only returns `id, role, content, tool_calls, created_at` — not `tool_results` (line 44-46 of workspace/index.tsx). So the frontend has no way to know the tool was already executed.
2. **No "completed" state tracking**: Components like `ResonanceConfirmator` use `useState` for decision state. When re-rendered from persisted messages, the state resets to the initial values. The component appears empty/fresh again.
3. **The `RememberConversation` middleware stores tool calls and results in the same record**: The `agent_conversation_messages` table has `tool_calls` and `tool_results` columns. But the `WorkspaceController` doesn't query `tool_results`.

### Fix
**File**: `app/Http/Controllers/WorkspaceController.php`

1. Add `tool_results` to the message mapping (line 44):
   ```php
   'tool_results' => json_decode($msg->tool_results, true) ?: [],
   ```

**File**: `resources/js/pages/workspace/index.tsx`

2. When rendering messages with `tool_calls`, check if corresponding `tool_results` exist. If they do, the component has been completed.
3. Pass a `completed` prop or `result` data to the component so it can render in a "read-only confirmed" state.

**Files**: Component files in `resources/js/components/dynamic/tools/`

4. Add a `completed` prop to components (e.g., `ResonanceConfirmator`, `DirectionComparator`, `FeedbackCollector`) that, when true, renders the component in a read-only state showing the user's previous decision instead of the empty form.

**Alternative (simpler) Fix**: Store the STEP_COMPLETE result in the brand's `discovery` data (already done by `ChatController`). When rendering a component, pass a `completed` prop based on whether the step exists in `brand.discovery`.

This requires:
- Passing `brand.discovery` data from `WorkspaceController` to the frontend
- Checking `brand.discovery[step_name]` in the component to determine if it's completed
- Rendering the component in read-only mode if the step is completed

### Recommended: Hybrid Approach
1. Add `tool_results` to the WorkspaceController message mapping
2. When rendering, check if a tool call has results
3. If results exist, pass `completed={true}` and `result={resultData}` to the component
4. Update the `DynamicRenderer` to pass these props
5. Update each component to accept and handle the `completed` prop

---

## Validation

1. `php artisan test` — Full suite passes (currently 130/130)
2. `npx vite build` — Production build succeeds
3. `npx tsc --noEmit` — TypeScript compiles (pre-existing error in `composition.tsx:198` is acceptable)
4. Manual testing: Create, delete, and recreate brands to verify ID reuse
5. Manual testing: Complete a form step and refresh the page to verify it stays completed
