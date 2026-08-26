# Plan: Sync Recent Decisions to DECISIONS.md

## Goal
Append the 5 recently implemented edge-case resolutions to the "Resolved Edge Cases & Quirks" section of `DECISIONS.md`, based on the code changes completed in this session.

## Decisions to Add

The following 5 entries should be appended to the `## Resolved Edge Cases & Quirks` section of `DECISIONS.md`, immediately after the existing "Step completion flow" entry:

### 1. Gemini fragmented tool-call streaming

```markdown
- **Gemini fragmented tool-call streaming**: Gemini's API streams function calls across multiple SSE chunks, each emitted as a separate `ToolCallEvent` with a newly generated UUID (because `mapToolCalls()` in `vendor/laravel/ai` generates `Str::uuid7()` when `$fc['id']` is absent). `useChatStream` previously matched by `id` only, creating duplicate component instances? the first with empty arguments and only the last with complete data. Fixed by adding a name-based fallback merge: when no `id` match is found, the hook matches by `name` and spreads new arguments into the existing entry.
```

**Source file**: `resources/js/hooks/use-chat-stream.ts`
**Decision recorded**: The UUID fragmentation is a backend (laravel/ai SDK) behavior; the frontend hook must be resilient to fragmented streaming by matching on `name` as a fallback key.

### 2. MDX component registration for all wizard components

```markdown
- **MDX component registration for all wizard components**: Only `MindMapCanvas` and `PalettePicker` were registered in `MDX_COMPONENTS` via `PreloadComponents` in `app.tsx`, causing all other 17 wizard components (ColorHierarchyBuilder, MoodboardComposer, DesignConceptExplorer, etc.) to render as invisible custom HTML elements when the AI emitted them as inline JSX in message text. Fixed by registering all 19 components from `ComponentRegistry` (registry.ts) at startup via a loop, including the `MindMap` ?? `MindMapCanvas` alias.
```

**Source file**: `resources/js/app.tsx`
**Decision recorded**: All `ComponentRegistry` entries must be dual-registered: once for `DynamicRenderer` (tool-call path) and once in `MDX_COMPONENTS` (inline-JSX path). `MindMap` is an alias for `MindMapCanvas` because the AI may emit either name.

### 3. onAction injection into MDX-rendered components

```markdown
- **onAction injection into MDX-rendered components**: `MessageContent` now accepts an optional `onAction` prop. The `useMDXComponents` callback in `evaluate()` wraps each registered component with `React.createElement(comp, { ...props, onAction })`, so MDX-embedded components can trigger `complete_step` / `submit_interview` actions back to the AI? matching the behavior of `DynamicRenderer`-rendered tool-call components.
```

**Source file**: `resources/js/components/message-content.tsx`
**Decision recorded**: Both rendering paths (MDX inline JSX and tool-call DynamicRenderer) must receive `onAction` so the workspace can intercept step-completion actions uniformly.

### 4. Shared onAction handler in workspace

```markdown
- **Shared onAction handler in workspace**: The workspace extracted the inline `onAction` handler (previously duplicated in each `DynamicRenderer` instance) into a single `useCallback`-wrapped `handleAction`. This is passed to both `MessageContent` and `DynamicRenderer`, ensuring consistent step-completion behavior across both MDX-inline and tool-call rendering paths.
```

**Source file**: `resources/js/pages/workspace/index.tsx`
**Decision recorded**: A single `handleAction` callback eliminates behavioral divergence between the two component rendering paths and simplifies maintenance.

### 5. MoodboardComposer UX fixes

```markdown
- **MoodboardComposer UX fixes**: `brandId` now properly destructured from props (was previously undefined in `onAction` calls). Asset cards constrained with `max-w-[100px]` and compact `p-2` padding. Dark mode text contrast fixed on all `<select>` elements (`dark:text-gray-200 dark:border-gray-600 dark:bg-gray-900`). Gray-400 fallback (`#9ca3af`) added for missing `color.hex` values. Empty palette placeholder message added when `suggestedPalette` is empty. Unused `exportFormats` replaced with `...rest` pattern.
```

**Source file**: `resources/js/components/dynamic/tools/moodboard.tsx`
**Decision recorded**: Defensive UI patterns for dynamically-rendered components: always provide fallback colors, constrain card dimensions, ensure dark-mode contrast, and destructure `brandId` from props to support `onAction` callbacks.

## Implementation Instructions

1. **Locate insertion point**: In `DECISIONS.md`, find the `## Resolved Edge Cases & Quirks` section and the last bullet starting with `- **Step completion flow**`.
2. **Append** the 5 markdown entries above (in order) after that bullet.
3. **Verify**: `DECISIONS.md` should now have 5 new bullets in the "Resolved Edge Cases & Quirks" section.

## Validation

- [ ] All 5 entries appear in the "Resolved Edge Cases & Quirks" section of `DECISIONS.md`
- [ ] Each entry has the bold-label format matching existing entries (e.g., `- **Bold Title**: description.`)
- [ ] File count of new entries = 5
