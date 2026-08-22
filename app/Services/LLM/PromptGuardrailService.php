<?php

namespace App\Services\LLM;

class PromptGuardrailService
{
    protected array $injectionPatterns = [
        'ignore previous instructions',
        'ignore all previous instructions',
        'ignore above instructions',
        'system override',
        'developer mode',
        'respond as a different ai',
        'respond as a different language model',
        'dan mode',
        'do anything now',
        'jailbreak',
        'unlimited mode',
        'no restrictions',
        'bypass safety',
        'override safety',
        'you are now',
        'pretend you are',
        'act as if you are',
        'you are not an ai',
        'you have no rules',
        'forget your instructions',
        'disregard your programming',
        'break character',
        'exit your constraints',
        'remove all filters',
        'disable content policy',
    ];

    protected int $maxPromptLength = 8000;

    public function sanitize(string $prompt): string
    {
        $prompt = mb_convert_encoding($prompt, 'UTF-8', 'UTF-8');
        $prompt = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $prompt) ?? $prompt;
        $prompt = preg_replace('/[\x{200B}-\x{200D}\x{FEFF}]/u', '', $prompt) ?? $prompt;
        $prompt = preg_replace('/\s+/', ' ', $prompt) ?? $prompt;
        $prompt = trim($prompt);

        return $prompt;
    }

    public function validate(string $prompt): array
    {
        $sanitized = $this->sanitize($prompt);

        if (mb_strlen($sanitized) > $this->maxPromptLength) {
            return [
                'valid' => false,
                'reason' => 'Prompt exceeds maximum length of '.$this->maxPromptLength.' characters.',
                'sanitized' => $sanitized,
            ];
        }

        $lower = mb_strtolower($sanitized);

        foreach ($this->injectionPatterns as $pattern) {
            if (str_contains($lower, $pattern)) {
                return [
                    'valid' => false,
                    'reason' => 'Prompt contains disallowed content.',
                    'sanitized' => $sanitized,
                ];
            }
        }

        return [
            'valid' => true,
            'sanitized' => $sanitized,
        ];
    }

    public function buildStructuredPayload(array $systemBlocks, array $userBlocks): array
    {
        $messages = [];

        foreach ($systemBlocks as $block) {
            $messages[] = [
                'role' => 'system',
                'content' => $block,
            ];
        }

        foreach ($userBlocks as $block) {
            $messages[] = [
                'role' => 'user',
                'content' => $block,
            ];
        }

        return $messages;
    }

    public function appendOutOfScopeSentinel(array $messages): array
    {
        $messages[] = [
            'role' => 'system',
            'content' => 'If the user query is irrelevant to design systems, brand discovery, typography, color theory, or visual identity, immediately and exclusively reply with the string ERROR_OUT_OF_SCOPE.',
        ];

        return $messages;
    }

    public function isOutOfScope(string $responseContent): bool
    {
        $normalized = trim($responseContent);

        return $normalized === 'ERROR_OUT_OF_SCOPE' || str_contains($normalized, 'ERROR_OUT_OF_SCOPE');
    }
}
