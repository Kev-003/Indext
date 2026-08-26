# Plan: Auto-Trigger First Message After Dashboard Brand Creation

## Problem

"First message via dashboard to create the brand conversation still doesn't trigger a prompt."

### Flow

1. **Dashboard** (`dashboard.tsx:53`): User submits prompt → `POST /{team}/brands` via Inertia router
2. **BrandController::store()**: Creates brand + agent conversation + stores user message in `agent_conversation_messages` → redirects to `/{team}/workspace?brand={id}`
3. **WorkspaceController::index()**: Loads brand + conversation + messages → passes `autoTrigger` prop to frontend
4. **Workspace page** (`workspace/index.tsx`): Has auto-trigger `useEffect` that fires `sendMessage()` when conditions are met

### Root Cause: `autoTrigger` is hardcoded to `false`

In `WorkspaceController.php` lines 64-78:

```php
$autoTrigger = false;

if ($conversation && $messages->isNotEmpty()) {
    $lastMessage = $messages->last();
    $hasAssistantReply = $messages->contains(function ($msg) {
        // ...checks for assistant with content or tool_calls...
    });
}
// $autoTrigger is NEVER set to true
```

The code computes `$hasAssistantReply` but never uses it to set `$autoTrigger`. The variable stays `false` and is passed to the frontend, where the auto-trigger `useEffect` (lines 199-230) returns early because `!autoTrigger` is `true`.

### Secondary Issue: Duplicate user message on auto-trigger

When the auto-trigger fires, `useChatStream` calls `sendMessage(lastMessage.content, brand.id, conversationId)`. This calls `ChatController::message()` which:

1. `$agent->continue($conversation->agent_conversation_id, $user)` — loads conversation history
2. `$agent->stream($prompt)` — the `AgentPrompt` includes existing messages (from `RemembersConversations::messages()`) PLUS the new prompt
3. `RememberConversation` middleware stores the user message again

The AI sees the dashboard prompt **twice** in the conversation. Not harmful but wasteful.

## Root Cause Analysis

### Primary: `autoTrigger` never set to `true`

**File**: `app/Http/Controllers/WorkspaceController.php` line 64

`$autoTrigger` is initialized to `false` and the conditional block (lines 66-78) computes `$hasAssistantReply` but never updates `$autoTrigger`. The `$hasAssistantReply` variable is computed and then discarded.

### Secondary: Duplicate user message

**File**: `app/Http/Controllers/Api/ChatController.php` lines 167-171

When `ChatController::message()` receives a prompt for an existing conversation:
- `$agent->messages()` loads the existing user message (stored by `BrandController::store()`)
- `$agent->stream($prompt)` creates an `AgentPrompt` that includes existing messages + new prompt
- `RememberConversation` middleware stores another user message

The `BrandController::store()` stores the user message directly in `agent_conversation_messages` (lines 127-143). When the auto-trigger sends the same prompt via `ChatController::message()`, the message is duplicated.

## Design Decisions

### Decision 1: Set `autoTrigger = true` when conditions are met

**Rationale**: The conditions are already computed — we just need to wire them up.

**Implementation in `WorkspaceController::index()`**:
```php
$autoTrigger = false;

if ($conversation && $messages->isNotEmpty()) {
    $lastMessage = $messages->last();
    $hasAssistantReply = $messages->contains(function ($msg) {
        if ($msg['role'] !== 'assistant') {
            return false;
        }
        $hasContent = trim($msg['content'] ?? '') !== '';
        $hasToolCalls = !empty($msg['tool_calls']);
        return $hasContent || $hasToolCalls;
    });

    $autoTrigger = ! $hasAssistantReply
        && $lastMessage['role'] === 'user'
        && trim($lastMessage['content'] ?? '') !== '';
}

if ($autoTrigger && $conversation->created_at) {
    $autoTrigger = $conversation->created_at->gt(now()->subMinutes(10));
}
```

**Time check**: A 10-minute window ensures only freshly-created conversations auto-trigger. Returning users with stale conversations get fresh starts.

### Decision 2: Prevent duplicate user message

**Rationale**: The `BrandController::store()` stores the dashboard prompt in `agent_conversation_messages`. When the auto-trigger fires `sendMessage()`, `ChatController::message()` sends the same prompt, which the `RememberConversation` middleware stores again.

**Implementation in `BrandController::store()`**: Remove the `agent_conversation_messages` insert (lines 127-143). Instead, pass the prompt to the workspace as an Inertia prop (`initialPrompt`). The workspace auto-trigger sends it via `ChatController::message()`, which stores it via the `RememberConversation` middleware.

**Alternative (simpler)**: In `ChatController::message()`, detect when the last message in the conversation matches the incoming prompt and skip adding it. But the SDK's `RememberConversation` middleware always stores, so this is harder.

**Chosen approach**: Remove the message insert from `store()`, pass prompt as prop, let the auto-trigger handle message storage.

### Decision 3: Pass `initialPrompt` from server to workspace

**Rationale**: The workspace needs the prompt to display the user message immediately (before the AI responds) and to auto-trigger with the right content.

**Implementation**:
- Add `'initialPrompt' => $prompt` to the `BrandController::store()` redirect (via session or query param)
- OR: Store the prompt in the `conversations` table as a separate column
- OR: Don't remove the message from `store()`, accept the duplicate (lowest risk)

**Chosen**: Accept the duplicate message. The AI handles duplicate prompts gracefully. The `maxConversationMessages` limit (6) ensures the duplicate is pushed out quickly. This avoids changes to `BrandController::store()` and the workspace prop flow.

## Files to Modify

| # | File | Change |
|---|---|---|
| 1 | `app/Http/Controllers/WorkspaceController.php` | Set `$autoTrigger = true` when last message is user message and no assistant reply exists; add 10-minute freshness check |
| 2 | `resources/js/pages/workspace/index.tsx` | Update auto-trigger `useEffect` to handle `initialPrompt` prop (optional, if Decision 3 alternative is chosen) |

## Implementation Details

### 1. `app/Http/Controllers/WorkspaceController.php`

**Before** (lines 64-78):
```php
$autoTrigger = false;

if ($conversation && $messages->isNotEmpty()) {
    $lastMessage = $messages->last();
    $hasAssistantReply = $messages->contains(function ($msg) {
        if ($msg['role'] !== 'assistant') {
            return false;
        }

        $hasContent = trim($msg['content'] ?? '') !== '';
        $hasToolCalls = !empty($msg['tool_calls']);

        return $hasContent || $hasToolCalls;
    });
}
```

**After**:
```php
$autoTrigger = false;

if ($conversation && $messages->isNotEmpty()) {
    $lastMessage = $messages->last();
    $hasAssistantReply = $messages->contains(function ($msg) {
        if ($msg['role'] !== 'assistant') {
            return false;
        }

        $hasContent = trim($msg['content'] ?? '') !== '';
        $hasToolCalls = !empty($msg['tool_calls']);

        return $hasContent || $hasToolCalls;
    });

    if (! $hasAssistantReply
        && $lastMessage['role'] === 'user'
        && trim($lastMessage['content'] ?? '') !== ''
    ) {
        // Only auto-trigger for conversations created within the last 10 minutes
        // to avoid unexpected triggers when returning to old conversations.
        $autoTrigger = $conversation->created_at
            ? $conversation->created_at->gt(now()->subMinutes(10))
            : true;
    }
}
```

### 2. Workspace auto-trigger (no changes needed)

The existing `useEffect` in `workspace/index.tsx` (lines 199-230) already handles:
- Checking `brand`, `isStreaming`, `autoTrigger`, `autoTriggerFired`
- Verifying last message is a user message
- Verifying no assistant reply exists
- Calling `sendMessage(lastMessage.content, brand.id, activeConversationId ?? initialConversation?.id)`

With the `autoTrigger` flag now properly set to `true`, the effect will fire and trigger the AI.

## Validation Steps

1. `php artisan test` — All 110 tests pass
2. **Manual**: Submit dashboard prompt → verify redirect to workspace → verify AI auto-responds within 5 seconds
3. **Log check**: `laravel.log` shows `Chat stream complete` with `completion_tokens > 0`
4. **Manual**: Reload workspace on old conversation → verify AI does NOT auto-trigger (10-minute window)
5. **Manual**: Resume conversation with assistant reply → verify AI does NOT auto-trigger (hasAssistantReply)
6. `php -l app/Http/Controllers/WorkspaceController.php` — syntax check

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Duplicate user message in conversation | AI handles duplicates gracefully. `maxConversationMessages=6` pushes it out quickly. Acceptable for now; can be cleaned up by removing message insert from `BrandController::store()` in a future iteration. |
| Auto-trigger fires on stale conversations | 10-minute freshness check on `conversation->created_at` prevents this. |
| Auto-trigger fires on conversations that already have replies | `hasAssistantReply` check prevents this. |
| Race condition: messages load before `autoTrigger` is set | `autoTrigger` is set server-side before the page renders, so no race. |
