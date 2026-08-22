<?php

namespace App\Observers;

use App\Models\BrandAsset;
use Illuminate\Support\Facades\Redis;

class BrandAssetObserver
{
    public function saved(BrandAsset $asset): void
    {
        $this->invalidateMoodboardCache($asset->brand_id);
    }

    public function deleted(BrandAsset $asset): void
    {
        $this->invalidateMoodboardCache($asset->brand_id);
    }

    protected function invalidateMoodboardCache(int $brandId): void
    {
        try {
            $keys = Redis::keys('moodboard:'.$brandId.':*');

            foreach ($keys as $key) {
                Redis::del($key);
            }

            $tagMembers = Redis::smembers('moodboard:tags:'.$brandId) ?? [];
            if (!empty($tagMembers)) {
                Redis::srem('moodboard:tags:'.$brandId, ...array_values($tagMembers));
            }
        } catch (\Throwable $e) {
            // Redis unavailable; skip cache invalidation gracefully
        }
    }
}
