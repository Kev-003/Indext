import { Head, Link, usePage, router } from '@inertiajs/react';
import { useState } from 'react';
import PendingInvitationsModal from '@/components/pending-invitations-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { dashboard, workspace } from '@/routes';
import type { DashboardInvitation } from '@/types';
import { ArrowRight, FolderKanban, Plus } from 'lucide-react';

interface Brand {
    id: number;
    name: string;
    industry?: string;
    status: string;
    updated_at: string;
}

type Props = {
    pendingInvitations?: DashboardInvitation[];
    recentBrands?: Brand[];
    errors?: Record<string, string>;
};

export default function Dashboard({
    pendingInvitations = [],
    recentBrands = [],
    errors = {},
}: Props) {
    const page = usePage();
    const currentTeam = page.props.currentTeam;
    const [prompt, setPrompt] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const [showInvitations, setShowInvitations] = useState(
        pendingInvitations.length > 0,
    );

    const handlePromptSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() || isSubmitting || !currentTeam) return;

        setIsSubmitting(true);
        setFormError(null);

        router.post(
            `/${currentTeam.slug}/brands`,
            { prompt: prompt.trim() },
            {
                onSuccess: () => {
                    setPrompt('');
                },
                onError: (err) => {
                    const message =
                        typeof err === 'string'
                            ? err
                            : (err.prompt ??
                              'Something went wrong. Please try again.');
                    setFormError(message);
                },
                onFinish: () => {
                    setIsSubmitting(false);
                },
            },
        );
    };

    const displayError = formError || errors.prompt;

    return (
        <>
            <Head title="Dashboard" />
            <PendingInvitationsModal
                invitations={pendingInvitations}
                open={pendingInvitations.length > 0 && showInvitations}
                onOpenChange={setShowInvitations}
            />

            <div className="flex h-full flex-1 flex-col justify-between p-6">
                {/* Upper Section: Recent Brands Grid */}
                <div className="space-y-6">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">
                            Recent Brands
                        </h2>
                        <p className="text-muted-foreground">
                            Select a brand to resume editing, or start a new
                            direction below.
                        </p>
                    </div>

                    {recentBrands.length === 0 ? (
                        <Card className="flex flex-col items-center justify-center border-dashed bg-gray-50/50 p-8 text-center dark:bg-gray-900/50">
                            <FolderKanban className="mb-4 h-10 w-10 text-muted-foreground" />
                            <CardTitle className="mb-1 text-lg">
                                No brands configured
                            </CardTitle>
                            <CardDescription className="mb-4 max-w-xs">
                                You haven't created any brands for this team
                                yet. Use the prompt below to generate your first
                                brand.
                            </CardDescription>
                        </Card>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {recentBrands.map((brand) => {
                                const workspaceUrl = currentTeam
                                    ? workspace(currentTeam.slug, {
                                          query: { brand: brand.id },
                                      })
                                    : '#';

                                return (
                                    <Link
                                        key={brand.id}
                                        href={workspaceUrl}
                                        className="block transition duration-200 hover:-translate-y-0.5"
                                    >
                                        <Card className="h-full border border-gray-200 bg-white hover:shadow-md dark:border-gray-800 dark:bg-gray-950">
                                            <CardHeader className="p-4 pb-2">
                                                <CardTitle className="flex items-center justify-between text-base">
                                                    {brand.name}
                                                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                                                </CardTitle>
                                                <CardDescription className="text-xs font-semibold text-blue-600 uppercase dark:text-blue-400">
                                                    Status: {brand.status}
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent className="flex items-end justify-between p-4 pt-0 text-sm text-muted-foreground">
                                                <span>
                                                    {brand.industry ||
                                                        'General Industry'}
                                                </span>
                                                <span className="text-xs text-gray-400">
                                                    Updated {brand.updated_at}
                                                </span>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Bottom Section: Intelligent AI Dispatch Input */}
                <div className="mt-8 border-t bg-white pt-6 dark:bg-zinc-950/20">
                    <div className="mx-auto max-w-3xl space-y-4">
                        <div className="text-center">
                            <h3 className="text-sm font-semibold">
                                Start or Resume Brand
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Type a new concept to initialize a project, or
                                enter an existing brand name to retrieve it.
                            </p>
                        </div>
                        <form
                            onSubmit={handlePromptSubmit}
                            className="flex flex-col gap-2"
                        >
                            <div className="flex gap-2">
                                <Input
                                    value={prompt}
                                    onChange={(e) => {
                                        setPrompt(e.target.value);
                                        if (formError) setFormError(null);
                                    }}
                                    placeholder="E.g., 'Open Acme Corp' or 'Create a brand for a tech startup'"
                                    disabled={isSubmitting || !currentTeam}
                                    className={`flex-1 shadow-sm ${displayError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                    aria-describedby={
                                        displayError
                                            ? 'prompt-error'
                                            : undefined
                                    }
                                />
                                <Button
                                    type="submit"
                                    disabled={
                                        isSubmitting ||
                                        !prompt.trim() ||
                                        !currentTeam
                                    }
                                >
                                    {isSubmitting ? 'Redirecting...' : 'Go'}
                                </Button>
                            </div>
                            {!currentTeam && (
                                <p className="text-sm text-amber-600 dark:text-amber-400">
                                    You need to be part of a team before you can
                                    create a brand.
                                </p>
                            )}
                            {displayError && (
                                <p
                                    id="prompt-error"
                                    className="text-sm text-red-600 dark:text-red-400"
                                >
                                    {displayError}
                                </p>
                            )}
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
}

Dashboard.layout = (props: { currentTeam?: { slug: string } | null }) => ({
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: props.currentTeam ? dashboard(props.currentTeam.slug) : '/',
        },
    ],
});
