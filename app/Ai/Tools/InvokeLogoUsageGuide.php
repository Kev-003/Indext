<?php

namespace App\Ai\Tools;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class InvokeLogoUsageGuide implements Tool
{
    public function description(): Stringable|string
    {
        return "Render the logo usage guide with do/don't rules.";
    }

    public function handle(Request $request): Stringable|string
    {
        return 'Rendered: invoke_logo_usage_guide';
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'id' => $schema->string()->description('Unique component instance ID.')->required(),
            'brandId' => $schema->integer()->description('Brand ID.'),
            'lockups' => $schema->array()->items($schema->object([]))->description('Approved lockups.'),
            'misuseExamples' => $schema->array()->description('Common misuse examples.')->items($schema->string()),
        ];
    }
}
