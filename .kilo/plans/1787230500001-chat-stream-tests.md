# Plan: Write Tests to Diagnose Wizard Not Displaying AI-Provided Info

## Problem Analysis

From the logs provided, two issues are visible:

1. **Rate limiting (429)**: Starting at 12:40:45, all subsequent `Chat streaming request` calls fail with `Application rate limited by AI provider [gemini]`. Only the first 2 of 6 requests succeed. Each failed request means the AI never generates a response, so no tool calls are emitted and no wizard components render.

2. **Wizard not displaying data**: The wizard components (ColorHierarchyBuilder, DesignConceptExplorer, etc.) receive `suggestedPalette`, `concepts`, etc. as props from the AI's tool calls. If the SSE stream format doesn't match what `useChatStream` expects, or if tool call arguments are malformed, the components won't render.

**Root causes to test**:
- Gemini 429 rate limit errors are not gracefully handled (no retry, no user-friendly message)
- SSE stream `tool_call` event format may not match what `useChatStream` parses
- Tool call argument merging by name (fragmented streaming) may still have edge cases
- Conversation context may not carry STEP_COMPLETE data through to the AI prompt

## Constraints

- No frontend test framework (Jest/Vitest) is installed — `package.json` has no test runner. All tests must be PHP/PHPUnit.
- The `BrandingAgent::fake()` mechanism supports arrays of responses (strings for text, `ToolCall` objects for tool calls, closures for dynamic responses).
- SSE output can be captured in tests using `ob_start()` / `ob_get_clean()` around `sendContent()`.

## Test File: `tests/Feature/ChatStreamingTest.php`

### Test Group 1: STEP_COMPLETE Semantic Filter Bypass

**1. `test_step_complete_bypasses_semantic_filter`**
- Setup: `BrandingAgent::fake(['OK'])`, mock `SemanticIntentFilter` to return `false` (irrelevant)
- Send `prompt` = `STEP_COMPLETE {"step":"color_hierarchy","palette":[...]}`
- Assert: HTTP 200 (not 400), because `str_starts_with(trim($prompt), 'STEP_COMPLETE')` bypasses the filter at `ChatController.php:188`

**2. `test_step_complete_with_off_topic_content_still_passes`**
- Same setup, but prompt contains "gardening tomatoes" within the STEP_COMPLETE JSON
- Assert: HTTP 200 — the semantic filter is bypassed entirely for STEP_COMPLETE

**3. `test_interview_complete_bypasses_semantic_filter`**
- Same pattern with `INTERVIEW_COMPLETE` prefix at `ChatController.php:182`

**4. `test_regular_prompt_after_discovery_is_filtered`**
- Send 5+ messages to push message_count >= 4
- Send off-topic prompt without STEP_COMPLETE prefix
- Assert: HTTP 400 with "Please keep queries related..."

### Test Group 2: SSE Stream Format Verification

**5. `test_sse_stream_emits_text_events`**
- Fake agent returns `['Hello! I am your AI brand director.']`
- Send a regular chat message
- Capture SSE output via `ob_start()` / `sendContent()` / `ob_get_clean()`
- Assert: output contains `event: text` and `data: {"content":"..."}` entries
- Assert: output ends with `event: done` and `data: {"conversation_id":...}`

**6. `test_sse_stream_emits_tool_call_events`**
- Fake agent returns `[new ToolCall(Str::uuid(), 'invoke_color_hierarchy_builder', ['brandId' => 1, 'suggestedPalette' => [...], 'mode' => 'digital'])]`
- Send a message
- Capture SSE output
- Assert: output contains `event: tool_call` with `data: {"id":"...","name":"invoke_color_hierarchy_builder","arguments":{"brandId":1,...}}`

**7. `test_sse_stream_emits_error_event_on_rate_limit`**
- Fake agent throws `RateLimitedException::forProvider('gemini', 429, ...)`
- Send a message
- Capture SSE output
- Assert: output contains `event: error` with `data: {"message":"Application rate limited by AI provider [gemini]."}`

### Test Group 3: Tool Call Argument Structure

**8. `test_color_hierarchy_builder_tool_call_contains_palette`**
- Fake agent returns a ToolCall with suggestedPalette containing 5 color objects
- Capture SSE output
- Assert: the `arguments` in the `data:` JSON contains `suggestedPalette` with at least 3 color entries
- Assert: each color has `name`, `color` (hex string), and `role` fields

**9. `test_tool_call_arguments_are_json_serializable`**
- Fake agent returns a ToolCall with nested array arguments
- Assert: `json_encode` of the arguments succeeds without errors
- Assert: `json_last_error()` is `JSON_ERROR_NONE`

### Test Group 4: Conversation Persistence Across STEP_COMPLETE

**10. `test_step_complete_reuses_existing_conversation`**
- First request: create conversation, fake response 'Hello!'
- Second request: send STEP_COMPLETE with `conversation_id`, fake response 'OK'
- Assert: both user messages stored in the same `agent_conversation_messages` table
- Assert: `Conversation` record count = 1

**11. `test_step_complete_message_count_incremented`**
- Send 3 STEP_COMPLETE messages to the same conversation
- Assert: `message_count` in logs increases (3, 6, 9 — because each step adds user + assistant message)
- This verifies the semantic filter bypass check at `ChatController.php:175` (`$messageCountSoFar < 4`)

### Test Group 5: Rate Limit Retry Behavior

**12. `test_retry_last_message_after_rate_limit`**
- Fake agent with responses: `[RateLimitedException, 'Retried response']`
- Send message, capture SSE — assert contains `event: error`
- Call `retryLastMessage()` — assert second SSE stream contains `event: text` (the retry response)
- Note: This tests the frontend retry mechanism via the `retryLastMessage` exposed in the chat state. The PHP test can verify the backend supports it (same conversation, same endpoint).

## Test File: `tests/Unit/SseStreamParserTest.php`

### Test Group 6: SSE Event Format Unit Tests

**13. `test_sse_stream_parses_text_delta`**
- Input: simulated SSE stream chunks from logs
- Assert: `useChatStream`'s parsing logic (lines 143-205 of `use-chat-stream.ts`) correctly extracts `content` from `{"content":"..."}`

**14. `test_sse_tool_call_merge_by_name`**
- Input: multiple SSE chunks with same `name` but different `id` (simulating Gemini fragmentation)
- Assert: merged tool call has combined arguments from all chunks
- Note: This logic is in the TypeScript file. A PHP test can simulate the merge logic and verify the behavior.

## Implementation Priority

1. **Tests 1-4**: Semantic filter bypass — quick to write, validates the STEP_COMPLETE flow isn't blocked
2. **Tests 5-7**: SSE stream format — captures the actual output to verify the frontend can parse it
3. **Tests 8-9**: Tool call argument structure — verifies the palette/concept data is properly formed for the wizard
4. **Tests 10-11**: Conversation persistence — verifies multi-step flow works end-to-end
5. **Tests 12-14**: Rate limit retry and parser unit tests — edge cases

## Test Infrastructure Notes

- Use `BrandingAgent::fake([...])` with `ToolCall` objects for tool call simulation
- Import: `use Laravel\Ai\Responses\Data\ToolCall;` and `use Illuminate\Support\Str;`
- Capture SSE output:
  ```php
  ob_start();
  $response = $this->postJson("/api/brands/{$brand->id}/chat/message", ['prompt' => $prompt]);
  $response->assertOk();
  $this->consumeStream($response);
  $output = ob_get_clean();
  ob_end_clean();
  ```
- Parse SSE events from `$output` by splitting on `\n\n` and `event:` / `data:` prefixes
