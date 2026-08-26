import React, { Suspense } from 'react';
import { ComponentRegistry } from './registry';

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
    if (!name) return '';

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

export function DynamicRenderer({ components, onAction }: DynamicRendererProps) {
    return (
        <div className="dynamic-components-container flex flex-col gap-4">
            {components.map((componentData) => {
                const resolvedName = resolveComponentName(componentData.name);
                const Component = ComponentRegistry[resolvedName];

                if (!Component) {
                    console.warn(
                        `Attempted to render unknown component: ${componentData.name} (resolved: ${resolvedName})`,
                    );
                    return (
                        <div
                            key={componentData.id}
                            className="rounded border border-red-500 bg-red-50/50 p-4 text-red-500"
                        >
                            Unknown component: {componentData.name}
                        </div>
                    );
                }

                return (
                    <Suspense
                        key={componentData.id}
                        fallback={
                            <div className="animate-pulse rounded bg-gray-200 p-4 dark:bg-gray-800">
                                Loading Tool...
                            </div>
                        }
                    >
                        <div className="group relative overflow-hidden rounded-xl border bg-white shadow-sm dark:bg-gray-950">
                            <Component
                                id={componentData.id}
                                onAction={onAction}
                                {...componentData.props}
                            />
                        </div>
                    </Suspense>
                );
            })}
        </div>
    );
}
