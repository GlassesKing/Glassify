/**
 * MediaPipe Face Landmarker 초기화 및 연속 감지
 * - 추후 기존 웹/앱에서 이 모듈만 import 해서 재사용 가능하도록 분리
 */
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import type { LandmarkPoint } from '../types'

/** MediaPipe 랜드마크 한 점 (패키지 내부 타입 호환) */
interface NormalizedLandmark {
  x: number
  y: number
  z?: number
}

const WASM_BASE =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

let faceLandmarkerInstance: FaceLandmarker | null = null

export async function getFaceLandmarker(): Promise<FaceLandmarker> {
  if (faceLandmarkerInstance) return faceLandmarkerInstance
  const vision = await FilesetResolver.forVisionTasks(WASM_BASE)
  faceLandmarkerInstance = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MODEL_URL,
      delegate: 'GPU',
    },
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrix: false,
    numFaces: 1,
    runningMode: 'VIDEO',
  })
  return faceLandmarkerInstance
}

export function convertToLandmarkPoint(landmark: NormalizedLandmark): LandmarkPoint {
  return { x: landmark.x, y: landmark.y, z: landmark.z }
}

export function detectFaceLandmarks(
  landmarker: FaceLandmarker,
  video: HTMLVideoElement,
  timestamp: number
): LandmarkPoint[] | null {
  const result = landmarker.detectForVideo(video, timestamp)
  if (!result.faceLandmarks?.length) return null
  return result.faceLandmarks[0].map(convertToLandmarkPoint)
}
