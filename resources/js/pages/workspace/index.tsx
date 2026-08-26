import type {
    DragEndEvent} from '@dnd-kit/core';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Head, Link, usePage, router } from '@inertiajs/react';
import { ArrowLeft, FolderKanban, GripVertical, Trash2 } from 'lucide-react';
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { ChatMessage } from '@/components/chat/chat-message';
import { ChatMessageListSkeleton } from '@/components/chat/chat-message-skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useChatStream, formatUserPrompt } from '@/hooks/use-chat-stream';
import type { Message } from '@/hooks/use-chat-stream';
import { cn } from '@/lib/utils';
import { workspace } from '@/routes';

type SortOption = 'manual' | 'name-asc' | 'name-desc' | 'newest' | 'oldest';

interface WorkspaceProps {
    brand: {
        id: string;
        name: string;
        industry?: string;
        execution_mode?: string;
        status: string;
        discovery?: Record<string, any>;
        strategy?: Record<string, any>;
    } | null;
    conversation: {
        id: string;
        title?: string;
        status: string;
    } | null;
    messages: Message[];
    brands: Array<{
        id: number;
        name: string;
        industry?: string;
        status: string;
        execution_mode?: string;
        updated_at: string;
    }>;
    availableTools: Array<{ name: string; description: string }>;
    autoTrigger: boolean;
}

interface SortableBrandCardProps {
    brand: {
        id: number;
        name: string;
        industry?: string;
        status: string;
        updated_at: string;
    };
    currentTeamSlug: string;
    onDelete: (id: number) => void;
    deletingId: number | null;
}

function SortableBrandCard({
    brand,
    currentTeamSlug,
    onDelete,
    deletingId,
}: SortableBrandCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: brand.id,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "relative w-full max-w-full cursor-pointer rounded-md border border-nm-grid bg-nm-paper p-4 text-nm-ink transition-shadow hover:shadow-md dark:bg-nm-paper-dark",
                isDragging && "opacity-50",
            )}
        >
            <div className="absolute top-0 left-0 h-2 w-2 rounded-bl-none" style={{ backgroundColor: 'var(--nm-stage-discovery)' }} />
            <div className="flex items-start justify-between gap-2">
                <Link
                    href={workspace(currentTeamSlug, {
                        query: { brand: brand.id },
                    })}
                    className="block min-w-0 flex-1"
                >
                    <h3 className="truncate font-display font-semibold text-nm-ink">{brand.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {brand.industry || 'General Industry'}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Status: {brand.status}
                    </p>
                    <p className="mt-2 text-xs text-nm-steel">
                        Updated {brand.updated_at}
                    </p>
                </Link>
                <div className="flex flex-col gap-1 opacity-0 transition group-hover:opacity-100">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 cursor-grab active:cursor-grabbing"
                        {...attributes}
                        {...listeners}
                    >
                        <GripVertical className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-nm-magenta hover:text-nm-magenta/80"
                        disabled={deletingId === brand.id}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onDelete(brand.id);
                        }}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default function Workspace({
    brand,
    conversation: initialConversation,
    messages: initialMessages,
    brands: initialBrands,
    availableTools,
    autoTrigger,
}: WorkspaceProps) {
    const formattedInitialMessages = useMemo(
        () => initialMessages.map((m) =>
            m.role === 'user' ? { ...m, content: formatUserPrompt(m.content || '') } : m,
        ),
        [initialMessages],
    );
    const {
        messages,
        isStreaming,
        isInitialLoading,
        error,
        sendMessage,
        retryLastMessage,
        activeConversationId,
        setMessages,
    } = useChatStream(formattedInitialMessages, initialConversation?.id);
    const [prompt, setPrompt] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [localBrands, setLocalBrands] = useState(initialBrands);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [sortBy, setSortBy] = useState<SortOption>('manual');
    const page = usePage();
    const currentTeamSlug = page.props.currentTeam?.slug || '';

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    useEffect(() => {
        setLocalBrands(initialBrands);
    }, [initialBrands]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleAction = useCallback(
        (action: string, data: Record<string, any>) => {
            if (!brand) {
return;
}

            const dataStr = JSON.stringify(data);

            if (action === 'submit_interview') {
                void sendMessage(
                    `INTERVIEW_COMPLETE ${dataStr}`,
                    brand.id,
                    activeConversationId ?? initialConversation?.id,
                );
            } else if (action === 'complete_step' || action === 'mindmap_confirm') {
                void sendMessage(
                    `STEP_COMPLETE ${dataStr}`,
                    brand.id,
                    activeConversationId ?? initialConversation?.id,
                );
            }
        },
        [sendMessage, brand, activeConversationId, initialConversation?.id],
    );

    // Auto-trigger the AI when the workspace loads a conversation that has
    // a user message but no assistant reply yet (e.g. after dashboard creation).
    const autoTriggerFired = useRef(false);

    useEffect(() => {
        if (!brand || isStreaming || !autoTrigger || autoTriggerFired.current) {
return;
}

        const lastMessage = messages[messages.length - 1];

        if (
            !lastMessage ||
            lastMessage.role !== 'user' ||
            !lastMessage.content?.trim()
        ) {
return;
}

        const hasAssistantReply = messages.some(
            (m) => m.role === 'assistant' && (m.content?.trim() || (m.tool_calls?.length ?? 0) > 0),
        );

        if (hasAssistantReply) {
return;
}

        autoTriggerFired.current = true;
        sendMessage(
            lastMessage.content,
            brand.id,
            activeConversationId ?? initialConversation?.id,
        );
    }, [
        brand,
        autoTrigger,
        initialConversation,
        isStreaming,
        messages,
        sendMessage,
        activeConversationId,
    ]);

    const handlePromptSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!prompt.trim() || !brand || isStreaming) {
return;
}

        const currentPrompt = prompt;
        setPrompt('');

        await sendMessage(
            currentPrompt,
            brand.id,
            activeConversationId ?? initialConversation?.id,
        );
    };

    const handleDeleteBrand = async (brandId: number) => {
        console.log('delete handler start', brandId, window.location.href);

        if (
            !confirm(
                'Are you sure you want to delete this brand? This cannot be undone.',
            )
        ) {
return;
}

        setDeletingId(brandId);

        try {
            const response = await fetch(`/api/brands/${brandId}`, {
                method: 'DELETE',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN':
                        (
                            document.querySelector(
                                'meta[name="csrf-token"]',
                            ) as HTMLMetaElement
                        )?.content || '',
                },
            });

            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}: ${response.statusText || ''}`;
                const contentType = response.headers.get('content-type');

                if (contentType && contentType.includes('application/json')) {
                    try {
                        const errJson = await response.json();
                        errorMessage = errJson.message || errorMessage;
                    } catch {}
                }

                throw new Error(errorMessage);
            }

            setLocalBrands((prev) => prev.filter((b) => b.id !== brandId));

            if (brand && Number(brand.id) === brandId && currentTeamSlug) {
                router.visit(workspace(currentTeamSlug));
            }
        } catch (err) {
            alert(
                err instanceof Error ? err.message : 'Failed to delete brand',
            );
        } finally {
            setDeletingId(null);
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        if (sortBy !== 'manual') {
return;
}

        const { active, over } = event;

        if (!over || active.id === over.id) {
return;
}

        const oldIndex = localBrands.findIndex((b) => b.id === active.id);
        const newIndex = localBrands.findIndex((b) => b.id === over.id);

        const reordered = arrayMove(localBrands, oldIndex, newIndex);
        setLocalBrands(reordered);

        try {
            await fetch('/api/brands/sort', {
                method: 'PATCH',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN':
                        (
                            document.querySelector(
                                'meta[name="csrf-token"]',
                            ) as HTMLMetaElement
                        )?.content || '',
                },
                body: JSON.stringify({ order: reordered.map((b) => b.id) }),
            });
        } catch {
            setLocalBrands(initialBrands);
        }
    };

    const sortedBrands = [...localBrands].sort((a, b) => {
        switch (sortBy) {
            case 'name-asc':
                return a.name.localeCompare(b.name);
            case 'name-desc':
                return b.name.localeCompare(a.name);
            case 'newest':
                return (
                    new Date(b.updated_at).getTime() -
                    new Date(a.updated_at).getTime()
                );
            case 'oldest':
                return (
                    new Date(a.updated_at).getTime() -
                    new Date(b.updated_at).getTime()
                );
            default:
                return 0;
        }
    });

    // Brand list mode (no brand selected)
    if (!brand) {
        return (
            <>
                <Head title="Nomentra — Workspace" />
                <div className="flex h-full flex-col">
                    <div className="flex-1 space-y-6 overflow-y-auto p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="font-display text-2xl font-bold tracking-tight text-nm-ink">
                                    Your Brands
                                </h2>
                                <p className="text-muted-foreground">
                                    Manage and resume your brand projects.
                                </p>
                            </div>
                            <Select
                                value={sortBy}
                                onValueChange={(v) =>
                                    setSortBy(v as SortOption)
                                }
                            >
                                <SelectTrigger className="w-fit">
                                    <SelectValue placeholder="Sort by" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="manual">
                                        Manual
                                    </SelectItem>
                                    <SelectItem value="name-asc">
                                        Name (A-Z)
                                    </SelectItem>
                                    <SelectItem value="name-desc">
                                        Name (Z-A)
                                    </SelectItem>
                                    <SelectItem value="newest">
                                        Newest first
                                    </SelectItem>
                                    <SelectItem value="oldest">
                                        Oldest first
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {localBrands.length === 0 ? (
                            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-nm-grid p-12 text-center">
                                <FolderKanban className="mb-4 h-12 w-12 text-muted-foreground" />
                                <h3 className="mb-2 font-display text-lg font-semibold text-nm-ink">
                                    No brands yet
                                </h3>
                                <p className="max-w-md text-sm text-muted-foreground">
                                    Create your first brand from the dashboard
                                    to get started.
                                </p>
                            </div>
                        ) : (
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={localBrands.map((b) => b.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                        {(sortBy === 'manual'
                                            ? localBrands
                                            : sortedBrands
                                        ).map((b) => (
                                            <SortableBrandCard
                                                key={b.id}
                                                brand={b}
                                                currentTeamSlug={
                                                    currentTeamSlug
                                                }
                                                onDelete={handleDeleteBrand}
                                                deletingId={deletingId}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        )}
                    </div>
                </div>
            </>
        );
    }

    // Brand chat mode
    return (
    <div key={brand?.id || 'empty'}>
            <Head title={`Nomentra • ${brand.name}`} />
            <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-nm-grid p-4">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                                router.visit(workspace(currentTeamSlug))
                            }
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <h2 className="font-display text-lg font-semibold text-nm-ink">
                            {brand.name}
                        </h2>
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-nm-magenta hover:text-nm-magenta/80"
                        onClick={() => handleDeleteBrand(Number(brand.id))}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
                <div className="flex-1 space-y-6 overflow-y-auto p-4">
                    {isInitialLoading ? (
                        <ChatMessageListSkeleton />
                    ) : messages.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-nm-steel">
                            <div className="text-center">
                                <h3 className="font-display mb-2 text-lg font-semibold text-nm-ink">
                                    Welcome to Nomentra
                                </h3>
                                <p className="max-w-md text-sm text-muted-foreground">
                                    Describe what you want to build for your
                                    brand. Try asking for a mind map, color
                                    palette, or geometry.
                                </p>
                            </div>
                        </div>
                    ) : (
                        messages.map((message) => {
                            if (message.role === 'system') {
                                return null;
                            }

                            return (
                                <ChatMessage
                                    key={message.id}
                                    message={message}
                                    onAction={handleAction}
                                    brandDiscovery={brand?.discovery ?? null}
                                    brandStrategy={brand?.strategy ?? null}
                                />
                            );
                        })
                    )}

                    {(() => {
                        const lastMessage = messages[messages.length - 1];
                        const showLoadingIndicator =
                            isStreaming &&
                            (!lastMessage ||
                                lastMessage.role === 'user' ||
                                (lastMessage.role === 'assistant' &&
                                    !lastMessage.content?.trim() &&
                                    !lastMessage.tool_calls?.length));

                        return showLoadingIndicator ? (
                            <div className="flex justify-start">
                                <div className="rounded-[14px] bg-nm-paper px-4 py-3 dark:bg-nm-paper-dark">
                                    <div className="flex gap-1">
                                        <div
                                            className="h-2 w-2 animate-bounce rounded-full bg-nm-steel"
                                            style={{ animationDelay: '0ms' }}
                                        />
                                        <div
                                            className="h-2 w-2 animate-bounce rounded-full bg-nm-steel"
                                            style={{ animationDelay: '150ms' }}
                                        />
                                        <div
                                            className="h-2 w-2 animate-bounce rounded-full bg-nm-steel"
                                            style={{ animationDelay: '300ms' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : null;
                    })()}

                    <div ref={messagesEndRef} />
                </div>

                <div className="border-t border-nm-grid p-4">
                    {error && (
                        <div className="mb-2 flex items-center gap-2">
                            <span className="text-sm text-nm-magenta">.
                                {error}
                            </span>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => void retryLastMessage()}
                            >
                                Retry
                            </Button>
                        </div>
                    )}
                    <form onSubmit={handlePromptSubmit} className="flex gap-2">
                        <Input
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="What do you want to build for your brand?"
                            disabled={isStreaming}
                            className="border-nm-grid focus:ring-nm-cyan font-mono"
                        />
                        <Button
                            type="submit"
                            disabled={isStreaming || !prompt.trim()}
                            className="bg-nm-cyan text-white hover:bg-nm-cyan/90"
                        >
                            {isStreaming ? 'Sending...' : 'Submit'}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
