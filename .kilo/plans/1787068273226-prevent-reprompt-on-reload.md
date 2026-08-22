# Plan: Prevent Re-prompting on Page Reload

## Problem Statement
On page reload, the workspace auto-trigger effect (`useChatStream` + `workspace/index.tsx`) can re-send the last user message to the AI if the conversation ends with a user message that has no assistant reply. This causes:
1. **Duplicate/spam prompts** sent to the AI provider on every reload
2. **Credential leakage** if a user message contained API keys, passwords, or other secrets
3. **Error message churn**: the visible error state changes with each code update because new AI responses overwrite the conversation history

## Root Cause Analysis

### Frontend: `resources/js/pages/workspace/index.tsx:188-208`
The `useEffect` auto-trigger runs whenever `messages` changes. On page reload:
1. `initialMessages` is loaded from the server (DB)
2. `useChatStream` initializes with those messages
3. `useEffect(() => setMessages(initialMessages), ...)` syncs state
4. Auto-trigger effect fires because `messages` changed
5. If the last message is a `user` message with no `assistant` reply, it calls `sendMessage()` again
6. `sendMessage` makes a POST to `/api/brands/{id}/chat/message` with the same prompt
7. Backend stores a NEW user message + NEW assistant response in `agent_conversation_messages`
8. On next reload, steps 3-7 repeat

### Why `autoTriggerAttempted` doesn't help
`autoTriggerAttempted` is a `useRef<Set<string>>`. It resets to `new Set()` on every page load. So it only prevents duplicate triggers within the same page session, not across reloads.

### Backend: `app/Http/Controllers/WorkspaceController.php:29-46`
The controller loads messages from `agent_conversation_messages` and passes them as `initialMessages`. There is no flag indicating whether the conversation was just created and needs auto-triggering.

## Files to Review/Change

| File | Role | Issue |
|------|------|-------|
| `resources/js/pages/workspace/index.tsx` | Auto-trigger logic | Re-triggers on reload when last msg is user with no assistant reply |
| `resources/js/hooks/use-chat-stream.ts` | Chat state + sendMessage | No reload-safe deduplication |
| `app/Http/Controllers/WorkspaceController.php` | Server-side message loading | No indicator for fresh conversations |
| `app/Http/Controllers/Api/ChatController.php` | Message endpoint | Accepts duplicate prompts without validation |
| `app/Ai/Storage/SanitizedConversationStore.php` | Conversation persistence | Stores every call, enabling duplicates |

## Proposed Fix

### Approach: Server-side `auto_trigger` flag (minimal, robust)

**Backend: `WorkspaceController.php`**
Add a boolean flag to the Inertia props indicating whether the conversation was just created and still needs its first AI response:
```php
'autoTrigger' => $conversation && $messages->isEmpty() ? false : (
    $conversation && $messages->isNotEmpty() && $messages->last()->role === 'user' ? true : false
),
```
Actually, simpler: pass `autoTrigger: true` only when the conversation has exactly 1 message and it's from the current user, AND the conversation was created within the last 60 seconds.

**Frontend: `workspace/index.tsx`**
Replace the `autoTriggerAttempted` Set with a check against the server-provided `autoTrigger` flag:
```tsx
const { messages, isStreaming, error, sendMessage, setMessages, activeConversationId } =
    useChatStream(initialMessages, initialConversation?.id);
```

Change the auto-trigger effect to:
```tsx
useEffect(() => {
    if (!brand || isStreaming || !autoTrigger) return;
    // ... rest of logic
}, [brand, autoTrigger, isStreaming, messages, sendMessage, activeConversationId]);
```

**Frontend: `use-chat-stream.ts`**
No changes needed. The hook is fine.

### Alternative: `sessionStorage` deduplication (no backend changes)

If we want to avoid backend changes:
```tsx
const attemptKey = `auto-trigger:${brand.id}:${lastMessage.id}`;
if (sessionStorage.getItem(attemptKey)) return;
sessionStorage.setItem(attemptKey, '1');
```

This persists across reloads within the same browser session.

### Alternative: Timestamp-based guard

Only auto-trigger if the user message was created within the last 30 seconds:
```tsx
const messageAge = Date.now() - new Date(lastMessage.created_at).getTime();
if (messageAge > 30000) return;
```

## Recommended Solution

**Use the server-side `autoTrigger` flag.** It's the most explicit and correct approach because:
1. The server knows whether a conversation was just created
2. It prevents re-triggering even across browser sessions
3. It doesn't rely on client-side timing heuristics
4. It's easy to audit and reason about

## Verification Steps
1. Create a brand from the dashboard → verify AI auto-triggers once
2. Reload the workspace page → verify NO duplicate API call is made
3. Send a new message → verify normal flow works
4. Check `agent_conversation_messages` table → verify no duplicate rows after reload
5. Check network tab → verify only 1 POST to `/api/brands/{id}/chat/message` per user message

## Risks
- If the `autoTrigger` flag is incorrectly set, legitimate first-message triggers may be skipped
- If the server time is skewed, the timestamp-based fallback may misfire
