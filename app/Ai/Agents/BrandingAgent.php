<?php

namespace App\Ai\Agents;

use App\Models\Brand;
use Laravel\Ai\Attributes\Model;
use Laravel\Ai\Attributes\Provider;
use Laravel\Ai\Concerns\RemembersConversations;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\Conversational;
use Laravel\Ai\Contracts\HasTools;
use Laravel\Ai\Enums\Lab;
use Laravel\Ai\Promptable;
use Stringable;

class BrandingAgent implements Agent, Conversational, HasTools
{
    use Promptable, RemembersConversations;

    public function __construct(protected Brand $brand) {}

    public function instructions(): Stringable|string
    {
        $prompt = <<<PROMPT
You are an expert brand development director. Your role is to guide users through an authentic brand development process -- not to generate finished assets directly.

## Core Rules
1. You may ONLY invoke tools from the tools available to you. Never output finished assets, palettes, logos, or layouts as plain text -- always use a tool to surface them as an interactive component.
2. When a tool is invoked, pre-load it with material derived from the user's own conversation -- never generic templates.
3. Your job is to direct and question, not execute. The user must always be the one who makes the final creative decision.
4. If the user asks for something outside the tools available to you, guide them back to the process with a clarifying question instead of inventing an answer.

## Execution Modes
- Beginner: Scaffolded constructive geometry and sketch beautification.
- Experienced: Guided freeform canvas with creative direction briefs.
PROMPT;

        $user = auth()->user();

        if ($user && $user->llm_methodology) {
            $prompt .= "\n\n## User Branding Methodology\n";
            $prompt .= $this->sanitize($user->llm_methodology)."\n";
        }

        $prompt .= "\n\n## Active Brand Context\n";
        $prompt .= 'Brand Name: '.$this->sanitize($this->brand->name)."\n";

        if ($this->brand->industry) {
            $prompt .= 'Industry: '.$this->sanitize($this->brand->industry)."\n";
        }

        if ($this->brand->execution_mode) {
            $prompt .= 'Execution Mode: '.$this->sanitize($this->brand->execution_mode)."\n";
        }

        if (!empty($this->brand->strategy)) {
            $prompt .= 'Strategy: '.$this->safeJson($this->brand->strategy)."\n";
        }

        if (!empty($this->brand->discovery)) {
            $prompt .= 'Discovery: '.$this->safeJson($this->brand->discovery)."\n";
        }

        return $prompt;
    }

    public function tools(): iterable
    {
        return [
            new \App\Ai\Tools\InvokeClientInterviewWizard(),
            new \App\Ai\Tools\InvokeMindMap(),
            new \App\Ai\Tools\InvokeKeywordMindMap(),
            new \App\Ai\Tools\InvokeSemanticObjectMapper(),
            new \App\Ai\Tools\InvokeVisualPillarExtractor(),
            new \App\Ai\Tools\InvokeBrandStrategyOverview(),
            new \App\Ai\Tools\InvokeDesignConceptExplorer(),
            new \App\Ai\Tools\InvokePalettePicker(),
            new \App\Ai\Tools\InvokeColorHierarchyBuilder(),
            new \App\Ai\Tools\InvokeTypographyPairingSelector(),
            new \App\Ai\Tools\InvokeGeometricConstructor(),
            new \App\Ai\Tools\InvokeLogoCompositionBuilder(),
            new \App\Ai\Tools\InvokeReviewView(),
            new \App\Ai\Tools\InvokeDirectionComparator(),
            new \App\Ai\Tools\InvokeFeedbackCollector(),
            new \App\Ai\Tools\InvokeResonanceConfirmator(),
            new \App\Ai\Tools\InvokeGuidelinePreview(),
            new \App\Ai\Tools\InvokeBrandGuidelineDocument(),
            new \App\Ai\Tools\InvokeLogoUsageGuide(),
            new \App\Ai\Tools\InvokeColorSystemDocument(),
            new \App\Ai\Tools\InvokeTypographyHierarchyDoc(),
            new \App\Ai\Tools\InvokeAssetPatternLibrary(),
            new \App\Ai\Tools\InvokeDevHandoffPackage(),
            new \App\Ai\Tools\InvokeMoodboardComposer(),
        ];
    }

    public function provider(): ?string
    {
        return 'gemini';
    }

    public function model(): ?string
    {
        return 'gemini-3.6-flash';
    }

    private function sanitize(string $value): string
    {
        return mb_convert_encoding($value, 'UTF-8', mb_detect_encoding($value) ?: 'UTF-8');
    }

    private function safeJson(mixed $value): string
    {
        return json_encode($value, JSON_INVALID_UTF8_SUBSTITUTE | JSON_UNESCAPED_UNICODE) ?: '{}';
    }
}
