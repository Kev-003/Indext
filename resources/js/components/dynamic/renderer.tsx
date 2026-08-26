import React, { Suspense } from 'react';
import { SpecimenSheet } from '@/components/specimen-sheet';
import type { StageInfo } from './registry';
import { ComponentRegistry, STAGE_MAP } from './registry';

interface AIComponentData {
    id: string;
    name: string;
    props: any;
}

interface DynamicRendererProps {
    components: AIComponentData[];
    onAction?: (action: string, data: Record<string, any>) => void;
}

// Backend tool names carry an "Invoke" prefix the registry doesn't use.
// A small number of tools also differ beyond just that prefix — list those here.
const COMPONENT_NAME_ALIASES: Record<string, string> = {
    MindMap: 'MindMapCanvas',
};

function resolveComponentName(name: string): string {
    if (!name) {
return '';
}

    let cleaned = name;

    if (cleaned.toLowerCase().startsWith('invoke_')) {
        cleaned = cleaned.slice(7);
    } else if (cleaned.toLowerCase().startsWith('invoke')) {
        cleaned = cleaned.slice(6);
    }

    if (COMPONENT_NAME_ALIASES[cleaned]) {
        cleaned = COMPONENT_NAME_ALIASES[cleaned];
    }

    if (ComponentRegistry[cleaned]) {
        return cleaned;
    }

    const pascal = cleaned
        .split(/[-_]+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');

    return COMPONENT_NAME_ALIASES[pascal] ?? pascal;
}

function resolveStageInfo(componentName: string): StageInfo {
    return STAGE_MAP[componentName] ?? { stage: 'discovery', label: componentName };
}

function getCompletionLabel(result: any): string {
    if (!result) {
return 'Step completed';
}

    if (result.action === 'select_concept' || result.action === 'select_winner') {
        return 'Direction selected';
    }

    if (result.action === 'merge') {
        return 'Directions merged';
    }

    if (result.action === 'confirm' || result.decision === 'confirm') {
        return 'Direction confirmed';
    }

    if (result.action === 'refine' || result.action === 'changes') {
        return 'Changes requested';
    }

    if (result.action === 'restart') {
        return 'Started over';
    }

    if (result.action === 'skip') {
        return 'Skipped';
    }

    return 'Step completed';
}

export function DynamicRenderer({ components, onAction }: DynamicRendererProps) {
    return (
        <div className="dynamic-components-container flex flex-col gap-4">
            {components.map((componentData) => {
                const resolvedName = resolveComponentName(componentData.name);
                const Component = ComponentRegistry[resolvedName];
                const stageInfo = resolveStageInfo(resolvedName);

                const completed = !!componentData.props?.completed;
                const result = componentData.props?.result;

                if (!Component) {
                    return (
                        <SpecimenSheet
                            key={componentData.id}
                            stage={stageInfo.stage}
                            stageLabel={stageInfo.label}
                            title="Unknown Component"
                        >
                            <div className="text-destructive">
                                Attempted to render unknown component: {componentData.name}
                                (resolved: {resolvedName})
                            </div>
                        </SpecimenSheet>
                    );
                }

                return (
                    <Suspense
                        key={componentData.id}
                        fallback={
                            <SpecimenSheet
                                stage={stageInfo.stage}
                                stageLabel={stageInfo.label}
                                title={resolvedName}
                            >
                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                    <div className="h-4 w-4 animate-pulse rounded-full bg-muted" />
                                    <span>Loading tool…</span>
                                </div>
                            </SpecimenSheet>
                        }
                    >
                        <SpecimenSheet
                            stage={stageInfo.stage}
                            stageLabel={stageInfo.label}
                            title={resolvedName}
                            completed={completed}
                            completionLabel={getCompletionLabel(result)}
                        >
                            <Component
                                id={componentData.id}
                                onAction={onAction}
                                {...componentData.props}
                            />
                        </SpecimenSheet>
                    </Suspense>
                );
            })}
        </div>
    );
}
