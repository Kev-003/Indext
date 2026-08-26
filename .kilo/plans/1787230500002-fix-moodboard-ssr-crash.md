# Plan: Fix Gemini 400 Error During Direction Confirmation (`resonance_confirm`)

## Root Cause Analysis

### Production Error
```
[2026-08-26 04:17:39] local.DEBUG: Chat storing assistant error message
{"error":"HTTP request returned status code 400",...}
```

The error occurs when the user sends a `STEP_COMPLETE` message for the `resonance_confirm` step (direction confirmation). The semantic filter is correctly bypassed (STEP_COMPLETE prefix), but Gemini returns HTTP 400.

### Root Cause: Duplicate User Messages in Conversation History

The ChatController stores user messages in `agent_conversation_messages` (lines 130-146 for reuse, 159-175 for new). The Laravel AI `RememberConversation` middleware ALSO stores the user message via `$this->store->storeUserMessage()`. This creates **duplicate consecutive user messages** in the conversation history.

**First request (no conversation_id):**
1. ChatController creates `agent_conversations` record X, stores user msg in X
2. ChatController calls `$agent->forUser($user)` → `conversationId = null`
3. RememberConversation middleware: `conversationId` is null → creates NEW conversation Y, stores user + assistant in Y
4. `Conversation->agent_conversation_id = X`
5. **Result**: Conversation fragmented — ChatController's msg in X, AI response in Y

**Subsequent requests (reuse with conversation_id):**
1. ChatController looks up `Conversation->agent_conversation_id` = X
2. ChatController stores user msg in X (reuse case)
3. ChatController calls `$agent->continue(X, $user)` → `conversationId = X`
4. RememberConversation: `conversationId = X` (not null) → stores user + assistant in X
5. **Result**: X now has duplicate user messages: ChatController's msg + RememberConversation's msg

**When the AI makes a tool call (e.g., `invoke_resonance_confirmator`):**
The `DatabaseConversationStore::getLatestConversationMessages()` retrieves the last 6 messages and reconstructs them via `reconstructToolTurn()`. The message sequence becomes:
1. `user`: "previous prompt" (from ChatController)
2. `user`: "previous prompt" (from RememberConversation) — **DUPLICATE, consecutive user**
3. `model`: text + functionCall (the tool invocation)
4. `tool_result`: functionResponse (the tool result, stored in same record)
5. `model`: follow-up text
6. `user`: STEP_COMPLETE (from ChatController)
7. `user`: STEP_COMPLETE (from RememberConversation) — **DUPLICATE again**
8. `user`: STEP_COMPLETE (added in-memory by `StreamsText::stream()`)

Consecutive user messages (2→3 is valid user→model, but 6→7→8 are all user) violate Gemini's API format, which requires strict alternation and `functionResponse` messages to immediately follow `functionCall` messages. **Gemini returns HTTP 400.**

This issue manifests specifically at the `resonance_confirm` stage because:
- Earlier steps may not involve tool calls (text-only responses are more tolerant)
- The `maxConversationMessages = 6` limit means the duplicates only appear in the retrieved window once enough messages accumulate

### Secondary Issue: Conversation Fragmentation

The ChatController creates `agent_conversations` record X but calls `$agent->forUser()` on first request, causing `RememberConversation` to create a separate record Y. The `Conversation->agent_conversation_id` points to X, but AI responses from the first request are in Y. This means `messageCountSoFar` (which counts messages in X) is inaccurate.

## Fixes

### Fix 1: Remove duplicate user message storage from ChatController

**File**: `app/Http/Controllers/Api/ChatController.php`

Remove the `DB::connection()->table('agent_conversation_messages')->insert([...])` calls at:
- Lines 130-146 (reuse case)
- Lines 159-175 (new conversation case)

The `RememberConversation` middleware already stores user messages via `storeUserMessage()`. The user message is also added in-memory by `StreamsText::stream()` via `$messages[] = new UserMessage($prompt->prompt)`.

### Fix 2: Prevent conversation fragmentation

**File**: `app/Http/Controllers/Api/ChatController.php`

Change the first-request flow from `$agent->forUser($user)` to `$agent->continue($conversation->agent_conversation_id, $user)`:

```php
// Change from:
if ($conversationId && $conversation->agent_conversation_id) {
    $agent->continue($conversation->agent_conversation_id, $user);
} else {
    $agent->forUser($user);
}

// To:
if ($conversation->agent_conversation_id) {
    $agent->continue($conversation->agent_conversation_id, $user);
} else {
    $agent->forUser($user);
}
```

On the first request, `Conversation->agent_conversation_id` is set to X (created in the transaction), so `$agent->continue(X, $user)` is called instead of `$agent->forUser($user)`. This ensures the `RememberConversation` middleware stores messages in X (not Y), and `currentConversation()` returns X.

### Fix 3: Add detailed error logging for Gemini API errors

**File**: `app/Http/Controllers/Api/ChatController.php`

Enhance the catch block to log the actual Gemini API response body when a 400 error occurs. Add `use Illuminate\Http\Client\RequestException;` and check for `$e instanceof RequestException` to access `$e->response->body()`.

## Validation

1. `php artisan test --filter=ChatStreamingTest` — All 13 tests pass (already passing)
2. `php artisan test` — Full suite passes (already 130/130)
3. Manual test: Send `STEP_COMPLETE` for `resonance_confirm` via real Gemini API — verify no 400 error
4. Add a test that verifies conversation history has no consecutive user messages

## Risks

- **Risk**: Removing ChatController's user message storage changes `messageCountSoFar` calculation. **Mitigation**: The RememberConversation middleware stores 2 messages per turn (user + assistant), so the count is still correct. `messageCountSoFar` for req N reflects messages from req 1..N-1.
- **Risk**: The `messageCountSoFar` is computed before the DB transaction. With the fix, the ChatController's user message is no longer in the DB during streaming, so `messageCountSoFar` only reflects RememberConversation's messages. **Impact**: Filter threshold may shift by 1-2 messages. Should still trigger at `>= 4` after ~2 full turns.
- **Risk**: Existing conversation data (with duplicates) in the database. **Impact**: New requests will not create new duplicates, but old data may still cause issues. **Mitigation**: Old conversations will eventually age out of the 6-message window.
