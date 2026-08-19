<?php

namespace App\Services\LLM;

use Illuminate\Support\Collection;

interface LLMProvider
{
    /**
     * Stream a chat completion, yielding SSE chunks.
     *
     * @return Collection<int, LLMStreamChunk>
     */
    public function streamChat(array $messages, array $tools = []): Collection;

    /**
     * Get a non-streaming chat completion.
     */
    public function chat(array $messages, array $tools = []): LLMResponse;
}
