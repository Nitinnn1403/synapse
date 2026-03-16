import { useState, useEffect, useRef } from 'react'

interface TypewriterTextProps {
  fullText: string
  speed?: number
  isStreaming: boolean
  onComplete?: () => void
  children: (revealedText: string, isRevealing: boolean) => React.ReactNode
}

export default function TypewriterText({
  fullText,
  speed = 20,
  isStreaming,
  onComplete,
  children,
}: TypewriterTextProps) {
  const [revealedCount, setRevealedCount] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  const words = fullText.split(/(\s+)/)

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)

    if (revealedCount < words.length) {
      intervalRef.current = setInterval(() => {
        setRevealedCount((prev) => {
          const next = prev + 1
          if (next >= words.length) {
            if (intervalRef.current) clearInterval(intervalRef.current)
            if (!isStreaming) onCompleteRef.current?.()
          }
          return next
        })
      }, speed)
    } else if (!isStreaming) {
      onCompleteRef.current?.()
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [words.length, speed, isStreaming])

  const revealedText = words.slice(0, revealedCount).join('')
  const isRevealing = revealedCount < words.length || isStreaming

  return <>{children(revealedText, isRevealing)}</>
}
