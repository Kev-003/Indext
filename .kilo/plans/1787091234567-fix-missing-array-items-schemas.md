# Plan: Fix Missing `items()` on Array Schema Properties

## Root Cause
Gemini strictly enforces JSON Schema completeness. Every `$schema->array()` declaration must include an `->items(...)` call describing the shape of each array element. Thirteen tool schemas declare array properties without specifying their item types, causing Gemini to reject the entire tool-calling request with `INVALID_ARGUMENT`.

## Affected Files and Properties

| File | Property | Current | Missing |
|------|----------|---------|---------|
| `InvokeDesignConceptExplorer.php` | `concepts` | `$schema->array()->description(...)` | `->items(...)` |
| `InvokeColorHierarchyBuilder.php` | `suggestedPalette` | `$schema->array()->description(...)` | `->items(...)` |
| `InvokeTypographyPairingSelector.php` | `recommendedPairs` | `$schema->array()->description(...)` | `->items(...)` |
| `InvokeGeometricConstructor.php` | `primitives` | `$schema->array()->description(...)` | `->items(...)` |
| `InvokeReviewView.php` | `directions` | `$schema->array()->description(...)->required()` | `->items(...)` |
| `InvokeDirectionComparator.php` | `directions` | `$schema->array()->description(...)->required()` | `->items(...)` |
| `InvokeGuidelinePreview.php` | `sections` | `$schema->array()->description(...)->required()` | `->items(...)` |
| `InvokeLogoUsageGuide.php` | `lockups` | `$schema->array()->description(...)` | `->items(...)` |
| `InvokeColorSystemDocument.php` | `palette` | `$schema->array()->description(...)` | `->items(...)` |
| `InvokeTypographyHierarchyDoc.php` | `pairings` | `$schema->array()->description(...)` | `->items(...)` |
| `InvokeAssetPatternLibrary.php` | `patterns` | `$schema->array()->description(...)` | `->items(...)` |
| `InvokeDevHandoffPackage.php` | `assets` | `$schema->array()->description(...)` | `->items(...)` |
| `InvokeMoodboardComposer.php` | `initialAssets` | `$schema->array()->description(...)` | `->items(...)` |
| `InvokeMoodboardComposer.php` | `suggestedPalette` | `$schema->array()->description(...)` | `->items(...)` |

## Fix Pattern

Every bare `->array()` must be chained with `->items($schema->object([...]))` or `->items($schema->string())` depending on what the array contains.

### Generic fallback (safe for Gemini validation)
If the exact shape is unknown, use `$schema->object([])` (an empty object schema) or `$schema->string()` as a permissive fallback. This satisfies Gemini's `items` requirement without over-constraining the data.

### Recommended item shapes based on property semantics

| Property | Suggested Items Type | Rationale |
|----------|---------------------|-----------|
| `concepts` | `$schema->object([...])` with `label` + `description` strings | Design concept directions |
| `suggestedPalette` | `$schema->object([...])` with color fields | Color objects |
| `recommendedPairs` | `$schema->object([...])` with `heading` + `body` strings | Typography pair objects |
| `primitives` | `$schema->object([...])` with shape/geometry fields | Geometric primitive objects |
| `directions` | `$schema->object([...])` with `label` + `description` | Review/comparison direction objects |
| `sections` | `$schema->object([...])` with `title` + `content` | Guideline section objects |
| `lockups` | `$schema->object([...])` with `name` + `do` + `dont` | Logo lockup rule objects |
| `palette` | `$schema->object([...])` with color role fields | Color palette entry objects |
| `pairings` | `$schema->object([...])` with font pair fields | Typography pairing objects |
| `patterns` | `$schema->object([...])` with pattern metadata | Asset pattern objects |
| `assets` | `$schema->object([...])` with asset metadata | Asset list entry objects |
| `initialAssets` | `$schema->object([...])` with asset references | Asset reference objects |

If the frontend `DynamicRenderer` components expect specific props per item, those prop names should be reflected in the object schema. Otherwise, empty `$schema->object([])` is acceptable and will not block Gemini.

## Implementation Steps

1. Edit each of the 14 tool files listed above.
2. For each bare `->array()` call, append `->items(...)` with the appropriate item type.
3. Run `php artisan test` to confirm no regressions.
4. Verify in tinker or browser that the agent can now complete a prompt without the 400 error.

## Risk
- Overly restrictive item schemas could cause the AI to avoid populating certain fields. Using permissive object schemas (`$schema->object([])`) minimizes this risk.
- If the frontend expects specific keys per array item and we omit them from the schema, the AI may not know what to generate. We should cross-reference with the `DynamicRenderer` component props if validation errors persist after this fix.
