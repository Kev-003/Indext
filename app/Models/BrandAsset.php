<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BrandAsset extends Model
{
    use HasFactory;

    protected $fillable = [
        'brand_id',
        'type',
        'name',
        'content',
        'version',
        'is_approved',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'content' => 'array',
            'is_approved' => 'boolean',
        ];
    }

    /**
     * Get the brand that owns the asset.
     */
    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }
}
