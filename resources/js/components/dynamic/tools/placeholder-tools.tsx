import ELK from 'elkjs';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { DynamicComponentProps } from '../registry';

const elk = new ELK({
    defaultLayoutOptions: {
        'elk.algorithm': 'mrtree',
        'elk.direction': 'DOWN',
        'elk.spacing.nodeNode': '40',
    },
});

interface GraphNode {
    id: string;
    label: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
}

interface GraphEdge {
    id: string;
    source: string;
    target: string;
    points?: Array<{ x: number; y: number }>;
}

interface MindMapProps extends DynamicComponentProps {
    title?: string;
    nodes?: string[] | GraphNode[];
    edges?: GraphEdge[];
    layout?: 'radial' | 'tree' | 'horizontal' | 'vertical';
}

const NODE_W = 140;
const NODE_H = 44;

function normalizeNodes(raw: string[] | GraphNode[] | undefined): GraphNode[] {
    if (!raw || raw.length === 0) {
return [];
}

    return raw.map((n) =>
        typeof n === 'string'
            ? { id: n, label: n }
            : { ...n, id: n.id ?? n.label, label: n.label },
    );
}

function buildElkGraph(
    nodes: GraphNode[],
    edges: GraphEdge[],
    rootId: string,
): any {
    const children = nodes
        .filter((n) => n.id !== rootId)
        .map((n) => ({
            id: n.id,
            width: NODE_W,
            height: NODE_H,
            labels: [{ text: n.label }],
        }));

    const elkEdges =
        edges.length > 0
            ? edges.map((e) => ({
                  id: e.id,
                  sources: [e.source],
                  targets: [e.target],
              }))
            : nodes
                  .filter((n) => n.id !== rootId)
                  .map((n) => ({
                      id: `e_${n.id}`,
                      sources: [rootId],
                      targets: [n.id],
                  }));

    return {
        id: rootId,
        width: NODE_W,
        height: NODE_H,
        labels: [{ text: rootId }],
        children,
        edges: elkEdges,
    };
}

export function MindMapCanvas({
    id,
    title = 'Mind Map',
    nodes = [],
    edges = [],
    layout = 'tree',
    onAction,
}: MindMapProps) {
    const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
    const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([]);
    const [dimensions, setDimensions] = useState<{
        width: number;
        height: number;
    }>({ width: 600, height: 400 });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');
    const [newLabel, setNewLabel] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const initial = normalizeNodes(nodes);
        setGraphNodes(initial);
        setGraphEdges(edges);
    }, [nodes, edges]);

    useEffect(() => {
        if (graphNodes.length === 0) {
return;
}

        const rootId = graphNodes[0].id || graphNodes[0].label;
        const graph = buildElkGraph(graphNodes, graphEdges, rootId);

        elk.layout(graph)
            .then((result: any) => {
                const updated: GraphNode[] = [];
                const collect = (node: any) => {
                    updated.push({
                        id: node.id,
                        label: node.labels?.[0]?.text || node.id,
                        x: node.x || 0,
                        y: node.y || 0,
                        width: node.width || NODE_W,
                        height: node.height || NODE_H,
                    });

                    if (node.children) {
node.children.forEach(collect);
}
                };
                collect(result);
                setGraphNodes(updated);

                if (result.width && result.height) {
                    setDimensions({
                        width: result.width + 120,
                        height: result.height + 120,
                    });
                }
            })
            .catch(() => {});
    }, [graphNodes.length, graphEdges.length, layout]);

    const handleAddChild = (parentId: string) => {
        const label = prompt('Enter keyword:');

        if (!label) {
return;
}

        const newNode: GraphNode = { id: `n_${Date.now()}`, label };
        const newEdge: GraphEdge = {
            id: `e_${Date.now()}`,
            source: parentId,
            target: newNode.id,
        };
        const updated = [...graphNodes, newNode];
        setGraphNodes(updated);
        setGraphEdges((e) => [...e, newEdge]);
        onAction?.('mindmap_update', {
            nodes: updated,
            edges: [...graphEdges, newEdge],
        });
    };

    const handleRemove = (nodeId: string) => {
        const updatedNodes = graphNodes.filter((n) => n.id !== nodeId);
        const updatedEdges = graphEdges.filter(
            (e) => e.source !== nodeId && e.target !== nodeId,
        );
        setGraphNodes(updatedNodes);
        setGraphEdges(updatedEdges);
        onAction?.('mindmap_update', {
            nodes: updatedNodes,
            edges: updatedEdges,
        });
    };

    const handleDoubleClick = (node: GraphNode) => {
        setEditingId(node.id);
        setEditText(node.label);
    };

    const commitEdit = (nodeId: string) => {
        const label = editText.trim();

        if (!label) {
return;
}

        const updated = graphNodes.map((n) =>
            n.id === nodeId ? { ...n, label, id: label } : n,
        );
        setGraphNodes(updated);
        onAction?.('mindmap_update', { nodes: updated, edges: graphEdges });
        setEditingId(null);
        setEditText('');
    };

    const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
        const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const label = newLabel.trim();

        if (label) {
            const id = `n_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            const newNode: GraphNode = { id, label, x, y };
            setGraphNodes((prev) => [...prev, newNode]);
            setNewLabel('');
        }
    };

    const rootId = graphNodes[0]?.id || 'Brand';

    return (
        <div className="p-4">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-display font-semibold text-nm-magenta dark:text-nm-magenta">{title}</h3>
                <span className="rounded bg-nm-steel/10 px-2 py-1 font-mono text-xs text-nm-steel">
                    {graphNodes.length} nodes • {graphEdges.length} edges
                </span>
            </div>

            <div className="mb-2 flex gap-2">
                <Input
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="Add a keyword..."
                    size={30}
                />
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddChild(rootId)}
                    disabled={!newLabel.trim()}
                >
                    Add Child
                </Button>
            </div>

            <div
                ref={containerRef}
                className="overflow-auto rounded-lg border border-nm-grid bg-nm-paper dark:bg-nm-paper-dark"
                style={{ height: '400px' }}>
                {graphNodes.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-nm-steel italic">
                        No nodes provided — add keywords above
                    </div>
                ) : (
                    <svg
                        width={dimensions.width}
                        height={dimensions.height}
                        className="cursor-crosshair text-nm-steel"
                        onClick={handleSvgClick}
                    >
                        {graphEdges.map((edge) => {
                            const source = graphNodes.find(
                                (n) => n.id === edge.source,
                            );
                            const target = graphNodes.find(
                                (n) => n.id === edge.target,
                            );

                            if (!source || !target) {
return null;
}

                            const sx =
                                (source.x || 0) + (source.width || NODE_W) / 2;
                            const sy =
                                (source.y || 0) + (source.height || NODE_H) / 2;
                            const tx =
                                (target.x || 0) + (target.width || NODE_W) / 2;
                            const ty =
                                (target.y || 0) + (target.height || NODE_H) / 2;

                            return (
                                <line
                                    key={edge.id}
                                    x1={sx}
                                    y1={sy}
                                    x2={tx}
                                    y2={ty}
                                    stroke="currentColor"
                                    strokeWidth={2}
                                />
                            );
                        })}

                        {graphNodes.map((node) => {
                            const isEditing = editingId === node.id;

                            return (
                                <g
                                    key={node.id}
                                    transform={`translate(${node.x || 0}, ${node.y || 0})`}
                                >
                                    <rect
                                        width={node.width || NODE_W}
                                        height={node.height || NODE_H}
                                        rx={8}
                                        fill={
                                            node.id === rootId
                                                ? 'var(--nm-cyan)'
                                                : '#ffffff'
                                        }
                                        stroke={
                                            node.id === rootId
                                                ? 'var(--nm-cyan)'
                                                : 'var(--nm-grid)'
                                        }
                                        strokeWidth={2}
                                        className="dark:border-nm-grid dark:bg-nm-paper-dark"
                                    />
                                    {isEditing ? (
                                        <foreignObject
                                            x={4}
                                            y={8}
                                            width={node.width! - 8}
                                            height={node.height! - 16}
                                        >
                                            <Input
                                                autoFocus
                                                value={editText}
                                                onChange={(e) =>
                                                    setEditText(e.target.value)
                                                }
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
commitEdit(node.id);
}

                                                    if (e.key === 'Escape') {
setEditingId(null);
}
                                                }}
                                                className="h-6 text-sm"
                                            />
                                        </foreignObject>
                                    ) : (
                                        <text
                                            x={(node.width || NODE_W) / 2}
                                            y={(node.height || NODE_H) / 2 + 5}
                                            textAnchor="middle"
                                            fill={
                                                node.id === rootId
                                                    ? '#ffffff'
                                                    : 'var(--nm-ink)'
                                            }
                                            fontSize={14}
                                            cursor="pointer"
                                            onDoubleClick={() =>
                                                handleDoubleClick(node)
                                            }
                                            className="fill-nm-paper"
                                        >
                                            {node.label}
                                        </text>
                                    )}

                                    {node.id !== rootId && (
                                        <foreignObject
                                            x={(node.width || NODE_W) - 24}
                                            y={-8}
                                            width={20}
                                            height={20}
                                        >
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-5 w-5 text-nm-magenta"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRemove(node.id);
                                                }}
                                            >
                                                ×
                                            </Button>
                                        </foreignObject>
                                    )}
                                </g>
                            );
                        })}
                    </svg>
                )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                        onAction?.('mindmap_confirm', {
                            step: 'mindmap_confirm',
                            nodes: graphNodes,
                            edges: graphEdges,
                        })
                    }
                >
                    Save Mind Map
                </Button>
            </div>
        </div>
    );
}

// ---------------------------------------------------------
// Palette Picker Placeholder
// ---------------------------------------------------------
interface PalettePickerProps extends DynamicComponentProps {
    initialColors?: string[];
}

export function PalettePicker({ id, initialColors = [] }: PalettePickerProps) {
    return (
        <div className="p-4">
            <h3 className="mb-4 text-lg font-display font-semibold text-nm-amber dark:text-nm-amber">
                Color Palette Generator
            </h3>
            <div className="flex gap-4">
                {initialColors.map((color, i) => (
                    <div key={i} className="flex flex-col items-center gap-2">
                        <div
                            className="h-16 w-16 rounded-lg shadow-inner"
                            style={{ backgroundColor: color }}
                        />
                        <span className="font-mono text-xs">{color}</span>
                    </div>
                ))}
                {initialColors.length === 0 && (
                    <div className="text-muted-foreground italic">
                        Generate a palette...
                    </div>
                )}
            </div>
        </div>
    );
}

// ---------------------------------------------------------
// Geometric Constructor Placeholder (Rust/WASM target)
// ---------------------------------------------------------
interface GeometricProps extends DynamicComponentProps {
    mode?: 'Beginner' | 'Experienced';
}

export function GeometricConstructor({
    id,
    mode = 'Beginner',
}: GeometricProps) {
    return (
        <div className="p-4">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-display font-semibold text-nm-amber dark:text-nm-amber">Geometric Constructor</h3>
                <span className="rounded bg-nm-steel/10 px-2 py-1 font-mono text-xs text-nm-steel">
                    Mode: {mode}
                </span>
            </div>
            <div className="bg-nm-steel/10 dark:bg-nm-paper-dark flex aspect-video items-center justify-center rounded border">
                <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                        [Rust/WASM Sketch Engine Mounting Point]
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                        Awaiting WASM module initialization...
                    </p>
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------
// Review View Placeholder
// ---------------------------------------------------------
interface ReviewViewProps extends DynamicComponentProps {
    title?: string;
    directions?: Array<Record<string, any>>;
}

export function ReviewView({
    id,
    title = 'Direction Review',
    directions = [],
}: ReviewViewProps) {
    return (
        <div className="p-4">
            <h3 className="mb-4 text-lg font-display font-semibold text-nm-steel dark:text-nm-steel">{title}</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {directions.map((direction, i) => (
                    <div
                        key={i}
                        className="rounded-lg border border-nm-grid bg-nm-paper dark:bg-nm-paper-dark p-4"
                    >
                        <p className="text-sm text-muted-foreground">
                            Direction {i + 1}
                        </p>
                        <pre className="mt-2 max-h-40 overflow-auto text-xs">
                            {JSON.stringify(direction, null, 2)}
                        </pre>
                    </div>
                ))}
                {directions.length === 0 && (
                    <div className="col-span-full text-muted-foreground italic">
                        No directions provided
                    </div>
                )}
            </div>
        </div>
    );
}

// ---------------------------------------------------------
// Guideline Preview Placeholder
// ---------------------------------------------------------
interface GuidelinePreviewProps extends DynamicComponentProps {
    sections?: Array<Record<string, any>>;
}

export function GuidelinePreview({ id, sections = [] }: GuidelinePreviewProps) {
    return (
        <div className="p-4">
            <h3 className="mb-4 text-lg font-display font-semibold text-nm-steel dark:text-nm-steel">Brand Guidelines</h3>
            <div className="space-y-4">
                {sections.map((section, i) => (
                    <div
                        key={i}
                        className="rounded-lg border border-nm-grid bg-nm-paper dark:bg-nm-paper-dark p-4"
                    >
                        <h4 className="font-medium">
                            {section.title || `Section ${i + 1}`}
                        </h4>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {section.content || 'No content provided'}
                        </p>
                    </div>
                ))}
                {sections.length === 0 && (
                    <div className="text-muted-foreground italic">
                        No guideline sections provided
                    </div>
                )}
            </div>
        </div>
    );
}
