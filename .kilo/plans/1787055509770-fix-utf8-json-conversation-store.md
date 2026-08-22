# Plan: Fix Malformed UTF-8 json_encode Error (Revised)

## Problem
```
json_encode error: Malformed UTF-8 characters, possibly incorrectly encoded
```
This error is thrown by **Guzzle** (not PHP's native json_encode) when serializing the HTTP request body sent to the LLM provider. The request body contains malformed UTF-8 characters.

## Root Cause Analysis

The error message format `json_encode error: Malformed UTF-8...` matches Guzzle's `Client::request()` exactly (`vendor/guzzlehttp/guzzle/src/Client.php:1160`). This means the failure occurs when Laravel's HTTP client passes the request body array to Guzzle, which calls `json_encode($options['json'])`.

The request body is built in `vendor/laravel/ai/src/Gateway/OpenAi/Concerns/BuildsTextRequests.php` and includes:
- `instructions` (system prompt)
- `input` (conversation messages)
- `tools`, `model`, etc.

The **`instructions` string** is the most likely vector because it is built by `BrandingAgent::instructions()` (`app/Ai/Agents/BrandingAgent.php:23-71`) by concatenating database fields **without any UTF-8 sanitization**:
- `$user->llm_methodology` (line 50)
- `$this->brand->name` (line 55)
- `$this->brand->industry` (line 57)
- `$this->brand->execution_mode` (line 60)
- `json_encode($this->brand->strategy)` (line 63)
- `json_encode($this->brand->discovery)` (line 66)

If any of these fields contain malformed UTF-8 bytes (e.g., from incorrect DB charset, copy-paste, or AI-generated content), the resulting `instructions` string contains invalid UTF-8. The SDK does **not** call `json_encode` on `instructions` before adding it to the request body — it is inserted directly into the `input` array. When Guzzle later serializes the entire request body, it fails.

The conversation history (`input` messages) is a secondary vector. Pre-existing conversation records stored before our sanitization fix may contain malformed UTF-8 in `tool_calls`/`tool_results` JSON that `json_decode` preserves but the SDK's subsequent `json_encode` (in `MapsMessages`) would fail on — however, that would produce PHP's native error format (`json_encode(): ...`), not Guzzle's format. The Guzzle-specific format confirms the failure is at the HTTP serialization boundary.

## Evidence
1. Error format matches Guzzle's `Client::request()` line 1160, not PHP's native `json_encode` warning.
2. `BrandingAgent::instructions()` concatenates raw database strings into the system prompt with no UTF-8 guard.
3. `PromptGuardrailService::sanitize()` strips control characters but does **not** fix malformed UTF-8 (`preg_replace` with `/u` on invalid UTF-8 returns `null`, falling back to the original string).
4. The error occurs during `generateTextStep` → `post('responses', $body)`, before any stream events are yielded.

## Proposed Fix

### 1. Sanitize `BrandingAgent::instructions()`
Add a `sanitizeForJson()` helper and apply it to every string value concatenated into the instructions:
- `$user->llm_methodology`
- `$this->brand->name`
- `$this->brand->industry`
- `$this->brand->execution_mode`
- Add `JSON_INVALID_UTF8_SUBSTITUTE` to the two `json_encode` calls for `strategy` and `discovery`.

### 2. Sanitize user prompt in `ChatController`
Before passing `$prompt` to `$agent->stream($prompt)`, run it through `sanitizeForJson()`. The guardrail's `sanitize()` does not remove malformed UTF-8.

### 3. Harden `SanitizedConversationStore::getLatestConversationMessages()`
Pre-existing DB records may contain malformed UTF-8 inside decoded `tool_calls` and `tool_results`. Add a `sanitizeArrayForJson()` method that recursively walks arrays/objects and sanitizes every string value. Apply it to the decoded JSON before constructing message objects.

### 4. Fix `PromptGuardrailService::sanitize()`
Add `mb_convert_encoding($prompt, 'UTF-8', 'UTF-8')` to actually strip invalid UTF-8 sequences.

## Tasks for Implementation Agent

1. **`app/Ai/Agents/BrandingAgent.php`:**
   - Add `private function sanitizeForJson(string $value): string` using `mb_convert_encoding`.
   - Sanitize: `$user->llm_methodology`, `$this->brand->name`, `$this->brand->industry`, `$this->brand->execution_mode`.
   - Add `JSON_INVALID_UTF8_SUBSTITUTE` to `json_encode` calls for `strategy` and `discovery`.

2. **`app/Http/Controllers/Api/ChatController.php`:**
   - Sanitize `$prompt` with `sanitizeForJson()` before `$agent->stream($prompt)` on line 196.

3. **`app/Ai/Storage/SanitizedConversationStore.php`:**
   - Add `private function sanitizeArrayForJson(mixed $value): mixed` that recursively sanitizes strings in arrays/objects.
   - Apply `sanitizeArrayForJson` to decoded `tool_calls` and `tool_results` in `getLatestConversationMessages()`.

4. **`app/Services/LLM/PromptGuardrailService.php`:**
   - Add UTF-8 sanitization in `sanitize()` using `mb_convert_encoding`.

5. **Run tests:**
   - `php artisan test` — confirm 110/110 pass.

6. **Validate:**
   - Manually trigger a chat with a brand whose `strategy`/`discovery` or `llm_methodology` contains malformed UTF-8 bytes.
   - Confirm the `json_encode error` log no longer appears.

## Risks / Edge Cases
- `mb_convert_encoding` silently drops invalid bytes. This is acceptable for LLM context but may slightly alter stored user text.
- Pre-existing conversation records with malformed UTF-8 in `tool_calls`/`tool_results` will be cleaned on read, but the corrupted bytes remain in the DB until the rows are updated.
- The fix covers the OpenAI Responses API gateway used here. If other gateways (Anthropic, Bedrock, etc.) have similar `json_encode` paths, they would need separate review.

## Out of Scope
- Modifying vendor files.
- Adding global middleware to intercept all outbound LLM requests.
