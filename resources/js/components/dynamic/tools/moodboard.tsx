import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import type { DynamicComponentProps } from '../registry';

interface MoodboardComposerProps extends DynamicComponentProps {
    brandId?: number;
    initialAssets?: Array<{ id: string; url: string; type: string }>;
    layout?: 'grid' | 'freeform';
    suggestedPalette?: Array<{ role?: string; name?: string; hex?: string; color?: string }>;
    exportFormats?: string[];
}

const normalizeMoodboardPalette = (palette: any[]) => {
    if (!palette || !Array.isArray(palette)) {
return [];
}

    return palette.map((c) => ({
        role: c.role || c.name || 'accent',
        hex: c.hex || c.color || '#9ca3af',
    }));
};

export function MoodboardComposer({ id, onAction, brandId, initialAssets = [], layout = 'grid', suggestedPalette = [], ...rest }: MoodboardComposerProps) {
    const [assets, setAssets] = useState(initialAssets);
    const [palette, setPalette] = useState(() => normalizeMoodboardPalette(suggestedPalette));
    const [columns, setColumns] = useState([3]);

    useEffect(() => {
        if (initialAssets && initialAssets.length > 0) {
            setAssets(initialAssets);
        }
    }, [initialAssets]);

    useEffect(() => {
        if (suggestedPalette && suggestedPalette.length > 0) {
            setPalette(normalizeMoodboardPalette(suggestedPalette));
        }
    }, [suggestedPalette]);

    const addAsset = () => {
        setAssets([...assets, {
            id: Date.now().toString(),
            url: '',
            type: 'image',
        }]);
    };

    const removeAsset = (index: number) => {
        setAssets(assets.filter((_, i) => i !== index));
    };

    const updateAsset = (index: number, field: string, value: string) => {
        const updated = [...assets];
        (updated[index] as any)[field] = value;
        setAssets(updated);
    };

    const addColor = () => {
        setPalette([...palette, {
            role: 'accent',
            hex: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
        }]);
    };

    const removeColor = (index: number) => {
        setPalette(palette.filter((_, i) => i !== index));
    };

    const updateColor = (index: number, field: string, value: string) => {
        const updated = [...palette];
        (updated[index] as any)[field] = value;
        setPalette(updated);
    };

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-display font-semibold text-nm-steel dark:text-nm-steel">
                    Moodboard Composer</h3>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={addAsset}>
                        Add Asset
                    </Button>
                    <Button size="sm" onClick={() => onAction?.('complete_step', {
                        step: 'moodboard',
                        brandId,
                        assets,
                        palette,
                        layout,
                    })}>Save Moodboard</Button>
                </div>
            </div>

            <div className="space-y-2 mb-6">
                <Label>Grid Columns: {columns[0]}</Label>
                <Slider values={columns} onValuesChange={(v: number[]) => setColumns(v)} max={6} min={1} />
            </div>

            <div className={`grid gap-3 mb-6 ${layout === 'freeform' ? 'grid-cols-2 md:grid-cols-3' : `grid-cols-${columns[0]}`}`}>
                {assets.map((asset, i) => (
                    <Card key={asset.id} className="relative group max-w-[100px]">
                        <CardContent className="p-2">
                            {asset.url ? (
                                <img src={asset.url} alt="" className="w-full aspect-square object-cover rounded mb-1" />
                            ) : (
                                <div className="w-full aspect-square bg-nm-steel/10 dark:bg-nm-paper-dark rounded mb-1 flex items-center justify-center text-nm-steel text-xs">
                                    No asset
                                </div>
                            )}
                            <Input
                                value={asset.url}
                                onChange={(e) => updateAsset(i, 'url', e.target.value)}
                                placeholder="Asset URL"
                                className="text-xs mb-1 h-6"
                            />
                            <select
                                value={asset.type}
                                onChange={(e) => updateAsset(i, 'type', e.target.value)}
                                className="w-full text-xs border rounded p-1 dark:border-nm-grid dark:bg-nm-paper-dark"
                            >
                                <option value="image">Image</option>
                                <option value="texture">Texture</option>
                                <option value="reference">Reference</option>
                            </select>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 text-nm-magenta absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition"
                                onClick={() => removeAsset(i)}
                            >
                                ×
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {assets.length === 0 && (
                <div className="text-muted-foreground italic text-center py-8 mb-6 border rounded">
                    No assets yet. Add images, textures, or reference photos to build your moodboard.
                </div>
            )}

            <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-medium">Suggested Palette</h4>
                    <Button variant="outline" size="sm" onClick={addColor}>
                        Add Color
                    </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {palette.length === 0 && (
                        <div className="text-muted-foreground italic text-sm">No colors suggested yet. Add colors or ask the AI for a palette.</div>
                    )}
                    {palette.map((color, i) => (
                        <Card key={i} className="relative p-2">
                            <CardContent className="p-2 flex items-center gap-2">
                                <div
                                    className="w-8 h-8 rounded border"
                                    style={{ backgroundColor: color.hex || '#9ca3af' }}
                                />
                                <div className="space-y-1">
                                    <Input
                                        value={color.hex}
                                        onChange={(e) => updateColor(i, 'hex', e.target.value)}
                                        className="text-xs font-mono w-24"
                                    />
                                 <select
                                        value={color.role}
                                        onChange={(e) => updateColor(i, 'role', e.target.value)}
                                        className="text-xs border rounded p-1 w-24 dark:border-nm-grid dark:bg-nm-paper-dark"
                                    >
                                        <option value="primary">Primary</option>
                                        <option value="secondary">Secondary</option>
                                        <option value="accent">Accent</option>
                                        <option value="neutral">Neutral</option>
                                    </select>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 text-nm-magenta"
                                    onClick={() => removeColor(i)}
                                >
                                    ×
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
