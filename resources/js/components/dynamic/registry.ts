import React, { lazy, Suspense } from 'react';

// Define the component signature expected by all dynamic tools
export interface DynamicComponentProps {
    id: string;
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
