// @no-react-compiler
import { useCallback, useEffect, useRef, useState } from 'react';
import type {
    RefineOptions,
    RefineResult,
    RefineRequest,
    RefineResponse,
    ErrorResponse,
} from '@/lib/sketch-engine-types';
import SketchEngineWorkerUrl from '@/lib/sketch-engine.worker?worker&url';
export interface SketchRefinerState {
    result: RefineResult | null;
    isLoading: boolean;
    error: string | null;
    workerReady: boolean;
}

let workerPromise: Promise<Worker> | null = null;

// Vite serves assets from a different origin/port in dev (e.g. 127.0.0.1:5173
// vs the app's 127.0.0.1:8000). Worker() requires its script URL to be
// same-origin (or blob:/data:) — there is no CORS opt-in for the worker's
// own top-level script, only for imports made from inside it. Fetching the
// (already Vite-transformed) source and constructing the worker from a
// blob: URL sidesteps this; blob: URLs are always same-origin to the
// document that created them. Production doesn't need this since built
// assets share the app's own origin.
async function createWorkerFromUrl(url: string | URL, options?: WorkerOptions): Promise<Worker> {
    if (import.meta.env.DEV) {
        const response = await fetch(url);
        let code = await response.text();

        // Vite serves worker modules with path-relative import URLs
        // (e.g. import("/rust/...")). Inside a blob worker, those resolve
        // against the document origin (port 8000) instead of Vite's dev
        // server (port 5173). Rewrite them to absolute URLs so the worker
        // can fetch its dependencies from the correct server.
        const viteOrigin = new URL(typeof url === 'string' ? url : url.href).origin;
        code = code.replace(
            /(["'])(\/[^"']*)\1/g,
            (_, quote, path) => `${quote}${viteOrigin}${path}${quote}`,
        );

        const blob = new Blob([code], { type: 'application/javascript' });
        const blobUrl = URL.createObjectURL(blob);
        const worker = new Worker(blobUrl, options);
        URL.revokeObjectURL(blobUrl); // safe once the worker holds its own reference

        return worker;
    }

    return new Worker(url, options);
}

function getWorker(): Promise<Worker> {
    if (typeof Worker === 'undefined' || typeof window === 'undefined') {
        return Promise.reject(new Error('Workers not available in this environment'));
    }

    if (!workerPromise) {
        workerPromise = createWorkerFromUrl(SketchEngineWorkerUrl, { type: 'module' })
            .then((worker) => {
                return new Promise<Worker>((resolve, reject) => {
                    let settled = false;

                    worker.onmessage = (event: MessageEvent) => {
                        const msg = event.data as { type?: string; id?: string; error?: string };

                        if (msg.type === 'ready' && !settled) {
                            settled = true;
                            resolve(worker);
                        } else if (msg.type === 'error' && !settled) {
                            settled = true;
                            reject(new Error(msg.error || 'Worker reported initialization error'));
                        }
                    };

                    worker.onerror = (err) => {
                        if (!settled) {
                            settled = true;
                            reject(new Error(err.message || 'Worker error'));
                        }
                    };

                    setTimeout(() => {
                        if (!settled) {
                            settled = true;
                            reject(new Error('Worker initialization timeout'));
                        }
                    }, 5000);
                });
            })
            .catch((err) => {
                workerPromise = null;

                throw err;
            });
    }

    return workerPromise;
}

export function useSketchRefiner() {
    const [result, setResult] = useState<RefineResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [workerReady, setWorkerReady] = useState(false);
    const pendingRequests = useRef<Map<string, {
        resolve: (value: RefineResult) => void;
        reject: (reason: Error) => void;
        timeout: ReturnType<typeof setTimeout>;
    }>>(new Map());
    const cancelledRef = useRef(false);

    useEffect(() => {
        cancelledRef.current = false;

        getWorker()
            .then((w) => {
                if (cancelledRef.current) {
                    return;
                }

                w.onmessage = (event: MessageEvent) => {
                    const msg = event.data as RefineResponse | ErrorResponse;

                    if ('type' in msg && msg.type === 'ready') {
                        return;
                    }

                    const pending = pendingRequests.current.get(msg.id);

                    if (!pending) {
                        return;
                    }

                    clearTimeout(pending.timeout);
                    pendingRequests.current.delete(msg.id);

                    if ('error' in msg) {
                        pending.reject(new Error(msg.error));
                    } else {
                        if (msg.result === null || msg.result === undefined) {
                            pending.reject(new Error(
                                'WASM returned null result — the refinement engine encountered an internal error',
                            ));
                        } else {
                            pending.resolve(msg.result);
                        }
                    }
                };

                w.onerror = (err) => {
                    if (cancelledRef.current) {
                        return;
                    }

                    const msg = err.message || 'Worker error';
                    setError(msg);
                    const errorObj = new Error(msg);
                    pendingRequests.current.forEach((p, key) => {
                        clearTimeout(p.timeout);
                        pendingRequests.current.delete(key);
                        p.reject(errorObj);
                    });
                };

                setWorkerReady(true);
            })
            .catch((err: Error) => {
                if (cancelledRef.current) {
                    return;
                }

                const msg = err instanceof Error ? err.message : String(err);
                setError(`Failed to initialize worker: ${msg}`);
            });

        return () => {
            cancelledRef.current = true;
        };
    }, []);

    const refine = useCallback(
        async (
            flatPoints: Float64Array | number[],
            stride: number = 2,
            options?: RefineOptions,
        ): Promise<RefineResult> => {
            if (!workerReady) {
                await new Promise<void>((resolve, reject) => {
                    const check = () => {
                        if (cancelledRef.current) {
                            reject(new Error('Component unmounted'));

                            return;
                        }

                        if (workerReady) {
                            resolve();
                        } else if (error) {
                            reject(new Error(error));
                        } else {
                            setTimeout(check, 100);
                        }
                    };
                    check();
                });
            }

            setIsLoading(true);
            setError(null);

            const worker = await getWorker();
            const id = crypto.randomUUID();

            const request: RefineRequest = {
                id,
                action: 'refine',
                stride,
                options: options || {},
                points: flatPoints instanceof Float64Array ? flatPoints : new Float64Array(flatPoints),
            };

            return new Promise<RefineResult>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    pendingRequests.current.delete(id);
                    reject(new Error(
                        'Refinement timed out after 10 seconds. The WASM engine may have crashed or hung.',
                    ));
                }, 10000);

                pendingRequests.current.set(id, { resolve, reject, timeout });

                try {
                    worker.postMessage(request, [request.points.buffer]);
                } catch (e) {
                    clearTimeout(timeout);
                    pendingRequests.current.delete(id);
                    const err = e instanceof Error ? e : new Error(String(e));
                    reject(new Error(`Failed to send message to worker: ${err.message}`));
                }
            })
                .then((res) => {
                    setResult(res);

                    return res;
                })
                .catch((err) => {
                    const msg = err instanceof Error ? err.message : String(err);
                    const wrapped = err instanceof Error ? err : new Error(msg);
                    setError(msg);

                    throw wrapped;
                })
                .finally(() => {
                    setIsLoading(false);
                });
        },
        [workerReady, error],
    );

    const reset = useCallback(() => {
        setResult(null);
        setError(null);
    }, []);

    return { result, isLoading, error, workerReady, refine, reset };
}