<?php

namespace App\Ai\Tools;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class InvokeReviewView implements Tool
{
    public function description(): Stringable|string
    {
        return 'Render a review/comparison view for presenting sketch directions.';
    }

    public function handle(Request $request): Stringable|string
    {
        return 'Rendered: invoke_review_view';
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'id' => $schema->string()->description('Unique component instance ID.')->required(),
            'title' => $schema->string()->description('Review session title.')->required(),
            'directions' => $schema->array()->items($schema->object([]))->description('Array of direction objects to review.')->required(),
        ];
    }
}