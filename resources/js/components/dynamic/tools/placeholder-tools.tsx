// @no-react-compiler
import ELK from 'elkjs';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSketchRefiner } from '@/hooks/use-sketch-refiner';
import { SHAPE_CONCEPTS, conceptToPointArray, type ShapeConcept } from '@/lib/shape-concepts';
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
// Geometric Constructor (Rust/WASM Sketch Engine)
// ---------------------------------------------------------
interface GeometricProps extends DynamicComponentProps {
    mode?: 'Beginner' | 'Experienced';
    gridSize?: number;
    conceptOptions?: ShapeConcept[];
    completed?: boolean;
    result?: Record<string, any>;
}

interface DrawPoint {
    x: number;
    y: number;
    pressure?: number;
    timestamp?: number;
}

interface DrawnStroke {
    points: DrawPoint[];
    color: string;
    width: number;
}

export function GeometricConstructor({
    id,
    mode = 'Beginner',
    gridSize = 20,
    conceptOptions = SHAPE_CONCEPTS,
    completed = false,
    result,
    onAction,
}: GeometricProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPath, setCurrentPath] = useState<DrawPoint[]>([]);
    const [strokes, setStrokes] = useState<DrawnStroke[]>([]);
    const [refinedSvg, setRefinedSvg] = useState<string | null>(result?.svgPath || result?.svg || null);
    const [isRefining, setIsRefining] = useState(false);
    const [refineError, setRefineError] = useState<string | null>(null);
    const [activeColor, setActiveColor] = useState('#ffffff');
    const [selectedConcept, setSelectedConcept] = useState<ShapeConcept | null>(null);
    const isBeginner = mode === 'Beginner';

    const { refine } = useSketchRefiner();

    const initCanvas = useCallback((canvas: HTMLCanvasElement | null) => {
        canvasRef.current = canvas;
    }, []);

    const getCanvasPos = useCallback((e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
        const canvas = canvasRef.current;

        if (!canvas) {
            return { x: 0, y: 0 };
        }

        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        return {
            x: clientX - rect.left,
            y: clientY - rect.top,
        };
    }, []);

    const snapToGrid = useCallback((val: number, size: number): number => {
        if (isBeginner) {
            return Math.round(val / size) * size;
        }

        return val;
    }, [isBeginner]);

    const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (!canvasRef.current || completed) {
            return;
        }

        e.preventDefault();
        setIsDrawing(true);
        const pos = getCanvasPos(e);
        const snapped = {
            x: snapToGrid(pos.x, gridSize),
            y: snapToGrid(pos.y, gridSize),
        };
        setCurrentPath([snapped]);
    }, [getCanvasPos, snapToGrid, gridSize, completed]);

    const continueDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || !canvasRef.current || completed) {
            return;
        }

        e.preventDefault();
        const pos = getCanvasPos(e);
        const snapped = {
            x: snapToGrid(pos.x, gridSize),
            y: snapToGrid(pos.y, gridSize),
        };
        setCurrentPath((prev) => {
            if (prev.length === 0) {
                return [snapped];
            }

            const last = prev[prev.length - 1];

            if (Math.hypot(snapped.x - last.x, snapped.y - last.y) < 2) {
                return prev;
            }

            return [...prev, snapped];
        });
    }, [isDrawing, getCanvasPos, snapToGrid, gridSize, completed]);

    const finishDrawing = useCallback(() => {
        if (!isDrawing || currentPath.length < 2) {
            setIsDrawing(false);
            setCurrentPath([]);

            return;
        }

        const stroke: DrawnStroke = {
            points: currentPath,
            color: activeColor,
            width: 2,
        };

        setStrokes((prev) => [...prev, stroke]);
        setCurrentPath([]);
        setIsDrawing(false);
    }, [isDrawing, currentPath, activeColor]);

    const executeRefine = useCallback(async (allPoints: number[]) => {
        setIsRefining(true);
        setRefineError(null);

        try {
            const res = await refine(allPoints, 2, {
                epsilon: 3.0,
                angle_threshold_deg: 30.0,
                fit_tolerance: 2.0,
                snap_tolerance: 5.0,
                min_segment_length: 5.0,
            });

            if (!res || typeof res.svg_path !== 'string') {
                throw new Error('Invalid refinement result — missing svg_path');
            }

            setRefinedSvg(res.svg_path);
            onAction?.('geometric_refine', {
                step: 'geometric_constructor',
                action: 'refine',
                svgPath: res.svg_path,
                controlPoints: res.control_points,
                primitives: res.primitives,
            });
        } catch (e) {
            setRefineError(e instanceof Error ? e.message : 'Refinement failed');
        } finally {
            setIsRefining(false);
        }
    }, [refine, onAction]);

    const handleBeautify = useCallback(async () => {
        if (strokes.length === 0) {
            return;
        }

        const allPoints: number[] = [];
        for (const stroke of strokes) {
            for (const p of stroke.points) {
                allPoints.push(p.x, p.y);
            }
        }

        await executeRefine(allPoints);
    }, [strokes, executeRefine]);

    const handleSelectConcept = useCallback((concept: ShapeConcept) => {
        setSelectedConcept(concept);
    }, []);

    const handleUseConcept = useCallback(async (concept: ShapeConcept) => {
        setSelectedConcept(concept);
        const canvas = canvasRef.current;
        const w = canvas?.offsetWidth || 600;
        const h = canvas?.offsetHeight || 300;
        const points = conceptToPointArray(concept, w, h);
        await executeRefine(points);
    }, [executeRefine]);

    const handleClear = useCallback(() => {
        setStrokes([]);
        setRefinedSvg(null);
        setCurrentPath([]);
        setSelectedConcept(null);
        setRefineError(null);
    }, []);

    const handleAccept = useCallback(() => {
        if (refinedSvg) {
            onAction?.('geometric_accept', {
                step: 'geometric_constructor',
                action: 'accept',
                svgPath: refinedSvg,
                strokes,
            });
        }
    }, [refinedSvg, strokes, onAction]);

    useEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas) {
            return;
        }

        const ctx = canvas.getContext('2d');

        if (!ctx) {
            return;
        }

        const dpr = window.devicePixelRatio || 1;
        canvas.width = canvas.offsetWidth * dpr;
        canvas.height = canvas.offsetHeight * dpr;
        ctx.scale(dpr, dpr);

        const redraw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw existing strokes
            for (const stroke of strokes) {
                if (stroke.points.length < 2) {
                    continue;
                }

                ctx.strokeStyle = stroke.color;
                ctx.lineWidth = stroke.width;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.beginPath();
                ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

                for (let i = 1; i < stroke.points.length; i++) {
                    ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
                }

                ctx.stroke();
            }

            // Draw current path
            if (currentPath.length > 0) {
                ctx.strokeStyle = activeColor;
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.beginPath();
                ctx.moveTo(currentPath[0].x, currentPath[0].y);

                for (let i = 1; i < currentPath.length; i++) {
                    ctx.lineTo(currentPath[i].x, currentPath[i].y);
                }

                ctx.stroke();
            }
        };

        redraw();
    }, [strokes, currentPath, activeColor]);

    if (completed) {
        const markSvg = result?.svgPath || result?.svg || refinedSvg;
        return (
            <div className="p-4">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-display font-semibold text-nm-cyan">
                        Geometric Construction Accepted
                    </h3>
                    <span className="rounded bg-nm-cyan/10 px-2 py-1 font-mono text-xs text-nm-cyan">
                        Brand Asset Created
                    </span>
                </div>
                <div className="flex flex-col items-center justify-center rounded-lg border border-nm-grid bg-white p-6 dark:bg-nm-paper-dark">
                    {markSvg ? (
                        <svg
                            viewBox="0 0 600 300"
                            className="h-32 w-64 max-w-full"
                        >
                            <path
                                d={markSvg}
                                fill="none"
                                stroke="var(--nm-cyan)"
                                strokeWidth={3}
                                strokeLinejoin="round"
                                strokeLinecap="round"
                            />
                        </svg>
                    ) : (
                        <div className="text-sm text-muted-foreground italic">
                            Primary brand mark accepted and stored.
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="p-4">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-display font-semibold text-nm-amber dark:text-nm-amber">
                    Geometric Constructor
                </h3>
                <span className="rounded bg-nm-steel/10 px-2 py-1 font-mono text-xs text-nm-steel">
                    Mode: {mode}
                </span>
            </div>

            {/* Concept Palette */}
            {conceptOptions && conceptOptions.length > 0 && (
                <div className="mb-4">
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-mono font-medium text-nm-steel uppercase tracking-wider">
                            Concept Skeletons & Archetypes
                        </span>
                        <span className="text-xs text-muted-foreground">
                            Click to preview or use
                        </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6">
                        {conceptOptions.map((concept) => (
                            <div
                                key={concept.id}
                                onClick={() => handleSelectConcept(concept)}
                                className={`group cursor-pointer rounded-lg border p-2 transition-all ${
                                    selectedConcept?.id === concept.id
                                        ? 'border-nm-cyan bg-nm-cyan/10'
                                        : 'border-nm-grid bg-white hover:border-nm-steel/50 dark:bg-nm-paper-dark'
                                }`}
                            >
                                <div
                                    className="mx-auto h-12 w-12 text-nm-ink dark:text-gray-200"
                                    dangerouslySetInnerHTML={{ __html: concept.previewSvg }}
                                />
                                <div className="mt-1 text-center">
                                    <p className="truncate text-xs font-medium text-nm-ink dark:text-gray-100">
                                        {concept.label}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            void handleUseConcept(concept);
                                        }}
                                        className="mt-1 block w-full rounded bg-nm-steel/10 py-0.5 text-[10px] font-mono text-nm-steel hover:bg-nm-cyan hover:text-white"
                                    >
                                        Use Concept
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="bg-nm-steel/10 dark:bg-nm-paper-dark relative mb-4 flex aspect-video items-center justify-center rounded border">
                {strokes.length === 0 && !refinedSvg && !selectedConcept && (
                    <div className="text-center text-sm text-muted-foreground">
                        <p>Draw on the canvas below, or pick a concept skeleton above</p>
                        <p className="mt-1 text-xs">
                            {isBeginner
                                ? 'Snapping to grid enabled'
                                : 'Freehand mode — no grid'}
                        </p>
                    </div>
                )}

                {/* Ghost concept guide overlay */}
                {selectedConcept && !refinedSvg && strokes.length === 0 && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-30">
                        <div
                            className="h-36 w-36 text-nm-cyan"
                            dangerouslySetInnerHTML={{ __html: selectedConcept.previewSvg }}
                        />
                    </div>
                )}

                {refineError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <div className="text-center text-red-400">
                            <p className="font-medium">WASM Error</p>
                            <p className="text-sm">{refineError}</p>
                        </div>
                    </div>
                )}

                <canvas
                    ref={initCanvas}
                    className="absolute inset-0 h-full w-full cursor-crosshair"
                    onMouseDown={startDrawing}
                    onMouseMove={continueDrawing}
                    onMouseUp={finishDrawing}
                    onMouseLeave={finishDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={continueDrawing}
                    onTouchEnd={finishDrawing}
                />

                {refinedSvg && (
                    <svg
                        className="absolute inset-0 h-full w-full"
                        style={{ pointerEvents: 'none' }}
                    >
                        <path
                            d={refinedSvg}
                            fill="none"
                            stroke="var(--nm-cyan)"
                            strokeWidth={2}
                            strokeLinejoin="round"
                            strokeLinecap="round"
                        />
                    </svg>
                )}
            </div>

            <div className="mb-4 flex gap-2">
                <input
                    type="color"
                    value={activeColor}
                    onChange={(e) => setActiveColor(e.target.value)}
                    className="h-8 w-12 cursor-pointer rounded border"
                />
                <Button
                    size="sm"
                    variant="outline"
                    onClick={handleClear}
                    disabled={strokes.length === 0 && !refinedSvg && !selectedConcept}
                >
                    Clear Canvas
                </Button>
            </div>

            <div className="flex justify-end gap-2">
                {refinedSvg && (
                    <Button size="sm" variant="outline" onClick={handleAccept}>
                        Accept Refinement
                    </Button>
                )}
                <Button
                    size="sm"
                    onClick={handleBeautify}
                    disabled={strokes.length === 0 || isRefining}
                >
                    {isRefining ? 'Refining...' : 'Beautify'}
                </Button>
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
