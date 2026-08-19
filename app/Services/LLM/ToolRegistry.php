<?php

namespace App\Services\LLM;

use App\Services\LLM\Tools\BrandTools;
use InvalidArgumentException;

class ToolRegistry
{
    /**
     * @var array<string, ToolDefinition>
     */
    protected array $tools = [];

    /**
     * @var array<string, callable>
     */
    protected array $handlers = [];

    public function __construct()
    {
        $this->registerDefaultTools();
    }

    public function register(ToolDefinition $definition, callable $handler): void
    {
        $this->tools[$definition->name] = $definition;
        $this->handlers[$definition->name] = $handler;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function getToolDefinitions(): array
    {
        return array_values(array_map(fn (ToolDefinition $tool) => $tool->toArray(), $this->tools));
    }

    public function has(string $name): bool
    {
        return isset($this->tools[$name]);
    }

    /**
     * @return mixed
     */
    public function handle(string $name, array $arguments)
    {
        if (!isset($this->handlers[$name])) {
            throw new InvalidArgumentException("Tool not registered: {$name}");
        }

        return ($this->handlers[$name])($arguments);
    }

    protected function registerDefaultTools(): void
    {
        $brandTools = new BrandTools();

        $this->register(
            new ToolDefinition(
                name: 'invoke_mind_map',
                description: 'Render an inline mind-map canvas with keywords and derived concepts.',
                inputSchema: [
                    'type' => 'object',
                    'properties' => [
                        'id' => ['type' => 'string', 'description' => 'Unique component instance ID.'],
                        'title' => ['type' => 'string', 'description' => 'Title for the mind map.'],
                        'nodes' => ['type' => 'array', 'items' => ['type' => 'string'], 'description' => 'Keyword nodes to display.'],
                    ],
                    'required' => ['id', 'title', 'nodes'],
                ],
            ),
            fn (array $args) => $brandTools->renderMindMap($args)
        );

        $this->register(
            new ToolDefinition(
                name: 'invoke_palette_picker',
                description: 'Render a color palette picker pre-loaded with brand-derived colors.',
                inputSchema: [
                    'type' => 'object',
                    'properties' => [
                        'id' => ['type' => 'string', 'description' => 'Unique component instance ID.'],
                        'initialColors' => ['type' => 'array', 'items' => ['type' => 'string'], 'description' => 'Hex color codes.'],
                    ],
                    'required' => ['id', 'initialColors'],
                ],
            ),
            fn (array $args) => $brandTools->renderPalettePicker($args)
        );

        $this->register(
            new ToolDefinition(
                name: 'invoke_geometric_constructor',
                description: 'Render the geometric constructor for building marks from primitives.',
                inputSchema: [
                    'type' => 'object',
                    'properties' => [
                        'id' => ['type' => 'string', 'description' => 'Unique component instance ID.'],
                        'mode' => ['type' => 'string', 'enum' => ['Beginner', 'Experienced'], 'description' => 'Execution mode.'],
                        'primitives' => ['type' => 'array', 'description' => 'Pre-loaded geometric primitives.'],
                    ],
                    'required' => ['id'],
                ],
            ),
            fn (array $args) => $brandTools->renderGeometricConstructor($args)
        );

        $this->register(
            new ToolDefinition(
                name: 'invoke_review_view',
                description: 'Render a review/comparison view for presenting sketch directions.',
                inputSchema: [
                    'type' => 'object',
                    'properties' => [
                        'id' => ['type' => 'string', 'description' => 'Unique component instance ID.'],
                        'title' => ['type' => 'string', 'description' => 'Review session title.'],
                        'directions' => ['type' => 'array', 'description' => 'Array of direction objects to review.'],
                    ],
                    'required' => ['id', 'title', 'directions'],
                ],
            ),
            fn (array $args) => $brandTools->renderReviewView($args)
        );

        $this->register(
            new ToolDefinition(
                name: 'invoke_guideline_preview',
                description: 'Render a brand guideline preview document.',
                inputSchema: [
                    'type' => 'object',
                    'properties' => [
                        'id' => ['type' => 'string', 'description' => 'Unique component instance ID.'],
                        'sections' => ['type' => 'array', 'description' => 'Guideline sections to preview.'],
                    ],
                    'required' => ['id', 'sections'],
                ],
            ),
            fn (array $args) => $brandTools->renderGuidelinePreview($args)
        );
    }
}
