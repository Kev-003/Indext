import { Check, Target } from '@phosphor-icons/react';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { DynamicComponentProps } from '../registry';

// ---------------------------------------------------------
// 2.1 KeywordMindMap
// ---------------------------------------------------------
interface KeywordMindMapProps extends DynamicComponentProps {
    brandId?: number;
    rootNode?: string;
    keywords?: string[];
    layout?: 'radial' | 'tree';
}

export function KeywordMindMap({ id, onAction, rootNode = 'Brand', keywords = [], layout = 'radial' }: KeywordMindMapProps) {
    const [nodes, setNodes] = useState<string[]>(keywords);
    const [newNode, setNewNode] = useState('');

    const addNode = () => {
        if (newNode.trim()) {
            setNodes([...nodes, newNode.trim()]);
            setNewNode('');
        }
    };

    const removeNode = (index: number) => {
        setNodes(nodes.filter((_, i) => i !== index));
    };

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-display font-semibold text-nm-magenta dark:text-nm-magenta">
                    Keyword Mind Map
                </h3>
                <span className="text-xs font-mono bg-nm-steel/10 text-nm-steel px-2 py-1 rounded">
                    Layout: {layout}
                </span>
            </div>

            <div className="mb-4">
                <div className="inline-block px-4 py-2 bg-nm-paper dark:bg-nm-paper-dark text-nm-ink rounded-full text-sm font-medium">
                    {rootNode}
                </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
                {nodes.map((node, i) => (
                     <div key={i} className="group relative flex items-center gap-1 px-3 py-2 border border-nm-grid rounded-full bg-white dark:bg-nm-paper-dark shadow-sm hover:shadow-md transition">
                        <span className="text-sm">{node}</span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-nm-magenta opacity-0 group-hover:opacity-100 transition"
                            onClick={() => removeNode(i)}
                        >
                            ×
                        </Button>
                    </div>
                ))}
                {nodes.length === 0 && (
                    <div className="text-muted-foreground italic text-sm">No keywords added yet</div>
                )}
            </div>

            <div className="flex gap-2">
                <Input
                    value={newNode}
                    onChange={(e) => setNewNode(e.target.value)}
                    placeholder="Add a keyword..."
                    onKeyDown={(e) => e.key === 'Enter' && addNode()}
                />
                <Button onClick={addNode}>Add</Button>
            </div>

            <div className="flex justify-end pt-4">
                <Button
                    variant="default"
                    onClick={() => {
                        onAction?.('complete_step', {
                            step: 'keyword_mindmap',
                            rootNode,
                            keywords: nodes,
                        });
                    }}
                    disabled={nodes.length === 0}
                >
                    Confirm Keywords
                </Button>
            </div>
        </div>
    );
}

// ---------------------------------------------------------
// 2.2 SemanticObjectMapper
// ---------------------------------------------------------
interface SemanticObjectMapperProps extends DynamicComponentProps {
    brandId?: number;
    keyword?: string;
    suggestions?: string[];
    mode?: 'tangible' | 'abstract';
}

export function SemanticObjectMapper({ id, onAction, keyword = 'Growth', suggestions = [], mode = 'tangible' }: SemanticObjectMapperProps) {
    const [selected, setSelected] = useState<string | null>(null);
    const [customObject, setCustomObject] = useState('');

    const allOptions = [...suggestions];

    if (customObject && !allOptions.includes(customObject)) {
        allOptions.push(customObject);
    }

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-display font-semibold text-nm-magenta dark:text-nm-magenta">
                    Semantic Object Mapper
                </h3>
                <span className="text-xs font-mono bg-nm-steel/10 text-nm-steel px-2 py-1 rounded">
                    Mode: {mode}
                </span>
            </div>

            <div className="mb-4">
                <Label className="text-sm text-muted-foreground">Mapping keyword:</Label>
                <p className="text-lg font-semibold mt-1">"{keyword}"</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {allOptions.map((obj, i) => (
                    <Card
                        key={i}
                        className={`cursor-pointer transition hover:shadow-md ${selected === obj ? 'ring-2 ring-nm-magenta' : ''}`}
                        onClick={() => setSelected(obj)}
                    >
                        <CardContent className="p-4 text-center">
                            <Target size={24} className="text-nm-magenta mx-auto mb-2" />
                            <p className="text-sm font-medium">{obj}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="flex gap-2 mb-4">
                <Input
                    value={customObject}
                    onChange={(e) => setCustomObject(e.target.value)}
                    placeholder="Add custom object..."
                />
                <Button onClick={() => onAction?.('complete_step', {
                    step: 'semantic_mapper',
                    action: 'add_abstract',
                    keyword,
                    customObject,
                })}>Add</Button>
            </div>

            {selected && (
                <div className="flex justify-end">
                    <Button
                        onClick={() => {
                            onAction?.('complete_step', {
                                step: 'semantic_mapper',
                                keyword,
                                mapping: selected,
                            });
                        }}
                        disabled={!selected}
                    >
                        Save & Continue
                    </Button>
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------
// 2.3 DesignConceptExplorer
// ---------------------------------------------------------
interface Concept {
    id: string;
    name?: string;
    title?: string;
    mood?: string;
    description?: string;
    colors?: string[];
    typography?: string;
}

interface DesignConceptExplorerProps extends DynamicComponentProps {
    brandId?: number;
    concepts?: Concept[];
    completed?: boolean;
    result?: Record<string, any>;
}

export function DesignConceptExplorer({ id, onAction, concepts = [], completed, result }: DesignConceptExplorerProps) {
    const [selectedConcept, setSelectedConcept] = useState<string | null>(null);

    if (completed) {
        const conceptName = result?.concept?.title ?? result?.concept?.name ?? result?.selected_concept_id ?? 'concept';

        return (
            <div className="p-4">
                <h3 className="text-lg font-display font-semibold text-nm-magenta dark:text-nm-magenta">
                    Design Concept Explorer</h3>
                <div className="flex items-center gap-2 rounded border border-nm-cyan/30 bg-nm-cyan/10 px-4 py-3 text-sm text-nm-cyan dark:border-nm-cyan/30 dark:bg-nm-cyan/10 dark:text-nm-cyan">
                    <Check size={14} />
                    <span>Selected concept: {conceptName}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-display font-semibold text-nm-magenta dark:text-nm-magenta">
                    Design Concept Explorer</h3>
                <span className="text-xs text-muted-foreground">
                    {concepts.length} directions
                </span>
            </div>

            {concepts.length === 0 ? (
                <div className="text-muted-foreground italic text-center py-8">
                    No design concepts generated yet. Ask the AI to explore directions.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {concepts.map((concept, idx) => {
                        const conceptId = concept.id || `concept-${idx}`;
                        const conceptTitle = concept.title || concept.name || `Direction ${idx + 1}`;
                        const conceptDesc = concept.mood || concept.description || '';
                        const isSelected = selectedConcept === conceptId;

                        return (
                            <Card
                                key={conceptId}
                                className={`cursor-pointer transition hover:shadow-md ${isSelected ? 'ring-2 ring-nm-magenta' : ''}`}
                                onClick={() => setSelectedConcept(conceptId)}
                            >
                                <CardHeader className="p-4 pb-2">
                                    <CardTitle className="text-base">{conceptTitle}</CardTitle>
                                    {conceptDesc && (
                                        <CardDescription className="text-xs">{conceptDesc}</CardDescription>
                                    )}
                                </CardHeader>
                                <CardContent className="p-4 pt-0">
                                    {concept.colors && concept.colors.length > 0 && (
                                        <div className="flex gap-1 mb-2">
                                            {concept.colors.map((color, i) => (
                                                <div
                                                    key={i}
                                                    className="w-6 h-6 rounded border"
                                                    style={{ backgroundColor: color }}
                                                    title={color}
                                                />
                                            ))}
                                        </div>
                                    )}
                                    {concept.typography && (
                                        <p className="text-xs text-muted-foreground">Typography: {concept.typography}</p>
                                    )}
                                    <div className="flex gap-2 mt-3">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onAction?.('complete_step', {
                                                    step: 'concept_explorer',
                                                    action: 'refine',
                                                    concept,
                                                });
                                            }}
                                        >
                                            Refine
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="flex-1"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedConcept(conceptId);
                                                onAction?.('complete_step', {
                                                    step: 'concept_explorer',
                                                    action: 'select_concept',
                                                    concept,
                                                    selected_concept_id: conceptId,
                                                });
                                            }}
                                        >
                                            Select
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
