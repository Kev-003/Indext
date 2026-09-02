<?php

namespace App\Services\Brand;

use App\Models\Brand;
use App\Models\BrandAsset;

class AssetCommitter
{
    /**
     * Commit an accepted geometric mark as a BrandAsset.
     */
    public function commitLogoIcon(Brand $brand, array $data): BrandAsset
    {
        $latestVersion = $brand->assets()
            ->where('type', 'logo_icon')
            ->max('version');

        $version = ($latestVersion ?? 0) + 1;

        return BrandAsset::create([
            'brand_id' => $brand->id,
            'type' => 'logo_icon',
            'name' => "{$brand->name} primary mark",
            'content' => [
                'svg' => $data['svgPath'] ?? $data['svg'] ?? '',
                'primitives' => $data['primitives'] ?? [],
                'control_points' => $data['controlPoints'] ?? $data['control_points'] ?? [],
                'strokes' => $data['strokes'] ?? [],
            ],
            'version' => $version,
            'is_approved' => true,
        ]);
    }
}
