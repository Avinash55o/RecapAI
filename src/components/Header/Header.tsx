import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Settings, Mic, Square, Play } from 'lucide-react';
import { SettingsDropdown } from '../Settings/SettingsDropdown';

interface HeaderProps {
  currentLanguage: string;
  setLanguage: (language: string) => void;
  isListening: boolean;
  onToggleListen: () => void;
  onOpenQALibrary?: () => void;
}

/** Read-only info badge — shows shortcut key, not clickable */
const ShortcutBadge: React.FC<{ label: string; keys: string[] }> = ({ label, keys }) => (
  <div className="shortcut-badge">
    <span className="shortcut-badge-label">{label}</span>
    {keys.map((k, i) => (
      <span key={i} className="key-badge">{k}</span>
    ))}
  </div>
);

export function Header({
  currentLanguage,
  setLanguage,
  isListening,
  onToggleListen,
  onOpenQALibrary,
}: HeaderProps) {
  // ── Pill drag position ────────────────────────────────────────────────────
  // null x = centred via CSS; once dragged, x/y are pixel offsets
  const [pillPos, setPillPos] = useState<{ x: number | null; y: number }>({ x: null, y: 12 });
  const pillRef = useRef<HTMLDivElement>(null);
  const dragOrigin = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);

  const onDragStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Only start drag on the drag-handle div itself, not on buttons inside
    if ((e.target as HTMLElement).closest('button, select, input, textarea')) return;
    e.preventDefault();
    const rect = pillRef.current!.getBoundingClientRect();
    dragOrigin.current = {
      mx: e.clientX,
      my: e.clientY,
      px: rect.left + rect.width / 2,  // centre x
      py: rect.top,
    };

    const onMove = (ev: MouseEvent) => {
      if (!dragOrigin.current) return;
      const dx = ev.clientX - dragOrigin.current.mx;
      const dy = ev.clientY - dragOrigin.current.my;
      setPillPos({
        x: dragOrigin.current.px + dx,
        y: Math.max(4, dragOrigin.current.py + dy),
      });
    };
    const onUp = () => {
      dragOrigin.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  // ── Settings hover (open on hover, close with grace delay) ───────────────
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsBtnRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = () => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setSettingsOpen(false), 250);
  };
  const openSettings = () => { cancelClose(); setSettingsOpen(true); };

  // Clean up timer on unmount
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  // ── Pill CSS style (driven by drag state) ─────────────────────────────────
  const pillStyle: React.CSSProperties = pillPos.x !== null
    ? { left: pillPos.x, top: pillPos.y, transform: 'translateX(-50%)' }
    : { top: pillPos.y };

  return (
    <>
      {/* ── Pill Navbar ─────────────────────────────────────────────────── */}
      <div
        id="navbar-pill"
        ref={pillRef}
        className="navbar-pill"
        style={pillStyle}
        onMouseDown={onDragStart}
      >
        {/* Logo */}
        <div className={`navbar-logo ${isListening ? 'listening' : ''}`}>
          <span className="navbar-logo-inner">✦</span>
        </div>

        {/* ── ONLY real button: Start Interview / Done ── */}
        {!isListening ? (
          <button
            id="btn-start-interview"
            className="btn-start-interview"
            onClick={onToggleListen}
            type="button"
          >
            <Mic className="btn-icon" />
            Start Interview
          </button>
        ) : (
          <div className="listen-controls" id="listen-controls">
            <button className="btn-play-pause" type="button" title="Pause">
              <Play className="btn-icon" />
            </button>
            <button
              className="btn-done"
              type="button"
              onClick={onToggleListen}
              title="End session"
            >
              <Square className="btn-icon-sm" fill="currentColor" />
              Done
            </button>
          </div>
        )}

        {/* Divider */}
        <div className="navbar-divider" />

        {/* ── Read-only shortcut reference badges ── */}
        <ShortcutBadge label="Screenshot" keys={['Ctrl', 'H']} />
        <ShortcutBadge label="Solve"      keys={['Ctrl', '↵']} />
        <ShortcutBadge label="Reset"      keys={['Ctrl', 'R']} />
        <ShortcutBadge label="Listen"     keys={['Ctrl', 'L']} />
        <ShortcutBadge label="Hide"       keys={['Ctrl', 'B']} />

        {/* Divider */}
        <div className="navbar-divider" />

        {/* ── Settings gear — HOVER to open ── */}
        <button
          id="btn-settings"
          ref={settingsBtnRef}
          className={`navbar-gear ${settingsOpen ? 'navbar-gear-active' : ''}`}
          type="button"
          title="Settings (hover)"
          onMouseEnter={openSettings}
          onMouseLeave={scheduleClose}
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>

      {/* ── Settings Dropdown — keeps open while hovered ─────────────────── */}
      {settingsOpen && (
        <div
          className="settings-hover-bridge"
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          <SettingsDropdown
            currentLanguage={currentLanguage}
            setLanguage={setLanguage}
            onClose={() => setSettingsOpen(false)}
            anchorRef={settingsBtnRef}
            onOpenQALibrary={onOpenQALibrary}
          />
        </div>
      )}
    </>
  );
}
