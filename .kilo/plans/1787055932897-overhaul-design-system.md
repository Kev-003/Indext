# Plan: Visual Design System Overhaul — "Nomentra"

## Status: Pass 1 — Plan Complete

---

## 0. Product Grounding (from `docs/specs/brand-platform-feature-spec`)

A guided brand-development tool: AI directs, user executes. The front door is a single AI prompt. AI responses are either conversational text or interactive tool components pre-loaded with the user's own derived material. Tool components render inline as the conversation progresses. The AI never outputs finished assets.

**What this means visually**: The UI must distinguish two fundamentally different things:
1. **Conversation** — the AI and user talking (planning, asking, confirming)
2. **Tool surfaces** — working instruments the AI hands the user (mind-map canvas, constructor, palette picker)

Everything in this plan serves that distinction.

---

## 1. Color Palette — Grounded in CMYK Process Printing & Technical Drafting

All colors reference the physical materials brand designers work with: CMYK process inks, uncoated paper stock, print registration marks, steel drafting tools.

### Light Mode CSS Variable Replacements (in `app.css`)

Replace the OKLCH grayscale values in `:root` with:

```
--background: #faf8f5        → --nm-paper (warm uncoated paper stock)
--foreground: #0f172a        → --nm-ink (technical pen ink)
--card: #faf8f5              → same as paper
--card-foreground: #0f172a   → same as ink
--primary: #0891b2           → --nm-cyan (CMYK Process Cyan)
--primary-foreground: #ffffff → white (keeps contrast on cyan)
--secondary: #f8fafc        → off-white for secondary surfaces
--secondary-foreground: #0f172a
--muted: #f8fafc             → paper variant
--muted-foreground: #64748a → --nm-steel
--accent: #f8fafc            → paper variant (hover states)
--accent-foreground: #0891b2 → --nm-cyan
--border: #e5e1d9            → --nm-grid (drafting vellum)
--input: #e5e1d9
--ring: #0891b2              → --nm-cyan (focus rings)
--radius: 0.375rem           → 6px (precision tool feel, not rounded)
```

### Dark Mode CSS Variable Replacements (in `.dark`)

Mirror the same structure:
```
--background: #0f172a        → --nm-paper (deep technical ink)
--foreground: #f8fafc        → --nm-ink (paper white)
--card: #0f172a
--card-foreground: #f8fafc
--primary: #22d3ee           → brighter cyan
--primary-foreground: #0f172a
--secondary: #1e293b
--muted: #1e293b
--muted-foreground: #94a3b8
--border: #1e293b
--input: #1e293b
--ring: #22d3ee
--radius: 0.375rem
```

### Stage Discipline Colors

Each brand-development stage gets a CMYK-derived color. Used as registration-mark badges on specimen sheets, not as colored borders.

| Stage | Hex | Reference |
|-------|-----|-----------|
| Discovery | `#0891b2` | CMYK Process Cyan — foundation/interview |
| Concept Mapping | `#dc2626` | CMYK Process Magenta — ideation/mind-mapping |
| Composition | `#f59e0b` | Light table amber — creation/construction |
| Review | `#334159` | Print registration black — evaluation |
| Guidelines | `#64748a` | Drafting tool steel — documentation |
| Assets | `#cbd5e1` | Cool gray — deliverables/library |

### Anti-Default Check
1. **Warm cream + serif + terracotta (#D97757)**: AVOIDED — No warm cream background (using warm paper, not cream). No serif. No terracotta.
2. **Near-black + acid-green/vermilion**: AVOIDED — Dark mode uses deep technical ink (#0f172a), not pure black. Using cyan/magenta/amber, not acid green.
3. **Broadsheet hairline rules + zero border-radius**: AVOIDED — 6px radius on cards, 14px on bubbles. Generous white space. Hairline rules only for subtle dividers.

---

## 2. Typography — Brand Design Reference Typefaces

| Role | Typeface | Purpose | Grounded In |
|------|----------|---------|-------------|
| Display | **Space Grotesk** | Specimen sheet titles, dashboard headings, stage labels | Geometric sans with subtle character; used by brand identity studios (Instrument, Collins) |
| Body | **Instrument Sans** | Chat messages, form labels, body copy | Already in use; warm, readable at small sizes |
| Utility/Mono | **JetBrains Mono** | Hex codes, CMYK values, IDs, data tables, technical labels | Developer-designed monospace with design-tool credibility (Figma, Linear) |

### Font Config Changes (`vite.config.ts`)
```typescript
fonts: [
    bunny('Instrument Sans', { weights: [400, 500, 600] }),
    bunny('Space Grotesk', { weights: [400, 500, 600, 700] }),
    bunny('JetBrains Mono', { weights: [400, 500, 600] }),
],
```

### CSS Variable Changes (`app.css` `@theme` block)
```css
--font-sans: 'Instrument Sans', ...;
--font-display: 'Space Grotesk', sans-serif;
--font-mono: 'JetBrains Mono', monospace;
```

### Class Usage
- `font-sans` → body text (Instrument Sans)
- `font-display` → titles, stage labels (Space Grotesk)
- `font-mono` → technical data (JetBrains Mono)

---

## 3. Signature Element — "Specimen Sheets"

**What it is**: Tool results render as "specimen sheets" — visual references to physical brand-guideline specimen cards and print-production registration marks.

Instead of flat chat bubbles or cards with `border-l-4 border-l-{color}`, each tool invocation produces:

1. A **registration-mark corner badge**: Small colored square (stage discipline color) in the top-left corner with the stage name as text
2. **Paper-stock background**: `--nm-paper` with subtle border
3. **Full-width breakout**: Spans the conversation width, not confined to an 80% bubble
4. **Stage header**: Uppercase stage label + tool title above the content

**Why grounded in subject matter**: Brand guidelines include physical "specimen sheets" — printed cards showing logo usage, color systems, typography. Print production uses registration marks to align CMYK plates. This is literally what the product's users create.

### SpecimenSheet Component Interface (`resources/js/components/specimen-sheet.tsx`)

```typescript
interface SpecimenSheetProps {
    stage: 'discovery' | 'concept' | 'composition' | 'review' | 'guidelines' | 'assets';
    stageLabel: string;
    title: string;
    completed?: boolean;
    completionLabel?: string;
    children: React.ReactNode;
    className?: string;
}
```

### Component-to-Stage Mapping

Add to `resources/js/components/dynamic/registry.ts`:

```typescript
export const STAGE_MAP: Record<string, { stage: StageKey; label: string }> = {
    ClientInterviewWizard:       { stage: 'discovery', label: 'CLIENT INTERVIEW' },
    VisualPillarExtractor:      { stage: 'discovery', label: 'VISUAL PILLARS' },
    BrandStrategyOverview:        { stage: 'discovery', label: 'STRATEGY OVERVIEW' },
    KeywordMindMap:               { stage: 'concept', label: 'KEYWORD MIND MAP' },
    SemanticObjectMapper:         { stage: 'concept', label: 'SEMANTIC MAPPING' },
    DesignConceptExplorer:        { stage: 'concept', label: 'CONCEPT EXPLORER' },
    TypographyPairingSelector:    { stage: 'composition', label: 'TYPOGRAPHY' },
    ColorHierarchyBuilder:        { stage: 'composition', label: 'COLOR SYSTEM' },
    LogoCompositionBuilder:       { stage: 'composition', label: 'LOGO COMPOSITION' },
    DirectionComparator:          { stage: 'review', label: 'DIRECTION COMPARE' },
    FeedbackCollector:            { stage: 'review', label: 'FEEDBACK' },
    ResonanceConfirmator:         { stage: 'review', label: 'CONFIRM DIRECTION' },
    BrandGuidelineDocument:       { stage: 'guidelines', label: 'BRAND GUIDELINES' },
    LogoUsageGuide:               { stage: 'guidelines', label: 'LOGO USAGE' },
    ColorSystemDocument:          { stage: 'guidelines', label: 'COLOR SYSTEM' },
    AssetPatternLibrary:          { stage: 'guidelines', label: 'ASSET LIBRARY' },
    TypographyHierarchyDoc:       { stage: 'guidelines', label: 'TYPOGRAPHY' },
    DevHandoffPackage:            { stage: 'guidelines', label: 'DEV HANDOFF' },
    MoodboardComposer:            { stage: 'assets', label: 'MOODBOARD' },
    MindMapCanvas:                { stage: 'concept', label: 'MIND MAP' },
    PalettePicker:                { stage: 'composition', label: 'PALETTE' },
    GeometricConstructor:         { stage: 'composition', label: 'GEOMETRY' },
    ReviewView:                   { stage: 'review', label: 'DIRECTION REVIEW' },
    GuidelinePreview:             { stage: 'guidelines', label: 'GUIDELINE PREVIEW' },
};
```

---

## 4. Layout Wireframes

### 4.1 Workspace Chat View
```
┌─────────────────────────────────────────────────────────────┐
│  Brand Name                                 [⋮ Actions]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│     ┌─ ASSISTANT MESSAGE ───────────────────────────────┐   │
│     │                                                      │   │
│     │ Hi! Let's start with a quick interview...            │   │ ← Paper bubble, soft radius (14px)
│     │                                                      │   │
│     └──────────────────────────────────────────────────────┘   │
│                                                             │
│             ┌─ USER MESSAGE ───────────────────────────────┐ │
│             │                                               │ │ ← Cyan bubble, tail at right
│             │ Tell me about your coffee brand.            │ │
│             │                                               │ │
│             └───────────────────────────────────────────────┘ │
│                                                             │
│  ┌─ Specimen Sheet ───────────────────────────────────────┐ │
│  │ ◼ DISCOVERY    CLIENT INTERVIEW                         │ │ ← Registration-mark badge + title
│  │                                                        │ │
│  │ [Wizard: Business Name, Mission, Audience, Tone]      │ │
│  │                                                        │ │
│  │ [Continue]                                             │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─ INPUT BAR ─────────────────────────────────────────────┐ │
│  │ [ What do you want to build for your brand? ]          │ │
│  │                                                    [Send] │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Brand List Dashboard
```
┌─────────────────────────────────────────────────────────────┐
│ NOMENTRA   Dashboard                            [User v]   │
├─────────────────────────────────────────────────────────────┤
│  Recent Brands                                               │
│  Select a brand to resume editing, or start a new direction. │
│                                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────┐          │
│  │ ◼ Coffee Co  │ │ ◼ Studio    │ │ + New      │          │
│  │  Active      │ │  In Progress │ │ Project    │          │
│  │  2 days ago  │ │  1 week ago  │ │ [type...  │          │
│  └──────────────┘ └──────────────┘ └───────────┘           │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Start or Resume Brand                                   │ │
│  │ [ Describe what you're building...                 ]   │ │
│  │                                                [Go]     │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Shared Tool Card Shell (SpecimenSheet)
```
┌─ Specimen Sheet ────────────────────────────────────────────┐
│ ◼ DISCOVERY    CLIENT INTERVIEW                             │
│                                                            │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │  [Component Content Area]                              │ │
│ │                                                          │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                            │
│ ┌─ Actions ──┐  ┌─ Step ─┐                                 │
│ │ [Save]     │  │ 1/4    │                                 │
│ └────────────┘  └─────────┘                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Implementation Tasks (Ordered)

### Phase 1: Tokens & Typography
1. `resources/css/app.css` — Replace `:root` and `.dark` OKLCH values with new hex palette; add `--font-display` and `--font-mono` to `@theme`; update `--radius` from `0.625rem` to `0.375rem`
2. `vite.config.ts` — Add `bunny('Space Grotesk')` and `bunny('JetBrains Mono')` to font config
3. `resources/views/app.blade.php` — Ensure `<body>` uses appropriate font classes (`font-sans`)

### Phase 2: SpecimenSheet Component
4. Create `resources/js/components/specimen-sheet.tsx` — Shared shell with registration-mark badge, paper-stock background, stage header, content area, optional completion banner

### Phase 3: Component Registry & DynamicRenderer
5. `resources/js/components/dynamic/registry.ts` — Add `STAGE_MAP` export mapping component names to stages
6. `resources/js/components/dynamic/renderer.tsx` — Replace `group relative overflow-hidden rounded-xl border bg-white shadow-sm dark:bg-gray-950` wrapper with `<SpecimenSheet>`; remove `animate-pulse` loading state styling (use `--nm-grid` instead of gray-200/gray-800); remove shadow-sm

### Phase 4: Tool Components — Strip Colored Borders (8 files)
For each tool component file, remove the `border-l-4 border-l-{color}` from the root div and adjust internal styling:

7. `resources/js/components/dynamic/tools/discovery.tsx` — Remove `border-l-4 border-l-blue-500`, `border-l-4 border-l-indigo-500`, `border-l-4 border-l-emerald-500`. Replace status badges (`bg-blue-100 text-blue-800` → `--nm-cyan` variants). Remove internal h3 titles (SpecimenSheet provides them).
8. `resources/js/components/dynamic/tools/concept-mapping.tsx` — Remove `border-l-4 border-l-cyan-500`, `border-l-4 border-l-teal-500`, `border-l-4 border-l-amber-500`. Replace `ring-amber-500` → stage amber.
9. `resources/js/components/dynamic/tools/composition.tsx` — Remove `border-l-4 border-l-violet-500`, `border-l-4 border-l-pink-500`, `border-l-4 border-l-orange-500`. Replace `ring-violet-500`, `ring-pink-500` → stage colors.
10. `resources/js/components/dynamic/tools/review.tsx` — Remove `border-l-4 border-l-purple-500`, `border-l-4 border-l-yellow-500`, `border-l-4 border-l-green-500`. Replace `CompletedBanner` background `green-50` → `--nm-cyan` variant.
11. `resources/js/components/dynamic/tools/guidelines.tsx` — Remove `border-l-4 border-l-emerald-500`, `border-l-4 border-l-blue-500`, `border-l-4 border-l-pink-500`, etc. Replace `bg-gray-50 dark:bg-gray-900` with `--nm-grid` variant.
12. `resources/js/components/dynamic/tools/moodboard.tsx` — Remove `border-l-4 border-l-emerald-500`.
13. `resources/js/components/dynamic/tools/placeholder-tools.tsx` — Remove `border-l-4 border-l-cyan-500`, `border-l-4 border-l-green-500`, `border-l-4 border-l-purple-500`, `border-l-4 border-l-orange-500`, `border-l-4 border-l-emerald-500`. Update MindMapCanvas SVG fill/stroke colors from hardcoded `#0ea5e0`/`#0287ca`/`#ffffff`/`#1e293b`/`#d1d5db`/`#94a3b8` to CSS variables.
14. `resources/js/components/message-content.tsx` — Update markdown code block styling to use `font-mono` and `--nm-steel` text color

### Phase 5: Workspace Chat View
15. `resources/js/pages/workspace/index.tsx`:
    - User message bubble: Replace `bg-blue-600 text-white rounded-lg` with `bg-nm-cyan text-white rounded-[14px]` (soft bubble with tail)
    - Assistant message bubble: Replace `bg-gray-100 text-gray-900 dark:bg-gray-800` with `bg-nm-paper text-nm-ink rounded-[14px]` (paper bubble)
    - Restructure message rendering: assistant messages with `tool_calls` render the text content in a bubble, then tool calls render as sibling `<SpecimenSheet>` components (not nested inside the bubble)
    - Wrap all message content in `max-w-5xl mx-auto` container
    - Remove `bg-gray-100`/`bg-gray-800` from all inline divs, replace with CSS variables
    - Update SortableBrandCard: Remove `rounded-lg border bg-white hover:shadow-md dark:bg-gray-950`, replace with `BrandSpecimenCard` pattern

### Phase 6: Dashboard
16. `resources/js/pages/dashboard.tsx` — Replace shadcn/ui `Card` with `BrandSpecimenCard`:
    - Paper-stock background (`--nm-paper`)
    - Stage dot in corner (using brand's current stage status)
    - Remove `hover:-translate-y-0.5` transform
    - Use `font-display` for brand name headings
    - Dispatch input bar: `--nm-cyan` focus ring

### Phase 7: Project Rename
17. `package.json:2` — `"name": "Indext"` → `"name": "Nomentra"`
18. `.env` — `APP_NAME=Nomentra` (user handles this manually)
19. Document: After deploy, run `php artisan config:clear && php artisan view:clear`

---

## 6. What NOT to Touch (Constraints)

- Backend PHP files (`ChatController`, `BrandController`, `BrandingAgent`, etc.) — frontend-only pass
- Database migrations, models, routes
- AI orchestration logic
- The `kilo.json`, `.kilo/`, `AGENTS.md`, `DECISIONS.md` files unless they contain the project name

---

## 7. Validation

- `npx vite build` — production build succeeds with no errors
- `npx tsc --noEmit` — TypeScript compiles (existing `composition.tsx:198` error is acceptable)
- Visual review confirms:
  - No `border-l-4 border-l-{color}` patterns remain in tool components
  - No flat `bg-blue-600` user bubbles
  - Specimen sheets have registration-mark badges, not colored left borders
  - Dashboard cards have stage dots, not hover lift animations
  - All text uses Space Grotesk (display) / Instrument Sans (body) / JetBrains Mono (technical)
- `package.json` name is "Nomentra"
- Anti-default check passes: no terracotta, no near-black+acid-green, no hairline-broadsheet-zero-radius layout

---

## 8. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Removing border-l from 13 tool components is mechanical but error-prone | Use `grep -r "border-l-4"` to find all instances before and after |
| Workspace message rendering restructuring could break streaming | The `useChatStream` hook handles tool_calls separately from content; the new rendering just changes the wrapper, not the data flow |
| Font loading may cause FOUC | Use `font-display: swap` (bunny plugin handles this) |
| Dark mode contrast may be off | Verify `--nm-paper` (#0f172a) vs `--nm-ink` (#f8fafc) has 7:1+ contrast ratio |
| `max-w-5xl` container may clip on very narrow viewports | Use responsive: `max-w-full sm:max-w-3xl md:max-w-5xl` |
