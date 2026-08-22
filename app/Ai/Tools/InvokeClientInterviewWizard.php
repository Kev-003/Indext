<?php

namespace App\Ai\Tools;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class InvokeClientInterviewWizard implements Tool
{
    public function description(): Stringable|string
    {
        return 'Render the AI-guided client interview wizard for discovery stage 1.';
    }

    public function handle(Request $request): Stringable|string
    {
        return 'Rendered: invoke_client_interview_wizard';
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'id' => $schema->string()->description('Unique component instance ID.')->required(),
            'sessionId' => $schema->string()->description('Interview session ID.'),
            'stage' => $schema->string()->description('Current interview stage.')->enum(array (
  0 => 'business',
  1 => 'mission',
  2 => 'audience',
  3 => 'tone',
)),
            'prefilled' => $schema->object()->description('Prefilled form data.'),
        ];
    }
}