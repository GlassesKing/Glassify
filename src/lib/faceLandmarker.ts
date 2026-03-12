/**
 * MediaPipe Face Landmarker (tasks-vision)
 * - 478 랜드마크 + facial transformation matrix (3D 오버레이용)
 */
import {
  FaceLandmarker,
  FilesetResolver,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision'
import type { LandmarkPoint } from '../types'

const WASM_BASE =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

let faceLandmarkerInstance: FaceLandmarker | null = null

export interface FaceLandmarkerResult {
  landmarks: LandmarkPoint[] | null
  /** 4x4 변환 행렬 (column-major, Three.js 호환). 없으면 null */
  transformationMatrix: number[] | null
}

export interface FaceLandmarkerApi {
  send: (video: HTMLVideoElement) => Promise<void>
}

function toLandmarkPoint(p: NormalizedLandmark): LandmarkPoint {
  return { x: p.x, y: p.y, z: p.z }
}

/** MediaPipe Matrix (row-major) → Three.js column-major 16 배열 */
function matrixToColumnMajor(data: number[]): number[] {
  if (data.length < 16) return []
  const out: number[] = []
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) out.push(data[row * 4 + col] ?? 0)
  }
  return out
}

/**
 * Face Landmarker 초기화. 랜드마크 + facial transformation matrix 반환 (3D 오버레이용)
 */
export async function initFaceLandmarker(
  onResult: (result: FaceLandmarkerResult) => void
): Promise<FaceLandmarkerApi> {
  if (faceLandmarkerInstance) {
    return {
      send: async (video: HTMLVideoElement) => {
        const result = faceLandmarkerInstance!.detectForVideo(
          video,
          performance.now()
        )
        const list = result.faceLandmarks?.[0]
        const mat = result.facialTransformationMatrixes?.[0]
        onResult({
          landmarks: list ? list.map(toLandmarkPoint) : null,
          transformationMatrix:
            mat?.data?.length === 16 ? matrixToColumnMajor(mat.data) : null,
        })
      },
    }
  }

  const wasmFileset = await FilesetResolver.forVisionTasks(WASM_BASE)
  const faceLandmarker = await FaceLandmarker.createFromOptions(wasmFileset, {
    baseOptions: { modelAssetPath: MODEL_URL },
    numFaces: 1,
    minFaceDetectionConfidence: 0.3,
    minFacePresenceConfidence: 0.3,
    minTrackingConfidence: 0.3,
    runningMode: 'VIDEO',
    outputFacialTransformationMatrixes: true,
  })
  faceLandmarkerInstance = faceLandmarker

  return {
    send: async (video: HTMLVideoElement) => {
      try {
        const result = faceLandmarker.detectForVideo(video, performance.now())
        const list = result.faceLandmarks?.[0]
        const mat = result.facialTransformationMatrixes?.[0]
        onResult({
          landmarks: list ? list.map(toLandmarkPoint) : null,
          transformationMatrix:
            mat?.data?.length === 16 ? matrixToColumnMajor([...mat.data]) : null,
        })
      } catch (e) {
        onResult({ landmarks: null, transformationMatrix: null })
      }
    },
  }
}
