<?php

namespace App\Models;

use App\Enums\TeamRole;
use Database\Factories\ConversationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property int $team_id
 * @property int|null $brand_id
 * @property int $user_id
 * @property string $agent_conversation_id
 * @property string|null $title
 * @property string $status
 * @property array|null $metadata
 * @property int|null $sort_order
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 * @property-read User $user
 * @property-read Brand|null $brand
 * @property-read Team $team
 */
#[Fillable(['team_id', 'brand_id', 'user_id', 'agent_conversation_id', 'title', 'slug', 'status', 'metadata', 'sort_order'])]
class Conversation extends Model
{
    /** @use HasFactory<ConversationFactory> */
    use HasFactory, SoftDeletes;

    protected static function booted(): void
    {
        static::creating(function (Conversation $conversation) {
            if (empty($conversation->slug)) {
                $conversation->slug = static::generateUniqueSlug($conversation->title);
            }
        });
    }

    public static function generateUniqueSlug(?string $title, ?int $excludeId = null): string
    {
        $base = Str::slug((string) $title);
        if ($base === '') {
            $base = 'conversation';
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

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'sort_order' => 'integer',
        ];
    }

    /**
     * Get the user that owns the conversation.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the team that owns the conversation.
     */
    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    /**
     * Get the brand that owns the conversation.
     */
    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }
}
