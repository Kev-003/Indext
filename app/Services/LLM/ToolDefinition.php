<?php

namespace App\Services\LLM;

class ToolDefinition
{
    /**
     * @param string $name
     * @param string $description
     * @param array<string, mixed> $inputSchema
     */
    public function __construct(
        public string $name,
        public string $description,
        public array $inputSchema = ['type' => 'object', 'properties' => [], 'required' => []],
    ) {
    }

    public function toArray(): array
    {
        return [
            'type' => 'function',
            'function' => [
                'name' => $this->name,
                'description' => $this->description,
                'parameters' => $this->inputSchema,
            ],
        ];
    }
}
