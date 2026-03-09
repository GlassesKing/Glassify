/**
 * MediaPipe Face Mesh 초기화 및 연속 감지 (468 얼굴 랜드마크)
 * - @mediapipe/face_mesh 사용 (Face Landmarker 대신)
 */
import { FaceMesh } from '@mediapipe/face_mesh'
import type { LandmarkPoint } from '../types'

const CDN_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619'

let faceMeshInstance: FaceMesh | null = null

export interface FaceMeshApi {
  send: (video: HTMLVideoElement) => Promise<void>
}

/**
 * Face Mesh 초기화. onLandmarks는 매 프레임 감지 시 호출됨.
 */
export async function initFaceMesh(
  onLandmarks: (landmarks: LandmarkPoint[] | null) => void
): Promise<FaceMeshApi> {
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
  })

  faceMesh.onResults((results) => {
    const list = results.multiFaceLandmarks?.[0]
    if (list?.length) {
      const points: LandmarkPoint[] = list.map((p) => ({
        x: p.x,
        y: p.y,
        z: p.z,
      }))
      onLandmarks(points)
    } else {
      onLandmarks(null)
    }
  })

  await faceMesh.initialize()
  faceMeshInstance = faceMesh

  return {
    send: (video: HTMLVideoElement) => faceMesh.send({ image: video }),
  }
}
