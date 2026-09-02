<?php

namespace App\Models;

use App\Concerns\GeneratesUniqueTeamSlugs;
use App\Enums\TeamRole;
use Database\Factories\BrandFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property int|null $team_id
 * @property int $user_id
 * @property string $name
 * @property string|null $industry
 * @property string|null $execution_mode
 * @property array|null $strategy
 * @property array|null $discovery
 * @property string $status
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 * @property-read User $user
 * @property-read Team|null $team
 * @property-read Collection<int, Conversation> $conversations
 * @property-read Collection<int, BrandAsset> $assets
 * @property-read BrandGuideline|null $guideline
 */
#[Fillable(['team_id', 'user_id', 'name', 'slug', 'industry', 'execution_mode', 'strategy', 'discovery', 'status', 'sort_order'])]
class Brand extends Model
{
    /** @use HasFactory<BrandFactory> */
    use HasFactory, SoftDeletes;

    protected static function booted(): void
    {
        static::creating(function (Brand $brand) {
            if (empty($brand->slug)) {
                $brand->slug = static::generateUniqueSlug($brand->name);
            }
        });
    }

    public static function generateUniqueSlug(?string $name, ?int $excludeId = null): string
    {
        $base = Str::slug((string) $name);
        if ($base === '') {
            $base = 'brand';
        }

        for ($attempt = 0; $attempt < 10; $attempt++) {
            $candidate = $base . '-' . Str::lower(Str::random(6));
            $query = static::withTrashed()->where('slug', $candidate);
            if ($excludeId !== null) {
                $query->where('id', '!=', $excludeId);
            }
            if (! $query->exists()) {
                return $candidate;
            }
        }

        return $base . '-' . Str::lower(Str::random(8));
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    public function resolveRouteBinding($value, $field = null)
    {
        $field = $field ?: $this->getRouteKeyName();

        $instance = $this->resolveRouteBindingQuery($this, $value, $field)->first();

        if (! $instance && ctype_digit((string) $value)) {
            $instance = $this->newQuery()->where('id', (int) $value)->first();
        }

        return $instance;
    }

    protected function casts(): array
    {
        return [
            'strategy' => 'array',
            'discovery' => 'array',
            'sort_order' => 'integer',
        ];
    }

    /**
     * Get the user that owns the brand.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the team that owns the brand.
     */
    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    /**
     * Get the brand's conversations.
     */
    public function conversations(): HasMany
    {
        return $this->hasMany(Conversation::class);
    }

    /**
     * Get the brand's assets.
     */
    public function assets(): HasMany
    {
        return $this->hasMany(BrandAsset::class);
    }

    /**
     * Get the brand's guideline.
     */
    public function guideline(): HasOne
    {
        return $this->hasOne(BrandGuideline::class);
    }
}
