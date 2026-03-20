import React, { useRef, useEffect } from 'react';
import { RotateCcw, Zap, ImageIcon, Mic } from 'lucide-react';

export interface AnswerResult {
  question: string;
  answer: string;
  source: 'local' | 'ai';
  confidence?: number;
  canImprove?: boolean;
}

export interface ScreenshotPreview {
  path: string;
  preview: string;
}

interface AnswerPanelProps {
  // Audio / transcript mode
  transcript: string;
  onTranscriptEdit: (text: string) => void;
  isListening: boolean;
  isPaused: boolean;
  onSolveAudio: () => void;
  isSolvingAudio: boolean;

  // Screenshot mode
  screenshots: ScreenshotPreview[];
  onSolveScreenshots: () => void;
  isSolvingScreenshots: boolean;

  // Answer result (both modes)
  result: AnswerResult | null;
  onStartOver: () => void;

  transcriptionEngine: 'groq' | 'openai' | 'local';
}

export function AnswerPanel({
  transcript,
  onTranscriptEdit,
  isListening,
  isPaused,
  onSolveAudio,
  isSolvingAudio,
  screenshots,
  onSolveScreenshots,
  isSolvingScreenshots,
  result,
  onStartOver,
  transcriptionEngine,
}: AnswerPanelProps) {
  const bodyRef      = useRef<HTMLDivElement>(null);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll when content grows
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [result, transcript, screenshots]);

  // Auto-grow textarea height
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
  }, [transcript]);

  const hasTranscript    = transcript.trim().length > 0;
  const hasScreenshots   = screenshots.length > 0;
  const isSolving        = isSolvingAudio || isSolvingScreenshots;

  // Show panel when: listening, has transcript, has screenshots, or has answer
  const show = isListening || hasTranscript || hasScreenshots || !!result;
  if (!show) return null;

  // ── What title to show ────────────────────────────────────────────────────
  let titleText: React.ReactNode = 'RecallAI';
  if (hasScreenshots && !result) {
    titleText = <><ImageIcon className="inline h-3.5 w-3.5 mr-1" />{screenshots.length} Screenshot{screenshots.length > 1 ? 's' : ''} Ready</>;
  } else if (isListening && !result) {
    const engineLabels = {
      groq: 'Groq',
      openai: 'OpenAI',
      local: 'Local'
    };
    titleText = <><Mic className="inline h-3.5 w-3.5 mr-1 text-red-400" />Listening [{engineLabels[transcriptionEngine]}]…</>;
  }

  return (
    <div className="answer-panel" id="answer-panel">

      {/* ── Header ── */}
      <div className="answer-panel-header">
        <div className="answer-panel-logo">✦</div>
        <span className="answer-panel-title">{titleText}</span>

        <div className="answer-panel-actions">

          {/* ── Single smart Solve button ── */}
          {!isSolving && !result && (hasTranscript || hasScreenshots) && (
            <button
              id="btn-solve"
              className="btn-solve"
              onClick={hasTranscript ? onSolveAudio : onSolveScreenshots}
              type="button"
              title={hasTranscript ? 'Ctrl+A' : 'Ctrl+Enter'}
            >
              <Zap className="h-3 w-3" fill="currentColor" />
              {hasTranscript ? 'Find Answer' : 'Solve'}
              <span className="key-badge">Ctrl</span>
              <span className="key-badge">{hasTranscript ? 'A' : '↵'}</span>
            </button>
          )}

          {/* Solving spinner */}
          {isSolving && (
            <span className="solving-indicator">
              <span className="solving-dot" />
              <span className="solving-dot" style={{ animationDelay: '0.2s' }} />
              <span className="solving-dot" style={{ animationDelay: '0.4s' }} />
              {isSolvingAudio ? 'Finding answer…' : 'Solving…'}
            </span>
          )}

          <button id="btn-start-over" className="btn-start-over" onClick={onStartOver} type="button">
            <RotateCcw className="h-3 w-3" />
            Reset
            <span className="key-badge">Ctrl</span>
            <span className="key-badge">R</span>
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div ref={bodyRef} className="answer-panel-body">

        {/* ── Live transcript (editable) ── */}
        {!result && (isListening || hasTranscript) && (
          <div className="transcript-edit-wrap">
            {isListening && !hasTranscript && !isPaused && (
              /* Listening dots before any words arrive */
              <div className="panel-listening">
                <span className="listening-dot" />
                <span className="listening-dot" style={{ animationDelay: '0.2s' }} />
                <span className="listening-dot" style={{ animationDelay: '0.4s' }} />
                <span className="panel-listening-text">Listening… speak your question</span>
              </div>
            )}

            {hasTranscript && (
              <>
                <p className="transcript-edit-hint">
                  ✏️ Review & edit if needed, then click <strong>Find Answer</strong>
                </p>
                <textarea
                  ref={textareaRef}
                  className="transcript-textarea"
                  value={transcript}
                  onChange={e => onTranscriptEdit(e.target.value)}
                  placeholder="Transcript will appear here as you speak…"
                  spellCheck={false}
                />
              </>
            )}
          </div>
        )}

        {/* ── Paused ── */}
        {isPaused && !hasTranscript && !result && (
          <div className="panel-paused">Session paused</div>
        )}

        {/* ── Screenshot thumbnails ── */}
        {hasScreenshots && !result && (
          <div className="screenshot-grid">
            {screenshots.map((s, i) => (
              <div key={s.path} className="screenshot-thumb-wrap">
                <img src={s.preview} alt={`Shot ${i + 1}`} className="screenshot-thumb" />
                <span className="screenshot-thumb-num">{i + 1}</span>
              </div>
            ))}
            {!isSolving && (
              <p className="screenshot-hint">
                Press <span className="key-badge">Ctrl</span><span className="key-badge">↵</span> or click <strong>Solve</strong>
              </p>
            )}
          </div>
        )}

        {/* ── Answer ── */}
        {result && (
          <>
            <div className="panel-question">
              <span className="panel-question-label">Q:</span>
              {result.question}
            </div>

            <div className="panel-source-row">
              <span className={`panel-source-badge ${result.source === 'local' ? 'badge-local' : 'badge-ai'}`}>
                {result.source === 'local' ? '📚 From your Q&A Library' : '🤖 AI Answer'}
              </span>
              {result.canImprove && (
                <span className="badge-improve">✨ AI can improve this</span>
              )}
            </div>

            <div className="panel-answer">
              <pre className="panel-answer-text">{result.answer}</pre>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
