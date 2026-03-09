import { useState, useCallback, useRef, useEffect } from 'react'

export function useCamera() {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const streamRef = useRef<MediaStream | null>(null)

  const start = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
      setError(null)
      const media = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })
      streamRef.current = media
      setStream(media)
    } catch (e) {
      const message = e instanceof Error ? e.message : '카메라 접근 실패'
      setError(message)
      setStream(null)
    }
  }, [facingMode])

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setStream(null)
  }, [])

  const switchCamera = useCallback(() => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))
  }, [])

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

  useEffect(() => {
    if (stream && streamRef.current !== stream) {
      streamRef.current = stream
    }
  }, [stream])

  return { stream, error, start, stop, switchCamera, facingMode }
}
