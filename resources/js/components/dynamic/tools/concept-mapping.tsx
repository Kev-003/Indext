import React, { useState } from 'react';
import { DynamicComponentProps } from '../registry';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// ---------------------------------------------------------
// 2.1 KeywordMindMap
// ---------------------------------------------------------
interface KeywordMindMapProps extends DynamicComponentProps {
    brandId?: number;
    rootNode?: string;
    keywords?: string[];
    layout?: 'radial' | 'tree';
}

export function KeywordMindMap({ id, rootNode = 'Brand', keywords = [], layout = 'radial' }: KeywordMindMapProps) {
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
        <div className="p-6 border-l-4 border-l-cyan-500">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Keyword Mind Map</h3>
                <span className="text-xs font-mono bg-cyan-100 text-cyan-800 px-2 py-1 rounded">
                    Layout: {layout}
                </span>
            </div>

            <div className="mb-4">
                <div className="inline-block px-4 py-2 bg-gray-900 text-white rounded-full text-sm font-medium">
                    {rootNode}
                </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
                {nodes.map((node, i) => (
                    <div key={i} className="group relative flex items-center gap-1 px-3 py-2 border rounded-full bg-white dark:bg-gray-950 shadow-sm hover:shadow-md transition">
                        <span className="text-sm">{node}</span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-red-600 opacity-0 group-hover:opacity-100 transition"
                            onClick={() => removeNode(i)}
                        >
                            ×
                        </Button>
                    </div>
                ))}
                {nodes.length === 0 && (
                    <div className="text-gray-400 italic text-sm">No keywords added yet</div>
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

export function SemanticObjectMapper({ id, keyword = 'Growth', suggestions = [], mode = 'tangible' }: SemanticObjectMapperProps) {
    const [selected, setSelected] = useState<string | null>(null);
    const [customObject, setCustomObject] = useState('');

    const allOptions = [...suggestions];
    if (customObject && !allOptions.includes(customObject)) {
        allOptions.push(customObject);
    }

    return (
        <div className="p-6 border-l-4 border-l-teal-500">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Semantic Object Mapper</h3>
                <span className="text-xs font-mono bg-teal-100 text-teal-800 px-2 py-1 rounded">
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
                        className={`cursor-pointer transition hover:shadow-md ${selected === obj ? 'ring-2 ring-teal-500' : ''}`}
                        onClick={() => setSelected(obj)}
                    >
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl mb-2">🎯</div>
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
                <Button onClick={() => {/* AI would validate and add */}}>Add</Button>
            </div>

            {selected && (
                <div className="flex justify-end">
                    <Button onClick={() => {/* AI would save mapping */}}>
                        Save Mapping: {selected}
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
    name: string;
    mood?: string;
    colors?: string[];
    typography?: string;
}

interface DesignConceptExplorerProps extends DynamicComponentProps {
    brandId?: number;
    concepts?: Concept[];
}

export function DesignConceptExplorer({ id, concepts = [] }: DesignConceptExplorerProps) {
    const [selectedConcept, setSelectedConcept] = useState<string | null>(null);

    return (
        <div className="p-6 border-l-4 border-l-amber-500">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Design Concept Explorer</h3>
                <span className="text-xs text-muted-foreground">
                    {concepts.length} directions
                </span>
            </div>

            {concepts.length === 0 ? (
                <div className="text-gray-400 italic text-center py-8">
                    No design concepts generated yet. Ask the AI to explore directions.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {concepts.map((concept) => (
                        <Card
                            key={concept.id}
                            className={`cursor-pointer transition hover:shadow-md ${selectedConcept === concept.id ? 'ring-2 ring-amber-500' : ''}`}
                            onClick={() => setSelectedConcept(concept.id)}
                        >
                            <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-base">{concept.name}</CardTitle>
                                {concept.mood && (
                                    <CardDescription className="text-xs">{concept.mood}</CardDescription>
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
                                    <Button size="sm" variant="outline" className="flex-1">
                                        Refine
                                    </Button>
                                    <Button size="sm" className="flex-1">
                                        Select
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
