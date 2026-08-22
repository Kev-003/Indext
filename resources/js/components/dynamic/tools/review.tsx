import React, { useState } from 'react';
import { DynamicComponentProps } from '../registry';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
}

export function DirectionComparator({ id, directions = [], comparisonDimensions = ['memorability', 'versatility', 'timelessness'] }: DirectionComparatorProps) {
    const [votes, setVotes] = useState<Record<string, Record<string, number>>>({});

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
        <div className="p-6 border-l-4 border-l-purple-500">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Direction Comparator</h3>
                <span className="text-xs text-muted-foreground">
                    Compare {directions.length} directions
                </span>
            </div>

            {directions.length === 0 ? (
                <div className="text-gray-400 italic text-center py-8">
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
                                                            <span
                                                                className={`text-lg ${(votes[direction.id]?.[dim] || 0) >= star ? 'text-yellow-500' : 'text-gray-300'}`}
                                                            >
                                                                ★
                                                            </span>
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
                        <Button variant="outline" onClick={() => {/* AI would merge directions */}}>
                            Merge Directions
                        </Button>
                        <Button onClick={() => {/* AI would select winner */}}>
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
}

export function FeedbackCollector({ id, target = 'logo_direction_1', questions = ['What resonates?', 'What feels off?'], scale = 5 }: FeedbackCollectorProps) {
    const [responses, setResponses] = useState<Record<string, { rating: number; text: string }>>({});

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
        <div className="p-6 border-l-4 border-l-yellow-500">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Feedback Collector</h3>
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
                                    <span
                                        className={`text-xl ${(responses[question]?.rating || 0) >= star ? 'text-yellow-500' : 'text-gray-300'}`}
                                    >
                                        ★
                                    </span>
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
                <Button variant="outline" onClick={() => {/* AI would skip */}}>Skip</Button>
                <Button onClick={() => {/* AI would submit feedback */}}>Submit Feedback</Button>
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
}

export function ResonanceConfirmator({ id, brandId, directionId, summary = '' }: ResonanceConfirmatorProps) {
    const [decision, setDecision] = useState<string | null>(null);

    return (
        <div className="p-6 border-l-4 border-l-green-500">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Confirm Direction</h3>
                {directionId && (
                    <span className="text-xs font-mono bg-green-100 text-green-800 px-2 py-1 rounded">
                        Direction: {directionId}
                    </span>
                )}
            </div>

            {summary && (
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded">
                    <Label className="text-xs text-muted-foreground mb-1 block">Summary</Label>
                    <p className="text-sm">{summary}</p>
                </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
                <Button
                    variant={decision === 'confirm' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setDecision('confirm')}
                >
                    Confirm Direction
                </Button>
                <Button
                    variant={decision === 'changes' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setDecision('changes')}
                >
                    Request Changes
                </Button>
                <Button
                    variant={decision === 'restart' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setDecision('restart')}
                >
                    Start Over
                </Button>
            </div>

            {decision && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded text-sm text-blue-700 dark:text-blue-300">
                    Decision recorded: <strong>{decision}</strong>
                </div>
            )}
        </div>
    );
}

