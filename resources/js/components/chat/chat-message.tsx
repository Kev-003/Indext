import { COMPONENT_STEP_MAP } from '@/components/dynamic/registry';
import { DynamicRenderer, resolveComponentName } from '@/components/dynamic/renderer';
import { MessageContent } from '@/components/message-content';

export interface ChatMessageProps {
    message: {
        id: string;
        role: 'user' | 'assistant' | 'system' | 'tool';
        content: string | null;
        tool_calls?: Array<{
            id: string;
            name: string;
            arguments: Record<string, any>;
        }>;
        tool_results?: Array<{
            tool_call_id?: string;
            result_id?: string;
            result: Record<string, any>;
        }>;
        created_at: string;
    };
    onAction?: (action: string, data: Record<string, any>) => void;
    brandDiscovery?: Record<string, any> | null;
    brandStrategy?: Record<string, any> | null;
}

function hasContent(obj: any): boolean {
    if (!obj) return false;
    if (typeof obj !== 'object') return Boolean(obj);
    return Object.values(obj).some((v) => {
        if (v == null) return false;
        if (typeof v === 'string') return v.trim().length > 0;
        if (Array.isArray(v)) return v.length > 0;
        if (typeof v === 'object') return Object.keys(v).length > 0;
        return true;
    });
}

export function ChatMessage({ message, onAction, brandDiscovery, brandStrategy }: ChatMessageProps) {
    const { role, content, tool_calls, tool_results } = message;

    if (role === 'user') {
        return (
            <div className="mb-4 flex justify-end">
                <div className="max-w-[80%] rounded-[14px] border border-nm-cyan/20 bg-nm-cyan px-4 py-3 text-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                    <MessageContent content={content || ''} onAction={onAction} />
                </div>
            </div>
        );
    }

    if (role === 'system') {
        return null;
    }

    const hasTextContent = content && content.trim();
    const hasToolCalls = tool_calls && tool_calls.length > 0;

    if (!hasTextContent && !hasToolCalls) {
        return null;
    }

    return (
        <div className="mb-4 flex flex-col gap-3">
            {hasTextContent && (
                <div className="max-w-[80%] rounded-[14px] border border-nm-grid bg-nm-paper px-4 py-3 text-nm-ink shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:bg-nm-paper-dark">
                    <MessageContent content={content || ''} onAction={onAction} />
                </div>
            )}

            {hasToolCalls && (
                <div className="w-full">
                    {tool_calls!.map((toolCall) => {
                        const toolName = toolCall.name;

                        if (!toolName) {
                            return null;
                        }

                        const toolResult = tool_results?.find(
                            (tr) => tr.result_id === toolCall.id || tr.tool_call_id === toolCall.id,
                        );
                        const resolvedName = resolveComponentName(toolName);
                        const stepKey =
                            COMPONENT_STEP_MAP[resolvedName] ??
                            COMPONENT_STEP_MAP[toolName];
                        const discoveryData =
                            stepKey &&
                            brandDiscovery &&
                            brandDiscovery[stepKey] &&
                            hasContent(brandDiscovery[stepKey])
                                ? brandDiscovery[stepKey]
                                : null;
                        const strategyData =
                            (resolvedName === 'ClientInterviewWizard' ||
                                toolName === 'ClientInterviewWizard') &&
                            brandStrategy?.interview &&
                            hasContent(brandStrategy.interview)
                                ? brandStrategy.interview
                                : null;
                        const isCompleted = !!toolResult || !!discoveryData || !!strategyData;
                        const result = toolResult?.result ?? discoveryData ?? strategyData;

                        return (
                            <DynamicRenderer
                                key={toolCall.id}
                                onAction={onAction}
                                components={[
                                    {
                                        id: toolCall.arguments.id || toolCall.id,
                                        name: toolName,
                                        props: {
                                            ...toolCall.arguments,
                                            completed: isCompleted,
                                            result: result,
                                        },
                                    },
                                ]}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}
