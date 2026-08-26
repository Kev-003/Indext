import inertia from '@inertiajs/vite';
import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { bunny } from 'laravel-vite-plugin/fonts';
import { defineConfig, type Plugin } from 'vite';

function webWorkerShim(): Plugin {
    return {
        name: 'web-worker-shim',
        resolveId(source: string) {
            if (source === 'web-worker') {
                return '\0virtual:web-worker-shim';
            }
            return null;
        },
        load(id: string) {
            if (id === '\0virtual:web-worker-shim') {
                return `export default typeof Worker !== 'undefined' ? Worker : class _Worker {
                    constructor(url) { this.url = String(url); }
                    postMessage() {}
                    terminate() {}
                    addEventListener() {}
                    removeEventListener() {}
                    dispatchEvent() { return false; }
                };`;
            }
            return null;
        },
    };
}

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            refresh: true,
            fonts: [
                bunny('Instrument Sans', {
                    weights: [400, 500, 600],
                }),
                bunny('Space Grotesk', {
                    weights: [400, 500, 600, 700],
                }),
                bunny('JetBrains Mono', {
                    weights: [400, 500, 600],
                }),
            ],
        }),
        inertia(),
        react({
            babel: {
                plugins: ['babel-plugin-react-compiler'],
            }
        }),
        tailwindcss(),
        wayfinder({
            formVariants: true,
        }),
         webWorkerShim(),
    ],
});
