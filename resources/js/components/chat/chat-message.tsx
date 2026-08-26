import { COMPONENT_STEP_MAP } from '@/components/dynamic/registry';
import { DynamicRenderer } from '@/components/dynamic/renderer';
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
            tool_call_id: string;
            result: Record<string, any>;
        }>;
        created_at: string;
    };
    onAction?: (action: string, data: Record<string, any>) => void;
    brandDiscovery?: Record<string, any> | null;
    brandStrategy?: Record<string, any> | null;
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

    // Assistant message
    const hasContent = content && content.trim();
    const hasToolCalls = tool_calls && tool_calls.length > 0;

    if (!hasContent && !hasToolCalls) {
        return null;
    }

    return (
        <div className="mb-4 flex flex-col gap-3">
            {hasContent && (
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
                            (tr) => tr.tool_call_id === toolCall.id,
                        );
                        const stepKey = COMPONENT_STEP_MAP[toolName];
                        const discoveryData = stepKey && brandDiscovery ? brandDiscovery[stepKey] : null;
                        const strategyData =
                            toolName === 'ClientInterviewWizard' && brandStrategy
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
