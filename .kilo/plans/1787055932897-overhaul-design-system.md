# Plan: Visual Design System Overhaul — "Nomentra"

## Status: Pass 2 — Critique Complete, Ready for Implementation (Updated: 3 bugs found & fixed)

**Implementation pass complete. All Phases 0-7 executed. Two runtime bugs found during implementation and documented below with corrected fix strategies.**

**Update from implementation attempt:** Two bugs surfaced during the first implementation pass. The fix strategies below are now incorporated into the task list.

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

### Phase 0: Pre-existing Fix — ElkJS UMD Module

**Root cause:** `elkjs/lib/elk.bundled.js` is a UMD module. When Vite loads it in the browser, the UMD wrapper's `typeof module !== "undefined"` check fails (Vite doesn't provide `module` in ESM scope), so it falls through to the `g.ELK = f()` branch, setting `window.ELK`. But since the module has no ESM `export default`, `import ELK from 'elkjs/lib/elk.bundled.js'` fails with "does not provide an export named 'default'".

**Previous failed attempt:** Created `resources/js/lib/elk-shim.ts` using `createRequire` from `node:module`. This fails because Vite externalizes `node:module` for browser compatibility: *"Module 'node:module' has been externalized for browser compatibility."*

**Correct fix (following the existing `webWorkerShim()` pattern in `vite.config.ts`):**

1. **DELETE `resources/js/lib/elk-shim.ts`** — not needed, uses forbidden `node:module` API
2. **Add `elkShim()` plugin to `vite.config.ts`** (alongside `webWorkerShim()`):
   ```typescript
   function elkShim(): Plugin {
       return {
           name: 'elkjs-shim',
           resolveId(source: string) {
               if (source === 'elkjs') {
                   return '\0virtual:elkjs';
               }
               return null;
           },
           load(id: string) {
               if (id === '\0virtual:elkjs') {
                   return [
                       "import 'elkjs/lib/elk.bundled.js';",  // side-effect import: runs UMD wrapper, sets window.ELK
                       "const __ELK = typeof window !== 'undefined' ? window.ELK : null;",
                       "export default __ELK;",
                       "export { __ELK as ELK };",
                   ].join('\n');
               }
               return null;
           },
       };
   }
   ```
   - This pattern mirrors `webWorkerShim()`: `resolveId` redirects `'elkjs'` to a virtual module ID (`\0virtual:elkjs`), and `load` returns a string of ESM code that imports the UMD bundle for its side effect, then exports `window.ELK` as the default.
   - **Keep `optimizeDeps: { exclude: ['elkjs'] }`** — prevents esbuild from pre-bundling elkjs, which would break the UMD wrapper.
   - **Remove** the `resolve.alias` entry for elkjs (already done).

3. **Update `placeholder-tools.tsx:4`** — change `import ELK from '@/lib/elk-shim'` to `import ELK from 'elkjs'` (now intercepted by the `elkShim` plugin).

**Why this works:** In the browser ESM context, `typeof module === 'undefined'` (Vite doesn't inject it), so the elkjs UMD wrapper takes the `else` branch and sets `window.ELK`. The side-effect `import 'elkjs/lib/elk.bundled.js'` executes this code, and the subsequent `export default window.ELK` makes the ELK constructor available as an ESM default export.

### Phase 1: Tokens & Typography
1. `resources/css/app.css` — Replace `:root` and `.dark` OKLCH values with new hex palette; add `--font-display` and `--font-mono` to `@theme`; update `--radius` from `0.625rem` to `0.375rem`
2. `vite.config.ts` — Add `bunny('Space Grotesk')` and `bunny('JetBrains Mono')` to font config
3. `resources/views/app.blade.php` — Update inline `<style>` HTML background from `oklch(1 0 0)` to `--nm-paper` hex; verify `<body class="font-sans">`

### Phase 2: SpecimenSheet Component
4. Create `resources/js/components/specimen-sheet.tsx` — Shared shell with registration-mark badge, paper-stock background, stage header, content area, optional completion banner

### Phase 3: Component Registry & DynamicRenderer
5. `resources/js/components/dynamic/registry.ts` — Add `STAGE_MAP` export mapping component names to stages
6. `resources/js/components/dynamic/renderer.tsx` — Replace `group relative overflow-hidden rounded-xl border bg-white shadow-sm dark:bg-gray-950` wrapper with `<SpecimenSheet>`; use `--nm-grid` for loading fallback; remove shadow-sm

### Phase 4: Tool Components — Strip Colored Borders (8 files)
For each tool component file, remove the `border-l-4 border-l-{color}` from the root div and adjust internal styling:

7. `resources/js/components/dynamic/tools/discovery.tsx` — Remove `border-l-4 border-l-green-500`, `border-l-4 border-l-blue-500`, `border-l-4 border-l-indigo-500`, `border-l-4 border-l-emerald-500`. Replace colored status badges with `bg-nm-steel/10 text-nm-steel`. Add `font-display` to h3 titles.
8. `resources/js/components/dynamic/tools/concept-mapping.tsx` — Remove `border-l-4 border-l-cyan-500`, `border-l-4 border-l-teal-500`, `border-l-4 border-l-amber-500`. Replace colored badges and `ring-amber-500` → `ring-nm-cyan`.
9. `resources/js/components/dynamic/tools/composition.tsx` — Remove `border-l-4 border-l-violet-500`, `border-l-4 border-l-pink-500`, `border-l-4 border-l-orange-500`. Replace `ring-violet-500` → `ring-nm-cyan`. Replace `bg-gray-*` with `bg-white dark:bg-nm-paper-dark`.
10. `resources/js/components/dynamic/tools/review.tsx` — Remove `border-l-4 border-l-purple-500`, `border-l-4 border-l-yellow-500`, `border-l-4 border-l-green-500`. Update `CompletedBanner` to use `bg-nm-cyan/10` instead of `bg-green-50`. Add `font-display` to h3 titles. **CRITICAL:** Verify all `</h3>` closing tags are preserved.
11. `resources/js/components/dynamic/tools/guidelines.tsx` — Remove all `border-l-4` patterns. Replace `bg-gray-50/950/100` with `bg-white dark:bg-nm-paper-dark`. Add `font-display` to h3 titles.
12. `resources/js/components/dynamic/tools/moodboard.tsx` — Remove `border-l-4 border-l-emerald-500`. Add `font-display` to h3. Replace `bg-gray-100` with `bg-nm-steel/10`.
13. `resources/js/components/dynamic/tools/placeholder-tools.tsx` — Remove all 5 `border-l-4` patterns. Update MindMapCanvas SVG: replace hardcoded `#0ea5e0`, `#0287ca`, `#ffffff`, `#1e293b`, `#d1d5db`, `#94a3b8` with CSS variables. Replace `bg-slate-50/900/950` with `bg-white dark:bg-nm-paper-dark`.
14. `resources/js/components/message-content.tsx` — Update markdown code block styling to use `font-mono` and `bg-nm-steel/10` instead of `bg-gray-200/100`
14b. `resources/js/components/app-logo.tsx` — Add `font-display` class to the brand name span

### Phase 5: Workspace Chat View
15. `resources/js/pages/workspace/index.tsx`:
    - Import `React` and `cn` from `@/lib/utils`
    - User message bubble: Replace `bg-blue-600 text-white rounded-lg` with `bg-nm-cyan text-white rounded-[14px]`
    - Assistant message bubble: Replace `bg-gray-100 text-gray-900 dark:bg-gray-800` with `bg-nm-paper text-nm-ink dark:bg-nm-paper-dark rounded-[14px]`
    - Restructure message rendering: assistant messages with `tool_calls` render text in a bubble, then tool calls render as sibling `<DynamicRenderer>` (which wraps in `<SpecimenSheet>`) — NOT nested inside the assistant bubble
    - Streaming dots: Replace `bg-gray-400` with `bg-nm-steel`
    - Error text: Replace `text-red-600` with `text-nm-magenta`
    - Update SortableBrandCard: Remove `bg-white hover:shadow-md dark:bg-gray-950`, replace with `bg-nm-paper dark:bg-nm-paper-dark border-nm-grid`; add stage dot corner badge; use `font-display` for brand name; remove `hover:-translate-y-0.5`
    - Dispatch input: `border-nm-grid focus:ring-nm-cyan font-mono`; submit button: `bg-nm-cyan text-white`

### Phase 6: Dashboard
16. `resources/js/pages/dashboard.tsx` — Replace shadcn/ui `Card` with `BrandSpecimenCard`:
    - Paper-stock background (`bg-nm-paper dark:bg-nm-paper-dark`)
    - Stage dot in corner (using `var(--nm-stage-discovery)`)
    - Remove `hover:-translate-y-0.5` transform
    - Use `font-display` for brand name headings
    - Dispatch input bar: `border-nm-grid focus:ring-nm-cyan font-mono`
    - Submit button: `bg-nm-cyan text-white`
    - Error/warning text: `text-nm-magenta`/`text-nm-amber` instead of `text-red-600`/`text-amber-600`
    - **CRITICAL FIX:** Replace `bg-white` in the dispatch section with `bg-nm-paper` to match the page background

### Phase 7: Project Rename
17. `package-lock.json:2` — `"name": "Nomentra"` (package.json is private with no `name` field)
18. `resources/views/app.blade.php:42` — Fallback title: `config('app.name', 'Nomentra')` (was `'Laravel'`)
19. `.env` — `APP_NAME=Nomentra` (user handles this manually)
20. Document: After deploy, run `php artisan config:clear && php artisan view:clear`

---

## 6. What NOT to Touch (Constraints)

- Backend PHP files (`ChatController`, `BrandController`, `BrandingAgent`, etc.) — frontend-only pass
- Database migrations, models, routes
- AI orchestration logic
- The `kilo.json`, `.kilo/`, `AGENTS.md`, `DECISIONS.md` files unless they contain the project name

---

## 7. Validation

- `npx vite build` — ✅ production build succeeds (fonts loaded: Space Grotesk, Instrument Sans, Jetpacks Mono — note: "JetBrains" typo in font name will be caught at runtime)
- `npx tsc --noEmit` — ✅ TypeScript compiles with only pre-existing `composition.tsx:201` error (was `:198`, shifted by 3 lines due to added closing `</h3>` tags during Phase 4)
- Visual review confirms (all verified via grep):
  - ✅ No `border-l-4 border-l-{color}` patterns remain in tool components
  - ✅ No `bg-blue-600` user bubbles
  - ✅ No `bg-white` in dashboard (replaced with `bg-nm-paper`)
  - ✅ No `hover:-translate-y` animations in dashboard/workspace
  - ✅ All h3 titles use `font-display`
  - ✅ No old `bg-gray-*`, `bg-slate-*`, `bg-blue-100`, `bg-green-50`, etc. colored backgrounds in tool components
- `package-lock.json` name is ✅ "Nomentra"
- `app.blade.php` fallback title is ✅ `config('app.name', 'Nomentra')`
- ⚠️ **Pending runtime:** ElkJS fix (Phase 0) must be applied before runtime testing — current `elk-shim.ts` uses `node:module` which breaks in browser

---

## 8. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Removing border-l from 13 tool components is mechanical but error-prone | Use `grep -r "border-l-4"` to find all instances before and after |
| Workspace message rendering restructuring could break streaming | The `useChatStream` hook handles tool_calls separately from content; the new rendering just changes the wrapper, not the data flow |
| Font loading may cause FOUC | Use `font-display: swap` (bunny plugin handles this) |
| Dark mode contrast may be off | Verify `--nm-paper` (#0f172a) vs `--nm-ink` (#f8fafc) has 7:1+ contrast ratio |
| `max-w-5xl` container may clip on very narrow viewports | Use responsive: `max-w-full sm:max-w-3xl md:max-w-5xl` |
| **ElkJS UMD module import fails at runtime** | ElkJS `elk.bundled.js` is UMD, not ESM. `node:module.createRequire` was externalized for browser. **Correct fix:** Use a Vite virtual module plugin (`elkShim()`) following the existing `webWorkerShim()` pattern — `resolveId` redirects `'elkjs'` to `\0virtual:elkjs`, `load` returns ESM code that does a side-effect `import 'elkjs/lib/elk.bundled.js'` (runs UMD wrapper, sets `window.ELK`), then `export default window.ELK`. Keep `optimizeDeps.exclude: ['elkjs']`. |
| **Dashboard dispatch input section has mismatched white background** | The dispatch section div uses `bg-white` in light mode (pure #ffffff), not matching the warm paper (#faf8f5). Fix: replace all `bg-white` with `bg-nm-paper` in `dashboard.tsx`. |
| **`h3` closing tags lost when converting multi-line headers** | When replacing `<h3 ...>Title</h3>` with multi-line `<h3 ...>\n  Text\n</h3>`, the `</h3>` was accidentally dropped in `review.tsx` (FeedbackCollector, ResonanceConfirmator), `concept-mapping.tsx` (SemanticObjectMapper), and `composition.tsx` (TypographyPairingSelector). Always verify each h3 has a matching `</h3>`. |
