<?php

namespace Tests\Unit;

use App\Services\LLM\SemanticIntentFilter;
use Tests\TestCase;

class SemanticIntentFilterTest extends TestCase
{
    protected SemanticIntentFilter $filter;

    protected function setUp(): void
    {
        parent::setUp();
        $this->filter = new SemanticIntentFilter();
    }

    public function test_short_prompt_with_one_taxonomy_hit_is_relevant(): void
    {
        $this->assertTrue($this->filter->isRelevant('Create a brand for a tech startup'));
    }

    public function test_very_short_prompt_without_taxonomy_hits_is_not_relevant(): void
    {
        $this->assertFalse($this->filter->isRelevant('test'));
    }

    public function test_long_off_topic_prompt_is_not_relevant(): void
    {
        $prompt = 'I need help with my garden. The tomatoes are not growing well and the leaves are turning yellow. What fertilizer should I use?';
        $this->assertFalse($this->filter->isRelevant($prompt, 30));
    }

    public function test_long_design_prompt_is_relevant(): void
    {
        $prompt = 'I want to build a comprehensive visual identity system with a custom color palette, typography hierarchy, and geometric logo mark for my sustainable coffee brand.';
        $this->assertTrue($this->filter->isRelevant($prompt, 30));
    }

    public function test_empty_prompt_returns_zero_score(): void
    {
        $this->assertSame(0, $this->filter->score(''));
    }

    public function test_score_is_capped_at_100(): void
    {
        $prompt = 'brand logo design visual color typography identity style theme layout geometry shape mark icon wordmark';
        $this->assertLessThanOrEqual(100, $this->filter->score($prompt));
    }
}