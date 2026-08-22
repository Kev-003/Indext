<?php

namespace App\Observers;

use App\Models\BrandGuideline;
use Illuminate\Support\Facades\Redis;

class BrandGuidelineObserver
{
    public function saved(BrandGuideline $guideline): void
    {
        $this->invalidateMoodboardCache($guideline->brand_id);
    }

    public function deleted(BrandGuideline $guideline): void
    {
        $this->invalidateMoodboardCache($guideline->brand_id);
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
