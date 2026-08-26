import React, { useEffect, useState, Suspense } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeHighlight from 'rehype-highlight';
import { evaluate } from '@mdx-js/mdx';
import { Fragment } from 'react';
import { jsx, jsxs } from 'react/jsx-runtime';

interface MessageContentProps {
    content: string;
    onAction?: (action: string, data: Record<string, any>) => void;
}

const MDX_COMPONENTS: Record<string, React.ComponentType<any>> = {};

const hasJsx = (text: string): boolean => /<[A-Z][A-Za-z]/.test(text);

export function MessageContent({ content, onAction }: MessageContentProps) {
    const [mdxNode, setMdxNode] = useState<React.ReactNode>(null);
    const [mdxLoading, setMdxLoading] = useState(false);
    const [mdxError, setMdxError] = useState(false);

    useEffect(() => {
        if (!content || !content.trim()) {
            setMdxNode(null);
            setMdxError(false);
            return;
        }

        if (!hasJsx(content)) {
            setMdxNode(null);
            setMdxError(false);
            return;
        }

        let cancelled = false;
        setMdxLoading(true);
        setMdxError(false);

        evaluate(content, {
            Fragment,
            jsx,
            jsxs,
            useMDXComponents: () => {
                if (!onAction) return MDX_COMPONENTS;
                const wrapped: Record<string, React.ComponentType<any>> = {};
                for (const [name, comp] of Object.entries(MDX_COMPONENTS)) {
                    wrapped[name] = (props: any) =>
                        React.createElement(comp, { ...props, onAction });
                }
                return wrapped;
            },
        })
            .then((mod: { default: React.ComponentType }) => {
                if (cancelled) return;
                setMdxNode(React.createElement(mod.default));
                setMdxLoading(false);
            })
            .catch(() => {
                if (cancelled) return;
                setMdxError(true);
                setMdxLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [content, onAction]);

    if (!content) return null;

    if (!hasJsx(content)) {
        return renderMarkdown(content);
    }

    if (mdxLoading) {
        return <div className="text-sm">Processing…</div>;
    }

    if (mdxNode && !mdxError) {
        return (
            <Suspense fallback={<div className="text-sm">Loading…</div>}>
                {mdxNode}
            </Suspense>
        );
    }

    return renderMarkdown(content);
}

function renderMarkdown(content: string): React.ReactElement {
    return (
        <ReactMarkdown
            rehypePlugins={[rehypeRaw, rehypeHighlight]}
            components={{
                p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                ul: ({ node, ...props }) => <ul className="ml-4 list-disc mb-2" {...props} />,
                ol: ({ node, ...props }) => <ol className="ml-4 list-decimal mb-2" {...props} />,
                code: ({ node, inline, ...props }: any) =>
                    inline ? (
                        <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs" {...props} />
                    ) : (
                        <code className="block p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto" {...props} />
                    ),
            }}
        >
            {content}
        </ReactMarkdown>
    );
}

export function registerMessageComponent(name: string, component: React.ComponentType<any>) {
    MDX_COMPONENTS[name] = component;
}
