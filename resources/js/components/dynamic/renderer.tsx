import React, { Suspense } from 'react';
import { ComponentRegistry } from './registry';

interface AIComponentData {
    id: string;
    name: string;
    props: any;
}

interface DynamicRendererProps {
    components: AIComponentData[];
}

export function DynamicRenderer({ components }: DynamicRendererProps) {
    return (
        <div className="dynamic-components-container flex flex-col gap-4">
            {components.map((componentData) => {
                const Component = ComponentRegistry[componentData.name];

                if (!Component) {
                    console.warn(`Attempted to render unknown component: ${componentData.name}`);
                    return (
                        <div key={componentData.id} className="p-4 border border-red-500 rounded text-red-500 bg-red-50/50">
                            Unknown component: {componentData.name}
                        </div>
                    );
                }

                return (
                    <Suspense key={componentData.id} fallback={<div className="p-4 animate-pulse bg-gray-200 dark:bg-gray-800 rounded">Loading Tool...</div>}>
                        <div className="relative group border rounded-xl overflow-hidden shadow-sm bg-white dark:bg-gray-950">
                             <Component id={componentData.id} {...componentData.props} />
                        </div>
                    </Suspense>
                );
            })}
        </div>
    );
}
