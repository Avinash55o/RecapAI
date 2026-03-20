import SubscribedApp from "./_pages/SubscribedApp"
import { UpdateNotification } from "./components/UpdateNotification"
import {
  QueryClient,
  QueryClientProvider
} from "@tanstack/react-query"
import { useEffect, useState, useCallback } from "react"
import {
  Toast,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport
} from "./components/ui/toast"
import { ToastContext } from "./contexts/toast"
import { Header } from "./components/Header/Header"
import { AnswerPanel, AnswerResult } from "./components/AnswerPanel/AnswerPanel"
import { AudioListener } from "./components/AudioListener/AudioListener"
import { QALibraryPage } from "./components/QALibrary/QALibraryPage"
import { qaMatch } from "./utils/qaMatch"
import { askAI } from "./utils/askAI"

// Create a React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      gcTime: Infinity,
      retry: 1,
      refetchOnWindowFocus: false
    },
    mutations: {
      retry: 1
    }
  }
})

// Root component that provides the QueryClient
function App() {
  const [toastState, setToastState] = useState({
    open: false,
    title: "",
    description: "",
    variant: "neutral" as "neutral" | "success" | "error"
  })
  const [credits, setCredits] = useState<number>(999)
  const [currentLanguage, setCurrentLanguage] = useState<string>("python")
  const [isInitialized, setIsInitialized] = useState(false)

  // ── RecallAI state ──────────────────────────────────────────────────────
  const [isListening, setIsListening] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null)
  const [meetingAudioLanguage, setMeetingAudioLanguage] = useState("en")
  const [transcriptionEngine, setTranscriptionEngine] = useState<'groq'|'openai'|'local'>('groq')
  const [showQALibrary, setShowQALibrary] = useState(false)

  // ── Screenshot panel state ─────────────────────────────────────────────
  const [screenshots, setScreenshots] = useState<Array<{ path: string; preview: string }>>([])
  const [isSolving, setIsSolving] = useState(false)          // screenshots
  const [isSolvingAudio, setIsSolvingAudio] = useState(false) // audio transcript

  // ── Session key for hard resetting AudioListener ──────────────────────
  const [listenSessionKey, setListenSessionKey] = useState(0)

  // Set unlimited credits
  const updateCredits = useCallback(() => {
    setCredits(999)
    window.__CREDITS__ = 999
  }, [])

  // Helper function to safely update language
  const updateLanguage = useCallback((newLanguage: string) => {
    setCurrentLanguage(newLanguage)
    window.__LANGUAGE__ = newLanguage
  }, [])

  // Helper function to mark initialization complete
  const markInitialized = useCallback(() => {
    setIsInitialized(true)
    window.__IS_INITIALIZED__ = true
  }, [])

  // Show toast method
  const showToast = useCallback(
    (
      title: string,
      description: string,
      variant: "neutral" | "success" | "error"
    ) => {
      setToastState({
        open: true,
        title,
        description,
        variant
      })
    },
    []
  )

  // Check for API key — if missing, show a toast nudge to open gear settings
  useEffect(() => {
    const checkApiKey = async () => {
      try {
        const hasKey = await window.electronAPI.checkApiKey()
        if (!hasKey) {
          setTimeout(() => {
            showToast("Setup", "No API key found — click ⚙️ in the navbar to add one", "neutral")
          }, 1200)
        }
      } catch (error) {
        console.error("Failed to check API key:", error)
      }
    }
    if (isInitialized) checkApiKey()
  }, [isInitialized, showToast])

  // ── Screenshot-taken listener ─────────────────────────────────────────
  useEffect(() => {
    const unsub = window.electronAPI.onScreenshotTaken((data: any) => {
      setScreenshots(prev => {
        const next = [...prev, { path: data.path, preview: data.preview }]
        return next.slice(-4)
      })
      setAnswerResult(null)
    })
    return () => unsub()
  }, [])

  // ── Ctrl+R from main process: full reset ──────────────────────────────
  // Ctrl+R shortcut fires 'reset' + 'reset-view' from main process.
  // We listen for both to clear all React state regardless of which fires.
  useEffect(() => {
    const doReset = () => {
      setAnswerResult(null)
      setTranscript('')
      setIsListening(false)
      setIsPaused(false)
      setScreenshots([])
      setIsSolving(false)
      setIsSolvingAudio(false)
      setListenSessionKey(prev => prev + 1)
    }
    const u1 = (window.electronAPI as any).onReset?.(doReset) ?? (() => {})
    const u2 = window.electronAPI.onResetView(doReset)
    return () => { u1(); u2() }
  }, [])

  // Listen for Ctrl+L toggle-audio-listen from main process
  useEffect(() => {
    const unsub = (window.electronAPI as any).onToggleAudioListen(() => {
      setIsListening(prev => {
        const next = !prev
        if (!next) setIsPaused(false)
        return next
      })
    })
    return () => unsub()
  }, [])

  // ── OS click-through: toggle setIgnoreMouseEvents based on hover ─────────
  // forward:true means mousemove is always forwarded even when in click-through
  // mode, so we can detect cursor position and switch modes in real time.
  useEffect(() => {
    const INTERACTIVE = '.navbar-pill, .answer-panel, .settings-dropdown, .qa-library-page'
    let lastIgnore = true

    const onMove = (e: MouseEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const overInteractive = !!(el && el.closest(INTERACTIVE))
      const wantIgnore = !overInteractive

      if (wantIgnore !== lastIgnore) {
        lastIgnore = wantIgnore
        window.electronAPI.setIgnoreMouse(wantIgnore)
      }
    }

    window.addEventListener('mousemove', onMove)
    // Default: click-through
    window.electronAPI.setIgnoreMouse(true)

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.electronAPI.setIgnoreMouse(false)
    }
  }, [])

  // Load config (meeting audio language + code language)
  useEffect(() => {
    const initializeApp = async () => {
      try {
        updateCredits()
        const config = await window.electronAPI.getConfig()
        if (config?.language) updateLanguage(config.language)
        else updateLanguage("python")
        if ((config as any)?.meetingAudioLanguage) {
          setMeetingAudioLanguage((config as any).meetingAudioLanguage)
        }
        if ((config as any)?.transcriptionEngine) {
          setTranscriptionEngine((config as any).transcriptionEngine)
        }
        markInitialized()
      } catch (error) {
        console.error("Failed to initialize app:", error)
        updateLanguage("python")
        markInitialized()
      }
    }
    initializeApp()

    const onApiKeyInvalid = () => {
      showToast("API Key Invalid", "Your API key appears to be invalid or has insufficient credits", "error")
    }
    window.electronAPI.onApiKeyInvalid(onApiKeyInvalid)
    const unsubscribeSolutionSuccess = window.electronAPI.onSolutionSuccess(() => {
      console.log("Solution success")
    })

    return () => {
      window.electronAPI.removeListener("API_KEY_INVALID", onApiKeyInvalid)
      unsubscribeSolutionSuccess()
      window.__IS_INITIALIZED__ = false
      setIsInitialized(false)
    }
  }, [updateCredits, updateLanguage, markInitialized, showToast])

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleToggleListen = useCallback(() => {
    setIsListening(prev => {
      const next = !prev
      if (!next) { setIsPaused(false); setTranscript(""); }
      return next
    })
  }, [])

  const handleStartOver = useCallback(() => {
    setAnswerResult(null)
    setTranscript("")
    setIsListening(false)
    setIsPaused(false)
    setScreenshots([])
    setIsSolving(false)
    setIsSolvingAudio(false)
    setListenSessionKey(prev => prev + 1)
  }, [])


  // ── Solve: send queued screenshots to AI ─────────────────────────────
  const handleSolve = useCallback(async () => {
    if (screenshots.length === 0 || isSolving) return
    setIsSolving(true)
    try {
      await window.electronAPI.triggerProcessScreenshots()
      // After solve starts, clear the thumbnail list — the solution replaces it
      setScreenshots([])
    } catch (err) {
      console.error('Solve error:', err)
      showToast('Error', 'Failed to start solving. Check your API key.', 'error')
    } finally {
      setIsSolving(false)
    }
  }, [screenshots, isSolving, showToast])

  // ── Audio chunk arrives — APPEND to running transcript ─────────────────
  const handleTranscriptChunk = useCallback((chunk: string) => {
    setTranscript(prev => prev ? `${prev} ${chunk}` : chunk)
  }, [])

  // ── User manually edits the transcript textarea ──────────────────────
  const handleTranscriptEdit = useCallback((text: string) => {
    setTranscript(text)
  }, [])

  // ── Solve audio: qaMatch first, then AI fallback ──────────────────────
  const handleSolveAudio = useCallback(async () => {
    if (!transcript.trim() || isSolvingAudio) return
    setIsSolvingAudio(true)
    const question = transcript.trim()
    try {
      // 1. Try Q&A library first
      const match = await qaMatch(question)
      if (match.found && match.answer) {
        setAnswerResult({
          question: match.question || question,
          answer: match.answer,
          source: match.source,
          confidence: match.confidence,
          canImprove: match.canImprove,
        })
        return
      }
      // 2. Fall back to AI
      const cfg = await (window.electronAPI as any).getConfig()
      const aiAnswer = await askAI(question, cfg.apiKey || '', cfg.apiProvider || 'gemini')
      setAnswerResult({ question, answer: aiAnswer, source: 'ai' })
    } catch (err: any) {
      showToast('Error', `Could not get answer: ${err?.message}`, 'error')
    } finally {
      setIsSolvingAudio(false)
    }
  }, [transcript, isSolvingAudio, showToast])

  // \u2500\u2500 Ctrl+A = Find Answer shortcut (renderer-level, not global) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'a' && !e.shiftKey && !e.altKey) {
        e.preventDefault()
        handleSolveAudio()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleSolveAudio])

  const handleAudioError = useCallback((msg: string) => {
    showToast("Audio Error", msg, "error")
    setIsListening(false)
  }, [showToast])

  // ── Q&A Library opened from Settings ─────────────────────────────────────
  const openQALibrary = useCallback(() => setShowQALibrary(true), [])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ToastContext.Provider value={{ showToast }}>

          {/* ── Floating pill navbar (always visible) ── */}
          {isInitialized && (
            <Header
              currentLanguage={currentLanguage}
              setLanguage={updateLanguage}
              isListening={isListening}
              onToggleListen={handleToggleListen}
              onOpenQALibrary={openQALibrary}
            />
          )}

          {/* ── Answer / Transcript / Screenshot panel ── */}
          {isInitialized && (
            <AnswerPanel
              result={answerResult}
              transcript={transcript}
              onTranscriptEdit={handleTranscriptEdit}
              isListening={isListening}
              isPaused={isPaused}
              transcriptionEngine={transcriptionEngine}
              onStartOver={handleStartOver}
              onSolveAudio={handleSolveAudio}
              isSolvingAudio={isSolvingAudio}
              screenshots={screenshots}
              onSolveScreenshots={handleSolve}
              isSolvingScreenshots={isSolving}
            />
          )}

          {/* ── Audio listener (renders whisper download bar if loading) ── */}
          {isInitialized && (
            <AudioListener
              key={listenSessionKey}
              isListening={isListening}
              meetingAudioLanguage={meetingAudioLanguage}
              transcriptionEngine={transcriptionEngine}
              onTranscriptChunk={handleTranscriptChunk}
              onError={handleAudioError}
            />
          )}

          {/* ── Main content (always SubscribedApp or QALibrary) ── */}
          <div className="relative">
            {isInitialized ? (
              showQALibrary ? (
                <QALibraryPage onClose={() => setShowQALibrary(false)} />
              ) : (
                <SubscribedApp
                  credits={credits}
                  currentLanguage={currentLanguage}
                  setLanguage={updateLanguage}
                />
              )
            ) : (
              /* Transparent minimal spinner while Electron IPC initialises */
              <div style={{ position: 'fixed', top: 70, left: '50%', transform: 'translateX(-50%)' }}>
                <div className="w-5 h-5 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
              </div>
            )}
            <UpdateNotification />
          </div>

          <Toast
            open={toastState.open}
            onOpenChange={(open) =>
              setToastState((prev) => ({ ...prev, open }))
            }
            variant={toastState.variant}
            duration={1500}
          >
            <ToastTitle>{toastState.title}</ToastTitle>
            <ToastDescription>{toastState.description}</ToastDescription>
          </Toast>
          <ToastViewport />
        </ToastContext.Provider>
      </ToastProvider>
    </QueryClientProvider>
  )
}

export default App