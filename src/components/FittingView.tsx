import { useRef, useEffect, useState, useCallback } from 'react'
import { initFaceLandmarker } from '../lib/faceLandmarker'
import { Glasses3DRenderer } from '../lib/glasses3d'
import { getCenterGlassesFrame } from '../lib/glassesDetection'
import { drawGlasses } from '../lib/glassesOverlay'
import type { GlassesProduct } from '../types'
import type { FaceLandmarkerResult } from '../lib/faceLandmarker'

interface FittingViewProps {
  stream: MediaStream | null
  selectedGlasses: GlassesProduct | null
  /** 얼굴 기준 너비 (cm). 양 관자 거리 등. 넣으면 안경테 cm와 맞춰 실제 비율로 표시. 기본 15 */
  faceWidthCm?: number
}

export function FittingView({ stream, selectedGlasses, faceWidthCm = 15 }: FittingViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const canvasGlassesRef = useRef<HTMLCanvasElement>(null)
  const glassesImageRef = useRef<HTMLImageElement | null>(null)
  const lastTextureImageRef = useRef<HTMLImageElement | null>(null)
  const rafRef = useRef<number>(0)
  const lastResultRef = useRef<FaceLandmarkerResult | null>(null)
  const faceLandmarkerApiRef = useRef<Awaited<ReturnType<typeof initFaceLandmarker>> | null>(null)
  const glasses3dRef = useRef<Glasses3DRenderer | null>(null)
  const lastModelUrlRef = useRef<string | null>(null)
  const showLandmarksRef = useRef(false)
  const [ready, setReady] = useState(false)
  const [showLandmarks, setShowLandmarks] = useState(false)

  showLandmarksRef.current = showLandmarks

  const loadGlassesImage = useCallback((product: GlassesProduct | null) => {
    glassesImageRef.current = null
    if (!product?.imageUrl) return
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.referrerPolicy = 'no-referrer'
    img.onload = () => {
      glassesImageRef.current = img
    }
    img.onerror = () => {}
    img.src = product.imageUrl
  }, [])

  useEffect(() => {
    loadGlassesImage(selectedGlasses ?? null)
  }, [selectedGlasses, loadGlassesImage])

  useEffect(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    const canvasGlasses = canvasGlassesRef.current
    if (!stream || !video || !canvas || !canvasGlasses) return

    video.srcObject = stream
    video.play().catch(() => {})

    let faceLandmarkerApi: Awaited<ReturnType<typeof initFaceLandmarker>> | null = null
    let useVideoFrameCallback = false
    let lastSentTime = -1

    const run = async () => {
      try {
        faceLandmarkerApi = await initFaceLandmarker((result) => {
          lastResultRef.current = result
        })
        faceLandmarkerApiRef.current = faceLandmarkerApi
        setReady(true)
      } catch (e) {
        console.error('Face Landmarker init failed', e)
      }
    }
    run()

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let videoFrameId: number | undefined
    const reqVFC = (video as HTMLVideoElement & { requestVideoFrameCallback?: (cb: (now: number, metadata: unknown) => void) => number }).requestVideoFrameCallback
    const cancelVFC = typeof (video as HTMLVideoElement & { cancelVideoFrameCallback?: (id: number) => void }).cancelVideoFrameCallback === 'function'
      ? (id: number) => (video as HTMLVideoElement & { cancelVideoFrameCallback: (id: number) => void }).cancelVideoFrameCallback(id)
      : () => {}

    if (typeof reqVFC === 'function') {
      useVideoFrameCallback = true
      const scheduleNext = () => {
        if (faceLandmarkerApiRef.current && video.readyState >= 2) {
          faceLandmarkerApiRef.current.send(video).catch(() => {})
        }
        videoFrameId = reqVFC.call(video, scheduleNext)
      }
      videoFrameId = reqVFC.call(video, scheduleNext)
    }

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

      const useDefaultMeshOnly = selectedGlasses?.useDefaultMeshOnly === true
      const useSimpleOverlay = selectedGlasses && !selectedGlasses.modelUrl && !useDefaultMeshOnly
      const wantModelUrl = useDefaultMeshOnly ? null : (selectedGlasses?.modelUrl ?? null)
      if (canvasGlasses) {
        canvasGlasses.width = cw
        canvasGlasses.height = ch
        if (selectedGlasses) {
          if (useSimpleOverlay) {
            glasses3dRef.current?.dispose()
            glasses3dRef.current = null
            lastModelUrlRef.current = null
          } else {
            const modelUrlChanged = lastModelUrlRef.current !== wantModelUrl
            if (modelUrlChanged && glasses3dRef.current) {
              glasses3dRef.current.dispose()
              glasses3dRef.current = null
              lastModelUrlRef.current = null
            }
            if (!glasses3dRef.current) {
              try {
                glasses3dRef.current = new Glasses3DRenderer({
                  canvas: canvasGlasses,
                  videoWidth: vw,
                  videoHeight: vh,
                  mirror: true,
                  modelUrl: wantModelUrl,
                })
                lastModelUrlRef.current = wantModelUrl
                glasses3dRef.current.resize(vw, vh, cw, ch)
              } catch (e) {
                console.warn('3D glasses renderer init failed', e)
              }
            } else {
              glasses3dRef.current.resize(vw, vh, cw, ch)
            }
          }
        } else {
          glasses3dRef.current?.dispose()
          glasses3dRef.current = null
          lastModelUrlRef.current = null
        }
      }

      ctx.drawImage(video, 0, 0, cw, ch)

      if (ready && faceLandmarkerApi && !useVideoFrameCallback) {
        const t = video.currentTime
        if (t !== lastSentTime) {
          lastSentTime = t
          faceLandmarkerApi.send(video).catch(() => {})
        }
      }

      const result = lastResultRef.current

      if (showLandmarksRef.current && result?.landmarks && result.landmarks.length > 0) {
        ctx.fillStyle = 'rgba(0, 255, 100, 0.8)'
        ctx.strokeStyle = 'rgba(0, 200, 80, 0.9)'
        const radius = Math.max(1, Math.min(cw, ch) / 500)
        for (const p of result.landmarks) {
          const px = p.x * cw
          const py = p.y * ch
          ctx.beginPath()
          ctx.arc(px, py, radius, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()
        }
      }

      const renderer = glasses3dRef.current
      const img = glassesImageRef.current
      const imageReady = img?.complete && img?.naturalWidth > 0
      const hasFaceForGlasses = result?.landmarks && result.landmarks.length >= 468

      if ((selectedGlasses?.modelUrl || useDefaultMeshOnly) && renderer && !hasFaceForGlasses) {
        renderer.clearToTransparent()
      }

      if (selectedGlasses && cw > 0 && ch > 0 && hasFaceForGlasses) {
        if (useSimpleOverlay && img && imageReady) {
          const ctxGlasses = canvasGlasses?.getContext('2d')
          if (ctxGlasses) {
            ctxGlasses.clearRect(0, 0, cw, ch)
            drawGlasses({
              ctx: ctxGlasses,
              landmarks: result.landmarks,
              videoWidth: vw,
              videoHeight: vh,
              glassesImage: img,
              imageLoaded: true,
              outputWidth: cw,
              outputHeight: ch,
              frameWidthCm:
                selectedGlasses.frameWidthCm ??
                (selectedGlasses.dimensionsMm
                  ? selectedGlasses.dimensionsMm.totalLength / 10
                  : undefined),
              faceWidthCm,
              frontCropRatio: selectedGlasses.frontCropRatio,
            })
          }
        } else if (renderer) {
          if (img && imageReady && !selectedGlasses.modelUrl && !useDefaultMeshOnly) {
            if (lastTextureImageRef.current !== img) {
              renderer.setTexture(img)
              lastTextureImageRef.current = img
            }
          }
          if (useDefaultMeshOnly && img && imageReady) {
            if (lastTextureImageRef.current !== img) {
              const frameToUse = getCenterGlassesFrame(img)
              renderer.setTextureOnDefaultFrame(img, frameToUse)
              lastTextureImageRef.current = img
            }
          }
          if (selectedGlasses.modelUrl) {
            renderer.renderWithLandmarks(result.landmarks, vw, vh, cw, ch, {
              frameWidthCm:
                selectedGlasses.frameWidthCm ??
                (selectedGlasses.dimensionsMm
                  ? selectedGlasses.dimensionsMm.totalLength / 10
                  : undefined),
              faceWidthCm,
              frontCropRatio: selectedGlasses.frontCropRatio,
            })
          } else if (result.transformationMatrix && result.transformationMatrix.length === 16 && !useDefaultMeshOnly) {
            renderer.renderWithPose(result.transformationMatrix)
          } else {
            renderer.renderWithLandmarks(result.landmarks, vw, vh, cw, ch)
          }
        }
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafRef.current)
      if (videoFrameId !== undefined && cancelVFC) cancelVFC(videoFrameId)
      video.srcObject = null
      faceLandmarkerApiRef.current = null
      glasses3dRef.current?.dispose()
      glasses3dRef.current = null
    }
  }, [stream, selectedGlasses, ready, faceWidthCm])

  return (
    <div className="fitting-view">
      <video
        ref={videoRef}
        className="fitting-video"
        playsInline
        muted
        style={{ display: 'none' }}
      />
      <div className="fitting-mirror-wrap" style={{ transform: 'scaleX(-1)' }}>
        <canvas
          ref={canvasRef}
          className="fitting-canvas"
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
        <canvas
          ref={canvasGlassesRef}
          className="fitting-canvas fitting-canvas-glasses"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            pointerEvents: 'none',
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
        />
      </div>
      {stream && (
        <button
          type="button"
          className="landmark-toggle"
          onClick={() => setShowLandmarks((v) => !v)}
          title={showLandmarks ? '랜드마크 끄기' : '랜드마크 켜기'}
        >
          랜드마크 {showLandmarks ? 'ON' : 'OFF'}
        </button>
      )}
    </div>
  )
}
