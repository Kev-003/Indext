import { X } from '@phosphor-icons/react';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import type { DynamicComponentProps } from '../registry';

// ---------------------------------------------------------
// 3.2 TypographyPairingSelector
// ---------------------------------------------------------
interface TypographyPairingSelectorProps extends DynamicComponentProps {
    brandId?: number;
    recommendedPairs?: Array<{ heading: string; body: string }>;
    filters?: string[];
}

export function TypographyPairingSelector({
    id,
    onAction,
    recommendedPairs = [],
    filters = ['serif', 'sans', 'geometric'],
}: TypographyPairingSelectorProps) {
    const [selectedPair, setSelectedPair] = useState<number | null>(null);
    const [headingSize, setHeadingSize] = useState([48]);
    const [bodySize, setBodySize] = useState([16]);

    return (
        <div className="p-4">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-nm-amber dark:text-nm-amber font-display text-lg font-semibold">
                    Typography Pairing Selector
                </h3>
                <div className="flex gap-2">
                    {filters.map((filter) => (
                        <Button key={filter} variant="outline" size="sm">
                            {filter}
                        </Button>
                    ))}
                </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                {recommendedPairs.map((pair, i) => (
                    <Card
                        key={i}
                        className={`cursor-pointer transition hover:shadow-md ${selectedPair === i ? 'ring-nm-cyan ring-2' : ''}`}
                        onClick={() => setSelectedPair(i)}
                    >
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-base">
                                {pair.heading} + {pair.body}
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Recommended pairing
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="space-y-2">
                                <p
                                    style={{
                                        fontFamily: pair.heading,
                                        fontSize: `${headingSize[0]}px`,
                                    }}
                                    className="font-bold"
                                >
                                    The quick brown fox
                                </p>
                                <p
                                    style={{
                                        fontFamily: pair.body,
                                        fontSize: `${bodySize[0]}px`,
                                    }}
                                >
                                    The quick brown fox jumps over the lazy dog.
                                </p>
                            </div>
                            <div className="mt-4 space-y-2">
                                <Label>Heading size: {headingSize[0]}px</Label>
                                <Slider
                                    values={headingSize}
                                    onValuesChange={(v: number[]) =>
                                        setHeadingSize(v)
                                    }
                                    max={96}
                                    min={24}
                                />
                            </div>
                            <div className="mt-2 space-y-2">
                                <Label>Body size: {bodySize[0]}px</Label>
                                <Slider
                                    values={bodySize}
                                    onValuesChange={(v: number[]) =>
                                        setBodySize(v)
                                    }
                                    max={32}
                                    min={12}
                                />
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {recommendedPairs.length === 0 && (
                    <div className="col-span-full py-8 text-center text-muted-foreground italic">
                        No typography recommendations yet. Ask the AI to suggest
                        pairings based on brand pillars.
                    </div>
                )}
            </div>

            {selectedPair !== null && (
                <div className="flex justify-end">
                    <Button
                        onClick={() => {
                            const pair = recommendedPairs[selectedPair];
                            onAction?.('complete_step', {
                                step: 'typography_pairing',
                                pair,
                                headingSize: headingSize[0],
                                bodySize: bodySize[0],
                            });
                        }}
                    >
                        Save Pairing
                    </Button>
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------
// 3.3 ColorHierarchyBuilder
// ---------------------------------------------------------
interface ColorHierarchyBuilderProps extends DynamicComponentProps {
    brandId?: number;
    suggestedPalette?: Array<{
        role?: string;
        name?: string;
        hex?: string;
        color?: string;
        cmyk?: number[];
    }>;
    mode?: 'digital' | 'print' | 'both';
}

const normalizeColorPalette = (palette: any[]) => {
    if (!palette || !Array.isArray(palette)) {
return [];
}

    return palette.map((c, idx) => ({
        role:
            c.role ||
            c.name ||
            (idx === 0 ? 'primary' : idx === 1 ? 'secondary' : 'accent'),
        hex: c.hex || c.color || '#9ca3af',
        cmyk: c.cmyk || [0, 0, 0, 0],
    }));
};

export function ColorHierarchyBuilder({
    id,
    onAction,
    suggestedPalette = [],
    mode = 'both',
}: ColorHierarchyBuilderProps) {
    const [colors, setColors] = React.useState<
        Array<{ role: string; hex: string; cmyk?: number[] }>
    >(() => normalizeColorPalette(suggestedPalette));
    const [viewMode, setViewMode] = React.useState<
        'digital' | 'print' | 'both'
    >('digital');

    React.useEffect(() => {
        if (suggestedPalette && suggestedPalette.length > 0) {
            setColors(normalizeColorPalette(suggestedPalette));
        }
    }, [suggestedPalette]);

    const addColor = () => {
        const newColor = {
            role: 'accent',
            hex:
                '#' +
                Math.floor(Math.random() * 16777215)
                    .toString(16)
                    .padStart(6, '0'),
            cmyk: [0, 0, 0, 0],
        };
        setColors([...colors, newColor]);
    };

    const updateColor = (index: number, field: string, value: any) => {
        const updated = [...colors];
        (updated[index] as any)[field] = value;
        setColors(updated);
    };

    const removeColor = (index: number) => {
        setColors(colors.filter((_, i) => i !== index));
    };

    return (
        <div className="p-4">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-nm-amber dark:text-nm-amber font-display text-lg font-semibold">
                    Color Hierarchy Builder
                </h3>
                <div className="flex gap-2">
                    {(['digital', 'print', 'both'] as const).map((m) => (
                        <Button
                            key={m}
                            variant={mode === m ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setViewMode(m)}
                        >
                            {m}
                        </Button>
                    ))}
                </div>
            </div>

            {colors.length === 0 ? (
                <div className="mb-4 rounded border py-8 text-center text-muted-foreground italic">
                    No color suggestions provided yet. Click "Add Color" or ask
                    AI to generate a palette.
                </div>
            ) : (
                <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {colors.map((color, i) => (
                        <Card key={i} className="relative">
                            <CardContent className="p-3">
                                <div
                                    className="border-nm-grid dark:border-nm-grid mb-2 aspect-square w-full rounded-lg border shadow-inner"
                                    style={{
                                        backgroundColor: color.hex || '#9ca3af',
                                    }}
                                />
                                <Input
                                    value={color.hex || '#9ca3af'}
                                    onChange={(e) =>
                                        updateColor(i, 'hex', e.target.value)
                                    }
                                    className="mb-1 font-mono text-xs"
                                />
                                <select
                                    value={color.role}
                                    onChange={(e) =>
                                        updateColor(i, 'role', e.target.value)
                                    }
                                    className="border-nm-grid dark:text-nm-steel dark:border-nm-grid dark:bg-nm-paper-dark w-full rounded border p-1 text-xs"
                                >
                                    <option value="primary">
                                        Primary (60%)
                                    </option>
                                    <option value="secondary">
                                        Secondary (30%)
                                    </option>
                                    <option value="accent">Accent (10%)</option>
                                </select>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-nm-magenta absolute top-2 right-2 h-6 w-6"
                                    onClick={() => removeColor(i)}
                                >
                                    <X size={14} className="text-nm-magenta" />
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {(viewMode === 'print' || viewMode === 'both') &&
                colors.length > 0 && (
                    <div className="bg-nm-steel/10 mb-4 rounded p-4">
                        <Label className="mb-2 block font-mono text-xs">
                            CMYK VALUES
                        </Label>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {colors.map((color, i) => (
                                <div key={i} className="text-xs">
                                    <div className="font-medium">
                                        {color.role}
                                    </div>
                                    <div className="font-mono text-muted-foreground">
                                        {color.cmyk
                                            ? color.cmyk.join(', ')
                                            : 'C:0 M:0 Y:0 K:0'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            <div className="flex justify-between">
                <Button variant="outline" onClick={addColor}>
                    Add Color
                </Button>
                <Button
                    onClick={() =>
                        onAction?.('complete_step', {
                            step: 'color_hierarchy',
                            palette: colors,
                            mode: viewMode,
                        })
                    }
                >
                    Save Palette
                </Button>
            </div>
        </div>
    );
}

// ---------------------------------------------------------
// 3.4 LogoCompositionBuilder
// ---------------------------------------------------------
interface LogoCompositionBuilderProps extends DynamicComponentProps {
    brandId?: number;
    iconAssetId?: number;
    wordmark?: string;
    suggestedLockups?: string[];
}

export function LogoCompositionBuilder({
    id,
    onAction,
    brandId,
    iconAssetId,
    wordmark = 'Brand Name',
    suggestedLockups = ['horizontal', 'stacked', 'icon-only'],
}: LogoCompositionBuilderProps) {
    const [lockup, setLockup] = useState('horizontal');
    const [clearspace, setClearspace] = useState(16);
    const [scale, setScale] = useState(100);

    return (
        <div className="p-4">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-nm-amber dark:text-nm-amber font-display text-lg font-semibold">
                    Logo Composition Builder
                </h3>
                <span className="bg-nm-steel/10 text-nm-steel rounded px-2 py-1 font-mono text-xs">
                    Lockup: {lockup}
                </span>
            </div>

            <div className="mb-6 flex gap-2">
                {suggestedLockups.map((l) => (
                    <Button
                        key={l}
                        variant={lockup === l ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setLockup(l)}
                    >
                        {l}
                    </Button>
                ))}
            </div>

            <div className="border-nm-grid bg-nm-paper dark:bg-nm-paper-dark mb-6 rounded-lg border-2 border-dashed p-8">
                <div
                    className={`flex ${lockup === 'stacked' ? 'flex-col' : 'flex-row'} items-center justify-center gap-4`}
                >
                    <div
                        className="bg-nm-steel/20 dark:bg-nm-steel/30 flex items-center justify-center rounded"
                        style={{
                            width: `${scale}px`,
                            height: `${scale}px`,
                            transform: `scale(${scale / 100})`,
                        }}
                    >
                        <span className="text-xs text-muted-foreground">
                            ICON
                        </span>
                    </div>
                    {lockup !== 'icon-only' && (
                        <span className="text-xl font-bold">{wordmark}</span>
                    )}
                </div>
            </div>

            <div className="mb-6 space-y-4">
                <div className="space-y-2">
                    <Label>Clearspace: {clearspace}px</Label>
                    <Slider
                        values={[clearspace]}
                        onValuesChange={(v: number[]) => setClearspace(v[0])}
                        max={64}
                        min={8}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Scale: {scale}%</Label>
                    <Slider
                        values={[scale]}
                        onValuesChange={(v: number[]) => setScale(v[0])}
                        max={200}
                        min={50}
                    />
                </div>
            </div>

            <div className="flex justify-between">
                <Button
                    variant="outline"
                    onClick={() =>
                        onAction?.('complete_step', {
                            step: 'logo_composition',
                            action: 'generate_variations',
                            lockup,
                            clearspace,
                            scale,
                        })
                    }
                >
                    Generate Variations
                </Button>
                <Button
                    onClick={() =>
                        onAction?.('complete_step', {
                            step: 'logo_composition',
                            lockup,
                            clearspace,
                            scale,
                            wordmark,
                        })
                    }
                >
                    Save Composition
                </Button>
            </div>
        </div>
    );
}
