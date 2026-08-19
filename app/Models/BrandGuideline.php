<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BrandGuideline extends Model
{
    use HasFactory;

    protected $fillable = [
        'brand_id',
        'logo_guidelines',
        'color_guidelines',
        'typography_guidelines',
        'asset_guidelines',
        'future_plans',
        'is_published',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'logo_guidelines' => 'array',
            'color_guidelines' => 'array',
            'typography_guidelines' => 'array',
            'asset_guidelines' => 'array',
            'future_plans' => 'array',
            'is_published' => 'boolean',
        ];
    }

    /**
     * Get the brand that owns the guideline.
     */
    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }
}
