<?php

namespace App\Ai\Tools;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class InvokeKeywordMindMap implements Tool
{
    public function description(): Stringable|string
    {
        return 'Render an interactive keyword mind-map canvas.';
    }

    public function handle(Request $request): Stringable|string
    {
        return 'Rendered: invoke_keyword_mind_map';
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'id' => $schema->string()->description('Unique component instance ID.')->required(),
            'brandId' => $schema->integer()->description('Brand ID.'),
            'rootNode' => $schema->string()->description('Root node label.'),
            'keywords' => $schema->array()->description('Keyword nodes.')->items($schema->string()),
            'layout' => $schema->string()->description('Layout mode.')->enum(array (
  0 => 'radial',
  1 => 'tree',
)),
        ];
    }
}