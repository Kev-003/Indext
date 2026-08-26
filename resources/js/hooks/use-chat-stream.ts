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
    tool_results?: Array<{
        tool_call_id: string;
        result: Record<string, any>;
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
    retryLastMessage: () => Promise<void>;
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

export function useChatStream(initialMessages: Message[] = [], initialConversationId?: string | number | null): ChatState {
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeConversationId, setActiveConversationId] = useState<string | number | null>(initialConversationId ?? null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const lastPromptRef = useRef<string | null>(null);
    const lastBrandIdRef = useRef<string | number | null>(null);
    const lastConversationIdRef = useRef<string | number | null>(null);
    const lastAssistantMessageIdRef = useRef<string | null>(null);

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

        // Build a human-readable display label for system-generated prompts
        // so the user doesn't see raw JSON in the chat. The actual prompt sent
        // to the API is unchanged (we only prettify what's shown in the UI).
        const displayContent = (() => {
            if (prompt.startsWith('STEP_COMPLETE ')) {
                try {
                    const data = JSON.parse(prompt.slice('STEP_COMPLETE '.length));
                    const step = data.step
                        ? data.step.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
                        : 'Step';
                    if (data.action === 'select_concept' && (data.concept?.title || data.concept?.name)) {
                        return `✓ Selected concept: ${data.concept.title ?? data.concept.name}`;
                    }
                    if (data.action === 'refine' && (data.concept?.title || data.concept?.name)) {
                        return `↺ Refine concept: ${data.concept.title ?? data.concept.name}`;
                    }
                    if (data.palette) {
                        return `✓ Confirmed ${step} palette`;
                    }
                    return `✓ Completed: ${step}`;
                } catch {
                    return '✓ Step completed';
                }
            }
            if (prompt.startsWith('INTERVIEW_COMPLETE ')) {
                return '✓ Interview submitted';
            }
            return prompt;
        })();

        const userMessage: Message = {
            id: `user_${Date.now()}`,
            role: 'user',
            content: displayContent,
            created_at: new Date().toISOString(),
        };

        setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.role === 'user' && last.content === displayContent) {
                return prev;
            }
            return [...prev, userMessage];
        });

        const assistantMessageId = `assistant_${Date.now()}`;
        const assistantMessage: Message = {
            id: assistantMessageId,
            role: 'assistant',
            content: '',
            tool_calls: [],
            created_at: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMessage]);

        lastPromptRef.current = prompt;
        lastBrandIdRef.current = brandId;
        lastConversationIdRef.current = conversationId ?? null;
        lastAssistantMessageIdRef.current = assistantMessageId;

        try {
            const url = new URL(`/api/brands/${brandId}/chat/message`, window.location.origin);
            if (conversationId) {
                url.searchParams.set('conversation_id', String(conversationId));
            }

            console.log('[useChatStream] sending', {
                brandId,
                conversationId,
                promptPreview: prompt.slice(0, 50),
            });

            const response = await fetch(url.toString(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                    Accept: 'text/event-stream',
                },
                body: JSON.stringify({ prompt, conversation_id: conversationId || undefined }),
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

                        if (parsed.message) {
                            setError(parsed.message);
                            setMessages((prev) =>
                                prev.map((m) =>
                                    m.id === assistantMessageId ? { ...m, content: `Error: ${parsed.message}` } : m,
                                ),
                            );
                            continue;
                        }

                        if (parsed.content) {
                            accumulatedContent += parsed.content;
                            setMessages((prev) =>
                                prev.map((m) =>
                                    m.id === assistantMessageId ? { ...m, content: accumulatedContent } : m,
                                ),
                            );
                        }

                        if (parsed.id && parsed.name && parsed.arguments) {
                            let existing = toolCalls.find((t) => t.id === parsed.id);
                            if (!existing) {
                                existing = toolCalls.find((t) => t.name === parsed.name);
                            }
                            if (existing) {
                                existing.arguments = { ...existing.arguments, ...parsed.arguments };
                                existing.id = parsed.id;
                            } else {
                                toolCalls.push({
                                    id: parsed.id,
                                    name: parsed.name,
                                    arguments: parsed.arguments,
                                });
                            }

                            setMessages((prev) =>
                                prev.map((m) =>
                                    m.id === assistantMessageId ? { ...m, tool_calls: [...toolCalls] } : m,
                                ),
                            );
                        }

                        if (parsed.conversation_id) {
                            console.log('[useChatStream] received conversation_id', {
                                conversationId: parsed.conversation_id,
                                previousActive: activeConversationId,
                            });
                            setActiveConversationId(parsed.conversation_id);
                        }
                    } catch {
                        // Ignore parse errors for incomplete JSON chunks
                    }
                }
            }

            if (accumulatedContent === '' && toolCalls.length === 0) {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === assistantMessageId
                            ? { ...m, content: 'No response received from AI. The response may have timed out or been empty.' }
                            : m,
                    ),
                );
                setError('No response received from AI. Try again or rephrase your message.');
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

    const retryLastMessage = useCallback(async () => {
        const prompt = lastPromptRef.current;
        const brandId = lastBrandIdRef.current;
        const conversationId = lastConversationIdRef.current;
        const assistantMessageId = lastAssistantMessageIdRef.current;

        if (!prompt || !brandId) return;

        setMessages((prev) => prev.filter((m) => m.id !== assistantMessageId));
        setError(null);

        await sendMessage(prompt, brandId, conversationId ?? undefined);
    }, [sendMessage]);

    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    return { messages, isStreaming, error, activeConversationId, sendMessage, retryLastMessage, setMessages };
}
