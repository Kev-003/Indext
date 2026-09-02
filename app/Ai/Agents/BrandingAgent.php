<?php

namespace App\Ai\Agents;

use App\Models\Brand;
use Laravel\Ai\Attributes\MaxSteps;
use Laravel\Ai\Attributes\MaxTokens;
use Laravel\Ai\Attributes\Model;
use Laravel\Ai\Attributes\Provider;
use Laravel\Ai\Attributes\Temperature;
use Laravel\Ai\Concerns\RemembersConversations;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\Conversational;
use Laravel\Ai\Contracts\HasTools;
use Laravel\Ai\Enums\Lab;
use Laravel\Ai\Promptable;
use Stringable;

#[MaxTokens(1500)]
#[MaxSteps(3)]
#[Temperature(0.3)]
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

## Process Order & Tool Progression Sequence
You MUST follow this exact sequential progression for brand creation:
1. Discovery Phase:
   - Client Interview (`invoke_client_interview_wizard`)
   - Mind Map / Keywords (`invoke_keyword_mind_map` or `invoke_mind_map`)
   - Semantic Mapping (`invoke_semantic_object_mapper`)
   - Design Concept Explorer (`invoke_design_concept_explorer`)
2. Design & Composition Phase (AFTER a design concept is selected):
   - Geometric Constructor (`invoke_geometric_constructor`)
   - Color Hierarchy Builder (`invoke_color_hierarchy_builder`)
   - Typography Pairing Selector (`invoke_typography_pairing_selector`)
   - Logo Composition Builder (`invoke_logo_composition_builder`)
3. Review & Guidelines Phase:
   - Direction Comparator / Review (`invoke_direction_comparator` or `invoke_review_view`)
   - Brand Guidelines & Handoff (`invoke_brand_guideline_document` or `invoke_dev_handoff_package`)

IMPORTANT: When a user completes a step (STEP_COMPLETE), inspect the Active Brand Context to see what steps are completed, acknowledge the decision, and move to the NEXT step in the sequence. Never repeat or loop back to a step that is already completed in Discovery context.

After each STEP_COMPLETE, read the Discovery context and proceed to the next uncompleted phase step. Do NOT re-render a tool whose step is already present in Discovery. Do NOT ask the user a clarifying question after STEP_COMPLETE -- they have completed something; advance the flow.

When invoking `invoke_geometric_constructor`, select concept skeleton options aligned with the brand's visual pillars (e.g. precise, structural -> mark-square, mark-hexagon, chevron; fluid, organic -> loop-continuous, arc-segment, mark-circle).

When all phases in Discovery show completed keys (`interview`, `keyword_mindmap` or `mindmap_confirm`, `semantic_mapper`, `concept_explorer`, `color_hierarchy`, `typography_pairing`, `geometric_constructor`, `typography_hierarchy`), call `invoke_brand_finalization` exactly once and stop emitting further tools.

## Handling Interview Data
When the user sends a message starting with "INTERVIEW_COMPLETE", parse the JSON data as the completed client interview. Do not re-render the interview wizard. Use the data to proceed to the next step in the brand development process by invoking the most appropriate tool, pre-loading it with the user's data.

## Handling Step Completion
When the user sends a message starting with "STEP_COMPLETE", parse the JSON data to learn which step was completed and what data the user provided (e.g., confirmed keywords, selected semantic objects, chosen design concept). Acknowledge the completed step and proceed to the next appropriate tool or provide the next creative direction. Do not re-render the same tool -- move forward.

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
            new \App\Ai\Tools\InvokeBrandFinalization(),
        ];
    }

    public function provider(): ?string
    {
        return 'gemini';
    }

    public function model(): ?string
    {
        return 'gemini-3.5-flash';
    }

    private function sanitize(string $value): string
    {
        return mb_convert_encoding($value, 'UTF-8', mb_detect_encoding($value) ?: 'UTF-8');
    }

    private function safeJson(mixed $value): string
    {
        return json_encode($value, JSON_INVALID_UTF8_SUBSTITUTE | JSON_UNESCAPED_UNICODE) ?: '{}';
    }

    protected function maxConversationMessages(): int
    {
        return 6;
    }
}
