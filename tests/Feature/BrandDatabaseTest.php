<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\BrandAsset;
use App\Models\BrandGuideline;
use App\Models\User;
use App\Models\Team;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BrandDatabaseTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_brand_can_be_created_with_strategy_and_discovery_json(): void
    {
        $user = User::factory()->create();
        $team = Team::factory()->create();

        $strategyData = [
            'mission' => 'Empower creative builders.',
            'values' => ['integrity', 'innovation', 'craftsmanship'],
            'visual_pillars' => ['Minimalism', 'Precision'],
        ];

        $discoveryData = [
            'keywords' => ['clean', 'sharp', 'geometry'],
            'mind_map' => [
                'nodes' => ['Brand', 'Identity', 'Shapes']
            ],
            'design_concepts' => ['Structured layout with isometric lines']
        ];

        $brand = Brand::create([
            'user_id' => $user->id,
            'team_id' => $team->id,
            'name' => 'Acme Corp',
            'industry' => 'Technology',
            'execution_mode' => 'beginner',
            'strategy' => $strategyData,
            'discovery' => $discoveryData,
            'status' => 'discovery',
        ]);

        $this->assertEquals('Acme Corp', $brand->name);
        $this->assertEquals($strategyData, $brand->strategy);
        $this->assertEquals($discoveryData, $brand->discovery);
    }

    public function test_a_brand_can_have_assets_associated_with_it(): void
    {
        $user = User::factory()->create();
        
        $brand = Brand::create([
            'user_id' => $user->id,
            'name' => 'Acme Corp',
        ]);

        $assetContent = [
            'svg' => '<svg>...</svg>',
            'dimensions' => ['width' => 100, 'height' => 100]
        ];

        $asset = BrandAsset::create([
            'brand_id' => $brand->id,
            'type' => 'logo_icon',
            'name' => 'Primary Icon',
            'content' => $assetContent,
            'version' => 1,
            'is_approved' => true,
        ]);

        $this->assertEquals($brand->id, $asset->brand_id);
        $this->assertEquals($assetContent, $asset->content);
        $this->assertTrue($asset->is_approved);
        $this->assertCount(1, $brand->assets);
        $this->assertEquals('Primary Icon', $brand->assets->first()->name);
    }

    public function test_a_brand_can_have_guidelines_compiled(): void
    {
        $user = User::factory()->create();
        
        $brand = Brand::create([
            'user_id' => $user->id,
            'name' => 'Acme Corp',
        ]);

        $guideline = BrandGuideline::create([
            'brand_id' => $brand->id,
            'logo_guidelines' => ['composition' => 'Centered icon over wordmark'],
            'color_guidelines' => ['primary' => '#FF0000', 'cmyk' => [0, 100, 100, 0]],
            'typography_guidelines' => ['font' => 'Instrument Sans'],
            'asset_guidelines' => ['patterns' => 'Isometric grids'],
            'future_plans' => ['digital' => 'Deploy brand site'],
            'is_published' => false,
        ]);

        $this->assertEquals($brand->id, $guideline->brand_id);
        $this->assertEquals('Centered icon over wordmark', $guideline->logo_guidelines['composition']);
        $this->assertEquals([0, 100, 100, 0], $guideline->color_guidelines['cmyk']);
        
        $brand->load('guideline');
        $this->assertEquals('Instrument Sans', $brand->guideline->typography_guidelines['font']);
    }

    public function test_deleting_a_brand_cascade_deletes_assets_and_guidelines(): void
    {
        $user = User::factory()->create();
        
        $brand = Brand::create([
            'user_id' => $user->id,
            'name' => 'Acme Corp',
        ]);

        BrandAsset::create([
            'brand_id' => $brand->id,
            'type' => 'logo_icon',
            'name' => 'Primary Icon',
            'content' => ['svg' => '<svg></svg>'],
        ]);

        BrandGuideline::create([
            'brand_id' => $brand->id,
            'logo_guidelines' => ['rules' => 'Do not stretch'],
        ]);

        $this->assertCount(1, BrandAsset::all());
        $this->assertCount(1, BrandGuideline::all());

        $brand->delete();

        $this->assertCount(0, BrandAsset::all());
        $this->assertCount(0, BrandGuideline::all());
    }
}
