import React from 'react';
import { DynamicComponentProps } from '../registry';

// ---------------------------------------------------------
// Mind Map Canvas Placeholder
// ---------------------------------------------------------
interface MindMapProps extends DynamicComponentProps {
    title?: string;
    nodes?: string[];
}

export function MindMapCanvas({ id, title = "Brainstorming", nodes = [] }: MindMapProps) {
    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">{title}</h3>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Interactive</span>
            </div>
            <div className="flex flex-wrap gap-2">
                {nodes.map((node, i) => (
                    <div key={i} className="px-4 py-2 border rounded-full bg-slate-50 dark:bg-slate-900 shadow-sm">
                        {node}
                    </div>
                ))}
                {nodes.length === 0 && <div className="text-gray-400 italic">No nodes provided</div>}
            </div>
        </div>
    );
}

// ---------------------------------------------------------
// Palette Picker Placeholder
// ---------------------------------------------------------
interface PalettePickerProps extends DynamicComponentProps {
    initialColors?: string[];
}

export function PalettePicker({ id, initialColors = [] }: PalettePickerProps) {
    return (
        <div className="p-6 border-l-4 border-l-green-500">
             <h3 className="text-lg font-semibold mb-4">Color Palette Generator</h3>
             <div className="flex gap-4">
                 {initialColors.map((color, i) => (
                     <div key={i} className="flex flex-col items-center gap-2">
                         <div className="w-16 h-16 rounded-lg shadow-inner" style={{ backgroundColor: color }} />
                         <span className="text-xs font-mono">{color}</span>
                     </div>
                 ))}
                 {initialColors.length === 0 && <div className="text-gray-400 italic">Generate a palette...</div>}
             </div>
        </div>
    );
}

// ---------------------------------------------------------
// Geometric Constructor Placeholder (Rust/WASM target)
// ---------------------------------------------------------
interface GeometricProps extends DynamicComponentProps {
    mode?: 'Beginner' | 'Experienced';
}

export function GeometricConstructor({ id, mode = 'Beginner' }: GeometricProps) {
    return (
        <div className="p-6 border-l-4 border-l-purple-500">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Geometric Constructor</h3>
                <span className="text-xs font-mono bg-purple-100 text-purple-800 px-2 py-1 rounded">Mode: {mode}</span>
            </div>
             <div className="aspect-video bg-grid-slate-100 dark:bg-grid-slate-900 border rounded flex items-center justify-center">
                 <div className="text-center">
                     <p className="text-muted-foreground text-sm">[Rust/WASM Sketch Engine Mounting Point]</p>
                     <p className="text-xs text-slate-400 mt-2">Awaiting WASM module initialization...</p>
                 </div>
             </div>
        </div>
    );
}

// ---------------------------------------------------------
// Review View Placeholder
// ---------------------------------------------------------
interface ReviewViewProps extends DynamicComponentProps {
    title?: string;
    directions?: Array<Record<string, any>>;
}

export function ReviewView({ id, title = 'Direction Review', directions = [] }: ReviewViewProps) {
    return (
        <div className="p-6 border-l-4 border-l-orange-500">
            <h3 className="text-lg font-semibold mb-4">{title}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {directions.map((direction, i) => (
                    <div key={i} className="border rounded-lg p-4 bg-slate-50 dark:bg-slate-900">
                        <p className="text-sm text-gray-500">Direction {i + 1}</p>
                        <pre className="text-xs mt-2 overflow-auto max-h-40">
                            {JSON.stringify(direction, null, 2)}
                        </pre>
                    </div>
                ))}
                {directions.length === 0 && (
                    <div className="text-gray-400 italic col-span-full">No directions provided</div>
                )}
            </div>
        </div>
    );
}

// ---------------------------------------------------------
// Guideline Preview Placeholder
// ---------------------------------------------------------
interface GuidelinePreviewProps extends DynamicComponentProps {
    sections?: Array<Record<string, any>>;
}

export function GuidelinePreview({ id, sections = [] }: GuidelinePreviewProps) {
    return (
        <div className="p-6 border-l-4 border-l-emerald-500">
            <h3 className="text-lg font-semibold mb-4">Brand Guidelines</h3>
            <div className="space-y-4">
                {sections.map((section, i) => (
                    <div key={i} className="border rounded-lg p-4 bg-slate-50 dark:bg-slate-900">
                        <h4 className="font-medium">{section.title || `Section ${i + 1}`}</h4>
                        <p className="text-sm text-gray-500 mt-1">{section.content || 'No content provided'}</p>
                    </div>
                ))}
                {sections.length === 0 && (
                    <div className="text-gray-400 italic">No guideline sections provided</div>
                )}
            </div>
        </div>
    );
}
