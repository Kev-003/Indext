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

// The registry mapping AI tool names to actual React components
export const ComponentRegistry: Record<string, React.ComponentType<DynamicComponentProps>> = {
    MindMapCanvas,
    PalettePicker,
    GeometricConstructor,
    ReviewView,
    GuidelinePreview,
};

export type RegisteredComponentName = keyof typeof ComponentRegistry;
