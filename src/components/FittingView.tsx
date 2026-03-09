import { useRef, useEffect, useState, useCallback } from 'react'
import { getFaceLandmarker, detectFaceLandmarks } from '../lib/faceLandmarker'
import { drawGlasses } from '../lib/glassesOverlay'
import type { GlassesProduct } from '../types'
import type { LandmarkPoint } from '../types'

interface FittingViewProps {
  stream: MediaStream | null
  selectedGlasses: GlassesProduct | null
}

export function FittingView({ stream, selectedGlasses }: FittingViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const glassesImageRef = useRef<HTMLImageElement | null>(null)
  const [glassesImageLoaded, setGlassesImageLoaded] = useState(false)
  const rafRef = useRef<number>(0)
  const lastLandmarksRef = useRef<LandmarkPoint[] | null>(null)

  const loadGlassesImage = useCallback((product: GlassesProduct | null) => {
    if (glassesImageRef.current) {
      glassesImageRef.current.onload = null
      glassesImageRef.current.src = ''
      glassesImageRef.current = null
    }
    setGlassesImageLoaded(false)
    if (!product?.imageUrl) return
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      glassesImageRef.current = img
      setGlassesImageLoaded(true)
    }
    img.onerror = () => setGlassesImageLoaded(false)
    img.src = product.imageUrl
  }, [])

  useEffect(() => {
    loadGlassesImage(selectedGlasses ?? null)
  }, [selectedGlasses, loadGlassesImage])

  useEffect(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!stream || !video || !canvas) return

    video.srcObject = stream
    video.play().catch(() => {})

    let landmarker: Awaited<ReturnType<typeof getFaceLandmarker>> | null = null
    let ready = false

    const run = async () => {
      try {
        landmarker = await getFaceLandmarker()
        ready = true
      } catch (e) {
        console.error('Face Landmarker init failed', e)
      }
    }
    run()

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draw = () => {
      if (!video || !canvas || !ctx) return

      const vw = video.videoWidth
      const vh = video.videoHeight
      if (vw === 0 || vh === 0) {
        rafRef.current = requestAnimationFrame(draw)
        return
      }

      canvas.width = canvas.clientWidth
      canvas.height = canvas.clientHeight
      const cw = canvas.width
      const ch = canvas.height

      ctx.save()
      ctx.scale(-1, 1)
      ctx.drawImage(video, -cw, 0, cw, ch)
      ctx.restore()

      if (ready && landmarker) {
        const landmarks = detectFaceLandmarks(landmarker, video, performance.now())
        if (landmarks) lastLandmarksRef.current = landmarks
      }

      const landmarks = lastLandmarksRef.current
      const img = glassesImageRef.current
      if (landmarks && img && selectedGlasses) {
        drawGlasses({
          ctx,
          landmarks,
          videoWidth: vw,
          videoHeight: vh,
          glassesImage: img,
          imageLoaded: glassesImageLoaded,
          outputWidth: cw,
          outputHeight: ch,
        })
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafRef.current)
      video.srcObject = null
    }
  }, [stream, selectedGlasses, glassesImageLoaded])

  return (
    <div className="fitting-view">
      <video
        ref={videoRef}
        className="fitting-video"
        playsInline
        muted
        style={{ display: 'none' }}
      />
      <canvas
        ref={canvasRef}
        className="fitting-canvas"
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    </div>
  )
}
