// electron/QALibraryHelper.ts
import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';

export interface QAEntry {
    id: string;
    question: string;
    aliases: string[];       // alternate phrasings (including Hindi/Hinglish)
    answer: string;
    tags: string[];
    language: 'en' | 'hi' | 'mixed';
    createdAt: string;
    updatedAt: string;
}

export interface QASearchResult {
    entry: QAEntry;
    score: number;           // 0–1, higher = better match
}

// ── Common Hindi question-starter words for normalisation ──────────────────
const HINDI_QUESTION_STARTERS = [
    'kya', 'kaun', 'kaise', 'kab', 'kahan', 'kyun', 'kitna', 'kitne', 'kitni',
    'bataiye', 'batao', 'batana', 'samjhao', 'samjhaiye', 'bolo', 'bol',
    'aap', 'apna', 'apni', 'apne', 'mujhe', 'hum', 'tumhara', 'tumhari',
];

// ── Simple stopword list (English + Hindi) ────────────────────────────────
const STOPWORDS = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall', 'should',
    'may', 'might', 'must', 'can', 'could', 'of', 'in', 'on', 'at', 'to', 'for',
    'with', 'about', 'as', 'me', 'my', 'i', 'you', 'your', 'we', 'our', 'they', 'their',
    'it', 'its', 'this', 'that', 'these', 'those', 'what', 'which', 'who', 'how', 'when',
    'where', 'why', 'tell', 'describe',
    ...HINDI_QUESTION_STARTERS,
]);

function generateId(): string {
    return `qa_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function getLibraryPath(): string {
    try {
        return path.join(app.getPath('userData'), 'qa-library.json');
    } catch {
        return path.join(process.cwd(), 'qa-library.json');
    }
}

// ── Normalise a query to a clean comparable string ─────────────────────────
export function normaliseQuery(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')   // remove punctuation
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .filter(w => w.length > 1 && !STOPWORDS.has(w))
        .join(' ');
}

// ── Simple token-overlap similarity (0–1) ─────────────────────────────────
function tokenSimilarity(a: string, b: string): number {
    const tokA = new Set(a.split(' ').filter(Boolean));
    const tokB = new Set(b.split(' ').filter(Boolean));
    if (tokA.size === 0 || tokB.size === 0) return 0;
    let overlap = 0;
    tokA.forEach(t => { if (tokB.has(t)) overlap++; });
    return overlap / Math.max(tokA.size, tokB.size);
}

// ── Bigram-based fuzzy matching ───────────────────────────────────────────
function bigramSimilarity(a: string, b: string): number {
    const bigrams = (s: string) => {
        const arr: string[] = [];
        for (let i = 0; i < s.length - 1; i++) arr.push(s.slice(i, i + 2));
        return arr;
    };
    const bA = bigrams(a);
    const bB = new Set(bigrams(b));
    if (bA.length === 0 || bB.size === 0) return 0;
    const matches = bA.filter(b => bB.has(b)).length;
    return (2 * matches) / (bA.length + bB.size);
}

function computeScore(query: string, candidate: string): number {
    const nq = normaliseQuery(query);
    const nc = normaliseQuery(candidate);

    // prevent empty strings from matching
    if (!nq || !nc) return 0;
    // Exact match shortcut
    if (nq === nc) return 1.0;
    // Substring containment
    if (nc.includes(nq) || nq.includes(nc)) return 0.92;
    // Weighted combo: token overlap (70%) + bigram (30%)
    const tok = tokenSimilarity(nq, nc);
    const big = bigramSimilarity(nq, nc);
    return tok * 0.7 + big * 0.3;
}

// ══════════════════════════════════════════════════════════════════════════════
class QALibraryHelper {
    private libraryPath: string;

    constructor() {
        this.libraryPath = getLibraryPath();
    }

    // ── CRUD ─────────────────────────────────────────────────────────────────

    loadQALibrary(): QAEntry[] {
        try {
            if (fs.existsSync(this.libraryPath)) {
                const raw = fs.readFileSync(this.libraryPath, 'utf8');
                return JSON.parse(raw) as QAEntry[];
            }
        } catch (err) {
            console.error('[QALibrary] Failed to load:', err);
        }
        return [];
    }

    private saveLibrary(entries: QAEntry[]): void {
        try {
            const dir = path.dirname(this.libraryPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(this.libraryPath, JSON.stringify(entries, null, 2));
        } catch (err) {
            console.error('[QALibrary] Failed to save:', err);
        }
    }

    saveQAEntry(entry: Omit<QAEntry, 'id' | 'createdAt' | 'updatedAt'>): QAEntry {
        const entries = this.loadQALibrary();
        const newEntry: QAEntry = {
            ...entry,
            id: generateId(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        entries.push(newEntry);
        this.saveLibrary(entries);
        return newEntry;
    }

    updateQAEntry(id: string, updates: Partial<Omit<QAEntry, 'id' | 'createdAt'>>): QAEntry | null {
        const entries = this.loadQALibrary();
        const idx = entries.findIndex(e => e.id === id);
        if (idx === -1) return null;
        entries[idx] = { ...entries[idx], ...updates, updatedAt: new Date().toISOString() };
        this.saveLibrary(entries);
        return entries[idx];
    }

    deleteQAEntry(id: string): boolean {
        const entries = this.loadQALibrary();
        const next = entries.filter(e => e.id !== id);
        if (next.length === entries.length) return false;
        this.saveLibrary(next);
        return true;
    }

    // ── Search ────────────────────────────────────────────────────────────────

    /**
     * Search the library for the best matching entry.
     * Returns the top result or null when nothing scores above 0.35.
     */
    fuzzySearch(query: string): QASearchResult | null {
        const entries = this.loadQALibrary();
        if (entries.length === 0) return null;

        let best: QASearchResult | null = null;

        for (const entry of entries) {
            // Check primary question + all aliases
            const candidates = [entry.question, ...entry.aliases];
            let topScore = 0;
            for (const c of candidates) {
                const s = computeScore(query, c);
                if (s > topScore) topScore = s;
            }
            if (topScore > (best?.score ?? 0)) {
                best = { entry, score: topScore };
            }
        }

        // Minimum relevance threshold
        if (!best || best.score < 0.35) return null;
        return best;
    }
}

export const qaLibraryHelper = new QALibraryHelper();
