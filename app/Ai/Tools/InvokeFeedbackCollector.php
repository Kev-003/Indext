<?php

namespace App\Ai\Tools;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class InvokeFeedbackCollector implements Tool
{
    public function description(): Stringable|string
    {
        return 'Render the structured feedback collector after presenting a direction.';
    }

    public function handle(Request $request): Stringable|string
    {
        return 'Rendered: invoke_feedback_collector';
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'id' => $schema->string()->description('Unique component instance ID.')->required(),
            'brandId' => $schema->integer()->description('Brand ID.'),
            'target' => $schema->string()->description('Target asset or direction ID.'),
            'questions' => $schema->array()->description('Feedback questions.')->items($schema->string()),
            'scale' => $schema->integer()->description('Rating scale max value.'),
        ];
    }
}