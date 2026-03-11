/**
 * MUSE 04 등 2D 오버레이(drawGlasses)와 동일한 화면 좌표·크기·회전 계산.
 * GLB도 같은 transform으로 맞추기 위해 공유.
 */
import type { LandmarkPoint } from '../types'
import { GLASSES_LANDMARKS } from '../types'

const DEFAULT_FRONT_CROP_RATIO = 0.58

function normToCanvas(
  x: number,
  y: number,
  outputWidth: number,
  outputHeight: number,
  mirror: boolean
): { x: number; y: number } {
  let px = x * outputWidth
  const py = y * outputHeight
  if (mirror) px = outputWidth - px
  return { x: px, y: py }
}

export interface GlassesScreenTransform {
  centerPx: number
  centerPy: number
  widthPx: number
  heightPx: number
  /** 라디안, drawGlasses와 동일 (ctx.rotate 인자) */
  rotation: number
}

/**
 * drawGlasses와 동일한 기준:
 * - 중심: 양 눈 안쪽 중점
 * - 폭: templeDistPx * 1.1 또는 frameWidthCm 기반
 * - 높이: eyeSpanPx * 2 또는 이미지 비율
 * - 회전: 관자 연선
 */
export function getGlassesScreenTransform(
  landmarks: LandmarkPoint[],
  videoWidth: number,
  videoHeight: number,
  outputWidth: number,
  outputHeight: number,
  options?: {
    frameWidthCm?: number
    faceWidthCm?: number
    frontCropRatio?: number
    /** drawGlasses와 같이 mirror=false (부모 scaleX(-1)로 반전) */
    mirror?: boolean
  }
): GlassesScreenTransform | null {
  if (landmarks.length < 468) return null

  const mirror = options?.mirror ?? false
  const faceWidthCm = options?.faceWidthCm ?? 15
  const frontCropRatio = options?.frontCropRatio ?? DEFAULT_FRONT_CROP_RATIO
  const cropRatio = Math.max(0.35, Math.min(0.95, frontCropRatio))

  const toCanvas = (x: number, y: number) =>
    normToCanvas(x, y, outputWidth, outputHeight, mirror)

  const leftTemple = landmarks[GLASSES_LANDMARKS.leftTemple]
  const rightTemple = landmarks[GLASSES_LANDMARKS.rightTemple]
  const leftEyeInner = landmarks[GLASSES_LANDMARKS.leftEyeInner]
  const rightEyeInner = landmarks[GLASSES_LANDMARKS.rightEyeInner]
  const leftEyeOuter = landmarks[GLASSES_LANDMARKS.leftEyeOuter]
  const rightEyeOuter = landmarks[GLASSES_LANDMARKS.rightEyeOuter]
  const noseRoot = landmarks[GLASSES_LANDMARKS.noseRoot]
  if (
    !leftTemple ||
    !rightTemple ||
    !leftEyeInner ||
    !rightEyeInner ||
    !leftEyeOuter ||
    !rightEyeOuter ||
    !noseRoot
  )
    return null

  const left = toCanvas(leftTemple.x, leftTemple.y)
  const right = toCanvas(rightTemple.x, rightTemple.y)
  const centerNormX = (leftEyeInner.x + rightEyeInner.x) / 2
  // 눈 안쪽만 쓰면 눈썹 쪽으로 올라감 → 코뿌리(노즈 브릿지) 쪽으로 내려서 안경이 눈·코에 안착
  const centerNormY = (leftEyeInner.y + rightEyeInner.y) * 0.4 + noseRoot.y * 0.6
  const center = toCanvas(centerNormX, centerNormY)
  const leftEye = toCanvas(leftEyeOuter.x, leftEyeOuter.y)
  const rightEye = toCanvas(rightEyeOuter.x, rightEyeOuter.y)

  const templeDistPx = Math.hypot(right.x - left.x, right.y - left.y)
  const eyeSpanPx = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y)

  let widthPx: number
  let heightPx: number
  const frameWidthCm = options?.frameWidthCm
  if (frameWidthCm != null && frameWidthCm > 0 && faceWidthCm > 0) {
    const pixelsPerCm = templeDistPx / faceWidthCm
    widthPx = frameWidthCm * pixelsPerCm
    // 이미지 없을 때(GLB)는 눈 세로 비율로 높이 근사 (drawGlasses는 이미지 비율 사용)
    heightPx = eyeSpanPx * 2.0
  } else {
    widthPx = templeDistPx * 1.1
    heightPx = eyeSpanPx * 2.0
  }

  const rotation = Math.atan2(rightTemple.y - leftTemple.y, rightTemple.x - leftTemple.x)

  return {
    centerPx: center.x,
    centerPy: center.y,
    widthPx,
    heightPx,
    rotation,
  }
}
