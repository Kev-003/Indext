import { CheckCircle2, Circle } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import type { DynamicComponentProps } from '../registry';

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

export function ClientInterviewWizard({
    id,
    onAction,
    stage = 'business',
    prefilled = {},
    completed,
    result,
}: ClientInterviewWizardProps) {
    const [formData, setFormData] = useState({
        businessName: (result?.businessName ?? prefilled?.businessName) || '',
        mission: (result?.mission ?? prefilled?.mission) || '',
        audience: (result?.audience ?? prefilled?.audience) || '',
        tone: result?.tone ?? prefilled?.tone ?? 'professional',
    });
    const [currentStage, setCurrentStage] = useState(stage);
    const [submitted, setSubmitted] = useState(false);
    const [editing, setEditing] = useState(false);
    const [customToneInput, setCustomToneInput] = useState('');

    useEffect(() => {
        const interview = (result && (result.interview ?? result)) || {};

        const allFilled =
            Boolean(interview.businessName?.trim()) &&
            Boolean(interview.mission?.trim()) &&
            Boolean(interview.audience?.trim()) &&
            Boolean(interview.tone?.trim());

        if (completed && allFilled) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSubmitted(true);
        }
    }, [completed, result]);

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
        'professional',
        'friendly',
        'sophisticated',
        'playful',
        'quirky',
        'bold',
        'confident',
        'minimal',
        'modern',
        'classic',
        'rustic',
        'luxury',
        'accessible',
        'serious',
        'casual',
        'vintage',
        'contemporary',
        'edgy',
        'authentic',
        'refined',
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
            setFormData({
                ...formData,
                tone: [...selectedTones, custom].join(', '),
            });
        }

        setCustomToneInput('');
    };

    const removeTone = (t: string) => {
        setFormData({
            ...formData,
            tone: selectedTones.filter((x: string) => x !== t).join(', '),
        });
    };

    if (submitted && !editing) {
        return (
            <div className="p-4">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-nm-cyan font-display text-lg font-semibold">
                        Interview Complete
                    </h3>
                    <span className="bg-nm-steel/10 text-nm-steel rounded px-2 py-1 font-mono text-xs">
                        Submitted
                    </span>
                </div>

                <div className="mt-4 space-y-3 text-sm">
                    <div>
                        <span className="font-medium text-muted-foreground dark:text-muted-foreground">
                            Business:
                        </span>
                        <span className="ml-2 text-foreground dark:text-foreground">
                            {formData.businessName}
                        </span>
                    </div>
                    <div>
                        <span className="font-medium text-muted-foreground dark:text-muted-foreground">
                            Mission:
                        </span>
                        <p className="mt-1 ml-2 text-foreground dark:text-foreground">
                            {formData.mission}
                        </p>
                    </div>
                    <div>
                        <span className="font-medium text-muted-foreground dark:text-muted-foreground">
                            Audience:
                        </span>
                        <p className="mt-1 ml-2 text-foreground dark:text-foreground">
                            {formData.audience}
                        </p>
                    </div>
                    <div>
                        <span className="font-medium text-muted-foreground dark:text-muted-foreground">
                            Tone:
                        </span>
                        <span className="ml-2 text-foreground dark:text-foreground">
                            {formData.tone}
                        </span>
                    </div>
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => setEditing(true)}
                >
                    Edit Answers
                </Button>

                <p className="mt-4 text-xs text-muted-foreground">
                    Your brand director is processing your interview...
                </p>
            </div>
        );
    }

    return (
        <div className="p-4">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-nm-cyan dark:text-nm-cyan font-display text-lg font-semibold">
                    Client Interview
                </h3>
                <span className="bg-nm-steel/10 text-nm-steel rounded px-2 py-1 font-mono text-xs">
                    Stage: {stage}
                </span>
            </div>

            <div className="mb-6 flex gap-2">
                {stages.map((s) => {
                    const complete = isStageComplete(s.key);

                    return (
                        <Button
                            key={s.key}
                            variant={
                                currentStage === s.key ? 'default' : 'outline'
                            }
                            size="sm"
                            onClick={() => setCurrentStage(s.key)}
                        >
                            {s.label}
                            {complete && (
                                <CheckCircle2 className="ml-1 h-3 w-3" />
                            )}
                            {!complete && (
                                <Circle className="ml-1 h-3 w-3 opacity-30" />
                            )}
                        </Button>
                    );
                })}
            </div>

            <div className="space-y-4">
                {currentStage === 'business' && (
                    <div className="space-y-2">
                        <Label htmlFor={`${id}-business`}>
                            Business Name / Industry
                        </Label>
                        <Input
                            id={`${id}-business`}
                            value={formData.businessName}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    businessName: e.target.value,
                                })
                            }
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
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    mission: e.target.value,
                                })
                            }
                            placeholder="What is the brand's core purpose?"
                            className="min-h-[100px]"
                        />
                    </div>
                )}

                {currentStage === 'audience' && (
                    <div className="space-y-2">
                        <Label htmlFor={`${id}-audience`}>
                            Target Audience
                        </Label>
                        <Textarea
                            id={`${id}-audience`}
                            value={formData.audience}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    audience: e.target.value,
                                })
                            }
                            placeholder="Who is the ideal customer?"
                            className="min-h-[100px]"
                        />
                    </div>
                )}

                {currentStage === 'tone' && (
                    <div className="space-y-4">
                        <Label>
                            Tone of Voice (select multiple or type custom)
                        </Label>
                        <div className="flex flex-wrap gap-2">
                            {toneOptions.map((t) => {
                                const selected = selectedTones.includes(t);

                                return (
                                    <Button
                                        key={t}
                                        variant={
                                            selected ? 'default' : 'outline'
                                        }
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
                            onKeyDown={(e) =>
                                e.key === 'Enter' && addCustomTone()
                            }
                            placeholder="Add custom tone (press Enter)"
                        />
                        {selectedTones.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                                {selectedTones.map((t: string, i: number) => (
                                    <span
                                        key={i}
                                        className="bg-nm-cyan/10 text-nm-cyan rounded px-2 py-1 text-xs"
                                    >
                                        {t}
                                        <button
                                            onClick={() => removeTone(t)}
                                            className="hover:text-nm-cyan ml-1"
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
                        <div className="text-nm-amber dark:text-nm-amber text-xs">
                            Complete all sections to continue:{' '}
                            {incompleteStages
                                .map(
                                    (s) =>
                                        stages.find((st) => st.key === s.key)
                                            ?.label,
                                )
                                .join(', ')}
                        </div>
                    )}
                     <div className="flex justify-between">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    if (submitted && editing) {
                                        setEditing(false);
                                    }
                                }}
                                disabled={!submitted || !editing}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() => {
                                    if (submitted && editing) {
                                        onAction?.('submit_interview', formData);
                                    } else {
                                        setSubmitted(true);
                                        onAction?.('submit_interview', formData);
                                    }
                                }}
                                disabled={!isAllComplete || (submitted && !editing)}
                            >
                                {submitted && editing
                                    ? 'Update Interview'
                                    : 'Submit Interview'}
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

export function VisualPillarExtractor({
    id,
    onAction,
    suggestedPillars = [],
    brandId,
}: VisualPillarExtractorProps) {
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
        <div className="p-4">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-nm-cyan dark:text-nm-cyan font-display text-lg font-semibold">
                    Visual Pillars
                </h3>
                <span className="text-xs text-muted-foreground">
                    {pillars.length}/4 pillars
                </span>
            </div>

            <p className="mb-4 text-sm text-muted-foreground">
                These pillars will guide all visual decisions. Drag to reorder,
                or edit directly.
            </p>

            <div className="mb-4 space-y-2">
                {pillars.map((pillar, i) => (
                    <div
                        key={i}
                        className="border-nm-grid bg-nm-paper dark:bg-nm-paper-dark flex items-center gap-2 rounded border p-2"
                    >
                        <span className="text-nm-steel font-mono text-xs">
                            {i + 1}
                        </span>
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
                            className="text-nm-magenta h-8 w-8"
                            onClick={() => removePillar(i)}
                        >
                            ×
                        </Button>
                    </div>
                ))}
            </div>

            <div className="mb-4 flex gap-2">
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
                <Button
                    onClick={() =>
                        onAction?.('complete_step', {
                            step: 'visual_pillars',
                            brandId,
                            pillars,
                        })
                    }
                >
                    Confirm Pillars
                </Button>
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

export function BrandStrategyOverview({
    id,
    onAction,
    brandId,
    readonly = false,
}: BrandStrategyOverviewProps) {
    const [strategy, setStrategy] = useState({
        mission: 'Empower creative builders.',
        values: ['integrity', 'innovation', 'craftsmanship'],
        visualPillars: ['Minimalism', 'Precision'],
    });

    return (
        <div className="p-4">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-nm-cyan dark:text-nm-cyan font-display text-lg font-semibold">
                    Brand Strategy Overview
                </h3>
                <span className="bg-nm-steel/10 text-nm-steel rounded px-2 py-1 font-mono text-xs">
                    {readonly ? 'Read Only' : 'Editable'}
                </span>
            </div>

            <div className="space-y-6">
                <div className="space-y-2">
                    <Label>Mission</Label>
                    <Textarea
                        value={strategy.mission}
                        onChange={(e) =>
                            setStrategy({
                                ...strategy,
                                mission: e.target.value,
                            })
                        }
                        disabled={readonly}
                        className="min-h-[80px]"
                    />
                </div>

                <div className="space-y-2">
                    <Label>Values</Label>
                    <div className="flex flex-wrap gap-2">
                        {strategy.values.map((val, i) => (
                            <div
                                key={i}
                                className="border-nm-grid bg-nm-paper dark:bg-nm-paper-dark flex items-center gap-1 rounded-full border px-3 py-1"
                            >
                                <Input
                                    value={val}
                                    onChange={(e) => {
                                        const updated = [...strategy.values];
                                        updated[i] = e.target.value;
                                        setStrategy({
                                            ...strategy,
                                            values: updated,
                                        });
                                    }}
                                    className="h-8 w-32 text-sm"
                                    disabled={readonly}
                                />
                                {!readonly && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-nm-magenta h-6 w-6"
                                        onClick={() =>
                                            setStrategy({
                                                ...strategy,
                                                values: strategy.values.filter(
                                                    (_, idx) => idx !== i,
                                                ),
                                            })
                                        }
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
                                onClick={() =>
                                    setStrategy({
                                        ...strategy,
                                        values: [...strategy.values, ''],
                                    })
                                }
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
                            <span
                                key={i}
                                className="bg-nm-cyan/10 dark:bg-nm-paper-dark border-nm-cyan/30 text-nm-cyan rounded-full border px-3 py-1 text-sm"
                            >
                                {pillar}
                            </span>
                        ))}
                    </div>
                </div>

                {!readonly && (
                    <div className="flex justify-end border-t pt-4">
                        <Button
                            onClick={() =>
                                onAction?.('complete_step', {
                                    step: 'brand_strategy',
                                    brandId,
                                    strategy,
                                })
                            }
                        >
                            Save Strategy
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
