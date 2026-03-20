import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ExternalLink, ChevronDown, Mic } from 'lucide-react';
import { useToast } from '../../contexts/toast';

interface SettingsDropdownProps {
  currentLanguage: string;
  setLanguage: (lang: string) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement>;
  onOpenQALibrary?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const OUTPUT_LANGUAGES = [
  { value: 'english', label: 'English' },
  { value: 'hindi', label: 'Hindi' },
  { value: 'hinglish', label: 'Hinglish' },
];

const CODE_LANGUAGES = [
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
];

const AUDIO_LANGUAGES = [
  { value: 'en', label: 'English (recommended)' },
  { value: 'hi', label: 'Hindi' },
  { value: 'auto', label: 'Auto-detect' },
];

const SHORTCUTS = [
  { label: 'Ask AI',       keys: ['Ctrl', 'Enter'] },
  { label: 'Start Over',   keys: ['Ctrl', 'R'] },
  { label: 'Screenshot',   keys: ['Ctrl', 'H'] },
  { label: 'Show/Hide',    keys: ['Ctrl', 'B'] },
  { label: 'Audio Listen', keys: ['Ctrl', 'L'] },
  { label: 'Move Up',      keys: ['Ctrl', '↑'] },
  { label: 'Move Left',    keys: ['Ctrl', '←'] },
  { label: 'Move Down',    keys: ['Ctrl', '↓'] },
  { label: 'Move Right',   keys: ['Ctrl', '→'] },
  { label: 'quit',         keys: ['Ctrl', 'Q'] },
];

type APIProvider = 'openai' | 'gemini' | 'anthropic';

interface Config {
  apiKey?: string;
  apiProvider?: APIProvider;
  extractionModel?: string;
  solutionModel?: string;
  debuggingModel?: string;
  language?: string;
  outputLanguage?: string;
  meetingAudioLanguage?: string;
  personalPrompt?: string;
  transcriptionEngine?: 'groq' | 'openai' | 'local';
  groqApiKey?: string;
}

export function SettingsDropdown({
  currentLanguage,
  setLanguage,
  onClose,
  anchorRef,
  onOpenQALibrary,
  onMouseEnter,
  onMouseLeave,
}: SettingsDropdownProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  // Config state
  const [apiKey, setApiKey] = useState('');
  const [apiProvider, setApiProvider] = useState<APIProvider>('gemini');
  const [outputLanguage, setOutputLanguage] = useState('english');
  const [meetingAudioLanguage, setMeetingAudioLanguage] = useState('en');
  const [personalPrompt, setPersonalPrompt] = useState('');
  const [transcriptionEngine, setTranscriptionEngine] = useState<'groq'|'openai'|'local'>('groq');
  const [groqApiKey, setGroqApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showGroqKey, setShowGroqKey] = useState(false);

  // Load config once
  useEffect(() => {
    window.electronAPI.getConfig().then((cfg: Config) => {
      setApiKey(cfg.apiKey || '');
      setApiProvider(cfg.apiProvider || 'gemini');
      setOutputLanguage(cfg.outputLanguage || 'english');
      setMeetingAudioLanguage(cfg.meetingAudioLanguage || 'en');
      setPersonalPrompt(cfg.personalPrompt || '');
      setTranscriptionEngine(cfg.transcriptionEngine || 'groq');
      setGroqApiKey(cfg.groqApiKey || '');
    }).catch(console.error);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose, anchorRef]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await window.electronAPI.updateConfig({
        apiKey,
        apiProvider,
        language: currentLanguage,
        outputLanguage,
        meetingAudioLanguage,
        personalPrompt,
        transcriptionEngine,
        groqApiKey,
      } as any);
      setLanguage(currentLanguage);
      showToast('Saved', 'Settings saved successfully', 'success');
    } catch (err) {
      showToast('Error', 'Failed to save settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const maskKey = (k: string) =>
    k && k.length > 8 ? `${k.slice(0, 4)}···${k.slice(-4)}` : k;

  return (
    <div
      ref={panelRef}
      className="settings-dropdown"
      id="settings-dropdown"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Header */}
      <div className="sd-header">
        <span className="sd-title">Settings</span>
        <button className="sd-close" onClick={onClose} type="button">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="sd-body">

        {/* ── API Key ── */}
        <div className="sd-section">
          <label className="sd-label">API Key</label>
          <div className="sd-api-row">
            <input
              type={showApiKey ? 'text' : 'password'}
              className="sd-input sd-input-api"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="sk-... / gemini... / sk-ant-..."
            />
            <button
              className="sd-toggle-key"
              type="button"
              onClick={() => setShowApiKey(v => !v)}
            >
              {showApiKey ? '🙈' : '👁'}
            </button>
          </div>
          <div className="sd-provider-row">
            {(['openai', 'gemini', 'anthropic'] as APIProvider[]).map(p => (
              <button
                key={p}
                type="button"
                className={`sd-provider-btn ${apiProvider === p ? 'sd-provider-btn-active' : ''}`}
                onClick={() => setApiProvider(p)}
              >
                {p === 'openai' ? 'OpenAI' : p === 'gemini' ? 'Gemini' : 'Claude'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Output Language ── */}
        <div className="sd-section">
          <label className="sd-label">Output Language</label>
          <select
            className="sd-select"
            value={outputLanguage}
            onChange={e => setOutputLanguage(e.target.value)}
          >
            {OUTPUT_LANGUAGES.map(l => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>

        {/* ── Code Language ── */}
        <div className="sd-section">
          <label className="sd-label">Code Language</label>
          <select
            className="sd-select"
            value={currentLanguage}
            onChange={e => setLanguage(e.target.value)}
          >
            {CODE_LANGUAGES.map(l => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>

        {/* ── Groq API Key (for Whisper) ── */}
        <div className="sd-section">
          <label className="sd-label">
            ⚡ Groq API Key
            <a
              href="https://console.groq.com/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="sd-label-link"
              onClick={e => { e.preventDefault(); (window.electronAPI as any).openLink('https://console.groq.com/keys'); }}
            >
              Get free key ↗
            </a>
          </label>
          <div className="sd-api-row">
            <input
              type={showGroqKey ? 'text' : 'password'}
              className="sd-input sd-input-api"
              value={groqApiKey}
              onChange={e => setGroqApiKey(e.target.value)}
              placeholder="gsk_..."
              id="input-groq-key"
            />
            <button
              className="sd-toggle-key"
              type="button"
              onClick={() => setShowGroqKey(v => !v)}
            >
              {showGroqKey ? '🙈' : '👁'}
            </button>
          </div>
          <p className="sd-hint">Free · 28 hrs/day · Whisper Large v3 Turbo · Best accuracy for Hindi/Hinglish</p>
        </div>

        {/* ── Transcription Engine (Whisper) ── */}
        <div className="sd-section">
          <label className="sd-label">🎤 Transcription Engine</label>
          <div className="sd-provider-row">
            <button
              type="button"
              id="btn-engine-groq"
              className={`sd-provider-btn ${transcriptionEngine === 'groq' ? 'sd-provider-btn-active' : ''}`}
              onClick={() => setTranscriptionEngine('groq')}
            >
              ⚡ Groq
            </button>
            <button
              type="button"
              id="btn-engine-openai"
              className={`sd-provider-btn ${transcriptionEngine === 'openai' ? 'sd-provider-btn-active' : ''}`}
              onClick={() => setTranscriptionEngine('openai')}
            >
              OpenAI
            </button>
            <button
              type="button"
              id="btn-engine-local"
              className={`sd-provider-btn ${transcriptionEngine === 'local' ? 'sd-provider-btn-active' : ''}`}
              onClick={() => setTranscriptionEngine('local')}
            >
              Offline
            </button>
          </div>
          <p className="sd-hint">
            {transcriptionEngine === 'groq'
              ? '⚡ Groq: Fastest · Whisper Large v3 Turbo · Needs Groq key · Free 28hr/day'
              : transcriptionEngine === 'openai'
              ? '☁ OpenAI Whisper-1 · Needs OpenAI API key'
              : '💻 Offline · Whisper Base · No key needed · ~140 MB download'}
          </p>
        </div>

        {/* ── Meeting Audio Language ── */}
        <div className="sd-section">
          <label className="sd-label">Meeting Audio Language</label>
          <select
            className="sd-select"
            value={meetingAudioLanguage}
            onChange={e => setMeetingAudioLanguage(e.target.value)}
          >
            {AUDIO_LANGUAGES.map(l => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>

        {/* ── Manage Q&A Library ── */}
        <div className="sd-section">
          <label className="sd-label">Manage Prompts</label>
          <p className="sd-hint">Create and edit your Q&A templates</p>
          <button
            type="button"
            className="sd-btn-outline"
            id="btn-open-qa-library"
            onClick={() => { onOpenQALibrary?.(); onClose(); }}
          >
            Open Q&A Library
          </button>
        </div>

        {/* ── Personal Prompt ── */}
        <div className="sd-section">
          <label className="sd-label">Personal Prompt</label>
          <p className="sd-hint">Appended to every AI answer request</p>
          <textarea
            className="sd-textarea"
            rows={3}
            value={personalPrompt}
            onChange={e => setPersonalPrompt(e.target.value)}
            placeholder="e.g. Always answer in bullet points. Keep it concise."
          />
        </div>

        {/* ── Keyboard Shortcuts ── */}
        <div className="sd-section">
          <label className="sd-label">Keyboard Shortcuts</label>
          <div className="sd-shortcuts">
            {SHORTCUTS.map(s => (
              <div key={s.label} className="sd-shortcut-row">
                <span className="sd-shortcut-label">{s.label}</span>
                <div className="sd-keys">
                  {s.keys.map((k, i) => (
                    <span key={i} className="key-badge">{k}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Bottom buttons ── */}
        <div className="sd-section">
          <button
            type="button"
            className="sd-btn-primary"
            disabled={isSaving}
            onClick={handleSave}
          >
            {isSaving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>

      </div>
    </div>
  );
}
