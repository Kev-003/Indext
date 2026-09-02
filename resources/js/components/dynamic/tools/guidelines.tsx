import { Check, X, Copy, CheckCircle } from '@phosphor-icons/react';
import React, { useState } from 'react';
import { usePage, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { DynamicComponentProps } from '../registry';

// ---------------------------------------------------------
// 5.1 BrandGuidelineDocument (Brand Completion Terminal)
// ---------------------------------------------------------
interface BrandGuidelineDocumentProps extends DynamicComponentProps {
    brandId?: number;
    sections?: string[];
    readonly?: boolean;
}

export function BrandGuidelineDocument({
    id,
    onAction,
    brandId,
    sections = ['logo', 'color', 'typography', 'assets', 'future'],
    readonly = false,
}: BrandGuidelineDocumentProps) {
    const page = usePage<any>();
    const brand = page.props?.brand;
    const currentTeamSlug = page.props?.currentTeam?.slug || '';
    const brandSlug = brand?.slug || brand?.id || brandId;

    const [activeSection, setActiveSection] = useState(sections[0] || 'logo');
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [publishStatus, setPublishStatus] = useState<boolean>(
        brand?.guideline?.is_published ?? (brand?.status === 'delivered')
    );

    const guideline = brand?.guideline;
    const discovery = brand?.discovery ?? {};
    const strategy = brand?.strategy ?? {};

    // Derive logo SVG
    const logoSvg =
        guideline?.logo_guidelines?.primary_mark?.svg ||
        discovery?.geometric_constructor?.svgPath ||
        discovery?.geometric_constructor?.svg ||
        '';

    // Derive palette
    const palette =
        guideline?.color_guidelines?.palette ||
        discovery?.palette ||
        strategy?.color_system ||
        [
            { name: 'Paper Base', color: '#f8fafc', hex: '#f8fafc', role: 'dominant' },
            { name: 'Steel Neutral', color: '#64748b', hex: '#64748b', role: 'structural' },
            { name: 'Cyan Accent', color: '#0ea5e0', hex: '#0ea5e0', role: 'accent' },
        ];

    // Derive typography
    const typographyPairing =
        guideline?.typography_guidelines?.pairing ||
        strategy?.typography_pairing || {
            heading: 'Space Grotesk',
            body: 'JetBrains Mono',
        };

    const handleFinalize = async () => {
        if (!brandSlug) return;
        setIsFinalizing(true);
        try {
            const res = await fetch(`/api/brands/${brandSlug}/finalize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
            });
            if (res.ok) {
                setPublishStatus(true);
                router.reload({ only: ['brand'] });
            }
        } catch (e) {
            console.error('Finalize error', e);
        } finally {
            setIsFinalizing(false);
        }
    };

    const handleCopyJson = () => {
        const payload = {
            brandName: brand?.name,
            status: 'delivered',
            logoSvg,
            palette,
            typography: typographyPairing,
            discovery,
            guideline,
        };
        navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const renderSection = () => {
        switch (activeSection) {
            case 'logo':
                return (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h4 className="font-display font-semibold text-nm-ink dark:text-gray-100">
                                Primary Brand Mark
                            </h4>
                            <span className="rounded bg-nm-cyan/10 px-2 py-0.5 font-mono text-xs text-nm-cyan">
                                Vector Master
                            </span>
                        </div>

                        <div className="flex flex-col items-center justify-center rounded-lg border border-nm-grid bg-white p-8 dark:bg-nm-paper-dark">
                            {logoSvg ? (
                                <svg
                                    viewBox="0 0 600 300"
                                    className="h-40 w-80 max-w-full"
                                >
                                    <path
                                        d={logoSvg}
                                        fill="none"
                                        stroke="var(--nm-cyan)"
                                        strokeWidth={3}
                                        strokeLinejoin="round"
                                        strokeLinecap="round"
                                    />
                                </svg>
                            ) : (
                                <div className="text-center text-sm text-muted-foreground italic">
                                    No geometric logo mark generated yet. Complete the Geometric Constructor step.
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="rounded border border-nm-grid p-4 bg-white dark:bg-nm-paper-dark">
                                <h5 className="text-xs font-mono font-semibold uppercase tracking-wider text-nm-steel">
                                    Clear Space & Sizing
                                </h5>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Maintain minimum perimeter clear space equal to 100% of mark height. Minimum display height is 24px digital / 8mm print.
                                </p>
                            </div>
                            <div className="rounded border border-nm-grid p-4 bg-white dark:bg-nm-paper-dark">
                                <h5 className="text-xs font-mono font-semibold uppercase tracking-wider text-nm-steel">
                                    Usage Guidelines
                                </h5>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Do not stretch, shear, distort, or apply unapproved color gradients to the vector mark geometry.
                                </p>
                            </div>
                        </div>
                    </div>
                );

            case 'color':
                return (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h4 className="font-display font-semibold text-nm-ink dark:text-gray-100">
                                Color Architecture (60-30-10)
                            </h4>
                            <span className="rounded bg-nm-amber/10 px-2 py-0.5 font-mono text-xs text-nm-amber">
                                Harmonics
                            </span>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            {Array.isArray(palette) && palette.map((col: any, idx: number) => {
                                const hex = col.hex || col.color || (typeof col === 'string' ? col : '#0ea5e0');
                                const name = col.name || col.role || `Color ${idx + 1}`;
                                return (
                                    <div key={idx} className="rounded-lg border border-nm-grid bg-white p-3 dark:bg-nm-paper-dark">
                                        <div
                                            className="h-24 w-full rounded-md shadow-inner"
                                            style={{ backgroundColor: hex }}
                                        />
                                        <div className="mt-2 flex items-center justify-between">
                                            <span className="text-sm font-medium text-nm-ink dark:text-gray-200">
                                                {name}
                                            </span>
                                            <span className="font-mono text-xs text-nm-steel">
                                                {hex}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );

            case 'typography':
                return (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h4 className="font-display font-semibold text-nm-ink dark:text-gray-100">
                                Typography Pairing & Hierarchy
                            </h4>
                            <span className="rounded bg-nm-steel/10 px-2 py-0.5 font-mono text-xs text-nm-steel">
                                Type Specimen
                            </span>
                        </div>

                        <div className="rounded-lg border border-nm-grid bg-white p-6 dark:bg-nm-paper-dark space-y-4">
                            <div>
                                <span className="font-mono text-xs text-nm-steel uppercase tracking-wider">
                                    Display &amp; Headings — {typographyPairing.heading || 'Space Grotesk'}
                                </span>
                                <p
                                    style={{ fontFamily: typographyPairing.heading || 'Space Grotesk' }}
                                    className="mt-1 text-3xl font-bold tracking-tight text-nm-ink dark:text-gray-100"
                                >
                                    {brand?.name || 'Nomentra'} Identity Systems
                                </p>
                            </div>
                            <div className="border-t border-nm-grid pt-4">
                                <span className="font-mono text-xs text-nm-steel uppercase tracking-wider">
                                    Body &amp; Technical Specimen — {typographyPairing.body || 'JetBrains Mono'}
                                </span>
                                <p
                                    style={{ fontFamily: typographyPairing.body || 'JetBrains Mono' }}
                                    className="mt-1 text-sm text-muted-foreground leading-relaxed"
                                >
                                    Structured constructive branding with programmatic precision. The quick brown fox jumps over the lazy dog. 0123456789.
                                </p>
                            </div>
                        </div>
                    </div>
                );

            case 'assets':
                return (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h4 className="font-display font-semibold text-nm-ink dark:text-gray-100">
                                Brand Asset Library
                            </h4>
                            <span className="rounded bg-nm-steel/10 px-2 py-0.5 font-mono text-xs text-nm-steel">
                                Production Files
                            </span>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="rounded-lg border border-nm-grid bg-white p-4 dark:bg-nm-paper-dark">
                                <h5 className="font-medium text-sm text-nm-ink dark:text-gray-200">
                                    Vector Mark (SVG / PDF)
                                </h5>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Scalable vector paths optimized for digital platforms and high-resolution print.
                                </p>
                            </div>
                            <div className="rounded-lg border border-nm-grid bg-white p-4 dark:bg-nm-paper-dark">
                                <h5 className="font-medium text-sm text-nm-ink dark:text-gray-200">
                                    Design System Tokens
                                </h5>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    W3C design token definitions for CSS, Tailwind, Swift, and Android Jetpack Compose.
                                </p>
                            </div>
                        </div>
                    </div>
                );

            case 'future':
                return (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h4 className="font-display font-semibold text-nm-ink dark:text-gray-100">
                                Governance &amp; Future Roadmap
                            </h4>
                            <span className="rounded bg-nm-steel/10 px-2 py-0.5 font-mono text-xs text-nm-steel">
                                Handoff Ready
                            </span>
                        </div>

                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-nm-cyan" />
                                Master vector logo mark committed to repository
                            </li>
                            <li className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-nm-cyan" />
                                Color contrast validation &amp; hierarchy distribution
                            </li>
                            <li className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-nm-cyan" />
                                Typography specimens calibrated for Web &amp; Mobile
                            </li>
                            <li className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-nm-cyan" />
                                Exportable brand kit package compiled
                            </li>
                        </ul>
                    </div>
                );

            default:
                return <p className="text-sm text-muted-foreground">Select a section to view.</p>;
        }
    };

    return (
        <div className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                    <h3 className="text-lg font-display font-semibold text-nm-ink dark:text-gray-100">
                        Brand Identity Guidelines
                    </h3>
                    {publishStatus && (
                        <span className="flex items-center gap-1 rounded bg-nm-cyan/10 px-2 py-0.5 font-mono text-xs text-nm-cyan">
                            <CheckCircle size={12} weight="fill" />
                            Published
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyJson}
                        className="gap-1 font-mono text-xs"
                    >
                        <Copy size={13} />
                        {copied ? 'Copied JSON!' : 'Export JSON'}
                    </Button>
                    {!publishStatus ? (
                        <Button
                            size="sm"
                            onClick={handleFinalize}
                            disabled={isFinalizing}
                            className="bg-nm-cyan text-white hover:bg-nm-cyan/90"
                        >
                            {isFinalizing ? 'Finalizing...' : 'Finalize & Publish Brand'}
                        </Button>
                    ) : (
                        <span className="text-xs font-mono text-nm-steel">
                            Brand Delivered
                        </span>
                    )}
                </div>
            </div>

            <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
                {sections.map((section) => (
                    <Button
                        key={section}
                        variant={activeSection === section ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActiveSection(section)}
                        className={`capitalize font-mono text-xs ${
                            activeSection === section
                                ? 'bg-nm-cyan text-white hover:bg-nm-cyan/90'
                                : 'border-nm-grid'
                        }`}
                    >
                        {section}
                    </Button>
                ))}
            </div>

            <div className="rounded-lg border border-nm-grid bg-nm-paper p-6 dark:bg-nm-paper-dark min-h-[320px]">
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
        <div className="p-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-display font-semibold text-nm-steel dark:text-nm-steel">
                    Logo Usage Guide</h3>
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
                            <div key={i} className="border border-nm-grid rounded p-4 bg-nm-steel/5 dark:bg-nm-paper-dark">
                                <p className="text-sm font-medium">{lockup.name || `Lockup ${i + 1}`}</p>
                                <p className="text-xs text-muted-foreground">{lockup.description || 'Standard lockup'}</p>
                            </div>
                        ))}
                        {lockups.length === 0 && (
                            <p className="text-sm text-muted-foreground italic">No lockups defined yet.</p>
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
                                <p className="text-sm flex items-center gap-1">
                                    {showDo ? <Check size={14} className="text-nm-cyan" /> : <X size={14} className="text-nm-magenta" />}
                                    {example}
                                </p>
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
        <div className="p-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-display font-semibold text-nm-steel dark:text-nm-steel">
                    Color System</h3>
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
                            <p className="text-xs text-muted-foreground font-mono">{color}</p>
                        </div>
                    ))}
                    {Object.keys(hierarchy).length === 0 && (
                        <p className="text-sm text-muted-foreground italic">No hierarchy defined.</p>
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
                        <p className="text-sm text-muted-foreground italic col-span-full">No palette colors yet.</p>
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
        <div className="p-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-display font-semibold text-nm-steel dark:text-nm-steel">
                    Asset & Pattern Library</h3>
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
                        <div className="aspect-video bg-nm-steel/10 dark:bg-nm-paper-dark flex items-center justify-center">
                            {pattern.svg ? (
                                <div dangerouslySetInnerHTML={{ __html: pattern.svg }} />
                            ) : (
                                <span className="text-xs text-muted-foreground">Pattern {i + 1}</span>
                            )}
                        </div>
                        <CardContent className="p-3">
                            <p className="text-sm font-medium">{pattern.name || `Pattern ${i + 1}`}</p>
                            <p className="text-xs text-muted-foreground capitalize">{pattern.type || 'shape'}</p>
                        </CardContent>
                    </Card>
                ))}
                {patterns.length === 0 && (
                    <div className="col-span-full text-muted-foreground italic text-center py-8">
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

const normalizeTypographyHierarchy = (pairings: any[]) => {
    if (!pairings || !Array.isArray(pairings)) {
        return [];
    }
    return pairings.map((p, idx) => ({
        heading:
            p?.heading ?? p?.headingFont ?? p?.display ?? p?.heading_name ?? 'Untitled heading',
        body: p?.body ?? p?.bodyFont ?? p?.subhead ?? p?.body_name ?? 'Untitled body',
        scale: p?.scale ?? p?.typeScale ?? null,
    }));
};

export function TypographyHierarchyDoc({ id, onAction, brandId, pairings = [] }: TypographyHierarchyDocProps) {
    const normalizedPairings = normalizeTypographyHierarchy(pairings);
    const handleContinue = (skipped = false) => {
        onAction?.('complete_step', {
            step: 'typography_hierarchy',
            brandId,
            pairings: normalizedPairings,
            skipped,
        });
    };

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-display font-semibold text-nm-steel dark:text-nm-steel">
                    Typography Hierarchy</h3>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm">Export Specimen</Button>
                    <Button size="sm" onClick={() => handleContinue(false)}>Accept &amp; Continue</Button>
                </div>
            </div>

            {normalizedPairings.length === 0 ? (
                <div className="text-muted-foreground italic text-center py-8">
                    No typography pairings defined yet.
                </div>
            ) : (
                <div className="space-y-6">
                    {normalizedPairings.map((pairing, i) => (
                        <div key={i} className="border rounded-lg p-6">
                            <div className="mb-4">
                                <h4 style={{ fontFamily: pairing.heading }} className="text-4xl font-bold mb-2">
                                    Heading — {pairing.heading}
                                </h4>
                                <p style={{ fontFamily: pairing.body }} className="text-lg">
                                    Body text — {pairing.body}
                                </p>
                            </div>

                            {pairing.scale && Array.isArray(pairing.scale) && (
                                <div className="space-y-2">
                                    <Label>Type Scale</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {pairing.scale.map((size: string, j: number) => (
                                            <span key={j} className="px-2 py-1 bg-nm-steel/10 dark:bg-nm-paper-dark rounded text-xs font-mono text-nm-steel">
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

            {normalizedPairings.length === 0 && (
                <div className="flex justify-end mt-4">
                    <Button variant="outline" onClick={() => handleContinue(true)}>Skip</Button>
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

export function DevHandoffPackage({ id, onAction, brandId, tokens = {}, assets = [], touchpoints = ['web', 'mobile', 'print', 'packaging'] }: DevHandoffPackageProps) {
    const [selectedExports, setSelectedExports] = useState<string[]>(['svg', 'png']);

    const toggleExport = (format: string) => {
        setSelectedExports(
            selectedExports.includes(format)
                ? selectedExports.filter((f) => f !== format)
                : [...selectedExports, format]
        );
    };

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-display font-semibold text-nm-steel dark:text-nm-steel">
                    Dev Handoff Package</h3>
                <span className="text-xs font-mono bg-nm-steel/10 text-nm-steel px-2 py-1 rounded">
                    {touchpoints.length} touchpoints
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <h4 className="font-medium mb-3">Design Tokens</h4>
                    <div className="space-y-2">
                        {Object.keys(tokens).length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">No tokens generated yet.</p>
                        ) : (
                            Object.entries(tokens).map(([key, value]) => (
                                <div key={key} className="flex justify-between p-2 border rounded text-sm">
                                    <span className="font-mono">{key}</span>
                                    <span className="text-muted-foreground dark:text-muted-foreground">
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
                        <span key={tp} className="px-3 py-1 bg-nm-steel/10 dark:bg-nm-paper-dark rounded-full text-sm text-nm-steel capitalize">
                            {tp}
                        </span>
                    ))}
                </div>
            </div>

            <div className="flex justify-between">
                <Button variant="outline" onClick={() => onAction?.('complete_step', {
                    step: 'dev_handoff',
                    brandId,
                    action: 'package_assets',
                    exports: selectedExports,
                    tokens,
                    assets,
                    touchpoints,
                })}>
                    Package Assets
                </Button>
                <Button onClick={() => onAction?.('complete_step', {
                    step: 'dev_handoff',
                    brandId,
                    action: 'approve_handoff',
                    exports: selectedExports,
                    tokens,
                    assets,
                    touchpoints,
                })}>
                    Approve Handoff
                </Button>
            </div>
        </div>
    );
}
