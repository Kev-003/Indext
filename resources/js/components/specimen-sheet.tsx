import { Check } from '@phosphor-icons/react';
import React from 'react';
import { cn } from '@/lib/utils';

export type StageKey =
    | 'discovery'
    | 'concept'
    | 'composition'
    | 'review'
    | 'guidelines'
    | 'assets';

interface SpecimenSheetProps {
    stage: StageKey;
    stageLabel: string;
    title?: string;
    completed?: boolean;
    completionLabel?: string;
    children: React.ReactNode;
    className?: string;
}

const stageColorVar: Record<StageKey, string> = {
    discovery: 'var(--nm-stage-discovery)',
    concept: 'var(--nm-stage-concept)',
    composition: 'var(--nm-stage-composition)',
    review: 'var(--nm-stage-review)',
    guidelines: 'var(--nm-stage-guidelines)',
    assets: 'var(--nm-stage-assets)',
};

export function SpecimenSheet({
    stage,
    stageLabel,
    title,
    completed,
    completionLabel,
    children,
    className,
}: SpecimenSheetProps) {
    const color = stageColorVar[stage];

    return (
        <div
            className={cn(
                'bg-nm-paper text-nm-ink relative w-full max-w-5xl rounded-md border',
                'motion-reduce:transition-none',
                className,
            )}
            style={{ '--stage-color': color } as React.CSSProperties}
        >
            <div
                className="absolute top-0 left-0 h-3 w-3"
                style={{ backgroundColor: color }}
                aria-hidden="true"
            />
            <div
                className="absolute top-0 left-3 h-3 w-3"
                style={{ backgroundColor: color }}
                aria-hidden="true"
            />
            <div
                className="absolute top-3 left-0 h-3 w-3"
                style={{ backgroundColor: color }}
                aria-hidden="true"
            />

            {completed && (
                <div className="border-nm-grid border-b px-5 py-3">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium"></span>
                    </div>
                </div>
            )}

            {(title || stageLabel) && (
                <div className="border-nm-grid border-b px-5 py-3">
                    {stageLabel && (
                        <span className="text-nm-steel text-[10px] font-medium tracking-wider uppercase">
                            {stageLabel}
                        </span>
                    )}
                    {title && (
                        <h3 className="text-nm-ink mt-0.5 font-display text-lg font-semibold">
                            {title}
                        </h3>
                    )}
                </div>
            )}

            <div className="px-5 py-4">{children}</div>
        </div>
    );
}
