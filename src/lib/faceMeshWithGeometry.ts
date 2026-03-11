/**
 * MediaPipe Face Mesh + Face Geometry (3D pose transform)
 * - enableFaceGeometry로 pose matrix 제공
 */
import { FaceMesh, matrixDataToMatrix } from '@mediapipe/face_mesh'
import type { LandmarkPoint } from '../types'

const CDN_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619'

let faceMeshInstance: FaceMesh | null = null

export interface FaceGeometryResult {
  landmarks: LandmarkPoint[]
  /** 4x4 pose transform matrix (column-major, row-major array) */
  poseMatrix: number[]
}

export interface FaceMeshGeometryApi {
  send: (video: HTMLVideoElement) => Promise<void>
}

/** MediaPipe Face Geometry 카메라 파라미터 (Three.js와 동기화) */
export const FACE_CAMERA = {
  verticalFovDegrees: 63,
  near: 1,
  far: 10000,
}

export async function initFaceMeshWithGeometry(
  onResult: (result: FaceGeometryResult | null) => void
): Promise<FaceMeshGeometryApi> {
  if (faceMeshInstance) {
    return {
      send: (video: HTMLVideoElement) => faceMeshInstance!.send({ image: video }),
    }
  }

  const faceMesh = new FaceMesh({
    locateFile: (file) => `${CDN_BASE}/${file}`,
  })

  faceMesh.setOptions({
    maxNumFaces: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
    selfieMode: true,
    enableFaceGeometry: true,
    refineLandmarks: false,
  })

  faceMesh.onResults((results) => {
    const landmarks = results.multiFaceLandmarks?.[0]
    const geometry = results.multiFaceGeometry?.[0]
    if (!landmarks?.length || !geometry) {
      onResult(null)
      return
    }

    const points: LandmarkPoint[] = landmarks.map((p) => ({
      x: p.x,
      y: p.y,
      z: p.z,
    }))

    const poseData = geometry.getPoseTransformMatrix()
    const matrix2d = matrixDataToMatrix(poseData)
    // column-major 4x4 -> flat array for Three.js
    const poseMatrix: number[] = []
    for (let col = 0; col < 4; col++) {
      for (let row = 0; row < 4; row++) {
        poseMatrix.push(matrix2d[row]?.[col] ?? 0)
      }
    }

    onResult({ landmarks: points, poseMatrix })
  })

  await faceMesh.initialize()
  faceMeshInstance = faceMesh

  return {
    send: (video: HTMLVideoElement) => faceMesh.send({ image: video }),
  }
}
