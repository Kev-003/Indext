import type { RefineRequest, RefineResponse, ErrorResponse } from '@/lib/sketch-engine-types';

type WasmModule = Awaited<ReturnType<typeof loadWASM>>;
let wasmModule: WasmModule | null = null;

async function loadWASM() {
    const mod = await import('@wasm/sketch_engine');
    wasmModule = mod;

    return mod;
}

self.onmessage = async (event: MessageEvent) => {
    const msg = event.data as RefineRequest;

    if (msg.action === 'refine') {
        try {
            if (!wasmModule) {
                const mod = await loadWASM();

                if (!mod.default || !mod.refine_sketch_js) {
                    throw new Error('WASM module loaded but missing exports');
                }

                await mod.default();
            }

            if (!wasmModule || !wasmModule.refine_sketch_js) {
                throw new Error('WASM module not initialized');
            }

            const opts = msg.options || {};
            const optsValue = {
                epsilon: opts.epsilon ?? 2.0,
                angle_threshold_deg: opts.angle_threshold_deg ?? 30.0,
                fit_tolerance: opts.fit_tolerance ?? 1.5,
                snap_tolerance: opts.snap_tolerance ?? 3.0,
                min_segment_length: opts.min_segment_length ?? 2.0,
            };

            const optsJs = JSON.parse(JSON.stringify(optsValue));

            try {
                const result = wasmModule.refine_sketch_js(
                    msg.points,
                    msg.stride,
                    optsJs,
                );

                if (result === null || result === undefined) {
                    throw new Error(
                        'refine_sketch_js returned null/undefined — ' +
                        'serde_wasm_bindgen serialization likely failed (NaN/Infinity or unsupported types)',
                    );
                }

                const response: RefineResponse = {
                    id: msg.id,
                    action: 'refine',
                    result: result as any,
                };

                self.postMessage(response);
            } catch (wasmErr) {
                const detail = wasmErr instanceof Error ? wasmErr.message : String(wasmErr);

                throw new Error(`WASM execution error: ${detail}`);
            }
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e);
            console.error('[sketch-engine-worker] Refinement error:', e);
            const errorResponse: ErrorResponse = {
                id: msg.id,
                action: 'refine',
                error: errorMsg,
            };
            self.postMessage(errorResponse);
        }
    }
};

// Load WASM eagerly and signal readiness only after successful load
loadWASM()
    .then((mod) => {
        if (!mod.default || !mod.refine_sketch_js) {
            throw new Error('WASM module loaded but missing exports (default init or refine_sketch_js)');
        }

        return mod.default();
    })
    .then(() => {
        self.postMessage({ type: 'ready' });
    })
    .catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[sketch-engine-worker] Failed to initialize WASM:', msg);
        self.postMessage({ type: 'error', error: msg });
    });
