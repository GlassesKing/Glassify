# 웹에서 실시간 얼굴 인식하기 (MediaPipe Face Landmarker)

React + Vite + MediaPipe로 **카메라 영상에서 얼굴을 인식하고, 478개 랜드마크를 실시간으로 그리는** 부분까지 정리한 글입니다.  
(안경 가상 피팅은 다음 글에서 다룹니다.)

---

## 1. 뭘 만드는지

- 브라우저에서 **전면 카메라**를 켠다.
- **MediaPipe Face Landmarker**로 매 프레임 얼굴을 감지한다.
- 감지된 **얼굴 랜드마크(478점)** 를 캔버스에 **초록 점**으로 그려서 확인한다.

즉, **“얼굴 인식”** 구간만 다룹니다. (랜드마크 ON/OFF 버튼으로 점 표시 여부만 제어)

---

## 2. 사용 기술

| 구분 | 기술 |
|------|------|
| 프레임워크 | React 18 |
| 빌드 | Vite 5 |
| 언어 | TypeScript |
| 얼굴 인식 | **@mediapipe/tasks-vision** (Face Landmarker) |

Face Landmarker는 **478개 얼굴 랜드마크**와 선택 시 **facial transformation matrix**까지 줄 수 있어서, 나중에 3D 오버레이(안경 등)를 붙이기 좋습니다.

---

## 3. 프로젝트 셋업

```bash
npm create vite@latest my-face-demo -- --template react-ts
cd my-face-demo
npm install @mediapipe/tasks-vision
```

- 카메라: 브라우저 **getUserMedia** 사용 (HTTPS 또는 localhost 필요).
- Face Landmarker 모델은 **Google CDN**에서 불러오므로 인터넷 필요.

---

## 4. 전체 흐름

1. **카메라 켜기** → `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })`
2. **영상을 &lt;video&gt;에 넣고 재생**
3. **Face Landmarker 초기화** (WASM + 모델 로드, 한 번만)
4. **매 프레임**  
   - 비디오를 캔버스에 그린 뒤  
   - 현재 프레임을 `faceLandmarker.detectForVideo(video, timestamp)` 로 넘기고  
   - 반환된 `faceLandmarks[0]` (478점)를 캔버스에 점으로 그림

---

## 5. Face Landmarker 초기화 (핵심)

MediaPipe **tasks-vision**의 Face Landmarker를 쓰면 됩니다.  
모델 파일은 Google 제공 URL, WASM은 npm 패키지의 CDN 경로를 사용합니다.

```ts
// faceLandmarker.ts
import {
  FaceLandmarker,
  FilesetResolver,
} from '@mediapipe/tasks-vision'

const WASM_BASE =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

export async function initFaceLandmarker(
  onResult: (result: { landmarks: { x: number; y: number; z?: number }[] | null }) => void
) {
  const wasmFileset = await FilesetResolver.forVisionTasks(WASM_BASE)
  const faceLandmarker = await FaceLandmarker.createFromOptions(wasmFileset, {
    baseOptions: { modelAssetPath: MODEL_URL },
    numFaces: 1,
    minFaceDetectionConfidence: 0.5,
    minFacePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
    runningMode: 'VIDEO',  // 비디오 스트림용
  })

  return {
    send: async (video: HTMLVideoElement) => {
      const result = faceLandmarker.detectForVideo(video, performance.now())
      const list = result.faceLandmarks?.[0] ?? null
      onResult({
        landmarks: list ? list.map((p) => ({ x: p.x, y: p.y, z: p.z })) : null,
      })
    },
  }
}
```

- **runningMode: 'VIDEO'** 이면 `detectForVideo(video, timestamp)` 로 연속 프레임에 쓸 수 있습니다.
- **numFaces: 1** 로 한 얼굴만 감지해도 됩니다.

---

## 6. 카메라 스트림 훅 (간단 버전)

```ts
// useCamera.ts
import { useState, useCallback } from 'react'

export function useCamera() {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)

  const start = useCallback(async () => {
    try {
      setError(null)
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      setStream(media)
    } catch (e) {
      setError(e instanceof Error ? e.message : '카메라 접근 실패')
      setStream(null)
    }
  }, [])

  const stop = useCallback(() => {
    stream?.getTracks().forEach((t) => t.stop())
    setStream(null)
  }, [stream])

  return { stream, error, start, stop }
}
```

---

## 7. 그리기 루프 (얼굴 인식 + 랜드마크 그리기)

한 컴포넌트에서 **video → canvas** 그리고 **매 프레임 Face Landmarker 호출 → 랜드마크 점 그리기**까지 처리하는 흐름입니다.

```tsx
// 1) ref: video, canvas, 마지막 랜드마크 결과, Face Landmarker API
const videoRef = useRef<HTMLVideoElement>(null)
const canvasRef = useRef<HTMLCanvasElement>(null)
const lastResultRef = useRef<{ landmarks: { x: number; y: number }[] | null }>(null)
const faceApiRef = useRef<Awaited<ReturnType<typeof initFaceLandmarker>> | null>(null)

// 2) 스트림 바뀌면 video에 넣고, Face Landmarker 한 번만 초기화
useEffect(() => {
  const video = videoRef.current
  const canvas = canvasRef.current
  if (!stream || !video || !canvas) return

  video.srcObject = stream
  video.play().catch(() => {})

  initFaceLandmarker((result) => {
    lastResultRef.current = result
  }).then((api) => {
    faceApiRef.current = api
  })

  const ctx = canvas.getContext('2d')!
  const draw = () => {
    const vw = video.videoWidth
    const vh = video.videoHeight
    if (vw === 0 || vh === 0) {
      requestAnimationFrame(draw)
      return
    }
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight
    const cw = canvas.width
    const ch = canvas.height

    // 비디오 프레임 그리기
    ctx.drawImage(video, 0, 0, cw, ch)

    // 현재 프레임으로 얼굴 감지
    faceApiRef.current?.send(video)

    // 랜드마크가 있으면 점으로 그리기 (정규화 좌표 0~1 → 픽셀)
    const result = lastResultRef.current
    if (result?.landmarks?.length) {
      ctx.fillStyle = 'rgba(0, 255, 100, 0.8)'
      for (const p of result.landmarks) {
        const px = p.x * cw
        const py = p.y * ch
        ctx.beginPath()
        ctx.arc(px, py, 3, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    requestAnimationFrame(draw)
  }
  const raf = requestAnimationFrame(draw)
  return () => {
    cancelAnimationFrame(raf)
    video.srcObject = null
    faceApiRef.current = null
  }
}, [stream])
```

- **lastResultRef**: Landmarker가 비동기로 결과를 넘기므로, 그리기 루프에서는 “가장 마지막 결과”만 사용합니다.
- 랜드마크 좌표는 **정규화 (0~1)** 이라서 `p.x * cw`, `p.y * ch` 로 캔버스 픽셀으로 바꿉니다.

---

## 8. UI 예시 (카메라 켜기 + 캔버스)

```tsx
function App() {
  const { stream, error, start, stop } = useCamera()

  return (
    <div>
      {!stream ? (
        <div>
          {error && <p>{error}</p>}
          <button onClick={start}>카메라 켜기</button>
        </div>
      ) : (
        <>
          <video ref={videoRef} playsInline muted style={{ display: 'none' }} />
          <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
          <button onClick={stop}>카메라 끄기</button>
        </>
      )}
    </div>
  )
}
```

- **video**는 숨기고, **canvas**만 보이게 해서 “실시간 얼굴 인식” 화면처럼 보이게 할 수 있습니다.

---

## 9. 정리

- **getUserMedia**로 전면 카메라 스트림 획득.
- **@mediapipe/tasks-vision**의 **Face Landmarker**로 `detectForVideo(video, timestamp)` 호출.
- 나온 **478개 랜드마크**를 정규화 좌표 → 픽셀 변환해서 **canvas에 점**으로 그리면, “얼굴 인식” 단계는 완성입니다.

다음 단계에서는 이 랜드마크를 이용해 **안경 이미지나 3D 모델을 얼굴에 붙이는** 가상 피팅을 이어서 다루면 됩니다.

---

*이 글은 Glassify 프로젝트의 얼굴 인식 부분만 발췌·요약한 내용입니다.*
