import { Head } from '@inertiajs/react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from '@inertiajs/react';
import { Save } from 'lucide-react';

interface LLMSettingsProps {
    methodology: string | null;
    provider: {
        api_key: string;
        model: string;
        base_url: string;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Settings',
        href: '/settings/profile',
    },
    {
        title: 'LLM Configuration',
        href: '/settings/llm',
    },
];

export default function LLMSettings({ methodology, provider }: LLMSettingsProps) {
    const { data, setData, put, processing, errors, recentlySuccessful } = useForm({
        llm_methodology: methodology || '',
        provider: {
            api_key: provider?.api_key || '',
            model: provider?.model || '',
            base_url: provider?.base_url || '',
        },
    });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        put('/settings/llm');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="LLM Configuration" />
            <div className="max-w-2xl mx-auto space-y-6">
                <div>
                    <h1 className="text-2xl font-bold">LLM Configuration</h1>
                    <p className="text-muted-foreground">
                        Configure your AI provider and branding methodology.
                    </p>
                </div>

                {recentlySuccessful && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-300">
                        Settings saved successfully.
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-lg font-medium">Provider Settings</h3>
                            <p className="text-sm text-muted-foreground">
                                These settings are read from your environment configuration. Contact your administrator to update API keys.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="provider.api_key">API Key</Label>
                            <Input
                                id="provider.api_key"
                                type="password"
                                value={data.provider.api_key}
                                onChange={(e) => setData('provider.api_key', e.target.value)}
                                placeholder="sk-..."
                                disabled
                            />
                            <p className="text-xs text-muted-foreground">
                                Managed via OPENAI_API_KEY environment variable.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="provider.model">Model</Label>
                            <Input
                                id="provider.model"
                                value={data.provider.model}
                                onChange={(e) => setData('provider.model', e.target.value)}
                                placeholder="gpt-4o-mini"
                                disabled
                            />
                            <p className="text-xs text-muted-foreground">
                                Managed via OPENAI_MODEL environment variable.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="provider.base_url">Base URL</Label>
                            <Input
                                id="provider.base_url"
                                value={data.provider.base_url}
                                onChange={(e) => setData('provider.base_url', e.target.value)}
                                placeholder="https://api.openai.com/v1"
                                disabled
                            />
                            <p className="text-xs text-muted-foreground">
                                Managed via OPENAI_BASE_URL environment variable. Use this for local LLMs like Ollama.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <h3 className="text-lg font-medium">Branding Methodology</h3>
                            <p className="text-sm text-muted-foreground">
                                Inject your professional branding expertise into the AI system prompt. This guides how the AI directs the brand development process.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="llm_methodology">Methodology Text</Label>
                            <Textarea
                                id="llm_methodology"
                                value={data.llm_methodology}
                                onChange={(e) => setData('llm_methodology', e.target.value)}
                                placeholder="Describe your branding methodology, design principles, color psychology rules, typography guidelines, etc. This will be injected into the AI system prompt."
                                className="min-h-[200px]"
                            />
                            {errors.llm_methodology && (
                                <p className="text-sm text-red-600 dark:text-red-400">
                                    {errors.llm_methodology}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button type="submit" disabled={processing}>
                            <Save className="h-4 w-4 mr-2" />
                            {processing ? 'Saving...' : 'Save Settings'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
