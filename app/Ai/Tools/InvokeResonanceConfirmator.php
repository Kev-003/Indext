<?php

namespace App\Ai\Tools;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class InvokeResonanceConfirmator implements Tool
{
    public function description(): Stringable|string
    {
        return 'Render the resonance confirmator before locking a direction.';
    }

    public function handle(Request $request): Stringable|string
    {
        return 'Rendered: invoke_resonance_confirmator';
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'id' => $schema->string()->description('Unique component instance ID.')->required(),
            'brandId' => $schema->integer()->description('Brand ID.'),
            'directionId' => $schema->string()->description('Direction ID to confirm.'),
            'summary' => $schema->string()->description('Summary of the direction.'),
        ];
    }
}