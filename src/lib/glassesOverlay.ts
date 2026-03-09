/**
 * 얼굴 랜드마크 기반 안경 오버레이 그리기
 * - 정규화 좌표(0~1)를 캔버스 픽셀 좌표로 변환 후 안경 이미지 배치
 */
import type { LandmarkPoint } from '../types'
import { GLASSES_LANDMARKS } from '../types'

export interface DrawGlassesOptions {
  ctx: CanvasRenderingContext2D
  landmarks: LandmarkPoint[]
  videoWidth: number
  videoHeight: number
  glassesImage: HTMLImageElement
  /** 안경 이미지가 로드된 상태인지 */
  imageLoaded: boolean
  /** 캔버스에 그리는 영역 (미러링된 비디오 기준) */
  outputWidth: number
  outputHeight: number
}

/** 두 점 사이 각도(라디안), 수평 기준 */
function angleBetween(
  p1: LandmarkPoint,
  p2: LandmarkPoint
): number {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x)
}

/** 정규화 좌표 → 캔버스 좌표 (비디오가 캔버스에 맞춰 스케일된 경우) */
function normToCanvas(
  x: number,
  y: number,
  videoWidth: number,
  videoHeight: number,
  outputWidth: number,
  outputHeight: number,
  mirror: boolean
): { x: number; y: number } {
  const scaleX = outputWidth / videoWidth
  const scaleY = outputHeight / videoHeight
  const scale = Math.min(scaleX, scaleY)
  const offsetX = (outputWidth - videoWidth * scale) / 2
  const offsetY = (outputHeight - videoHeight * scale) / 2
  let px = x * videoWidth * scale + offsetX
  const py = y * videoHeight * scale + offsetY
  if (mirror) px = outputWidth - px
  return { x: px, y: py }
}

export function drawGlasses(options: DrawGlassesOptions): void {
  const {
    ctx,
    landmarks,
    videoWidth,
    videoHeight,
    glassesImage,
    imageLoaded,
    outputWidth,
    outputHeight,
  } = options

  if (!imageLoaded || landmarks.length < 468) return

  const mirror = true
  const leftTemple = landmarks[GLASSES_LANDMARKS.leftTemple]
  const rightTemple = landmarks[GLASSES_LANDMARKS.rightTemple]
  const noseRoot = landmarks[GLASSES_LANDMARKS.noseRoot]
  const leftEyeOuter = landmarks[GLASSES_LANDMARKS.leftEyeOuter]
  const rightEyeOuter = landmarks[GLASSES_LANDMARKS.rightEyeOuter]

  const left = normToCanvas(leftTemple.x, leftTemple.y, videoWidth, videoHeight, outputWidth, outputHeight, mirror)
  const right = normToCanvas(rightTemple.x, rightTemple.y, videoWidth, videoHeight, outputWidth, outputHeight, mirror)
  const center = normToCanvas(noseRoot.x, noseRoot.y, videoWidth, videoHeight, outputWidth, outputHeight, mirror)
  const leftEye = normToCanvas(leftEyeOuter.x, leftEyeOuter.y, videoWidth, videoHeight, outputWidth, outputHeight, mirror)
  const rightEye = normToCanvas(rightEyeOuter.x, rightEyeOuter.y, videoWidth, videoHeight, outputWidth, outputHeight, mirror)

  const width = Math.hypot(right.x - left.x, right.y - left.y) * 1.35
  const eyeDist = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y)
  const height = eyeDist * 1.8

  const rotation = angleBetween(leftTemple, rightTemple)

  ctx.save()
  ctx.translate(center.x, center.y)
  ctx.rotate(rotation)
  ctx.drawImage(glassesImage, -width / 2, -height / 2, width, height)
  ctx.restore()
}
