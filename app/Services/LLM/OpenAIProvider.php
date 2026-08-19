<?php

namespace App\Services\LLM;

use Illuminate\Http\Client\Factory as HttpClient;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;

class OpenAIProvider implements LLMProvider
{
    /**
     * @param HttpClient $http
     */
    public function __construct(
        protected HttpClient $http,
        protected string $apiKey,
        protected string $model = 'gpt-4o-mini',
        protected string $baseUrl = 'https://api.openai.com/v1',
    ) {}

    public function streamChat(array $messages, array $tools = []): Collection
    {
        $payload = [
            'model' => $this->model,
            'messages' => $messages,
            'stream' => true,
        ];

        if (!empty($tools)) {
            $payload['tools'] = $tools;
            $payload['tool_choice'] = 'auto';
        }

        $response = $this->http->withToken($this->apiKey)
            ->accept('application/json')
            ->post($this->baseUrl.'/chat/completions', $payload)
            ->throw();

        $streamed = collect();
        $buffer = '';

        foreach ($response->body() as $chunk) {
            $buffer .= $chunk;

            while (($pos = strpos($buffer, "\n")) !== false) {
                $line = substr($buffer, 0, $pos);
                $buffer = substr($buffer, $pos + 1);

                $line = trim($line);
                if ($line === '' || $line === 'data: [DONE]') {
                    continue;
                }

                if (str_starts_with($line, 'data: ')) {
                    $data = json_decode(substr($line, 6), true);
                    if (!is_array($data)) {
                        continue;
                    }

                    $delta = $data['choices'][0]['delta'] ?? [];

                    if (isset($delta['content']) && $delta['content'] !== null) {
                        $streamed->push(new LLMStreamChunk(
                            type: 'text',
                            delta: ['content' => $delta['content']],
                            metadata: ['finish_reason' => $data['choices'][0]['finish_reason'] ?? null],
                        ));
                    }

                    if (isset($delta['tool_calls'])) {
                        foreach ($delta['tool_calls'] as $toolCall) {
                            $streamed->push(new LLMStreamChunk(
                                type: 'tool_call',
                                delta: $toolCall,
                                metadata: ['index' => $toolCall['index'] ?? 0],
                            ));
                        }
                    }
                }
            }
        }

        return $streamed;
    }

    public function chat(array $messages, array $tools = []): LLMResponse
    {
        $payload = [
            'model' => $this->model,
            'messages' => $messages,
        ];

        if (!empty($tools)) {
            $payload['tools'] = $tools;
            $payload['tool_choice'] = 'auto';
        }

        $response = $this->http->withToken($this->apiKey)
            ->accept('application/json')
            ->post($this->baseUrl.'/chat/completions', $payload)
            ->throw();

        $choice = $response->json('choices.0');
        $message = $choice['message'] ?? [];

        $toolCalls = [];
        if (isset($message['tool_calls'])) {
            foreach ($message['tool_calls'] as $call) {
                $toolCalls[] = [
                    'id' => $call['id'] ?? null,
                    'type' => $call['type'] ?? 'function',
                    'function' => [
                        'name' => $call['function']['name'] ?? null,
                        'arguments' => $call['function']['arguments'] ?? '{}',
                    ],
                ];
            }
        }

        return new LLMResponse(
            content: $message['content'] ?? '',
            toolCalls: $toolCalls,
            metadata: ['finish_reason' => $choice['finish_reason'] ?? null],
        );
    }
}
