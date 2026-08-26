import { createInertiaApp } from '@inertiajs/react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { registerMessageComponent } from '@/components/message-content';
import { ComponentRegistry } from '@/components/dynamic/registry';
import { Suspense, lazy } from 'react';

const LazyMindMapCanvas = lazy(() =>
    import('@/components/dynamic/tools/placeholder-tools').then((m) => ({ default: m.MindMapCanvas })),
);

function PreloadComponents() {
    Object.entries(ComponentRegistry).forEach(([name, Component]) => {
        registerMessageComponent(name, (props: any) => (
            <Suspense fallback={null}>
                <Component {...props} />
            </Suspense>
        ));
    });

    registerMessageComponent('MindMap', (props: any) => (
        <Suspense fallback={null}>
            <LazyMindMapCanvas {...props} />
        </Suspense>
    ));

    return null;
}

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    layout: (name) => {
        switch (true) {
            case name === 'welcome':
                return null;
            case name.startsWith('auth/'):
                return AuthLayout;
            case name.startsWith('settings/'):
            case name.startsWith('teams/'):
                return [AppLayout, SettingsLayout];
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <>
                <PreloadComponents />
                <TooltipProvider delayDuration={0}>
                    {app}
                    <Toaster />
                </TooltipProvider>
            </>
        );
    },
    progress: {
        color: '#4B5563',
    },
});

initializeTheme();
