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
use Illuminate\Support\Carbon;

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
#[Fillable(['team_id', 'user_id', 'name', 'industry', 'execution_mode', 'strategy', 'discovery', 'status', 'sort_order'])]
class Brand extends Model
{
    /** @use HasFactory<BrandFactory> */
    use HasFactory;

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
