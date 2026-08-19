<?php

namespace App\Services\LLM;

class LLMResponse
{
    /**
     * @param string $content
     * @param array<int, array{id: string, type: string, function: array{name: string, arguments: string}}> $toolCalls
     * @param array<string, mixed> $metadata
     */
    public function __construct(
        public string $content,
        public array $toolCalls = [],
        public array $metadata = [],
    ) {
    }
}
