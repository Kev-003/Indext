import { useCallback, useEffect, useRef, useState } from 'react';

export interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string | null;
    tool_calls?: Array<{
        id: string;
        name: string;
        arguments: Record<string, any>;
    }>;
    created_at: string;
}

export interface ToolCall {
    id: string;
    name: string;
    arguments: Record<string, any>;
}

export interface ChatState {
    messages: Message[];
    isStreaming: boolean;
    error: string | null;
    activeConversationId: string | number | null;
    sendMessage: (prompt: string, brandId: string | number, conversationId?: string | number) => Promise<void>;
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

export function useChatStream(initialMessages: Message[] = [], initialConversationId?: string | number | null): ChatState {
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeConversationId, setActiveConversationId] = useState<string | number | null>(initialConversationId ?? null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const sendMessage = useCallback(async (
        prompt: string,
        brandId: string | number,
        conversationId?: string | number,
    ) => {
        setError(null);
        setIsStreaming(true);

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        const userMessage: Message = {
            id: `user_${Date.now()}`,
            role: 'user',
            content: prompt,
            created_at: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, userMessage]);

        const assistantMessageId = `assistant_${Date.now()}`;
        const assistantMessage: Message = {
            id: assistantMessageId,
            role: 'assistant',
            content: '',
            tool_calls: [],
            created_at: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMessage]);

        try {
            const url = new URL(`/api/brands/${brandId}/chat/message`, window.location.origin);
            if (conversationId) {
                url.searchParams.set('conversation_id', String(conversationId));
            }

            const response = await fetch(url.toString(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                    Accept: 'text/event-stream',
                },
                body: JSON.stringify({ prompt }),
                signal: controller.signal,
            });

            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}: ${response.statusText || 'Server Error'}`;
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    try {
                        const errJson = await response.json();
                        errorMessage = errJson.message || errorMessage;
                    } catch {}
                } else if (contentType && contentType.includes('text/html')) {
                    errorMessage = `HTTP ${response.status}: Server returned an error page (${response.statusText || 'Internal Server Error'})`;
                } else {
                    const text = await response.text();
                    if (text && text.length < 200) {
                        errorMessage = text;
                    }
                }
                throw new Error(errorMessage);
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let accumulatedContent = '';
            let toolCalls: Array<{ id: string; name: string; arguments: Record<string, any> }> = [];

            while (true) {
                const { done, value } = await reader!.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || !trimmed.startsWith('data:')) continue;

                    const data = trimmed.slice(5).trim();
                    if (data === '[DONE]') continue;

                    try {
                        const parsed = JSON.parse(data);

                        if (parsed.content) {
                            accumulatedContent += parsed.content;
                            setMessages((prev) =>
                                prev.map((m) =>
                                    m.id === assistantMessageId ? { ...m, content: accumulatedContent } : m,
                                ),
                            );
                        }

                        if (parsed.id && parsed.name && parsed.arguments) {
                            const existing = toolCalls.find((t) => t.id === parsed.id);
                            if (!existing) {
                                toolCalls.push({
                                    id: parsed.id,
                                    name: parsed.name,
                                    arguments: parsed.arguments,
                                });
                            } else {
                                existing.arguments = { ...existing.arguments, ...parsed.arguments };
                            }

                            setMessages((prev) =>
                                prev.map((m) =>
                                    m.id === assistantMessageId ? { ...m, tool_calls: [...toolCalls] } : m,
                                ),
                            );
                        }

                        if (parsed.conversation_id) {
                            // Track which conversation is now active so subsequent
                            // messages are routed to the same conversation.
                            // Do NOT use this as the message id — that corrupts React keys.
                            setActiveConversationId(parsed.conversation_id);
                        }
                    } catch {
                        // Ignore parse errors for incomplete JSON chunks
                    }
                }
            }
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                setError(err.message || 'Failed to send message');
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === assistantMessageId ? { ...m, content: `Error: ${err.message}` } : m,
                    ),
                );
            }
        } finally {
            setIsStreaming(false);
            abortControllerRef.current = null;
        }
    }, []);

    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    return { messages, isStreaming, error, activeConversationId, sendMessage, setMessages };
}
