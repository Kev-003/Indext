import React, { useState } from 'react';
import { DynamicComponentProps } from '../registry';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { CheckCircle2, Circle } from 'lucide-react';

// ---------------------------------------------------------
// 1.1 ClientInterviewWizard
// ---------------------------------------------------------
interface ClientInterviewWizardProps extends DynamicComponentProps {
    sessionId?: string;
    stage?: 'business' | 'mission' | 'audience' | 'tone';
    prefilled?: Record<string, any>;
    completed?: boolean;
    result?: Record<string, any>;
}

export function ClientInterviewWizard({ id, onAction, stage = 'business', prefilled = {}, completed, result }: ClientInterviewWizardProps) {
    const [formData, setFormData] = useState({
        businessName: prefilled.businessName || '',
        mission: prefilled.mission || '',
        audience: prefilled.audience || '',
        tone: prefilled.tone || 'professional',
    });
    const [currentStage, setCurrentStage] = useState(stage);
    const [submitted, setSubmitted] = useState(completed ?? false);
    const [customToneInput, setCustomToneInput] = useState('');

    const stages: Array<{ key: typeof stage; label: string }> = [
        { key: 'business', label: 'Business' },
        { key: 'mission', label: 'Mission' },
        { key: 'audience', label: 'Audience' },
        { key: 'tone', label: 'Tone' },
    ];

    const isStageComplete = (s: typeof stage): boolean => {
        switch (s) {
            case 'business':
                return formData.businessName.trim().length > 0;
            case 'mission':
                return formData.mission.trim().length > 0;
            case 'audience':
                return formData.audience.trim().length > 0;
            case 'tone':
                return formData.tone.trim().length > 0;
            default:
                return false;
        }
    };

    const incompleteStages = stages.filter((s) => !isStageComplete(s.key));
    const isAllComplete = incompleteStages.length === 0;

    const toneOptions = [
        'professional', 'friendly', 'sophisticated', 'playful', 'quirky',
        'bold', 'confident', 'minimal', 'modern', 'classic', 'rustic',
        'luxury', 'accessible', 'serious', 'casual', 'vintage',
        'contemporary', 'edgy', 'authentic', 'refined',
    ];

    const selectedTones = formData.tone
        .split(',')
        .map((t: string) => t.trim())
        .filter(Boolean);

    const toggleTone = (t: string) => {
        const tones = selectedTones.includes(t)
            ? selectedTones.filter((x: string) => x !== t)
            : [...selectedTones, t];
        setFormData({ ...formData, tone: tones.join(', ') });
    };

    const addCustomTone = () => {
        const custom = customToneInput.trim();
        if (custom && !selectedTones.includes(custom)) {
            setFormData({ ...formData, tone: [...selectedTones, custom].join(', ') });
        }
        setCustomToneInput('');
    };

    const removeTone = (t: string) => {
        setFormData({ ...formData, tone: selectedTones.filter((x: string) => x !== t).join(', ') });
    };

    if (submitted) {
        return (
            <div className="p-6 border-l-4 border-l-green-500">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-green-700">
                        Interview Complete
                    </h3>
                    <span className="text-xs font-mono bg-green-100 text-green-800 px-2 py-1 rounded">
                        Submitted
                    </span>
                </div>

                <div className="mt-4 space-y-3 text-sm">
                    <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Business:</span>
                        <span className="ml-2 text-gray-800 dark:text-gray-200">
                            {formData.businessName}
                        </span>
                    </div>
                    <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Mission:</span>
                        <p className="ml-2 mt-1 text-gray-800 dark:text-gray-200">
                            {formData.mission}
                        </p>
                    </div>
                    <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Audience:</span>
                        <p className="ml-2 mt-1 text-gray-800 dark:text-gray-200">
                            {formData.audience}
                        </p>
                    </div>
                    <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Tone:</span>
                        <span className="ml-2 text-gray-800 dark:text-gray-200">
                            {formData.tone}
                        </span>
                    </div>
                </div>

                <p className="mt-4 text-xs text-muted-foreground">
                    Your brand director is processing your interview...
                </p>
            </div>
        );
    }

    return (
        <div className="p-6 border-l-4 border-l-blue-500">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Client Interview</h3>
                <span className="text-xs font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    Stage: {stage}
                </span>
            </div>

            <div className="flex gap-2 mb-6">
                {stages.map((s) => {
                    const complete = isStageComplete(s.key);
                    return (
                        <Button
                            key={s.key}
                            variant={currentStage === s.key ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setCurrentStage(s.key)}
                        >
                            {s.label}
                            {complete && <CheckCircle2 className="ml-1 h-3 w-3" />}
                            {!complete && <Circle className="ml-1 h-3 w-3 opacity-30" />}
                        </Button>
                    );
                })}
            </div>

            <div className="space-y-4">
                {currentStage === 'business' && (
                    <div className="space-y-2">
                        <Label htmlFor={`${id}-business`}>Business Name / Industry</Label>
                        <Input
                            id={`${id}-business`}
                            value={formData.businessName}
                            onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                            placeholder="e.g., Northline Coffee"
                        />
                    </div>
                )}

                {currentStage === 'mission' && (
                    <div className="space-y-2">
                        <Label htmlFor={`${id}-mission`}>Brand Mission</Label>
                        <Textarea
                            id={`${id}-mission`}
                            value={formData.mission}
                            onChange={(e) => setFormData({ ...formData, mission: e.target.value })}
                            placeholder="What is the brand's core purpose?"
                            className="min-h-[100px]"
                        />
                    </div>
                )}

                {currentStage === 'audience' && (
                    <div className="space-y-2">
                        <Label htmlFor={`${id}-audience`}>Target Audience</Label>
                        <Textarea
                            id={`${id}-audience`}
                            value={formData.audience}
                            onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
                            placeholder="Who is the ideal customer?"
                            className="min-h-[100px]"
                        />
                    </div>
                )}

                {currentStage === 'tone' && (
                    <div className="space-y-4">
                        <Label>Tone of Voice (select multiple or type custom)</Label>
                        <div className="flex flex-wrap gap-2">
                            {toneOptions.map((t) => {
                                const selected = selectedTones.includes(t);
                                return (
                                    <Button
                                        key={t}
                                        variant={selected ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => toggleTone(t)}
                                    >
                                        {t}
                                    </Button>
                                );
                            })}
                        </div>
                        <Input
                            value={customToneInput}
                            onChange={(e) => setCustomToneInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addCustomTone()}
                            placeholder="Add custom tone (press Enter)"
                        />
                        {selectedTones.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                                {selectedTones.map((t: string, i: number) => (
                                    <span
                                        key={i}
                                        className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded"
                                    >
                                        {t}
                                        <button
                                            onClick={() => removeTone(t)}
                                            className="ml-1 hover:text-blue-900"
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="flex flex-col gap-2 pt-4">
                    {!isAllComplete && (
                        <div className="text-xs text-amber-600 dark:text-amber-400">
                            Complete all sections to continue:{' '}
                            {incompleteStages.map((s) => stages.find((st) => st.key === s.key)?.label).join(', ')}
                        </div>
                    )}
                    <div className="flex justify-between">
                        <Button variant="outline" disabled>Back</Button>
                        <Button
                            onClick={() => {
                                setSubmitted(true);
                                onAction?.('submit_interview', formData);
                            }}
                            disabled={!isAllComplete}
                        >
                            Continue
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------
// 1.2 VisualPillarExtractor
// ---------------------------------------------------------
interface VisualPillarExtractorProps extends DynamicComponentProps {
    sessionId?: string;
    suggestedPillars?: string[];
    brandId?: number;
}

export function VisualPillarExtractor({ id, onAction, suggestedPillars = [], brandId }: VisualPillarExtractorProps) {
    const [pillars, setPillars] = useState<string[]>(suggestedPillars);
    const [newPillar, setNewPillar] = useState('');

    const addPillar = () => {
        if (newPillar.trim() && pillars.length < 6) {
            setPillars([...pillars, newPillar.trim()]);
            setNewPillar('');
        }
    };

    const removePillar = (index: number) => {
        setPillars(pillars.filter((_, i) => i !== index));
    };

    return (
        <div className="p-6 border-l-4 border-l-indigo-500">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Visual Pillars</h3>
                <span className="text-xs text-muted-foreground">
                    {pillars.length}/4 pillars
                </span>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
                These pillars will guide all visual decisions. Drag to reorder, or edit directly.
            </p>

            <div className="space-y-2 mb-4">
                {pillars.map((pillar, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 border rounded bg-white dark:bg-gray-950">
                        <span className="text-xs font-mono text-gray-400">{i + 1}</span>
                        <Input
                            value={pillar}
                            onChange={(e) => {
                                const updated = [...pillars];
                                updated[i] = e.target.value;
                                setPillars(updated);
                            }}
                            className="flex-1"
                        />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600"
                            onClick={() => removePillar(i)}
                        >
                            ×
                        </Button>
                    </div>
                ))}
            </div>

            <div className="flex gap-2 mb-4">
                <Input
                    value={newPillar}
                    onChange={(e) => setNewPillar(e.target.value)}
                    placeholder="Add a new pillar..."
                    onKeyDown={(e) => e.key === 'Enter' && addPillar()}
                />
                <Button onClick={addPillar} disabled={pillars.length >= 4}>
                    Add
                </Button>
            </div>

            <div className="flex justify-end">
                <Button onClick={() => onAction?.('complete_step', {
                    step: 'visual_pillars',
                    brandId,
                    pillars,
                })}>Confirm Pillars</Button>
            </div>
        </div>
    );
}

// ---------------------------------------------------------
// 1.3 BrandStrategyOverview
// ---------------------------------------------------------
interface BrandStrategyOverviewProps extends DynamicComponentProps {
    brandId?: number;
    readonly?: boolean;
}

export function BrandStrategyOverview({ id, onAction, brandId, readonly = false }: BrandStrategyOverviewProps) {
    const [strategy, setStrategy] = useState({
        mission: 'Empower creative builders.',
        values: ['integrity', 'innovation', 'craftsmanship'],
        visualPillars: ['Minimalism', 'Precision'],
    });

    return (
        <div className="p-6 border-l-4 border-l-emerald-500">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Brand Strategy Overview</h3>
                <span className="text-xs font-mono bg-emerald-100 text-emerald-800 px-2 py-1 rounded">
                    {readonly ? 'Read Only' : 'Editable'}
                </span>
            </div>

            <div className="space-y-6">
                <div className="space-y-2">
                    <Label>Mission</Label>
                    <Textarea
                        value={strategy.mission}
                        onChange={(e) => setStrategy({ ...strategy, mission: e.target.value })}
                        disabled={readonly}
                        className="min-h-[80px]"
                    />
                </div>

                <div className="space-y-2">
                    <Label>Values</Label>
                    <div className="flex flex-wrap gap-2">
                        {strategy.values.map((val, i) => (
                            <div key={i} className="flex items-center gap-1 px-3 py-1 border rounded-full bg-white dark:bg-gray-950">
                                <Input
                                    value={val}
                                    onChange={(e) => {
                                        const updated = [...strategy.values];
                                        updated[i] = e.target.value;
                                        setStrategy({ ...strategy, values: updated });
                                    }}
                                    className="w-32 h-8 text-sm"
                                    disabled={readonly}
                                />
                                {!readonly && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-red-600"
                                        onClick={() => setStrategy({
                                            ...strategy,
                                            values: strategy.values.filter((_, idx) => idx !== i),
                                        })}
                                    >
                                        ×
                                    </Button>
                                )}
                            </div>
                        ))}
                        {!readonly && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setStrategy({ ...strategy, values: [...strategy.values, ''] })}
                            >
                                + Value
                            </Button>
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Visual Pillars</Label>
                    <div className="flex flex-wrap gap-2">
                        {strategy.visualPillars.map((pillar, i) => (
                            <span key={i} className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-full text-sm">
                                {pillar}
                            </span>
                        ))}
                    </div>
                </div>

                {!readonly && (
                    <div className="flex justify-end pt-4 border-t">
                        <Button onClick={() => onAction?.('complete_step', {
                            step: 'brand_strategy',
                            brandId,
                            strategy,
                        })}>Save Strategy</Button>
                    </div>
                )}
            </div>
        </div>
    );
}
