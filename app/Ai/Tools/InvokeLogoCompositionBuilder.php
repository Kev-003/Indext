<?php

namespace App\Ai\Tools;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class InvokeLogoCompositionBuilder implements Tool
{
    public function description(): Stringable|string
    {
        return 'Render the logo composition builder for arranging icon + wordmark lockups.';
    }

    public function handle(Request $request): Stringable|string
    {
        return 'Rendered: invoke_logo_composition_builder';
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'id' => $schema->string()->description('Unique component instance ID.')->required(),
            'brandId' => $schema->integer()->description('Brand ID.'),
            'iconAssetId' => $schema->integer()->description('Asset ID for the icon.'),
            'wordmark' => $schema->string()->description('Brand name for wordmark.'),
            'suggestedLockups' => $schema->array()->description('Lockup orientations.')->items($schema->string()),
        ];
    }
}