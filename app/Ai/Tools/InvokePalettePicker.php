<?php

namespace App\Ai\Tools;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class InvokePalettePicker implements Tool
{
    public function description(): Stringable|string
    {
        return 'Render a color palette picker pre-loaded with brand-derived colors.';
    }

    public function handle(Request $request): Stringable|string
    {
        return 'Rendered: invoke_palette_picker';
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'id' => $schema->string()->description('Unique component instance ID.')->required(),
            'initialColors' => $schema->array()->description('Hex color codes.')->items($schema->string())->required(),
        ];
    }
}