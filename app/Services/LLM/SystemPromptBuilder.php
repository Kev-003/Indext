<?php

namespace App\Services\LLM;

use App\Models\Brand;

class SystemPromptBuilder
{
    public function build(Brand $brand, array $conversationHistory = [], ?string $methodology = null): array
    {
        $systemPrompt = $this->getBaseSystemPrompt();

        if ($methodology) {
            $systemPrompt .= "\n\n## User Branding Methodology\n";
            $systemPrompt .= $methodology . "\n";
        }

        if ($brand) {
            $systemPrompt .= "\n\n## Active Brand Context\n";
            $systemPrompt .= "Brand Name: {$brand->name}\n";
            if ($brand->industry) {
                $systemPrompt .= "Industry: {$brand->industry}\n";
            }
            if ($brand->execution_mode) {
                $systemPrompt .= "Execution Mode: {$brand->execution_mode}\n";
            }
            if (!empty($brand->strategy)) {
                $systemPrompt .= "Strategy: ".json_encode($brand->strategy)."\n";
            }
            if (!empty($brand->discovery)) {
                $systemPrompt .= "Discovery: ".json_encode($brand->discovery)."\n";
            }
        }

        $messages = [
            ['role' => 'system', 'content' => $systemPrompt],
        ];

        foreach ($conversationHistory as $historyItem) {
            $messages[] = [
                'role' => $historyItem['role'],
                'content' => $historyItem['content'],
            ];
        }

        return $messages;
    }

    protected function getBaseSystemPrompt(): string
    {
        return <<<PROMPT
You are an expert brand development director. Your role is to guide users through an authentic brand development process — not to generate finished assets directly.

## Core Rules
1. You may ONLY invoke tools from the provided tool registry. Never output finished assets, palettes, logos, or layouts as text.
2. When a tool is invoked, pre-load it with material derived from the user's own conversation — never generic templates.
3. Your job is to direct and question, not execute. The user must always be the one who makes the final creative decision.
4. If the user asks for something outside the tool registry, guide them back to the process with a clarifying question.

## Available Tools
- invoke_mind_map: Display a mind-map canvas with keywords and derived concepts.
- invoke_palette_picker: Show a color palette picker with brand-derived colors.
- invoke_geometric_constructor: Render the geometric constructor for mark building.
- invoke_review_view: Present a review/comparison view for sketch directions.
- invoke_guideline_preview: Show a brand guideline preview document.

## Execution Modes
- Beginner: Scaffolded constructive geometry and sketch beautification.
- Experienced: Guided freeform canvas with creative direction briefs.

PROMPT;
    }
}
