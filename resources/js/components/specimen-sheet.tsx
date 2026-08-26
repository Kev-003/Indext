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
                'relative w-full max-w-5xl rounded-md border bg-nm-paper text-nm-ink',
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
                <div className="border-b border-nm-grid px-5 py-2.5">
                    <div className="flex items-center gap-2">
                        <span
                            className="flex h-4 w-4 items-center justify-center rounded-full text-xs"
                            style={{
                                backgroundColor: color,
                                color: '#ffffff',
                            }}
                        >
                            <Check size={12} />
                        </span>
                        <span className="text-xs font-medium">
                            {completionLabel || 'Step completed'}
                        </span>
                    </div>
                </div>
            )}

            {(title || stageLabel) && (
                <div className="border-b border-nm-grid px-5 py-3">
                    {stageLabel && (
                        <span className="text-[10px] font-medium uppercase tracking-wider text-nm-steel">
                            {stageLabel}
                        </span>
                    )}
                    {title && (
                        <h3 className="font-display mt-0.5 text-lg font-semibold text-nm-ink">
                            {title}
                        </h3>
                    )}
                </div>
            )}

            <div className="px-5 py-4">{children}</div>
        </div>
    );
}
