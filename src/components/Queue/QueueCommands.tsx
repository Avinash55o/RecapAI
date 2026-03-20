// QueueCommands.tsx
// The old command bar (bg-black/60 pill) is fully replaced by the new
// pill Header.tsx navbar. This component renders nothing.

import React from "react"

interface QueueCommandsProps {
  onTooltipVisibilityChange: (visible: boolean, height: number) => void
  screenshotCount?: number
  credits: number
  currentLanguage: string
  setLanguage: (language: string) => void
}

const QueueCommands: React.FC<QueueCommandsProps> = () => {
  // All actions are now handled by the floating pill navbar in Header.tsx.
  return null
}

export default QueueCommands
