/**
 * 얼굴 랜드마크 기반 안경 오버레이
 * - 얼굴 평면에 붙어 보이도록 회전·크기만 적용 (원근 없음, 앞으로 뻗지 않음)
 * - 이미지 중앙(프론트만) 크롭으로 안경다리 제거
 * - 실제 배치 수치는 glassesScreenTransform 과 동일
 */
import type { LandmarkPoint } from '../types'
import { getGlassesScreenTransform } from './glassesScreenTransform'

const DEFAULT_FRONT_CROP_RATIO = 0.58

export interface DrawGlassesOptions {
  ctx: CanvasRenderingContext2D
  landmarks: LandmarkPoint[]
  videoWidth: number
  videoHeight: number
  glassesImage: HTMLImageElement
  imageLoaded: boolean
  outputWidth: number
  outputHeight: number
  frameWidthCm?: number
  faceWidthCm?: number
  /** 이미지 가로 중앙 비율(0~1). 작으면 다리 끝 더 숨김, 크면 옆면 더 보임. 기본 0.58 */
  frontCropRatio?: number
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
    frameWidthCm,
    faceWidthCm = 15,
    frontCropRatio = DEFAULT_FRONT_CROP_RATIO,
  } = options

  const cropRatio = Math.max(0.35, Math.min(0.95, frontCropRatio))
  const cropOffset = (1 - cropRatio) / 2

  if (!imageLoaded || landmarks.length < 468) return

  const transform = getGlassesScreenTransform(landmarks, videoWidth, videoHeight, outputWidth, outputHeight, {
    frameWidthCm,
    faceWidthCm,
    frontCropRatio,
    mirror: false,
  })
  if (!transform) return

  let width = transform.widthPx
  let height = transform.heightPx

  // frameWidthCm 사용 시 drawGlasses는 이미지 비율로 높이를 맞춤
  if (frameWidthCm != null && frameWidthCm > 0 && faceWidthCm > 0) {
    const imgW = glassesImage.naturalWidth || 1
    const imgH = glassesImage.naturalHeight || 1
    const cropW = cropRatio * imgW
    height = width * (imgH / cropW)
  }

  const imgW = glassesImage.naturalWidth || 1
  const imgH = glassesImage.naturalHeight || 1
  const cropX = cropOffset * imgW
  const cropW = cropRatio * imgW

  ctx.save()
  ctx.translate(transform.centerPx, transform.centerPy)
  ctx.rotate(transform.rotation)
  ctx.drawImage(glassesImage, cropX, 0, cropW, imgH, -width / 2, -height / 2, width, height)
  ctx.restore()
}
