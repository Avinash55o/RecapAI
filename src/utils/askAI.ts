/**
 * askAI.ts
 * Sends a plain-text question to the configured AI provider and returns
 * the answer. Works with OpenAI, Gemini, and Anthropic.
 */

const SYSTEM_PROMPT =
    'You are an expert interview coaching assistant. ' +
    'Answer the interview question below clearly and concisely. ' +
    'Format code blocks with triple backticks. ' +
    'Keep the response focused and practical.';

export async function askAI(
    question: string,
    apiKey: string,
    provider: 'openai' | 'gemini' | 'anthropic' | string
): Promise<string> {
    if (!apiKey) return '⚠ No API key configured. Add one in ⚙ Settings.';

    try {
        if (provider === 'openai') {
            return await askOpenAI(question, apiKey);
        } else if (provider === 'gemini') {
            return await askGemini(question, apiKey);
        } else if (provider === 'anthropic') {
            return await askAnthropic(question, apiKey);
        }
        return '⚠ Unsupported AI provider in settings.';
    } catch (err: any) {
        console.error('[askAI] Error:', err);
        if (err?.message?.includes('401') || err?.message?.includes('403')) {
            return '⚠ API key is invalid or expired. Update it in ⚙ Settings.';
        }
        return `⚠ AI error: ${err?.message ?? String(err)}`;
    }
}

// ── OpenAI ─────────────────────────────────────────────────────────────────
async function askOpenAI(question: string, apiKey: string): Promise<string> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: question },
            ],
            max_tokens: 800,
            temperature: 0.3,
        }),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() ?? '(empty response)';
}

// ── Gemini ─────────────────────────────────────────────────────────────────
async function askGemini(question: string, apiKey: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{
                parts: [{ text: `${SYSTEM_PROMPT}\n\nQuestion: ${question}` }],
            }],
            generationConfig: { maxOutputTokens: 800, temperature: 0.3 },
        }),
    });
    if (!res.ok) throw new Error(`Gemini ${res.status}`);
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '(empty response)';
}

// ── Anthropic ──────────────────────────────────────────────────────────────
async function askAnthropic(question: string, apiKey: string): Promise<string> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 800,
            system: SYSTEM_PROMPT,
            messages: [{ role: 'user', content: question }],
        }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}`);
    const data = await res.json();
    return data.content?.[0]?.text?.trim() ?? '(empty response)';
}
