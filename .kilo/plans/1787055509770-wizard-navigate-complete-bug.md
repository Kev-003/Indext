# Fix: Workspace form "suddenly becomes complete" when navigating out and back

## Goal

A user opening the workspace wizard, partially filling it out (or filling all stages), navigating away (dashboard, another brand, closing/reopening the tab) and returning must NOT see the form locked into a "Submitted" read-only state unless they themselves clicked the submit action. When a form was actually submitted, the user must still be able to reopen and edit it.

## Root-cause hypothesis (to verify during implementation)

1. The 4-stage `ClientInterviewWizard` is read-only once `submitted === true` (`resources/js/components/dynamic/tools/discovery.tsx:104-178`). `submitted` is seeded via `useState(completed ?? false)` (line 36) AND syncs from props via `useEffect` (line 39-43).
2. `ChatMessage` derives `isCompleted` from any of: (a) the matching `tool_result` in conversation history, (b) `brandDiscovery[stepKey]` having content, or (c) `brandStrategy.interview` having content (`resources/js/components/chat/chat-message.tsx:101`).
3. If the user clicks the bottom button labeled **"Continue"** (`discovery.tsx:349`) thinking it advances the stage, `setSubmitted(true)` + `onAction('submit_interview', formData)` fire (line 343-346). The local view flips to read-only immediately. The server persists `strategy.interview = $data`. After navigation out and back, the wizard mounts with `completed=true` from `brandStrategy.interview` and stays read-only.
4. The same shape applies to every other wizard (`KeywordMindMap`, `ColorHierarchyBuilder`, `TypographyPairingSelector`, etc.) — but the user only described the interview scenario, so the fix is centered on `ClientInterviewWizard` first with the same pattern available for the rest.

### Alternative triggers to check while implementing

- `useChatStream` keeps the previous brand's `messages` in state when navigating between brands (`useState(initialMessages)` runs only on first mount). If the same component instance is reused across a brand switch, stale `tool_results` may flip a different brand's wizard to "completed." Mitigated today by `key={brand?.id || 'empty'}` on the wrapper (`workspace/index.tsx:509`) — verify it is still effective after any re-render and that `useChatStream` is reset when `initialConversationId` changes.
- If `brand.strategy` is an empty object `{}` instead of `null` on a brand that has never submitted, `brandStrategy?.interview` is `undefined` and `hasContent(undefined)` returns `false` — safe. Confirm with `hasContent` (already implemented in `chat-message.tsx:27-37`).
- If the `prefilled` prop carries partial data from a previous attempt, `formData` would be pre-populated but `submitted` would remain `false` — safe, but worth verifying.

## Affected files

- `resources/js/components/dynamic/tools/discovery.tsx` — `ClientInterviewWizard` (primary)
- `resources/js/components/chat/chat-message.tsx` — derivation of `isCompleted` / `result` for tool calls
- `resources/js/hooks/use-chat-stream.ts` — confirm `messages` reset when conversation changes
- `resources/js/pages/workspace/index.tsx` — confirm `useChatStream` re-initialization when brand changes
- Optional follow-up: same edit-after-submit affordance on the other 5 step tools (`concept-mapping`, `composition`, `moodboard`, etc.) — only if the same bug is reproducible on them.

## Tasks

1. **Verify the root cause in the running app.** Reproduce the exact flow the user described in a dev session:
   - Open a brand with no interview data. Confirm the wizard renders in editable form.
   - Fill all 4 stages. Click the bottom button. Confirm it submits and goes read-only.
   - Navigate to dashboard. Navigate back to the same brand. Confirm wizard is read-only.
   - Reset by deleting the brand and creating a new one. Repeat but click the back-arrow in the browser (or a sidebar link) **before** clicking the bottom button. Confirm the wizard is empty/editable on return (this is the bug scenario the user reported — verify the symptom is read-only rather than empty/reset).
   - Note: if the bug only manifests after a click of "Continue," that click is the actual trigger; the "navigating out" is just how the user re-enters the form. The fix below still applies.
2. **Rename the submit affordance** in `ClientInterviewWizard` from "Continue" to "Submit Interview" (or "Complete Interview"). This is the single most important user-facing fix — the label is the proximate cause of the user's misperception that the form "became complete" without their action.
3. **Allow re-editing after submit.** Replace the hard read-only `if (submitted) { return <SubmittedSummary /> }` branch with a layout that:
   - Always shows the form fields pre-filled from `formData` (or `prefilled` on first mount).
   - When `submitted === true`, also renders a "Submitted ✓" badge and the read-only summary panel **above** the form.
   - Adds a single "Edit answers" button when `submitted` is true. Clicking it flips local `editing=true` so the user can modify fields. A new "Update Interview" button (replacing the original Continue/Submit) sends `submit_interview` again with the new data and resets `submitted=true` on response. This mirrors the re-confirm pattern already documented for other tools.
4. **Sync `formData` from `result` when the wizard remounts on a previously completed step.** Currently the wizard ignores `result` (the `brandStrategy.interview` payload). Add a `useEffect` that, when `result` is present and differs from current `formData`, seeds `formData` from `result` on first mount. This prevents the form from appearing empty if the user edits and the server response has different field names. Only run once on mount to avoid stomping the user's in-progress edits.
5. **Reset `messages` in `useChatStream` when `initialConversationId` changes.** Add a `useEffect` that detects a change in `initialConversationId` and calls `setMessages(initialMessages)` if the new id is different. Prevents stale tool_results from a prior brand bleed-through if the Inertia page instance is reused.
6. **Verify the `key={brand?.id || 'empty'}` wrapper on the brand chat mode** (`workspace/index.tsx:509`) still forces a full remount of the chat subtree when the brand changes. If the user reports the bug after switching between two brands (not just navigating to dashboard and back), this is the right layer to also remount `useChatStream` by moving it inside the keyed subtree, or by keying the hook consumer.
7. **Validation**:
   - `npx tsc --noEmit` clean
   - `npx vite build` clean
   - `npx eslint <modified files>` clean (the only newly added useEffect for `formData` sync must use `// eslint-disable-next-line react-hooks/set-state-in-effect`)
   - `php artisan test` (existing suite) clean
   - Manual: repeat the reproduction steps from task 1 and confirm (a) the button label is unambiguous, (b) navigating out and back leaves the form editable when no submit has happened, (c) after submit the user can re-edit and re-submit without losing data.
8. **Update `DECISIONS.md`** under a new section `## Wizard Re-Edit & Navigation Robustness (2026-09-02)` covering: label rename, re-edit affordance, `formData` seed from `result`, `useChatStream` reset on conversation change, and the rationale for keeping the key-on-brand wrapper.

## Out of scope

- Reverting the prettier-only formatting changes already on `discovery.tsx`. (Leave as-is.)
- Re-introducing the shared `SavedButton` / `CompletedBanner` / `MindGraph` components that the user reverted.
- Changes to the AI agent's `BrandingAgent` prompt.
- Adding edit-after-submit affordance to the 5+ non-interview step tools in this round. The pattern in task 3 is the template; apply it to others only if they reproduce the same bug.

## Open questions to confirm before / during implementation

- **Q1**: After clicking the bottom button, does the user expect to see the next step of the wizard (multi-page interview) or to submit the whole interview? Today it submits. If they expected multi-page, the fix is also a stage-router rewrite. *(Recommendation: keep single submit; the 4 stage-cards at the top are just visual progress indicators today, not actual pages.)*
- **Q2**: When the user re-edits and resubmits, should the server allow overwriting `strategy.interview`, or only allow one final submit? *(Recommendation: allow overwrite; this is consistent with the existing `STEP_COMPLETE` overwrite of `brand.discovery[step]`.)*
- **Q3**: If the user navigates away mid-edit (not yet submitted), should the in-progress form data be auto-saved as a draft? *(Recommendation: out of scope; would require a new `draft` column and a debounced PATCH. Confirm with user before adding.)*

## Acceptance criteria

- The submit button is labeled clearly (no "Continue" ambiguity).
- Submitting, navigating away, and returning shows the wizard in editable form pre-filled with the previous answers.
- A user who never clicked submit sees an editable empty form on every return visit.
- Switching brands while a wizard is on screen does not show the previous brand's "completed" state.
- All existing tests still pass; no new console errors; `tsc` and `vite build` are clean.
