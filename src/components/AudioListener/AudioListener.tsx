// src/components/AudioListener/AudioListener.tsx
// Simple, reliable audio recording in fixed 5-second chunks.
// Sends each chunk to Groq / OpenAI / Local Whisper for transcription.

import { useEffect, useRef, useCallback, useState } from 'react';
import { transcribeAudio, TranscriptionEngine } from '../../utils/audioTranscribe';
import { initLocalWhisper, isLocalWhisperReady, WhisperStatus } from '../../utils/localWhisper';

interface AudioListenerProps {
  isListening: boolean;
  meetingAudioLanguage: string;
  transcriptionEngine: TranscriptionEngine;
  onTranscriptChunk: (text: string) => void;
  onError: (msg: string) => void;
}

const CHUNK_INTERVAL_MS = 5000; // record in 5-second windows

// ── Progress bar while local model downloads ──────────────────────────────
function WhisperLoadUI({ status }: { status: WhisperStatus }) {
  if (status.status === 'idle' || status.status === 'ready') return null;
  if (status.status === 'error') {
    return (
      <div className="whisper-load-bar error">
        ⚠ Local Whisper failed: {status.error}
      </div>
    );
  }
  if (status.status === 'loading') {
    return (
      <div className="whisper-load-bar">
        <span className="whisper-load-label">
          ⬇ Downloading Whisper Base ({status.progress}%) — ~140 MB, one-time
        </span>
        <div className="whisper-load-track">
          <div className="whisper-load-fill" style={{ width: `${status.progress}%` }} />
        </div>
        <span className="whisper-load-sub">{status.file}</span>
      </div>
    );
  }
  return null;
}

export function AudioListener({
  isListening,
  meetingAudioLanguage,
  transcriptionEngine,
  onTranscriptChunk,
  onError,
}: AudioListenerProps) {
  const [whisperStatus, setWhisperStatus] = useState<WhisperStatus>({ status: 'idle' });
  const [inlineError, setInlineError] = useState<string | null>(null);

  const streamRef    = useRef<MediaStream | null>(null);
  const recorderRef  = useRef<MediaRecorder | null>(null);
  const chunksRef    = useRef<Blob[]>([]);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const isActiveRef  = useRef(false);
  const isMountedRef = useRef(true);

  // Mark when unmounted so pending requests are ignored
  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);

  // Pre-warm local model if selected
  useEffect(() => {
    if (transcriptionEngine !== 'local') return;
    if (isLocalWhisperReady()) { setWhisperStatus({ status: 'ready' }); return; }
    initLocalWhisper((s) => setWhisperStatus(s)).catch(() => {});
  }, [transcriptionEngine]);

  // ── Flush the current buffered audio and send to transcription ────────
  const flushAndTranscribe = useCallback(async (recorder: MediaRecorder) => {
    // 1. Stop recorder to collect final data, then immediately restart
    return new Promise<void>((resolve) => {
      // Set a one-time onstop handler to process the collected chunks
      recorder.onstop = async () => {
        const blobs = chunksRef.current.splice(0);
        if (isActiveRef.current) {
          // Restart immediately for the next 5-second window
          try { recorder.start(CHUNK_INTERVAL_MS); } catch { /* may already be stopped */ }
        }

        if (blobs.length === 0) { resolve(); return; }
        const blob = new Blob(blobs, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size < 1000) { resolve(); return; } // too small = pure silence

        // Read keys fresh from config
        let apiKey = '', groqApiKey = '';
        let langHint: string | undefined = meetingAudioLanguage === 'auto' ? undefined : meetingAudioLanguage;
        try {
          const cfg = await (window.electronAPI as any).getConfig();
          apiKey    = cfg.apiKey    || '';
          groqApiKey = cfg.groqApiKey || '';
        } catch { /* ignore */ }

        try {
          setInlineError(null);
          const text = await transcribeAudio(blob, langHint, apiKey, transcriptionEngine, groqApiKey);
          if (!isMountedRef.current) return; // Drop chunk if we reset/unmounted during the wait
          if (text && text.trim()) onTranscriptChunk(text.trim());
        } catch (err: any) {
          const msg = err?.message || String(err);
          console.error('[AudioListener] transcription error:', err);
          setInlineError(msg);
          onError(`Transcription failed: ${msg}`);
        }
        resolve();
      };

      // Trigger the stop (fires ondataavailable one last time, then onstop)
      try { recorder.stop(); } catch { resolve(); }
    });
  }, [meetingAudioLanguage, transcriptionEngine, onTranscriptChunk, onError]);

  // ── Start mic and begin recording loop ───────────────────────────────
  const startMic = useCallback(async () => {
    try {
      console.log('[AudioListener] Requesting microphone...');

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      });
      streamRef.current = stream;
      console.log('[AudioListener] Got mic stream');

      // Pick the best supported mime type
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg']
        .find(t => MediaRecorder.isTypeSupported(t)) || '';
      console.log('[AudioListener] Using mimeType:', mimeType || '(browser default)');

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
          console.log('[AudioListener] chunk received, size:', e.data.size, 'total chunks:', chunksRef.current.length);
        }
      };

      // Start recording — collect data every CHUNK_INTERVAL_MS
      recorder.start(CHUNK_INTERVAL_MS);
      console.log('[AudioListener] recorder started, state:', recorder.state);

      // Every N seconds, stop → transcribe → restart
      timerRef.current = setInterval(async () => {
        if (!isActiveRef.current) return;
        if (recorderRef.current?.state === 'recording') {
          console.log('[AudioListener] flushing chunk, total chunks buffered:', chunksRef.current.length);
          await flushAndTranscribe(recorderRef.current);
        }
      }, CHUNK_INTERVAL_MS);

    } catch (err: any) {
      console.error('[AudioListener] mic error:', err);
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        onError('Microphone access denied. Please allow mic permission.');
      } else if (err?.name === 'NotFoundError') {
        onError('No microphone found. Please connect a microphone.');
      } else {
        onError(`Mic error: ${err?.message || err}`);
      }
    }
  }, [flushAndTranscribe, onError]);

  const stopMic = useCallback(() => {
    isActiveRef.current = false;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    try { if (recorderRef.current?.state !== 'inactive') recorderRef.current?.stop(); } catch {}
    streamRef.current?.getTracks().forEach(t => t.stop());
    recorderRef.current = null;
    streamRef.current   = null;
    chunksRef.current   = [];
  }, []);

  useEffect(() => {
    if (isListening) {
      isActiveRef.current = true;
      startMic();
    } else {
      stopMic();
    }
    return () => { stopMic(); };
  }, [isListening, startMic, stopMic]);

  return (
    <>
      <WhisperLoadUI status={whisperStatus} />
      {inlineError && (
        <div className="whisper-load-bar error" style={{ marginTop: 4, padding: '6px 10px', fontSize: 11 }}>
          ⚠ {inlineError}
        </div>
      )}
    </>
  );
}
