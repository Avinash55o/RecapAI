// src/utils/qaMatch.ts
// Renderer-side Q&A match helper — calls the Electron IPC bridge.

export interface QAMatchResult {
    found: boolean;
    answer?: string;
    question?: string;
    confidence?: number;
    source: 'local' | 'ai';
    /** true when 0.50–0.80 confidence — suggest AI can improve */
    canImprove?: boolean;
}

/**
 * Search the personal Q&A library for the question.
 * Returns a structured result indicating whether to use the local answer or fall through to AI.
 */
export async function qaMatch(question: string): Promise<QAMatchResult> {
    try {
        const result = await window.electronAPI.qaSearch(question);

        if (!result) {
            return { found: false, source: 'ai' };
        }

        const { entry, score } = result;

        if (score >= 0.80) {
            // High confidence → use local answer directly
            return {
                found: true,
                answer: entry.answer,
                question: entry.question,
                confidence: score,
                source: 'local',
                canImprove: false,
            };
        }

        if (score >= 0.50) {
            // Medium confidence → return local but flag that AI may improve it
            return {
                found: true,
                answer: entry.answer,
                question: entry.question,
                confidence: score,
                source: 'local',
                canImprove: true,
            };
        }

        // Below threshold → fall through to AI
        return { found: false, source: 'ai' };
    } catch (err) {
        console.error('[qaMatch] IPC error:', err);
        return { found: false, source: 'ai' };
    }
}
