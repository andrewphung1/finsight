import { useCallback, useRef } from 'react'

export function useDebouncedClick(delay: number = 300) {
  const isProcessingRef = useRef(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const debouncedClick = useCallback((handler: (e: React.MouseEvent) => void) => {
    return (e: React.MouseEvent) => {
      if (isProcessingRef.current) {
        e.preventDefault()
        return
      }

      isProcessingRef.current = true

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Call the handler
      handler(e)

      // Reset after delay
      timeoutRef.current = setTimeout(() => {
        isProcessingRef.current = false
      }, delay)
    }
  }, [delay])

  return debouncedClick
}
