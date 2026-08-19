<?php

namespace App\Services\LLM;

class LLMStreamChunk
{
    /**
     * @param array<string, mixed> $delta
     * @param array<string, mixed> $metadata
     */
    public function __construct(
        public string $type,
        public array $delta = [],
        public array $metadata = [],
    ) {
    }
}
