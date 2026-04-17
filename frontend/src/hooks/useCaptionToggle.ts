import { useState, useEffect, useCallback } from 'react'

export function useCaptionToggle() {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    if (!window.electronAPI?.captionGetStatus) return
    window.electronAPI.captionGetStatus().then((status) => {
      setEnabled(status.enabled)
    })
  }, [])

  useEffect(() => {
    if (!window.electronAPI?.onCaptionStatusChanged) return
    const cleanup = window.electronAPI.onCaptionStatusChanged((val) => {
      setEnabled(val)
    })
    return cleanup
  }, [])

  const toggle = useCallback(async () => {
    if (!window.electronAPI?.captionToggle) return
    const newState = await window.electronAPI.captionToggle(undefined, 'sidebar-caption-toggle')
    setEnabled(newState)
  }, [])

  return { enabled, toggle }
}
