import type React from 'react';
import { lazy, Suspense } from 'react';

// Define the component signature expected by all dynamic tools
export interface DynamicComponentProps {
    id: string;
    onAction?: (action: string, data: Record<string, any>) => void;
    [key: string]: any;
}

// Lazy load tools to keep the main bundle size small
const MindMapCanvas = lazy(() => import('./tools/placeholder-tools').then(m => ({ default: m.MindMapCanvas })));
const PalettePicker = lazy(() => import('./tools/placeholder-tools').then(m => ({ default: m.PalettePicker })));
const GeometricConstructor = lazy(() => import('./tools/placeholder-tools').then(m => ({ default: m.GeometricConstructor })));
const ReviewView = lazy(() => import('./tools/placeholder-tools').then(m => ({ default: m.ReviewView })));
const GuidelinePreview = lazy(() => import('./tools/placeholder-tools').then(m => ({ default: m.GuidelinePreview })));

// Discovery & Strategy
const ClientInterviewWizard = lazy(() => import('./tools/discovery').then(m => ({ default: m.ClientInterviewWizard })));
const VisualPillarExtractor = lazy(() => import('./tools/discovery').then(m => ({ default: m.VisualPillarExtractor })));
const BrandStrategyOverview = lazy(() => import('./tools/discovery').then(m => ({ default: m.BrandStrategyOverview })));

// Concept Mapping & Discovery
const KeywordMindMap = lazy(() => import('./tools/concept-mapping').then(m => ({ default: m.KeywordMindMap })));
const SemanticObjectMapper = lazy(() => import('./tools/concept-mapping').then(m => ({ default: m.SemanticObjectMapper })));
const DesignConceptExplorer = lazy(() => import('./tools/concept-mapping').then(m => ({ default: m.DesignConceptExplorer })));

// Constructive Design & Composition
const TypographyPairingSelector = lazy(() => import('./tools/composition').then(m => ({ default: m.TypographyPairingSelector })));
const ColorHierarchyBuilder = lazy(() => import('./tools/composition').then(m => ({ default: m.ColorHierarchyBuilder })));
const LogoCompositionBuilder = lazy(() => import('./tools/composition').then(m => ({ default: m.LogoCompositionBuilder })));

// Review & Narrowing
const DirectionComparator = lazy(() => import('./tools/review').then(m => ({ default: m.DirectionComparator })));
const FeedbackCollector = lazy(() => import('./tools/review').then(m => ({ default: m.FeedbackCollector })));
const ResonanceConfirmator = lazy(() => import('./tools/review').then(m => ({ default: m.ResonanceConfirmator })));

// Guidelines & Handoff
const BrandGuidelineDocument = lazy(() => import('./tools/guidelines').then(m => ({ default: m.BrandGuidelineDocument })));
const LogoUsageGuide = lazy(() => import('./tools/guidelines').then(m => ({ default: m.LogoUsageGuide })));
const ColorSystemDocument = lazy(() => import('./tools/guidelines').then(m => ({ default: m.ColorSystemDocument })));
const AssetPatternLibrary = lazy(() => import('./tools/guidelines').then(m => ({ default: m.AssetPatternLibrary })));
const TypographyHierarchyDoc = lazy(() => import('./tools/guidelines').then(m => ({ default: m.TypographyHierarchyDoc })));
const DevHandoffPackage = lazy(() => import('./tools/guidelines').then(m => ({ default: m.DevHandoffPackage })));

// Moodboard
const MoodboardComposer = lazy(() => import('./tools/moodboard').then(m => ({ default: m.MoodboardComposer })));

// The registry mapping AI tool names to actual React components
export const ComponentRegistry: Record<string, React.ComponentType<DynamicComponentProps>> = {
    // Original placeholders
    MindMapCanvas,
    PalettePicker,
    GeometricConstructor,
    ReviewView,
    GuidelinePreview,

    // Discovery & Strategy
    ClientInterviewWizard,
    VisualPillarExtractor,
    BrandStrategyOverview,

    // Concept Mapping & Discovery
    KeywordMindMap,
    SemanticObjectMapper,
    DesignConceptExplorer,

    // Constructive Design & Composition
    TypographyPairingSelector,
    ColorHierarchyBuilder,
    LogoCompositionBuilder,

    // Review & Narrowing
    DirectionComparator,
    FeedbackCollector,
    ResonanceConfirmator,

    // Guidelines & Handoff
    BrandGuidelineDocument,
    LogoUsageGuide,
    ColorSystemDocument,
    AssetPatternLibrary,
    TypographyHierarchyDoc,
    DevHandoffPackage,

    // Moodboard
    MoodboardComposer,
};

export type RegisteredComponentName = keyof typeof ComponentRegistry;

export type StageKey =
    | 'discovery'
    | 'concept'
    | 'composition'
    | 'review'
    | 'guidelines'
    | 'assets';

export interface StageInfo {
    stage: StageKey;
    label: string;
}

export const STAGE_MAP: Record<string, StageInfo> = {
    ClientInterviewWizard: { stage: 'discovery', label: 'CLIENT INTERVIEW' },
    VisualPillarExtractor: { stage: 'discovery', label: 'VISUAL PILLARS' },
    BrandStrategyOverview: { stage: 'discovery', label: 'STRATEGY OVERVIEW' },
    KeywordMindMap: { stage: 'concept', label: 'KEYWORD MIND MAP' },
    SemanticObjectMapper: { stage: 'concept', label: 'SEMANTIC MAPPING' },
    DesignConceptExplorer: { stage: 'concept', label: 'CONCEPT EXPLORER' },
    TypographyPairingSelector: { stage: 'composition', label: 'TYPOGRAPHY' },
    ColorHierarchyBuilder: { stage: 'composition', label: 'COLOR SYSTEM' },
    LogoCompositionBuilder: { stage: 'composition', label: 'LOGO COMPOSITION' },
    DirectionComparator: { stage: 'review', label: 'DIRECTION COMPARE' },
    FeedbackCollector: { stage: 'review', label: 'FEEDBACK' },
    ResonanceConfirmator: { stage: 'review', label: 'CONFIRM DIRECTION' },
    BrandGuidelineDocument: { stage: 'guidelines', label: 'BRAND GUIDELINES' },
    LogoUsageGuide: { stage: 'guidelines', label: 'LOGO USAGE' },
    ColorSystemDocument: { stage: 'guidelines', label: 'COLOR SYSTEM' },
    AssetPatternLibrary: { stage: 'guidelines', label: 'ASSET LIBRARY' },
    TypographyHierarchyDoc: { stage: 'guidelines', label: 'TYPOGRAPHY HIERARCHY' },
    DevHandoffPackage: { stage: 'guidelines', label: 'DEV HANDOFF' },
    MoodboardComposer: { stage: 'assets', label: 'MOODBOARD' },
    MindMapCanvas: { stage: 'concept', label: 'MIND MAP' },
    PalettePicker: { stage: 'composition', label: 'PALETTE' },
    GeometricConstructor: { stage: 'composition', label: 'GEOMETRIC CONSTRUCTOR' },
    ReviewView: { stage: 'review', label: 'DIRECTION REVIEW' },
    GuidelinePreview: { stage: 'guidelines', label: 'GUIDELINE PREVIEW' },
};

// Maps component names to the step keys stored in brand.discovery
// (or brand.strategy for ClientInterviewWizard) so we can determine
// whether a wizard/tool has been completed on page reload.
export const COMPONENT_STEP_MAP: Record<string, string | undefined> = {
    ClientInterviewWizard: 'interview',
    MindMapCanvas: 'mindmap_confirm',
    KeywordMindMap: 'keyword_mindmap',
    SemanticObjectMapper: 'semantic_mapper',
    DesignConceptExplorer: 'concept_explorer',
    VisualPillarExtractor: 'visual_pillars',
    BrandStrategyOverview: 'brand_strategy',
    TypographyPairingSelector: 'typography_pairing',
    ColorHierarchyBuilder: 'color_hierarchy',
    LogoCompositionBuilder: 'logo_composition',
    DirectionComparator: 'direction_compare',
    FeedbackCollector: 'feedback_collect',
    ResonanceConfirmator: 'resonance_confirm',
    MoodboardComposer: 'moodboard',
    DevHandoffPackage: 'dev_handoff',
    ColorSystemDocument: 'color_system',
    AssetPatternLibrary: 'asset_pattern',
    TypographyHierarchyDoc: 'typography_hierarchy',
};
