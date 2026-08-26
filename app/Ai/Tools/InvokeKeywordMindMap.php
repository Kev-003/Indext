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
            'rootNode' => $schema->string()->description('Root node label.')->default('Brand'),
            'keywords' => $schema->array()->description('Keyword nodes to display.')->items($schema->string()),
            'layout' => $schema->string()->description('Layout mode.')->enum(array (
  0 => 'radial',
  1 => 'tree',
)),
            'nodes' => $schema->array()->description('Graph nodes with optional positions and types.')->items(
                $schema->object([
                    'id' => $schema->string()->description('Unique node identifier.'),
                    'label' => $schema->string()->description('Node display text.'),
                    'type' => $schema->string()->description('Node type: keyword, root, or concept.'),
                    'x' => $schema->number()->description('X coordinate (optional, elkjs will compute).'),
                    'y' => $schema->number()->description('Y coordinate (optional, elkjs will compute).'),
                ])
            ),
            'edges' => $schema->array()->description('Graph edges connecting nodes.')->items(
                $schema->object([
                    'id' => $schema->string()->description('Unique edge identifier.'),
                    'source' => $schema->string()->description('Source node ID.')->required(),
                    'target' => $schema->string()->description('Target node ID.')->required(),
                ])
            ),
        ];
    }
}