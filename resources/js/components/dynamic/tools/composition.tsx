import React, { useState } from 'react';
import { DynamicComponentProps } from '../registry';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// ---------------------------------------------------------
// 3.2 TypographyPairingSelector
// ---------------------------------------------------------
interface TypographyPairingSelectorProps extends DynamicComponentProps {
    brandId?: number;
    recommendedPairs?: Array<{ heading: string; body: string }>;
    filters?: string[];
}

export function TypographyPairingSelector({ id, recommendedPairs = [], filters = ['serif', 'sans', 'geometric'] }: TypographyPairingSelectorProps) {
    const [selectedPair, setSelectedPair] = useState<number | null>(null);
    const [headingSize, setHeadingSize] = useState([48]);
    const [bodySize, setBodySize] = useState([16]);

    return (
        <div className="p-6 border-l-4 border-l-violet-500">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Typography Pairing Selector</h3>
                <div className="flex gap-2">
                    {filters.map((filter) => (
                        <Button key={filter} variant="outline" size="sm">
                            {filter}
                        </Button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {recommendedPairs.map((pair, i) => (
                    <Card
                        key={i}
                        className={`cursor-pointer transition hover:shadow-md ${selectedPair === i ? 'ring-2 ring-violet-500' : ''}`}
                        onClick={() => setSelectedPair(i)}
                    >
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-base">{pair.heading} + {pair.body}</CardTitle>
                            <CardDescription className="text-xs">Recommended pairing</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="space-y-2">
                                <p style={{ fontFamily: pair.heading, fontSize: `${headingSize[0]}px` }} className="font-bold">
                                    The quick brown fox
                                </p>
                                <p style={{ fontFamily: pair.body, fontSize: `${bodySize[0]}px` }}>
                                    The quick brown fox jumps over the lazy dog.
                                </p>
                            </div>
                            <div className="space-y-2 mt-4">
                                <Label>Heading size: {headingSize[0]}px</Label>
                                <Slider values={headingSize} onValuesChange={(v: number[]) => setHeadingSize(v)} max={96} min={24} />
                            </div>
                            <div className="space-y-2 mt-2">
                                <Label>Body size: {bodySize[0]}px</Label>
                                <Slider values={bodySize} onValuesChange={(v: number[]) => setBodySize(v)} max={32} min={12} />
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {recommendedPairs.length === 0 && (
                    <div className="col-span-full text-gray-400 italic text-center py-8">
                        No typography recommendations yet. Ask the AI to suggest pairings based on brand pillars.
                    </div>
                )}
            </div>

            {selectedPair !== null && (
                <div className="flex justify-end">
                    <Button onClick={() => {/* AI would save pairing */}}>
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
    suggestedPalette?: Array<{ role: string; hex: string; cmyk?: number[] }>;
    mode?: 'digital' | 'print' | 'both';
}

export function ColorHierarchyBuilder({ id, suggestedPalette = [], mode = 'both' }: ColorHierarchyBuilderProps) {
    const [colors, setColors] = useState<Array<{ role: string; hex: string; cmyk?: number[] }>>(suggestedPalette);
    const [viewMode, setViewMode] = useState<'digital' | 'print' | 'both'>('digital');

    const addColor = () => {
        const newColor = {
            role: 'accent',
            hex: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
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
        <div className="p-6 border-l-4 border-l-pink-500">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Color Hierarchy Builder</h3>
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

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {colors.map((color, i) => (
                    <Card key={i} className="relative">
                        <CardContent className="p-3">
                            <div
                                className="w-full aspect-square rounded-lg mb-2 shadow-inner"
                                style={{ backgroundColor: color.hex }}
                            />
                            <Input
                                value={color.hex}
                                onChange={(e) => updateColor(i, 'hex', e.target.value)}
                                className="text-xs font-mono mb-1"
                            />
                            <select
                                value={color.role}
                                onChange={(e) => updateColor(i, 'role', e.target.value)}
                                className="w-full text-xs border rounded p-1"
                            >
                                <option value="primary">Primary (60%)</option>
                                <option value="secondary">Secondary (30%)</option>
                                <option value="accent">Accent (10%)</option>
                            </select>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-red-600 absolute top-2 right-2"
                                onClick={() => removeColor(i)}
                            >
                                ×
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {(viewMode === 'print' || viewMode === 'both') && colors.length > 0 && (
                <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded">
                    <Label className="text-xs font-mono mb-2 block">CMYK VALUES</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {colors.map((color, i) => (
                            <div key={i} className="text-xs">
                                <div className="font-medium">{color.role}</div>
                                <div className="font-mono text-gray-600">
                                    {color.cmyk ? color.cmyk.join(', ') : 'C:0 M:0 Y:0 K:0'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex justify-between">
                <Button variant="outline" onClick={addColor}>Add Color</Button>
                <Button onClick={() => {/* AI would save palette */}}>Save Palette</Button>
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

export function LogoCompositionBuilder({ id, brandId, iconAssetId, wordmark = 'Brand Name', suggestedLockups = ['horizontal', 'stacked', 'icon-only'] }: LogoCompositionBuilderProps) {
    const [lockup, setLockup] = useState('horizontal');
    const [clearspace, setClearspace] = useState(16);
    const [scale, setScale] = useState(100);

    return (
        <div className="p-6 border-l-4 border-l-orange-500">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Logo Composition Builder</h3>
                <span className="text-xs font-mono bg-orange-100 text-orange-800 px-2 py-1 rounded">
                    Lockup: {lockup}
                </span>
            </div>

            <div className="flex gap-2 mb-6">
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

            <div className="border-2 border-dashed rounded-lg p-8 mb-6 bg-gray-50 dark:bg-gray-900">
                <div className={`flex ${lockup === 'stacked' ? 'flex-col' : 'flex-row'} items-center justify-center gap-4`}>
                    <div
                        className="bg-gray-300 dark:bg-gray-700 rounded flex items-center justify-center"
                        style={{
                            width: `${scale}px`,
                            height: `${scale}px`,
                            transform: `scale(${scale / 100})`,
                        }}
                    >
                        <span className="text-xs text-gray-500">ICON</span>
                    </div>
                    {lockup !== 'icon-only' && (
                        <span className="text-xl font-bold">{wordmark}</span>
                    )}
                </div>
            </div>

            <div className="space-y-4 mb-6">
                <div className="space-y-2">
                    <Label>Clearspace: {clearspace}px</Label>
                    <Slider values={[clearspace]} onValuesChange={(v: number[]) => setClearspace(v[0])} max={64} min={8} />
                </div>
                <div className="space-y-2">
                    <Label>Scale: {scale}%</Label>
                    <Slider values={[scale]} onValuesChange={(v: number[]) => setScale(v[0])} max={200} min={50} />
                </div>
            </div>

            <div className="flex justify-between">
                <Button variant="outline" onClick={() => {/* AI would generate variations */}}>
                    Generate Variations
                </Button>
                <Button onClick={() => {/* AI would save lockup */}}>Save Composition</Button>
            </div>
        </div>
    );
}





