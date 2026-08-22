# Plan: Make Gemini the working primary provider

## Already completed
- [x] Strip BOM from all `app/**/*.php` files (`DeepSeekProvider.php`, `GeminiProvider.php`, `OpenAIProvider.php` were affected).
- [x] Add conversation stability logging in `ChatController::message()` (reuse vs create).
- [x] Add `conversation_id` logging in `useChatStream` (sent vs received).
- [x] Confirm `LLMProviderRouter` is wired as singleton in `AppServiceProvider` and reads keys from `config('services.gemini.api_key')` / `env('GEMINI_API_KEY')`.
- [x] Confirm `.env` has `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-3.5-flash`, `LLM_PROVIDER=gemini`.

## Remaining implementation tasks

### 1. Harden `GeminiProvider` response parsing
In `app/Services/LLM/GeminiProvider.php`:
- Add a `parseChatResponse(array $data, array $tools): LLMResponse` helper.
- In `chat()`, replace inline parsing with a call to `parseChatResponse()`.
- In `streamChat()`, reuse the same defensive parsing logic:
  - `candidates` may be missing or empty.
  - `content` may be a string instead of an array.
  - `parts` may be a string instead of an array.
  - On parse failure or empty candidates, log the raw response (truncated to ~2000 chars) via `Log::channel('single')->warning(...)`.
- Add a `safeTruncate(array $payload, int $maxLength = 2000): string` helper for safe logging.
- Keep `streamChat` and `chat` throwing on HTTP/network errors; only wrap the parsing, not the request.

### 2. Verify tool payload shape for Gemini
In `GeminiProvider::buildPayload()`:
- Confirm `tools` uses `functionDeclarations` with `name`, `description`, `parameters`.
- Confirm `systemInstruction` uses `parts` with `text`.
- Confirm assistant `tool_calls` map to `role: model` + `functionCall` parts.
- Confirm tool results map to `role: user` + `functionResponse` parts.
- No structural changes needed unless a mismatch is found.

### 3. Keep model name consistent
- `.env` already has `GEMINI_MODEL=gemini-3.5-flash`.
- `GeminiProvider` constructor default is `gemini-2.0-flash-exp` but the router overrides it with the env value, so no change needed.

### 4. Run validation
- `php artisan test` (uses `ChatPersistenceTest` mocks; should pass unchanged).
- `npm run types:check` (frontend TS check).
- If available, run `php artisan config:clear` before testing to ensure env values are fresh.

## Out of scope
- DeepSeek/OpenAI provider fixes (left as open fallback options).
- Changing the conversation data model.
- Adding retry logic for failed LLM calls.
