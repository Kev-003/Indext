import type { SnappedPrimitive } from './sketch-engine-types';

export interface ConceptPrimitive {
    type: 'circle' | 'rectangle' | 'line' | 'regular_polygon' | 'polygon';
    points?: Array<{ x: number; y: number }>;
    center?: { x: number; y: number };
    radius?: number;
    sides?: number;
    top_left?: { x: number; y: number };
    bottom_right?: { x: number; y: number };
    start?: { x: number; y: number };
    end?: { x: number; y: number };
}

export interface ShapeConcept {
    id: string;
    label: string;
    archetype: string;
    description: string;
    previewSvg: string;
    primitives: ConceptPrimitive[];
}

export const SHAPE_CONCEPTS: ShapeConcept[] = [
    {
        id: 'mark-circle',
        label: 'Pure Circle',
        archetype: 'minimal',
        description: 'Centered focal circle symbolizing unity, wholeness, and precision.',
        previewSvg: `<svg viewBox="0 0 80 80" class="w-full h-full"><circle cx="40" cy="40" r="28" fill="none" stroke="currentColor" stroke-width="3" /></svg>`,
        primitives: [
            {
                type: 'circle',
                center: { x: 300, y: 150 },
                radius: 80,
            },
        ],
    },
    {
        id: 'mark-square',
        label: 'Solid Square',
        archetype: 'structural',
        description: 'Balanced square mark conveying stability, structure, and integrity.',
        previewSvg: `<svg viewBox="0 0 80 80" class="w-full h-full"><rect x="16" y="16" width="48" height="48" fill="none" stroke="currentColor" stroke-width="3" rx="2" /></svg>`,
        primitives: [
            {
                type: 'rectangle',
                top_left: { x: 220, y: 70 },
                bottom_right: { x: 380, y: 230 },
            },
        ],
    },
    {
        id: 'mark-triangle',
        label: 'Delta Triangle',
        archetype: 'dynamic',
        description: 'Ascending delta triangle conveying growth, direction, and ambition.',
        previewSvg: `<svg viewBox="0 0 80 80" class="w-full h-full"><polygon points="40,14 68,64 12,64" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" /></svg>`,
        primitives: [
            {
                type: 'polygon',
                points: [
                    { x: 300, y: 60 },
                    { x: 390, y: 230 },
                    { x: 210, y: 230 },
                    { x: 300, y: 60 },
                ],
            },
        ],
    },
    {
        id: 'mark-hexagon',
        label: 'Hex Core',
        archetype: 'structural',
        description: 'Engineered hexagonal core suggesting modularity and technical strength.',
        previewSvg: `<svg viewBox="0 0 80 80" class="w-full h-full"><polygon points="40,12 66,27 66,53 40,68 14,53 14,27" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" /></svg>`,
        primitives: [
            {
                type: 'regular_polygon',
                center: { x: 300, y: 150 },
                radius: 85,
                sides: 6,
            },
        ],
    },
    {
        id: 'monogram-frame',
        label: 'Framed Shield',
        archetype: 'heritage',
        description: 'Architectural framed boundary for an authoritative emblem.',
        previewSvg: `<svg viewBox="0 0 80 80" class="w-full h-full"><rect x="18" y="14" width="44" height="52" rx="4" fill="none" stroke="currentColor" stroke-width="3" /><line x1="28" y1="40" x2="52" y2="40" stroke="currentColor" stroke-width="2" /></svg>`,
        primitives: [
            {
                type: 'rectangle',
                top_left: { x: 230, y: 60 },
                bottom_right: { x: 370, y: 240 },
            },
            {
                type: 'line',
                start: { x: 250, y: 150 },
                end: { x: 350, y: 150 },
            },
        ],
    },
    {
        id: 'monogram-letter',
        label: 'Monogram Pillar',
        archetype: 'typographic',
        description: 'Geometric serif pillars forming an abstracted letterform.',
        previewSvg: `<svg viewBox="0 0 80 80" class="w-full h-full"><path d="M22,62 L22,18 L38,46 L58,18 L58,62" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" /></svg>`,
        primitives: [
            {
                type: 'polygon',
                points: [
                    { x: 230, y: 230 },
                    { x: 230, y: 70 },
                    { x: 300, y: 170 },
                    { x: 370, y: 70 },
                    { x: 370, y: 230 },
                ],
            },
        ],
    },
    {
        id: 'loop-continuous',
        label: 'Infinity Ribbon',
        archetype: 'fluid',
        description: 'Fluid infinity loop depicting connectivity, endurance, and seamless flow.',
        previewSvg: `<svg viewBox="0 0 80 80" class="w-full h-full"><path d="M24,40 C14,26 14,54 24,40 C34,26 46,54 56,40 C66,26 66,54 56,40 Z" fill="none" stroke="currentColor" stroke-width="3" /></svg>`,
        primitives: [
            {
                type: 'polygon',
                points: [
                    { x: 220, y: 150 },
                    { x: 260, y: 90 },
                    { x: 340, y: 210 },
                    { x: 380, y: 150 },
                    { x: 340, y: 90 },
                    { x: 260, y: 210 },
                    { x: 220, y: 150 },
                ],
            },
        ],
    },
    {
        id: 'arc-segment',
        label: 'Radial Arch',
        archetype: 'fluid',
        description: 'Curved arch segment representing horizon, scope, and welcoming perspective.',
        previewSvg: `<svg viewBox="0 0 80 80" class="w-full h-full"><path d="M16,56 A28,28 0 0,1 64,56" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" /></svg>`,
        primitives: [
            {
                type: 'circle',
                center: { x: 300, y: 170 },
                radius: 90,
            },
        ],
    },
    {
        id: 'chevron',
        label: 'Apex Chevron',
        archetype: 'precision',
        description: 'Sharp forward chevron signifying velocity, technology, and forward momentum.',
        previewSvg: `<svg viewBox="0 0 80 80" class="w-full h-full"><polyline points="20,52 40,28 60,52" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" /></svg>`,
        primitives: [
            {
                type: 'polygon',
                points: [
                    { x: 220, y: 220 },
                    { x: 300, y: 80 },
                    { x: 380, y: 220 },
                ],
            },
        ],
    },
    {
        id: 'diamond',
        label: 'Prism Diamond',
        archetype: 'precision',
        description: 'Faceted rhomboid prism representing luxury, brilliance, and precision.',
        previewSvg: `<svg viewBox="0 0 80 80" class="w-full h-full"><polygon points="40,12 66,40 40,68 14,40" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" /></svg>`,
        primitives: [
            {
                type: 'polygon',
                points: [
                    { x: 300, y: 60 },
                    { x: 390, y: 150 },
                    { x: 300, y: 240 },
                    { x: 210, y: 150 },
                    { x: 300, y: 60 },
                ],
            },
        ],
    },
    {
        id: 'cross',
        label: 'Nexus Plus',
        archetype: 'precision',
        description: 'Balanced coordinate cross indicating convergence, intersection, and clarity.',
        previewSvg: `<svg viewBox="0 0 80 80" class="w-full h-full"><line x1="40" y1="16" x2="40" y2="64" stroke="currentColor" stroke-width="3" stroke-linecap="round" /><line x1="16" y1="40" x2="64" y2="40" stroke="currentColor" stroke-width="3" stroke-linecap="round" /></svg>`,
        primitives: [
            {
                type: 'line',
                start: { x: 300, y: 60 },
                end: { x: 300, y: 240 },
            },
            {
                type: 'line',
                start: { x: 210, y: 150 },
                end: { x: 390, y: 150 },
            },
        ],
    },
    {
        id: 'arrow',
        label: 'Vector Arrow',
        archetype: 'dynamic',
        description: 'Directional vector arrow representing progress, acceleration, and mission.',
        previewSvg: `<svg viewBox="0 0 80 80" class="w-full h-full"><path d="M22,58 L54,26 M34,24 L56,24 L56,46" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" /></svg>`,
        primitives: [
            {
                type: 'line',
                start: { x: 230, y: 220 },
                end: { x: 370, y: 80 },
            },
            {
                type: 'polygon',
                points: [
                    { x: 290, y: 80 },
                    { x: 370, y: 80 },
                    { x: 370, y: 160 },
                ],
            },
        ],
    },
];

/**
 * Converts a shape concept's primitives into flat [x0, y0, x1, y1, ...] point samples
 * that can be passed to the Rust WASM sketch engine.
 */
export function conceptToPointArray(concept: ShapeConcept, canvasWidth = 600, canvasHeight = 300): number[] {
    const points: number[] = [];
    const cx = canvasWidth / 2;
    const cy = canvasHeight / 2;

    for (const prim of concept.primitives) {
        if (prim.type === 'circle' && prim.radius) {
            const r = prim.radius;
            const center = prim.center || { x: cx, y: cy };
            const steps = 32;
            for (let i = 0; i <= steps; i++) {
                const theta = (i / steps) * 2 * Math.PI;
                points.push(center.x + r * Math.cos(theta), center.y + r * Math.sin(theta));
            }
        } else if (prim.type === 'rectangle' && prim.top_left && prim.bottom_right) {
            const { x: x1, y: y1 } = prim.top_left;
            const { x: x2, y: y2 } = prim.bottom_right;
            const steps = 8;
            for (let i = 0; i <= steps; i++) points.push(x1 + (i / steps) * (x2 - x1), y1);
            for (let i = 0; i <= steps; i++) points.push(x2, y1 + (i / steps) * (y2 - y1));
            for (let i = 0; i <= steps; i++) points.push(x2 - (i / steps) * (x2 - x1), y2);
            for (let i = 0; i <= steps; i++) points.push(x1, y2 - (i / steps) * (y2 - y1));
        } else if (prim.type === 'regular_polygon' && prim.radius && prim.sides) {
            const r = prim.radius;
            const sides = prim.sides;
            const center = prim.center || { x: cx, y: cy };
            const stepsPerSide = 6;
            for (let s = 0; s < sides; s++) {
                const a1 = (s / sides) * 2 * Math.PI - Math.PI / 2;
                const a2 = ((s + 1) / sides) * 2 * Math.PI - Math.PI / 2;
                const x1 = center.x + r * Math.cos(a1);
                const y1 = center.y + r * Math.sin(a1);
                const x2 = center.x + r * Math.cos(a2);
                const y2 = center.y + r * Math.sin(a2);
                for (let i = 0; i <= stepsPerSide; i++) {
                    const t = i / stepsPerSide;
                    points.push(x1 + t * (x2 - x1), y1 + t * (y2 - y1));
                }
            }
        } else if (prim.type === 'polygon' && prim.points && prim.points.length > 1) {
            for (let i = 0; i < prim.points.length - 1; i++) {
                const p1 = prim.points[i];
                const p2 = prim.points[i + 1];
                const steps = 8;
                for (let j = 0; j <= steps; j++) {
                    const t = j / steps;
                    points.push(p1.x + t * (p2.x - p1.x), p1.y + t * (p2.y - p1.y));
                }
            }
        } else if (prim.type === 'line' && prim.start && prim.end) {
            const steps = 12;
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                points.push(prim.start.x + t * (prim.end.x - prim.start.x), prim.start.y + t * (prim.end.y - prim.start.y));
            }
        }
    }

    return points;
}
