// src/utils/localWhisper.ts
// Runs OpenAI Whisper Small entirely offline using @xenova/transformers (WASM).
// The model (~460 MB) is downloaded from HuggingFace on first use and cached
// in the browser's Cache API — subsequent loads are instant.

import { pipeline, env } from '@xenova/transformers';

// ── onfig ──────────────────────────────────────────────────────────────────
// Use the HuggingFace CDN for model weights; cache in browser Cache API.
env.allowLocalModels = false;
env.useBrowserCache = true;

const MODEL_ID = 'Xenova/whisper-base';

// ── Types ──────────────────────────────────────────────────────────────────
export type WhisperStatus =
    | { status: 'idle' }
    | { status: 'loading'; progress: number; file: string }
    | { status: 'ready' }
    | { status: 'transcribing' }
    | { status: 'error'; error: string };

export type WhisperProgressCallback = (s: WhisperStatus) => void;

// ── Singleton ───────────────────────────────────────────────────────────────
let _pipeline: any = null;
let _loadPromise: Promise<void> | null = null;

/**
 * Pre-download / load the Whisper Small model.
 * Safe to call multiple times — only downloads/loads once.
 */
export async function initLocalWhisper(
    onProgress?: WhisperProgressCallback
): Promise<void> {
    if (_pipeline) {
        onProgress?.({ status: 'ready' });
        return;
    }
    if (_loadPromise) return _loadPromise;

    _loadPromise = (async () => {
        try {
            onProgress?.({ status: 'loading', progress: 0, file: 'model' });
            _pipeline = await pipeline(
                'automatic-speech-recognition',
                MODEL_ID,
                {
                    dtype: 'q8', // 8-bit quantization for much faster CPU inference
                    progress_callback: (info: any) => {
                        if (info.status === 'progress') {
                            onProgress?.({
                                status: 'loading',
                                progress: Math.round(info.progress ?? 0),
                                file: info.file ?? 'model',
                            });
                        }
                    },
                } as any  // dtype is valid at runtime but missing from older @xenova types
            );
            onProgress?.({ status: 'ready' });
        } catch (err: any) {
            onProgress?.({ status: 'error', error: err?.message ?? String(err) });
            _loadPromise = null;
            throw err;
        }
    })();

    return _loadPromise;
}

/** Returns true once the model is in memory and ready to transcribe. */
export function isLocalWhisperReady(): boolean {
    return !!_pipeline;
}

/**
 * Transcribe an audio Blob using the local Whisper Small model.
 *
 * @param audioBlob    Raw MediaRecorder output (webm/ogg with audio)
 * @param languageHint ISO-639-1 code ('en', 'hi', …) or undefined for auto-detect
 * @returns            Transcript string, empty on failure
 */
export async function transcribeLocal(
    audioBlob: Blob,
    languageHint?: string
): Promise<string> {
    if (!_pipeline) {
        throw new Error(
            'Local Whisper is not ready. Call initLocalWhisper() first.'
        );
    }

    // ── 1. Decode the compressed audio blob into PCM ──────────────────────
    const arrayBuf = await audioBlob.arrayBuffer();
    const audioCtx = new AudioContext({ sampleRate: 16_000 }); // Whisper wants 16 kHz
    let decoded: AudioBuffer;
    try {
        decoded = await audioCtx.decodeAudioData(arrayBuf);
    } catch {
        // Some browsers refuse to decode very short clips — return empty
        console.warn('[localWhisper] Could not decode audio blob, skipping');
        return '';
    } finally {
        audioCtx.close();
    }

    // ── 2. Flatten to mono Float32 ───────────────────────────────────────
    // If multi-channel, average the channels
    let samples: Float32Array;
    if (decoded.numberOfChannels === 1) {
        samples = decoded.getChannelData(0);
    } else {
        samples = new Float32Array(decoded.length);
        for (let c = 0; c < decoded.numberOfChannels; c++) {
            const ch = decoded.getChannelData(c);
            for (let i = 0; i < ch.length; i++) samples[i] += ch[i];
        }
        const n = decoded.numberOfChannels;
        for (let i = 0; i < samples.length; i++) samples[i] /= n;
    }

    // ── 3. Silence gate — skip if clip is too quiet ──────────────────────
    let rms = 0;
    for (const v of samples) rms += v * v;
    rms = Math.sqrt(rms / samples.length);
    if (rms < 0.005) return '';   // pure silence / very quiet noise

    // ── 4. Run inference ─────────────────────────────────────────────────
    const options: Record<string, any> = {
        return_timestamps: false,
        chunk_length_s: 30,
        stride_length_s: 5,
        num_beams: 1, // Greedy search - much faster than beam search
    };
    // language: null → auto-detect; named code → forced
    if (languageHint && languageHint !== 'auto') {
        options.language = languageHint;
    }

    try {
        const result = await _pipeline(samples, options);
        return (result?.text as string ?? '').trim();
    } catch (err) {
        console.error('[localWhisper] Inference error:', err);
        return '';
    }
}
