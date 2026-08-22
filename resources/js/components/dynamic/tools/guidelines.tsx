import React, { useState } from 'react';
import { DynamicComponentProps } from '../registry';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// ---------------------------------------------------------
// 5.1 BrandGuidelineDocument
// ---------------------------------------------------------
interface BrandGuidelineDocumentProps extends DynamicComponentProps {
    brandId?: number;
    sections?: string[];
    readonly?: boolean;
}

export function BrandGuidelineDocument({ id, brandId, sections = ['logo', 'color', 'typography', 'assets', 'future'], readonly = false }: BrandGuidelineDocumentProps) {
    const [activeSection, setActiveSection] = useState(sections[0]);

    const renderSection = () => {
        switch (activeSection) {
            case 'logo':
                return (
                    <div className="space-y-4">
                        <h4 className="font-medium">Logo Rules</h4>
                        <p className="text-sm text-gray-500">Define logo composition, clearspace, minimum size, and usage rules here.</p>
                    </div>
                );
            case 'color':
                return (
                    <div className="space-y-4">
                        <h4 className="font-medium">Color System</h4>
                        <p className="text-sm text-gray-500">Define color hierarchy, CMYK/RGB values, and accessibility rules here.</p>
                    </div>
                );
            case 'typography':
                return (
                    <div className="space-y-4">
                        <h4 className="font-medium">Typography</h4>
                        <p className="text-sm text-gray-500">Define type pairings, scale, weights, and hierarchy rules here.</p>
                    </div>
                );
            case 'assets':
                return (
                    <div className="space-y-4">
                        <h4 className="font-medium">Assets & Patterns</h4>
                        <p className="text-sm text-gray-500">Define shapes, patterns, and usage rules across Social, Web, and Print here.</p>
                    </div>
                );
            case 'future':
                return (
                    <div className="space-y-4">
                        <h4 className="font-medium">Future Plans & Governance</h4>
                        <p className="text-sm text-gray-500">Define development handoff, digital presence, physical touchpoints, and brand governance rules here.</p>
                    </div>
                );
            default:
                return <p className="text-sm text-gray-400">Select a section to view.</p>;
        }
    };

    return (
        <div className="p-6 border-l-4 border-l-emerald-500">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Brand Guidelines</h3>
                <div className="flex gap-2">
                    {!readonly && (
                        <Button variant="outline" size="sm">Regenerate Section</Button>
                    )}
                    <Button size="sm">Export PDF</Button>
                </div>
            </div>

            <div className="flex gap-2 mb-6 overflow-x-auto">
                {sections.map((section) => (
                    <Button
                        key={section}
                        variant={activeSection === section ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActiveSection(section)}
                        className="capitalize"
                    >
                        {section}
                    </Button>
                ))}
            </div>

            <div className="border rounded-lg p-6 bg-white dark:bg-gray-950 min-h-[300px]">
                {renderSection()}
            </div>
        </div>
    );
}

// ---------------------------------------------------------
// 5.2 LogoUsageGuide
// ---------------------------------------------------------
interface LogoUsageGuideProps extends DynamicComponentProps {
    brandId?: number;
    lockups?: any[];
    misuseExamples?: string[];
}

export function LogoUsageGuide({ id, brandId, lockups = [], misuseExamples = ['stretching', 'recoloring', 'rotation'] }: LogoUsageGuideProps) {
    const [showDo, setShowDo] = useState(true);

    return (
        <div className="p-6 border-l-4 border-l-blue-500">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Logo Usage Guide</h3>
                <div className="flex gap-2">
                    <Button
                        variant={showDo ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setShowDo(true)}
                    >
                        Do
                    </Button>
                    <Button
                        variant={!showDo ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setShowDo(false)}
                    >
                        Don't
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h4 className="font-medium mb-3">Approved Lockups</h4>
                    <div className="space-y-3">
                        {lockups.map((lockup, i) => (
                            <div key={i} className="border rounded p-4 bg-gray-50 dark:bg-gray-900">
                                <p className="text-sm font-medium">{lockup.name || `Lockup ${i + 1}`}</p>
                                <p className="text-xs text-muted-foreground">{lockup.description || 'Standard lockup'}</p>
                            </div>
                        ))}
                        {lockups.length === 0 && (
                            <p className="text-sm text-gray-400 italic">No lockups defined yet.</p>
                        )}
                    </div>
                </div>

                <div>
                    <h4 className="font-medium mb-3">
                        {showDo ? 'Correct Usage' : 'Common Misuse'}
                    </h4>
                    <div className="space-y-3">
                        {misuseExamples.map((example, i) => (
                            <div key={i} className="border rounded p-4">
                                <p className="text-sm">{showDo ? `✓ ${example}` : `✗ ${example}`}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------
// 5.3 ColorSystemDocument
// ---------------------------------------------------------
interface ColorSystemDocumentProps extends DynamicComponentProps {
    brandId?: number;
    palette?: any[];
    hierarchy?: Record<string, string>;
}

export function ColorSystemDocument({ id, brandId, palette = [], hierarchy = {} }: ColorSystemDocumentProps) {
    const [view, setView] = useState<'digital' | 'print'>('digital');

    return (
        <div className="p-6 border-l-4 border-l-pink-500">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Color System</h3>
                <div className="flex gap-2">
                    {['digital', 'print'].map((v) => (
                        <Button
                            key={v}
                            variant={view === v ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setView(v as any)}
                        >
                            {v === 'digital' ? 'RGB/HEX' : 'CMYK'}
                        </Button>
                    ))}
                </div>
            </div>

            <div className="mb-6">
                <h4 className="text-sm font-medium mb-3">Color Hierarchy (60-30-10)</h4>
                <div className="flex gap-4">
                    {Object.entries(hierarchy).map(([role, color]) => (
                        <div key={role} className="text-center">
                            <div
                                className="w-16 h-16 rounded-lg shadow-inner mb-1"
                                style={{ backgroundColor: color }}
                            />
                            <p className="text-xs font-medium capitalize">{role}</p>
                            <p className="text-xs text-gray-500 font-mono">{color}</p>
                        </div>
                    ))}
                    {Object.keys(hierarchy).length === 0 && (
                        <p className="text-sm text-gray-400 italic">No hierarchy defined.</p>
                    )}
                </div>
            </div>

            <div>
                <h4 className="text-sm font-medium mb-3">Full Palette</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {palette.map((color, i) => (
                        <div key={i} className="border rounded p-3">
                            <div
                                className="w-full aspect-square rounded mb-2"
                                style={{ backgroundColor: color.hex || color }}
                            />
                            <p className="text-xs font-mono">{color.hex || color}</p>
                        </div>
                    ))}
                    {palette.length === 0 && (
                        <p className="text-sm text-gray-400 italic col-span-full">No palette colors yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------
// 5.4 AssetPatternLibrary
// ---------------------------------------------------------
interface AssetPatternLibraryProps extends DynamicComponentProps {
    brandId?: number;
    patterns?: any[];
    contexts?: string[];
}

export function AssetPatternLibrary({ id, brandId, patterns = [], contexts = ['social', 'web', 'print'] }: AssetPatternLibraryProps) {
    const [selectedContext, setSelectedContext] = useState<string | null>(null);

    return (
        <div className="p-6 border-l-4 border-l-indigo-500">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Asset & Pattern Library</h3>
                <div className="flex gap-2">
                    {contexts.map((ctx) => (
                        <Button
                            key={ctx}
                            variant={selectedContext === ctx ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedContext(ctx)}
                            className="capitalize"
                        >
                            {ctx}
                        </Button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {patterns.map((pattern, i) => (
                    <Card key={i} className="overflow-hidden">
                        <div className="aspect-video bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
                            {pattern.svg ? (
                                <div dangerouslySetInnerHTML={{ __html: pattern.svg }} />
                            ) : (
                                <span className="text-xs text-gray-400">Pattern {i + 1}</span>
                            )}
                        </div>
                        <CardContent className="p-3">
                            <p className="text-sm font-medium">{pattern.name || `Pattern ${i + 1}`}</p>
                            <p className="text-xs text-muted-foreground capitalize">{pattern.type || 'shape'}</p>
                        </CardContent>
                    </Card>
                ))}
                {patterns.length === 0 && (
                    <div className="col-span-full text-gray-400 italic text-center py-8">
                        No patterns generated yet.
                    </div>
                )}
            </div>
        </div>
    );
}

// ---------------------------------------------------------
// 5.5 TypographyHierarchyDoc
// ---------------------------------------------------------
interface TypographyHierarchyDocProps extends DynamicComponentProps {
    brandId?: number;
    pairings?: Array<{ heading: string; body: string; scale?: string[] }>;
}

export function TypographyHierarchyDoc({ id, brandId, pairings = [] }: TypographyHierarchyDocProps) {
    return (
        <div className="p-6 border-l-4 border-l-purple-500">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Typography Hierarchy</h3>
                <Button variant="outline" size="sm">Export Specimen</Button>
            </div>

            {pairings.length === 0 ? (
                <div className="text-gray-400 italic text-center py-8">
                    No typography pairings defined yet.
                </div>
            ) : (
                <div className="space-y-6">
                    {pairings.map((pairing, i) => (
                        <div key={i} className="border rounded-lg p-6">
                            <div className="mb-4">
                                <h4 style={{ fontFamily: pairing.heading }} className="text-4xl font-bold mb-2">
                                    Heading — {pairing.heading}
                                </h4>
                                <p style={{ fontFamily: pairing.body }} className="text-lg">
                                    Body text — {pairing.body}
                                </p>
                            </div>

                            {pairing.scale && (
                                <div className="space-y-2">
                                    <Label>Type Scale</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {pairing.scale.map((size, j) => (
                                            <span key={j} className="px-2 py-1 bg-gray-100 dark:bg-gray-900 rounded text-xs font-mono">
                                                {size}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------
// 5.6 DevHandoffPackage
// ---------------------------------------------------------
interface DevHandoffPackageProps extends DynamicComponentProps {
    brandId?: number;
    tokens?: Record<string, any>;
    assets?: any[];
    touchpoints?: string[];
}

export function DevHandoffPackage({ id, brandId, tokens = {}, assets = [], touchpoints = ['web', 'mobile', 'print', 'packaging'] }: DevHandoffPackageProps) {
    const [selectedExports, setSelectedExports] = useState<string[]>(['svg', 'png']);

    const toggleExport = (format: string) => {
        setSelectedExports(
            selectedExports.includes(format)
                ? selectedExports.filter((f) => f !== format)
                : [...selectedExports, format]
        );
    };

    return (
        <div className="p-6 border-l-4 border-l-gray-500">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Dev Handoff Package</h3>
                <span className="text-xs font-mono bg-gray-100 text-gray-800 px-2 py-1 rounded">
                    {touchpoints.length} touchpoints
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <h4 className="font-medium mb-3">Design Tokens</h4>
                    <div className="space-y-2">
                        {Object.keys(tokens).length === 0 ? (
                            <p className="text-sm text-gray-400 italic">No tokens generated yet.</p>
                        ) : (
                            Object.entries(tokens).map(([key, value]) => (
                                <div key={key} className="flex justify-between p-2 border rounded text-sm">
                                    <span className="font-mono">{key}</span>
                                    <span className="text-gray-600 dark:text-gray-400">
                                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div>
                    <h4 className="font-medium mb-3">Export Formats</h4>
                    <div className="flex flex-wrap gap-2">
                        {['svg', 'png', 'pdf', 'swift', 'android', 'figma'].map((format) => (
                            <Button
                                key={format}
                                variant={selectedExports.includes(format) ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => toggleExport(format)}
                            >
                                {format.toUpperCase()}
                            </Button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mb-6">
                <h4 className="font-medium mb-3">Touchpoints</h4>
                <div className="flex flex-wrap gap-2">
                    {touchpoints.map((tp) => (
                        <span key={tp} className="px-3 py-1 bg-gray-100 dark:bg-gray-900 rounded-full text-sm capitalize">
                            {tp}
                        </span>
                    ))}
                </div>
            </div>

            <div className="flex justify-between">
                <Button variant="outline" onClick={() => {/* AI would package assets */}}>
                    Package Assets
                </Button>
                <Button onClick={() => {/* AI would finalize handoff */}}>
                    Approve Handoff
                </Button>
            </div>
        </div>
    );
}
