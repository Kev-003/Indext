# Plan: Fix Brand Creation Crash and Zero-Token Stream

## Problem

### Error 1: `Call to undefined method App\Models\Brand::withTrashed()`

```
local.ERROR: Call to undefined method App\Models\Brand::withTrashed()
...at app/Http/Controllers/BrandController.php(45)
```

`BrandController::store()` line 45 calls `Brand::withTrashed()` to find a soft-deleted brand for ID recycling. But the `Brand` model does not use the `SoftDeletes` trait. The `brands` migration has `$table->softDeletes()` and the model docblock includes `deleted_at`, but the trait was never wired into the model.

### Error 2: Chat stream completes with 0 tokens

```
testing.INFO: Chat stream complete {
  "brand_id":1,"conversation_id":1,
  "reason":"stop",
  "prompt_tokens":0,"completion_tokens":0,
  "reasoning_tokens":0
}
```

The stream completes normally (`reason:"stop"`) but with zero tokens for both prompt and completion. This indicates either:
- An invalid model name causing the API to silently return empty responses
- No conversation history loaded (broken agent conversation setup from the brand creation crash)

## Root Cause Analysis

### Root Cause 1: Missing `SoftDeletes` Trait

**File**: `app/Models/Brand.php` (lines 37-40)

The `Brand` model only uses `HasFactory`. The `SoftDeletes` trait from `Illuminate\Database\Eloquent\SoftDeletes` is never imported or applied. This means:
- `withTrashed()` is undefined
- `deleted_at` column exists in the database but is never populated
- `$brand->delete()` performs a hard delete

**Impact**: `BrandController::store()` crashes at line 45. The `DB::transaction` rolls back, so:
- Brand is not created
- Agent conversation is not created
- User message is not stored in `agent_conversation_messages`
- `ChatController::message()` has no conversation to continue → empty stream → 0 tokens

### Root Cause 2: Model Name Mismatch

**File**: `app/Ai/Agents/BrandingAgent.php` (line 113)

```php
public function model(): ?string
{
    return 'gemini-3.6-flash';
}
```

**Evidence that this is wrong**:
- `DECISIONS.md` line 28: "Gemini (`gemini-3.5-flash`) is primary"
- `config/services.php` line 52: `'model' => env('GEMINI_MODEL', 'gemini-3.5-flash')`
- `config/ai.php` line 105: `'model' => env('GEMINI_MODEL', 'gemini-3.6-flash')`

The `config/ai.php` default is `gemini-3.6-flash` but `config/services.php` defaults to `gemini-3.5-flash`. The `DECISIONS.md` documents `gemini-3.5-flash` as primary. The `gemini-3.6-flash` model does not exist in the Gemini API.

**Impact**: The LLM SDK sends requests to a non-existent model. The API silently returns `reason:"stop"` with 0 tokens instead of crashing.

## Design Decisions

### Decision 1: Add `SoftDeletes` trait to `Brand` model

**Rationale**: The migration already has `softDeletes()`, the model already has a `deleted_at` docblock property, and the controller already uses `withTrashed()` — this was clearly intended. The trait was simply forgotten.

**Risk**: Low. Soft deletes are already part of the schema. Adding the trait only enables the intended behavior.

**Migration impact**: No migration needed — `deleted_at` column already exists.

### Decision 2: Fix model name to `gemini-3.5-flash`

**Rationale**: `DECISIONS.md` and `config/services.php` both specify `gemini-3.5-flash`. The `gemini-3.6-flash` value is a typo. Fix both `BrandingAgent::model()` and `config/ai.php` to use the correct default.

**Risk**: Low. Aligning config with documented standard.

## Files to Modify

| # | File | Change |
|---|---|---|
| 1 | `app/Models/Brand.php` | Add `use Illuminate\Database\Eloquent\SoftDeletes;` import; add `SoftDeletes` to class trait list |
| 2 | `app/Ai/Agents/BrandingAgent.php` | Line 113: `'gemini-3.6-flash'` → `'gemini-3.5-flash'` |
| 3 | `config/ai.php` | Line 105: `'gemini-3.6-flash'` → `'gemini-3.5-flash'` |
| 4 | `app/Http/Controllers/BrandController.php` | Add `$brand->guideline()->delete();` before `$brand->delete()` in `destroy()` (DB cascade no longer fires with soft delete) |
| 5 | `tests/Feature/BrandDatabaseTest.php` | Change `$brand->delete()` → `$brand->forceDelete()` (tests hard-delete cascade) |
| 6 | `tests/Feature/BrandDeletionTest.php` | Change 4× `assertDatabaseMissing('brands', …)` → `assertSoftDeleted('brands', …)` |

## Implementation Details

### 1. `app/Models/Brand.php`

**Before** (lines 5-11, 39-40):
```php
use Illuminate\Database\Eloquent\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
```
```php
class Brand extends Model
{
    use HasFactory;
```

**After**:
```php
use Illuminate\Database\Eloquent\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
```
```php
class Brand extends Model
{
    use HasFactory, SoftDeletes;
```

No need to add `deleted_at` to `$fillable` — `SoftDeletes` handles it automatically via the `deleted_at` column.

### 2. `app/Ai/Agents/BrandingAgent.php`

**Line 113**: Change `'gemini-3.6-flash'` → `'gemini-3.5-flash'`

### 3. `config/ai.php`

**Line 105**: Change `'gemini-3.6-flash'` → `'gemini-3.5-flash'`

## Validation Steps

1. `php artisan test` — All 110 tests should still pass
2. `php artisan tinker` — Verify `Brand::withTrashed()` is callable:
   ```php
   >> Brand::withTrashed()->first();
   ```
3. **Manual brand creation**: Create a new brand via UI → verify no `withTrashed()` error in `laravel.log`
4. **Manual chat**: Send a message after brand creation → verify `completion_tokens > 0` and actual text content in stream
5. **Log verification**: Confirm `laravel.log` shows `reason:"stop"` with non-zero `completion_tokens`
6. `php artisan config:clear` — Clear config cache so `config/ai.php` change takes effect

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| `SoftDeletes` trait changes `delete()` behavior (hard → soft) | `destroy()` in `BrandController` uses `$brand->delete()` — soft delete is intended here. `withTrashed()` logic in `store()` confirms this design. |
| Existing hard-deleted brands won't have `deleted_at` populated | The `withTrashed()` query filters on `whereNotNull('deleted_at')`, so hard-deleted brands are just skipped — no errors. |
| `gemini-3.5-flash` might also not exist | `config/services.php` and `DECISIONS.md` both document it. If wrong, the API key test (Tinker `prompt('Hello')`) will fail with `401 Incorrect API key` rather than 0 tokens. |
