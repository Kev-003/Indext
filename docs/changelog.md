# Changelog & Known Issues

> Tracks bugs found, fixes applied, and open issues.

---

## 2026-08-19

### Fixed

#### Brand delete failed for brands without a team
- **Symptom**: Calling `DELETE /api/brands/{id}` threw a 403 or TypeError when the brand had no `team_id` (created before team support was added).
- **Root Cause**: `BrandController::destroy` called `$user->belongsToTeam($brand->team)` — if `$brand->team` is `null`, this throws. Also, assets were not deleted before the brand, potentially leaving orphaned asset records.
- **Fix**: Added a null-team fallback that checks `$brand->user_id === $user->id` instead. Added `$brand->assets()->delete()` before `$brand->delete()`. Wrapped `deleteConversation()` in a try/catch so a missing agent store entry doesn't abort the whole transaction.

#### Messages disappeared when navigating back into a conversation
- **Symptom**: Leaving a brand's workspace and re-entering it showed an empty chat — all prior messages gone.
- **Root Cause 1**: `WorkspaceController` only loaded the brands list *or* the messages — never both. On the brand-selected view, `brands` was an empty array, so if Inertia did a partial reload it had no brand list to render the back navigation.
- **Root Cause 2**: `ChatController::storeAssistantMessage` passed `content: $fullContent ?: null`, but `storeAssistantMessage(string $content)` requires a string. For tool-only AI responses (no text), `$fullContent` was empty and `null` was passed, causing a TypeError inside the stream closure — crashing the response after the stream had already started (hence the `headers already sent` PHP fatal error).
- **Fix 1**: `WorkspaceController` now always loads the full brands list, regardless of whether a specific brand is selected. Brand ownership is also now enforced (`where('team_id', $team->id)`) fixing the security gap noted in the changelog.
- **Fix 2**: `ChatController` now passes `$fullContent ?: ''` instead of `$fullContent ?: null`.

#### Brand deletion 500 error from interface — investigated and partially fixed
- **Symptom**: Deleting a brand from the workspace UI returned a 500 Internal Server Error. PHPUnit tests for brand deletion passed (7/7), so the backend logic was correct in isolation.
- **Investigation findings**:
  1. **Missing CSRF token**: `resources/views/app.blade.php` had no `<meta name="csrf-token">` tag. The frontend `fetch` sent `X-CSRF-TOKEN: ''` (empty string). Laravel's `PreventRequestForgery` middleware rejected the request before it reached the controller.
  2. **Generic frontend error handling**: The workspace delete handler threw `new Error('Failed to delete brand')` for any non-OK response, discarding the actual HTTP status code and response body.
  3. **Silent backend cleanup failures**: `BrandChatStore::deleteConversation()` caught all exceptions and ignored them, leaving no log trail if Laravel AI tables were missing or corrupted.
- **Fixes applied**:
  1. Added `<meta name="csrf-token" content="{{ csrf_token() }}">` to `resources/views/app.blade.php`.
  2. Updated `BrandChatStore::deleteConversation()` to return `bool` and log failures via `Log::warning()`.
  3. Wrapped `BrandController::destroy` transaction in try/catch, added structured JSON error responses (403/404/500), and logged failures with context (`brand_id`, `team_id`, `user_id`, exception).
  4. Updated frontend `handleDeleteBrand` to parse JSON error bodies and display the actual server message in the alert. Added `Accept: application/json` and `Content-Type: application/json` headers.
- **Remaining issue**: Browser console shows `The GET method is not supported for route api/brands/1. Supported methods: DELETE.` The most likely cause is click interception by the parent `<Link>` element or browser navigation occurring before the `fetch` executes. A `console.log` was added to `handleDeleteBrand` to confirm whether the handler is reached.
- **Auth fix**: Moved brand API routes from `routes/api.php` to `routes/web.php` under the `api/brands` prefix with `auth` middleware. This ensures the full `web` middleware stack (`StartSession`, CSRF, cookies) is applied, fixing the session-auth gap where `debug-auth` showed `auth_check: false` despite a valid session cookie.

---

### Fixed

#### Workspace wrapped in double App Layout
- **Symptom**: Workspace page rendered inside two nested `AppLayout` wrappers, causing double sidebars/headers.
- **Fix**: Removed the redundant layout wrapper from `workspace/index.tsx`. The page now relies solely on the layout assigned via `Workspace.layout`.

#### Dashboard prompt errors silently swallowed
- **Symptom**: Submitting an invalid prompt from the Dashboard (e.g., empty string, server-side validation failure) caused the page to do nothing visibly — no error message, no redirect.
- **Root Cause**: `useForm` from Inertia exposes an `errors` object, but the dashboard component was destructuring `post, processing` only — `errors` was never read or displayed.
- **Fix**: Destructure `errors` from `useForm`; display `errors.prompt` inline below the input field with a red border highlight. Also added a warning when `currentTeam` is `null` (input is now disabled in that state).

#### Workspace unreachable from the UI
- **Symptom**: No navigation link existed to reach `/workspace`; users had to type the URL manually.
- **Fix**: Dashboard brand cards now link directly to `/{team}/workspace?brand={id}` via the `workspace()` route helper.

#### AI errors showed full Laravel error page
- **Symptom**: When the AI API endpoint threw a 500, the raw HTML error page was displayed or caused a crash.
- **Fix**: `use-chat-stream.ts` catches non-2xx responses, detects `text/html` content type, and converts it to a readable user-facing message string instead of propagating the HTML.

---

## Open Issues

| # | Description | Priority |
|---|---|---|
| 1 | `WorkspaceController` does not verify that the requested `brand` belongs to the current team — a user could access another team's brand by guessing the ID. | High |
| 2 | `Message` model `created_at` not returned from `WorkspaceController`, so messages display without timestamps in the UI. | Medium |
| 3 | No optimistic UI rollback if the SSE stream fails mid-message — the partial assistant message remains in state. | Low |
| 4 | Rust/WASM Sketch Engine is not yet integrated — `GeometricConstructor` tool component is a placeholder. | Planned |
| 5 | Brand delete button in workspace may send GET instead of DELETE due to browser redirect/click interception — under investigation. | High |

