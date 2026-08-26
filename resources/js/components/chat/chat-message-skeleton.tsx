import { Skeleton } from '@/components/ui/skeleton';

interface ChatMessageSkeletonProps {
    isUser?: boolean;
}

export function ChatMessageSkeleton({ isUser = false }: ChatMessageSkeletonProps) {
    const alignment = isUser ? 'justify-end' : 'justify-start';

    return (
        <div className={`flex ${alignment} mb-4`}>
            <Skeleton
                className={`h-16 max-w-[80%] rounded-[14px] ${
                    isUser ? 'bg-nm-cyan/20' : 'bg-nm-steel/10'
                }`}
            />
        </div>
    );
}

export function ChatMessageListSkeleton() {
    return (
        <div className="flex flex-col gap-3">
            <ChatMessageSkeleton isUser={false} />
            <ChatMessageSkeleton isUser={false} />
            <ChatMessageSkeleton isUser={true} />
            <ChatMessageSkeleton isUser={false} />
        </div>
    );
}
