// file: src/components/SubscribedApp.tsx
import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"
import Queue from "./Queue"
import Solutions from "./Solutions"
import { useToast } from "../contexts/toast"

interface SubscribedAppProps {
  credits: number
  currentLanguage: string
  setLanguage: (language: string) => void
}

const SubscribedApp: React.FC<SubscribedAppProps> = ({
  credits,
  currentLanguage,
  setLanguage
}) => {
  const queryClient = useQueryClient()
  const [view, setView] = useState<"queue" | "solutions" | "debug">("queue")
  const containerRef = useRef<HTMLDivElement>(null)
  const { showToast } = useToast()

  // Let's ensure we reset queries etc. if some electron signals happen
  useEffect(() => {
    const cleanup = window.electronAPI.onResetView(() => {
      queryClient.invalidateQueries({
        queryKey: ["screenshots"]
      })
      queryClient.invalidateQueries({
        queryKey: ["problem_statement"]
      })
      queryClient.invalidateQueries({
        queryKey: ["solution"]
      })
      queryClient.invalidateQueries({
        queryKey: ["new_solution"]
      })
      setView("queue")
    })

    return () => {
      cleanup()
    }
  }, [])

  // NOTE: Dynamic dimension updates removed intentionally.
  // Previously a ResizeObserver called updateContentDimensions on every DOM
  // change → Electron resized the window → triggered more resize events →
  // shaking feedback loop. The window is now full-screen transparent with
  // pointer-events handled by CSS, so no auto-resize is needed.


  // Listen for events that might switch views or show errors
  useEffect(() => {
    const cleanupFunctions = [
      window.electronAPI.onSolutionStart(() => {
        setView("solutions")
      }),
      window.electronAPI.onUnauthorized(() => {
        queryClient.removeQueries({
          queryKey: ["screenshots"]
        })
        queryClient.removeQueries({
          queryKey: ["solution"]
        })
        queryClient.removeQueries({
          queryKey: ["problem_statement"]
        })
        setView("queue")
      }),
      window.electronAPI.onResetView(() => {
        queryClient.removeQueries({
          queryKey: ["screenshots"]
        })
        queryClient.removeQueries({
          queryKey: ["solution"]
        })
        queryClient.removeQueries({
          queryKey: ["problem_statement"]
        })
        setView("queue")
      }),
      window.electronAPI.onResetView(() => {
        queryClient.setQueryData(["problem_statement"], null)
      }),
      window.electronAPI.onProblemExtracted((data: any) => {
        if (view === "queue") {
          queryClient.invalidateQueries({
            queryKey: ["problem_statement"]
          })
          queryClient.setQueryData(["problem_statement"], data)
        }
      }),
      window.electronAPI.onSolutionError((error: string) => {
        showToast("Error", error, "error")
      })
    ]
    return () => cleanupFunctions.forEach((fn) => fn())
  }, [view])

  return (
    <div ref={containerRef} className="min-h-0">
      {view === "queue" ? (
        <Queue
          setView={setView}
          credits={credits}
          currentLanguage={currentLanguage}
          setLanguage={setLanguage}
        />
      ) : view === "solutions" ? (
        <Solutions
          setView={setView}
          credits={credits}
          currentLanguage={currentLanguage}
          setLanguage={setLanguage}
        />
      ) : null}
    </div>
  )
}

export default SubscribedApp
