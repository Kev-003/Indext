import { Head, Link, usePage, router } from '@inertiajs/react';
import { ArrowRight, FolderKanban } from 'lucide-react';
import { useState } from 'react';
import PendingInvitationsModal from '@/components/pending-invitations-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { dashboard, workspace } from '@/routes';
import type { DashboardInvitation } from '@/types';

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

        if (!prompt.trim() || isSubmitting || !currentTeam) {
return;
}

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
            <Head title="Nomentra — Dashboard" />
            <PendingInvitationsModal
                invitations={pendingInvitations}
                open={pendingInvitations.length > 0 && showInvitations}
                onOpenChange={setShowInvitations}
            />

            <div className="flex h-full flex-1 flex-col justify-between p-6">
                <div className="space-y-6">
                    <div>
                        <h2 className="font-display text-2xl font-bold tracking-tight text-nm-ink">
                            Recent Brands
                        </h2>
                        <p className="text-muted-foreground">
                            Select a brand to resume editing, or start a new
                            direction below.
                        </p>
                    </div>

                    {recentBrands.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-4 rounded-md border border-dashed border-nm-grid bg-nm-paper p-8 text-center dark:bg-nm-paper-dark">
                            <FolderKanban className="h-10 w-10 text-nm-steel" />
                            <h3 className="font-display text-lg font-semibold text-nm-ink">
                                No brands configured
                            </h3>
                            <p className="max-w-xs text-sm text-muted-foreground">
                                You haven't created any brands for this team
                                yet. Use the prompt below to generate your first
                                brand.
                            </p>
                        </div>
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
                                        className="block"
                                    >
                                        <div className="group relative h-full rounded-md border border-nm-grid bg-nm-paper p-4 text-nm-ink transition-shadow hover:shadow-md dark:bg-nm-paper-dark">
                                            <div
                                                className="absolute top-0 left-0 h-2 w-2"
                                                style={{
                                                    backgroundColor:
                                                        'var(--nm-stage-discovery)',
                                                }}
                                            />
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="truncate font-display text-base font-semibold text-nm-ink">
                                                        {brand.name}
                                                    </h3>
                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                        {brand.industry ||
                                                            'General Industry'}
                                                    </p>
                                                    <p className="mt-1 text-xs font-medium text-nm-cyan uppercase dark:text-nm-cyan">
                                                        Status: {brand.status}
                                                    </p>
                                                    <p className="mt-2 text-xs text-nm-steel">
                                                        Updated{' '}
                                                        {brand.updated_at}
                                                    </p>
                                                </div>
                                                <ArrowRight className="h-4 w-4 shrink-0 text-nm-steel opacity-0 transition-opacity group-hover:opacity-100" />
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="mt-8 border-t border-nm-grid bg-nm-paper pt-6 dark:bg-nm-paper-dark">
                    <div className="mx-auto max-w-3xl space-y-4">
                        <div className="text-center">
                            <h3 className="font-display text-sm font-semibold text-nm-ink">
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

                                        if (formError) {
setFormError(null);
}
                                    }}
                                    placeholder="E.g., 'Open Acme Corp' or 'Create a brand for a tech startup'"
                                    disabled={isSubmitting || !currentTeam}
                                    className={`flex-1 border-nm-grid bg-nm-paper font-mono text-sm text-nm-ink focus:ring-nm-cyan dark:bg-nm-paper-dark ${
                                        displayError
                                            ? 'border-nm-magenta focus-visible:ring-nm-magenta'
                                            : ''
                                    }`}
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
                                    className="bg-nm-cyan text-white hover:bg-nm-cyan/90"
                                >
                                    {isSubmitting ? 'Redirecting...' : 'Go'}
                                </Button>
                            </div>
                            {!currentTeam && (
                                <p className="text-sm text-nm-amber">
                                    You need to be part of a team before you can
                                    create a brand.
                                </p>
                            )}
                            {displayError && (
                                <p
                                    id="prompt-error"
                                    className="text-sm text-nm-magenta"
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
