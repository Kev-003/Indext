# System Patterns — Component Library Specification

> Last updated: 2026-08-19

## Core Constraint

> **The AI orchestrates and surfaces interactive UI tools. It NEVER generates finished logo marks or final assets directly.**

---

## 1. DISCOVERY & STRATEGY COMPONENTS

### 1.1 `ClientInterviewWizard`

| Field | Value |
|---|---|
| **Purpose** | Stage 1 of discovery: captures business context, mission, audience, and tone through an AI-guided interview flow. |
| **AI Tool Call Schema** | `{ "component": "ClientInterviewWizard", "props": { "sessionId": "uuid", "stage": "business|mission|audience|tone", "prefilled": {} } }` |
| **User Interactions** | Text inputs, multiple-choice selectors, tone sliders, skip/revisit navigation. |
| **Brand State Outputs** | `Brand.strategy.mission`, `Brand.strategy.values`, `Brand.discovery.audience_profile`, `Brand.discovery.tone_attributes` |

### 1.2 `VisualPillarExtractor`

| Field | Value |
|---|---|
| **Purpose** | Stage 2-3 bridge: AI extracts 2-4 visual pillars from interview data and presents them for user confirmation/adjustment. |
| **AI Tool Call Schema** | `{ "component": "VisualPillarExtractor", "props": { "sessionId": "uuid", "suggestedPillars": ["Minimalism", "Precision", "Warmth"], "brandId": 1 } }` |
| **User Interactions** | Drag-to-reorder pillars, inline text edit, add/remove pillar, strength/confidence slider per pillar. |
| **Brand State Outputs** | `Brand.strategy.visual_pillars[]` |

### 1.3 `BrandStrategyOverview`

| Field | Value |
|---|---|
| **Purpose** | Stage 4 summary: renders the complete brand strategy document for user review before moving to concept exploration. |
| **AI Tool Call Schema** | `{ "component": "BrandStrategyOverview", "props": { "brandId": 1, "readonly": false } }` |
| **User Interactions** | Inline editing of mission/values, expandable sections, approve/reject per section, request AI rewrite. |
| **Brand State Outputs** | Updates all `Brand.strategy.*` and `Brand.discovery.*` fields atomically on save. |

---

## 2. CONCEPT MAPPING & DISCOVERY COMPONENTS

### 2.1 `KeywordMindMap`

| Field | Value |
|---|---|
| **Purpose** | Interactive mind-map canvas displaying keywords and derived concepts extracted from the interview. |
| **AI Tool Call Schema** | `{ "component": "KeywordMindMap", "props": { "brandId": 1, "rootNode": "Brand", "keywords": ["Authentic", "Handcrafted", "Local"], "layout": "radial|tree" } }` |
| **User Interactions** | Add/remove nodes, drag nodes to rearrange, click node to expand synonyms, double-click to rename, right-click for context actions (pin, color, delete). |
| **Brand State Outputs** | `Brand.discovery.keyword_map`, `Brand.discovery.mind_map.nodes[]` |

### 2.2 `SemanticObjectMapper`

| Field | Value |
|---|---|
| **Purpose** | Maps abstract brand keywords to tangible visual objects/metaphors (e.g., "growth" -> "sprout", "structure" -> "grid"). |
| **AI Tool Call Schema** | `{ "component": "SemanticObjectMapper", "props": { "brandId": 1, "keyword": "Growth", "suggestions": ["Sprout", "Branch", "Spiral"], "mode": "tangible|abstract" } }` |
| **User Interactions** | Accept/reject suggestions, upload reference image, draw quick sketch, save mapping to keyword. |
| **Brand State Outputs** | `Brand.discovery.semantic_mappings[{keyword, object, image_ref}]` |

### 2.3 `DesignConceptExplorer`

| Field | Value |
|---|---|
| **Purpose** | Displays 2-3 AI-generated design concept directions with mood boards, color swatches, and typographic references for user comparison. |
| **AI Tool Call Schema** | `{ "component": "DesignConceptExplorer", "props": { "brandId": 1, "concepts": [ { "id": "c1", "name": "Direction A", "mood": "Industrial", "colors": ["#1a1a2e"], "typography": "Instrument Sans" } ] } }` |
| **User Interactions** | Side-by-side comparison, vote/favorite per direction, request AI refinement on a specific direction, merge elements across directions. |
| **Brand State Outputs** | `Brand.discovery.design_concepts[]`, `Brand.discovery.shortlisted_direction_ids[]` |

---

## 3. CONSTRUCTIVE DESIGN & COMPOSITION COMPONENTS

### 3.1 `GeometricConstructor`

| Field | Value |
|---|---|
| **Purpose** | Primary mark-building tool. Users construct logo marks from geometric primitives using grids, snapping, and WASM-powered sketch refinement. |
| **AI Tool Call Schema** | `{ "component": "GeometricConstructor", "props": { "brandId": 1, "mode": "Beginner|Experienced", "primitives": ["circle", "square", "triangle"], "gridSize": 8, "canvasSize": { "w": 512, "h": 512 } } }` |
| **User Interactions** | Add/remove primitives, drag/resize/rotate, grid snapping toggle, WASM "beautify" button (RDP simplification + Schneider bezier fitting), undo/redo, save snapshot. |
| **Brand State Outputs** | `BrandAsset` records (`type: logo_icon`, `content: { svg, primitives, transform }`), `Brand.discovery.geometric_preferences` |

### 3.2 `TypographyPairingSelector`

| Field | Value |
|---|---|
| **Purpose** | Lets users browse, compare, and select typographic pairings with AI recommendations based on brand pillars. |
| **AI Tool Call Schema** | `{ "component": "TypographyPairingSelector", "props": { "brandId": 1, "recommendedPairs": [ { "heading": "Playfair Display", "body": "Inter" } ], "filters": ["serif", "sans", "geometric"] } }` |
| **User Interactions** | Filter by category, preview sample text in pairing, adjust size/weight/line-height, save pairing, request AI rationale. |
| **Brand State Outputs** | `Brand.strategy.typography_pairing`, `Brand.discovery.typography_preferences` |

### 3.3 `ColorHierarchyBuilder`

| Field | Value |
|---|---|
| **Purpose** | Builds the brand color system with 60-30-10 hierarchy, CMYK print vs RGB digital separation, and accessibility checks. |
| **AI Tool Call Schema** | `{ "component": "ColorHierarchyBuilder", "props": { "brandId": 1, "suggestedPalette": [ { "role": "primary", "hex": "#1a1a2e", "cmyk": [90, 80, 60, 40] } ], "mode": "digital|print|both" } }` |
| **User Interactions** | Add/remove colors, assign hierarchy role, toggle CMYK/RGB view, contrast checker, save palette, export CSS/Swift/Android. |
| **Brand State Outputs** | `Brand.strategy.color_system`, `Brand.discovery.color_preferences` |

### 3.4 `LogoCompositionBuilder`

| Field | Value |
|---|---|
| **Purpose** | Arranges the finalized icon mark with wordmark, lockups, and clearspace rules. |
| **AI Tool Call Schema** | `{ "component": "LogoCompositionBuilder", "props": { "brandId": 1, "iconAssetId": 42, "wordmark": "Brand Name", "suggestedLockups": ["horizontal", "stacked", "icon-only"] } }` |
| **User Interactions** | Drag icon relative to wordmark, toggle lockup orientation, adjust clearspace, preview on mockups, save composition. |
| **Brand State Outputs** | `BrandAsset` records (`type: logo_lockup`, `content: { arrangement, clearspace, mockups }`), `Brand.guideline.logo_guidelines` |

---

## 4. REVIEW & NARROWING COMPONENTS

### 4.1 `DirectionComparator`

| Field | Value |
|---|---|
| **Purpose** | Side-by-side comparison of 2-3 user-built directions with AI-generated pros/cons. |
| **AI Tool Call Schema** | `{ "component": "DirectionComparator", "props": { "brandId": 1, "directions": [ { "id": "d1", "name": "Industrial", "assets": [ ... ] } ], "comparisonDimensions": ["memorability", "versatility", "timelessness"] } }` |
| **User Interactions** | Select winning direction, vote per dimension, request hybrid merge, annotate with feedback. |
| **Brand State Outputs** | `Brand.discovery.direction_feedback`, `Brand.discovery.selected_direction_id` |

### 4.2 `FeedbackCollector`

| Field | Value |
|---|---|
| **Purpose** | Structured feedback form presented by AI after presenting a direction or asset. |
| **AI Tool Call Schema** | `{ "component": "FeedbackCollector", "props": { "brandId": 1, "target": "logo_direction_1", "questions": ["What resonates?", "What feels off?"], "scale": 1-5 } }` |
| **User Interactions** | Star ratings, text feedback, emoji reactions, skip, request new direction. |
| **Brand State Outputs** | `Brand.discovery.feedback_entries[]`, `Brand.discovery.iteration_count` |

### 4.3 `ResonanceConfirmator`

| Field | Value |
|---|---|
| **Purpose** | Final confirmation step before locking a direction and moving to guidelines generation. |
| **AI Tool Call Schema** | `{ "component": "ResonanceConfirmator", "props": { "brandId": 1, "directionId": "d1", "summary": "..." } }` |
| **User Interactions** | Confirm / Request changes / Start over. |
| **Brand State Outputs** | `Brand.status` transitions from `refinement` -> `delivered`, `Brand.discovery.locked_direction_id` |

---

## 5. GUIDELINES & HANDOFF COMPONENTS

### 5.1 `BrandGuidelineDocument`

| Field | Value |
|---|---|
| **Purpose** | Interactive, live brand guidelines document covering all sections. |
| **AI Tool Call Schema** | `{ "component": "BrandGuidelineDocument", "props": { "brandId": 1, "sections": ["logo", "color", "typography", "assets", "future"], "readonly": false } }` |
| **User Interactions** | Expand/collapse sections, inline edit, regenerate section via AI, export PDF, share link. |
| **Brand State Outputs** | `BrandGuideline` record (all guideline fields), `Brand.status = delivered` |

### 5.2 `LogoUsageGuide`

| Field | Value |
|---|---|
| **Purpose** | Detailed logo rules: composition, clearspace, minimum size, misuse examples. |
| **AI Tool Call Schema** | `{ "component": "LogoUsageGuide", "props": { "brandId": 1, "lockups": [ ... ], "misuseExamples": ["stretching", "recoloring", "rotation"] } }` |
| **User Interactions** | Upload misuse example, annotate rules, toggle do/don't visibility, export assets. |
| **Brand State Outputs** | `BrandGuideline.logo_guidelines`, `BrandGuideline.asset_guidelines` |

### 5.3 `ColorSystemDocument`

| Field | Value |
|---|---|
| **Purpose** | Color hierarchy, CMYK vs RGB, accessibility matrix, usage rules. |
| **AI Tool Call Schema** | `{ "component": "ColorSystemDocument", "props": { "brandId": 1, "palette": [ ... ], "hierarchy": { "primary": "...", "secondary": "...", "accent": "..." } } }` |
| **User Interactions** | Edit hierarchy, toggle print/digital view, WCAG contrast check, export values. |
| **Brand State Outputs** | `BrandGuideline.color_guidelines` |

### 5.4 `AssetPatternLibrary`

| Field | Value |
|---|---|
| **Purpose** | Shapes, patterns, and texture assets with usage rules across Social Media, Web, and Print. |
| **AI Tool Call Schema** | `{ "component": "AssetPatternLibrary", "props": { "brandId": 1, "patterns": [ { "id": "p1", "type": "isometric-grid", "svg": "..." } ], "contexts": ["social", "web", "print"] } }` |
| **User Interactions** | Preview pattern on mockup, adjust scale/opacity, approve/reject, tag contexts. |
| **Brand State Outputs** | `BrandAsset` records (`type: pattern`, `type: texture`), `BrandGuideline.asset_guidelines` |

### 5.5 `TypographyHierarchyDoc`

| Field | Value |
|---|---|
| **Purpose** | Type scale, pairings, weights, hierarchy rules, and usage examples. |
| **AI Tool Call Schema** | `{ "component": "TypographyHierarchyDoc", "props": { "brandId": 1, "pairings": [ { "heading": "Playfair Display", "body": "Inter", "scale": ["64px", "32px", "16px"] } ] } }` |
| **User Interactions** | Adjust scale sliders, preview live text, toggle weights, export type specimen PDF. |
| **Brand State Outputs** | `BrandGuideline.typography_guidelines` |

### 5.6 `DevHandoffPackage`

| Field | Value |
|---|---|
| **Purpose** | Final deliverable packaging: source files, tokens, export formats, and governance rules. |
| **AI Tool Call Schema** | `{ "component": "DevHandoffPackage", "props": { "brandId": 1, "tokens": { "color": {}, "typography": {} }, "assets": [ ... ], "touchpoints": ["web", "mobile", "print", "packaging"] } }` |
| **User Interactions** | Select export formats (SVG, PNG, PDF, Swift, Android XML), review token completeness, approve handoff. |
| **Brand State Outputs** | `Brand.status = delivered`, `BrandGuideline.future_plans` |
