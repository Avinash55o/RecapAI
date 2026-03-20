// src/utils/audioTranscribe.ts
// Unified transcription helper — routes between:
//   'groq'   → Groq Whisper Large v3 Turbo (fastest, best accuracy, free tier)
//   'openai' → OpenAI Whisper-1 cloud API
//   'local'  → Whisper Base WASM (offline, no key needed)

import { transcribeLocal, initLocalWhisper, isLocalWhisperReady } from './localWhisper';

export type TranscriptionEngine = 'groq' | 'openai' | 'local';

// ── Groq Whisper API ─────────────────────────────────────────────────────────

/**
 * Transcribe using Groq's Whisper Large v3 Turbo API.
 * Groq uses LPUs, so a 30-second clip typically returns in ~0.3 seconds.
 * Free tier: ~28 hours/day of audio.
 * Get a free key at: https://console.groq.com/keys
 */
async function transcribeViaGroq(
    audioBlob: Blob,
    languageHint: string | undefined,
    groqApiKey: string
): Promise<string> {
    try {
        const formData = new FormData();
        // Groq requires a filename with an extension
        formData.append('file', audioBlob, 'audio.webm');
        formData.append('model', 'whisper-large-v3-turbo');
        formData.append('response_format', 'json');
        if (languageHint && languageHint !== 'auto') {
            formData.append('language', languageHint);
        }

        const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${groqApiKey}` },
            body: formData,
        });

        if (!response.ok) {
            const err = await response.text();
            console.error('[audioTranscribe] Groq Whisper error:', err);
            return '';
        }
        const data = await response.json();
        return (data.text as string) || '';
    } catch (err) {
        console.error('[audioTranscribe] Groq network error:', err);
        return '';
    }
}

// ── OpenAI Whisper API ───────────────────────────────────────────────────────

/**
 * Transcribe using the OpenAI Whisper-1 API (requires OpenAI API key).
 */
async function transcribeViaOpenAI(
    audioBlob: Blob,
    languageHint: string | undefined,
    apiKey: string
): Promise<string> {
    try {
        const formData = new FormData();
        formData.append('file', audioBlob, 'audio.webm');
        formData.append('model', 'whisper-1');
        if (languageHint && languageHint !== 'auto') {
            formData.append('language', languageHint);
        }
        formData.append('response_format', 'json');

        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}` },
            body: formData,
        });

        if (!response.ok) {
            console.error('[audioTranscribe] OpenAI Whisper error:', await response.text());
            return '';
        }
        const data = await response.json();
        return (data.text as string) || '';
    } catch (err) {
        console.error('[audioTranscribe] OpenAI network error:', err);
        return '';
    }
}

// ── Unified entry point ──────────────────────────────────────────────────────

/**
 * Transcribe an audio Blob using the configured engine.
 *
 * @param audioBlob    MediaRecorder output (webm/ogg)
 * @param languageHint BCP-47 code ('en', 'hi', …) or 'auto'/undefined
 * @param apiKey       OpenAI API key (used when engine === 'openai')
 * @param engine       Which transcription backend to use
 * @param groqApiKey   Groq API key (used when engine === 'groq')
 */
export async function transcribeAudio(
    audioBlob: Blob,
    languageHint: string | undefined,
    apiKey: string,
    engine: TranscriptionEngine = 'groq',
    groqApiKey?: string
): Promise<string> {

    // ── Groq ──────────────────────────────────────────────────────────────
    if (engine === 'groq') {
        if (!groqApiKey) {
            console.warn('[audioTranscribe] No Groq API key — falling back to local Whisper');
            // Graceful fallback to local if no key set yet
            return runLocal(audioBlob, languageHint, apiKey);
        }
        return transcribeViaGroq(audioBlob, languageHint, groqApiKey);
    }

    // ── OpenAI ────────────────────────────────────────────────────────────
    if (engine === 'openai') {
        if (!apiKey) {
            console.warn('[audioTranscribe] No OpenAI API key for Whisper');
            return '';
        }
        return transcribeViaOpenAI(audioBlob, languageHint, apiKey);
    }

    // ── Local (default) ───────────────────────────────────────────────────
    return runLocal(audioBlob, languageHint, apiKey);
}

async function runLocal(
    audioBlob: Blob,
    languageHint: string | undefined,
    apiKey: string
): Promise<string> {
    if (!isLocalWhisperReady()) {
        try {
            await initLocalWhisper();
        } catch (err) {
            console.error('[audioTranscribe] Local Whisper init failed, falling back to OpenAI:', err);
            if (apiKey) return transcribeViaOpenAI(audioBlob, languageHint, apiKey);
            return '';
        }
    }
    return transcribeLocal(audioBlob, languageHint);
}

// ── Question detection heuristics ────────────────────────────────────────────
const QUESTION_STARTERS_EN = [
    'tell me', 'describe', 'explain', 'what is', 'what are', 'how do',
    'how would', 'why do', 'why is', 'can you', 'could you', 'would you',
    'walk me through', 'have you ever', 'give me an example',
];

const QUESTION_STARTERS_HI = [
    'bataiye', 'batao', 'samjhao', 'samjhaiye', 'kya hai', 'kya hain',
    'kaise', 'kyun', 'kab', 'kaun', 'aapne kabhi', 'ek example do',
    'aapka', 'apne baare', 'apne experience',
];

/** Heuristically decide whether a transcript text is a question. */
export function isQuestion(text: string): boolean {
    if (!text || text.trim().length < 5) return false;
    const lower = text.toLowerCase().trim();
    if (lower.endsWith('?')) return true;
    for (const s of [...QUESTION_STARTERS_EN, ...QUESTION_STARTERS_HI]) {
        if (lower.startsWith(s) || lower.includes(` ${s} `)) return true;
    }
    return false;
}
