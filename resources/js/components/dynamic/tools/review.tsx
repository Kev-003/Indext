import { Check, Star } from '@phosphor-icons/react';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { DynamicComponentProps } from '../registry';

// Shared helper: read-only completion banner
function CompletedBanner({ label }: { label: string }) {
    return (
        <div className="flex items-center gap-2 rounded border border-nm-cyan/30 bg-nm-cyan/10 px-4 py-3 text-sm text-nm-cyan">
            <Check size={14} />
            <span>{label}</span>
        </div>
    );
}

// ---------------------------------------------------------
// 4.1 DirectionComparator
// ---------------------------------------------------------
interface Direction {
    id: string;
    name: string;
    assets?: any[];
}

interface DirectionComparatorProps extends DynamicComponentProps {
    brandId?: number;
    directions?: Direction[];
    comparisonDimensions?: string[];
    completed?: boolean;
    result?: Record<string, any>;
}

export function DirectionComparator({ id, onAction, directions = [], comparisonDimensions = ['memorability', 'versatility', 'timelessness'], completed, result }: DirectionComparatorProps) {
    const [votes, setVotes] = useState<Record<string, Record<string, number>>>({});

    if (completed) {
        const winnerLabel = result?.action === 'select_winner'
            ? `Winner selected`
            : result?.action === 'merge'
            ? 'Directions merged'
            : 'Comparison completed';

        return (
            <div className="p-4">
                <h3 className="text-lg font-display font-semibold mb-3 text-nm-steel dark:text-nm-steel">
                    Direction Comparator</h3>
                <CompletedBanner label={winnerLabel} />
            </div>
        );
    }

    const vote = (directionId: string, dimension: string, value: number) => {
        setVotes({
            ...votes,
            [directionId]: {
                ...(votes[directionId] || {}),
                [dimension]: value,
            },
        });
    };

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-display font-semibold text-nm-steel dark:text-nm-steel">
                    Direction Comparator</h3>
                <span className="text-xs text-muted-foreground">
                    Compare {directions.length} directions
                </span>
            </div>

            {directions.length === 0 ? (
                <div className="text-muted-foreground italic text-center py-8">
                    No directions to compare. Build some directions first.
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto mb-6">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left p-2">Direction</th>
                                    {comparisonDimensions.map((dim) => (
                                        <th key={dim} className="text-center p-2 capitalize">
                                            {dim}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {directions.map((direction) => (
                                    <tr key={direction.id} className="border-b last:border-0">
                                        <td className="p-2 font-medium">{direction.name}</td>
                                        {comparisonDimensions.map((dim) => (
                                            <td key={dim} className="text-center p-2">
                                                <div className="flex justify-center gap-1">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <Button
                                                            key={star}
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6"
                                                            onClick={() => vote(direction.id, dim, star)}
                                                        >
                                                                <Star size={16} className={(votes[direction.id]?.[dim] || 0) >= star ? 'text-nm-amber' : 'text-muted-foreground'} />
                                                        </Button>
                                                    ))}
                                                </div>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => onAction?.('complete_step', {
                            step: 'direction_compare',
                            action: 'merge',
                            votes,
                            directions,
                        })}>
                            Merge Directions
                        </Button>
                        <Button onClick={() => onAction?.('complete_step', {
                            step: 'direction_compare',
                            action: 'select_winner',
                            votes,
                            directions,
                        })}>
                            Select Winner
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
}

// ---------------------------------------------------------
// 4.2 FeedbackCollector
// ---------------------------------------------------------
interface FeedbackCollectorProps extends DynamicComponentProps {
    brandId?: number;
    target?: string;
    questions?: string[];
    scale?: number;
    completed?: boolean;
    result?: Record<string, any>;
}

export function FeedbackCollector({ id, onAction, target = 'logo_direction_1', questions = ['What resonates?', 'What feels off?'], scale = 5, completed, result }: FeedbackCollectorProps) {
    const [responses, setResponses] = useState<Record<string, { rating: number; text: string }>>({});

    if (completed) {
        return (
            <div className="p-4">
                <h3 className="text-lg font-display font-semibold mb-3 text-nm-steel dark:text-nm-steel mb-3">
                    Feedback Collector</h3>
                <CompletedBanner label={`Feedback submitted for: ${result?.target ?? target}`} />
            </div>
        );
    }

    const updateResponse = (question: string, field: 'rating' | 'text', value: any) => {
        setResponses({
            ...responses,
            [question]: {
                ...(responses[question] || { rating: 0, text: '' }),
                [field]: value,
            },
        });
    };

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-display font-semibold text-nm-steel dark:text-nm-steel mb-3">
                    Feedback Collector
                </h3>
                <span className="text-xs text-muted-foreground">Target: {target}</span>
            </div>

            <div className="space-y-6">
                {questions.map((question, i) => (
                    <div key={i} className="space-y-2">
                        <Label>{question}</Label>
                        <div className="flex gap-1 mb-2">
                            {Array.from({ length: scale }, (_, n) => n + 1).map((star) => (
                                <Button
                                    key={star}
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => updateResponse(question, 'rating', star)}
                                >
                                    <Star size={16} className={(responses[question]?.rating || 0) >= star ? 'text-nm-amber' : 'text-muted-foreground'} />
                                </Button>
                            ))}
                        </div>
                        <Textarea
                            value={responses[question]?.text || ''}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateResponse(question, 'text', e.target.value)}
                            placeholder="Your thoughts..."
                            className="min-h-[80px]"
                        />
                    </div>
                ))}
            </div>

            <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={() => onAction?.('complete_step', {
                    step: 'feedback_collect',
                    action: 'skip',
                    target,
                    responses,
                })}>Skip</Button>
                <Button onClick={() => onAction?.('complete_step', {
                    step: 'feedback_collect',
                    target,
                    responses,
                })}>Submit Feedback</Button>
            </div>
        </div>
    );
}

// ---------------------------------------------------------
// 4.3 ResonanceConfirmator
// ---------------------------------------------------------
interface ResonanceConfirmatorProps extends DynamicComponentProps {
    brandId?: number;
    directionId?: string;
    summary?: string;
    completed?: boolean;
    result?: Record<string, any>;
}

export function ResonanceConfirmator({ id, onAction, brandId, directionId, summary = '', completed, result }: ResonanceConfirmatorProps) {
    const [decision, setDecision] = useState<string | null>(null);

    if (completed) {
        const decisionLabel =
            (result?.decision === 'confirm' && 'Direction confirmed') ||
            (result?.decision === 'changes' && 'Changes requested') ||
            (result?.decision === 'restart' && 'Started over') ||
            'Completed';

        return (
            <div className="p-4">
                <h3 className="text-lg font-display font-semibold mb-3 text-nm-steel dark:text-nm-steel">
                    Confirm Direction</h3>
                <CompletedBanner label={decisionLabel} />
            </div>
        );
    }

    const handleDecision = (d: string) => {
        setDecision(d);
        onAction?.('complete_step', {
            step: 'resonance_confirm',
            brandId,
            directionId,
            decision: d,
            summary,
        });
    };

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-display font-semibold text-nm-steel dark:text-nm-steel">
                    Confirm Direction</h3>
                {directionId && (
                    <span className="text-xs font-mono bg-nm-steel/10 text-nm-steel px-2 py-1 rounded">
                        Direction: {directionId}
                    </span>
                )}
            </div>

            {summary && (
                <div className="mb-6 p-4 bg-nm-steel/10 rounded">
                    <Label className="text-xs text-muted-foreground mb-1 block">Summary</Label>
                    <p className="text-sm">{summary}</p>
                </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
                <Button
                    variant={decision === 'confirm' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => handleDecision('confirm')}
                >
                    Confirm Direction
                </Button>
                <Button
                    variant={decision === 'changes' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => handleDecision('changes')}
                >
                    Request Changes
                </Button>
                <Button
                    variant={decision === 'restart' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => handleDecision('restart')}
                >
                    Start Over
                </Button>
            </div>

            {decision && (
                <div className="mt-4 p-3 bg-nm-cyan/10 rounded text-sm text-nm-cyan">
                    Decision recorded: <strong>{decision}</strong>
                </div>
            )}
        </div>
    );
}

