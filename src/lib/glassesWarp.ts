/**
 * 랜드마크 기반 안경 왜곡 오버레이
 * - 얼굴 4점(템플·코뿌리 등)에 맞춰 안경 이미지를 그리드로 나누어 원근 왜곡
 * - 안경이 얼굴에 밀착된 느낌을 위해 2D 왜곡 적용
 */
import type { LandmarkPoint } from '../types'
import { GLASSES_LANDMARKS } from '../types'

const MIRROR = true
const GRID_SIZE = 12

export interface WarpGlassesOptions {
  ctx: CanvasRenderingContext2D
  landmarks: LandmarkPoint[]
  videoWidth: number
  videoHeight: number
  canvasWidth: number
  canvasHeight: number
  glassesImage: HTMLImageElement
}

function normToCanvas(
  x: number,
  y: number,
  videoWidth: number,
  videoHeight: number,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } {
  const scaleX = canvasWidth / videoWidth
  const scaleY = canvasHeight / videoHeight
  const scale = Math.min(scaleX, scaleY)
  const offsetX = (canvasWidth - videoWidth * scale) / 2
  const offsetY = (canvasHeight - videoHeight * scale) / 2
  let px = x * videoWidth * scale + offsetX
  const py = y * videoHeight * scale + offsetY
  if (MIRROR) px = canvasWidth - px
  return { x: px, y: py }
}

/** 안경 영역 4꼭짓점 (정규화 좌표): [좌상, 우상, 우하, 좌하] → 캔버스 좌표 */
function getGlassesQuad(
  landmarks: LandmarkPoint[],
  vw: number,
  vh: number,
  cw: number,
  ch: number
): [{ x: number; y: number }[], number] {
  const noseRoot = landmarks[GLASSES_LANDMARKS.noseRoot]
  const leftTemple = landmarks[GLASSES_LANDMARKS.leftTemple]
  const rightTemple = landmarks[GLASSES_LANDMARKS.rightTemple]
  const leftEyeOuter = landmarks[GLASSES_LANDMARKS.leftEyeOuter]
  const rightEyeOuter = landmarks[GLASSES_LANDMARKS.rightEyeOuter]
  const leftEyeInner = landmarks[GLASSES_LANDMARKS.leftEyeInner]
  const rightEyeInner = landmarks[GLASSES_LANDMARKS.rightEyeInner]
  if (
    !noseRoot ||
    !leftTemple ||
    !rightTemple ||
    !leftEyeOuter ||
    !rightEyeOuter ||
    !leftEyeInner ||
    !rightEyeInner
  ) {
    return [[], 0]
  }

  const center = normToCanvas(noseRoot.x, noseRoot.y, vw, vh, cw, ch)
  const left = normToCanvas(leftTemple.x, leftTemple.y, vw, vh, cw, ch)
  const right = normToCanvas(rightTemple.x, rightTemple.y, vw, vh, cw, ch)
  const leftOuter = normToCanvas(leftEyeOuter.x, leftEyeOuter.y, vw, vh, cw, ch)
  const rightOuter = normToCanvas(rightEyeOuter.x, rightEyeOuter.y, vw, vh, cw, ch)
  const leftInner = normToCanvas(leftEyeInner.x, leftEyeInner.y, vw, vh, cw, ch)
  const rightInner = normToCanvas(rightEyeInner.x, rightEyeInner.y, vw, vh, cw, ch)

  const eyeCenterY = (leftOuter.y + rightOuter.y) / 2
  const topY = eyeCenterY - Math.abs(rightOuter.y - rightInner.y) * 1.4
  const bottomY = eyeCenterY + Math.abs(rightOuter.y - rightInner.y) * 1.6

  const leftTop = { x: left.x + (center.x - left.x) * 0.15, y: topY }
  const rightTop = { x: right.x + (center.x - right.x) * 0.15, y: topY }
  const rightBottom = { x: right.x + (center.x - right.x) * 0.1, y: bottomY }
  const leftBottom = { x: left.x + (center.x - left.x) * 0.1, y: bottomY }

  const quad: { x: number; y: number }[] = [leftTop, rightTop, rightBottom, leftBottom]
  const width = Math.hypot(right.x - left.x, right.y - left.y)
  return [quad, width]
}

/** 3점 대응으로 2D 아핀 행렬 (a,c,e; b,d,f) 계산. setTransform(a,b,c,d,e,f) */
function getAffineFromTriangles(
  s1: { x: number; y: number },
  s2: { x: number; y: number },
  s3: { x: number; y: number },
  d1: { x: number; y: number },
  d2: { x: number; y: number },
  d3: { x: number; y: number },
  imgW: number,
  imgH: number
): { a: number; b: number; c: number; d: number; e: number; f: number } {
  const x1 = s1.x * imgW
  const y1 = s1.y * imgH
  const x2 = s2.x * imgW
  const y2 = s2.y * imgH
  const x3 = s3.x * imgW
  const y3 = s3.y * imgH
  const det = x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2)
  if (Math.abs(det) < 1e-10) return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }
  const a = (d1.x * (y2 - y3) + d2.x * (y3 - y1) + d3.x * (y1 - y2)) / det
  const b = (d1.y * (y2 - y3) + d2.y * (y3 - y1) + d3.y * (y1 - y2)) / det
  const c = (d1.x * (x3 - x2) + d2.x * (x1 - x3) + d3.x * (x2 - x1)) / det
  const d = (d1.y * (x3 - x2) + d2.y * (x1 - x3) + d3.y * (x2 - x1)) / det
  const e = d1.x - a * x1 - c * y1
  const f = d1.y - b * x1 - d * y1
  return { a, b, c, d, e, f }
}

/** 사각형 내부 점 (bilinear): s,t in [0,1] */
function bilinear(
  s: number,
  t: number,
  p00: { x: number; y: number },
  p10: { x: number; y: number },
  p11: { x: number; y: number },
  p01: { x: number; y: number }
): { x: number; y: number } {
  return {
    x: (1 - s) * (1 - t) * p00.x + s * (1 - t) * p10.x + (1 - s) * t * p01.x + s * t * p11.x,
    y: (1 - s) * (1 - t) * p00.y + s * (1 - t) * p10.y + (1 - s) * t * p01.y + s * t * p11.y,
  }
}

/**
 * 랜드마크에 맞춰 안경 이미지를 왜곡해 캔버스에 그림
 */
export function warpGlassesToFace(options: WarpGlassesOptions): void {
  const {
    ctx,
    landmarks,
    videoWidth: vw,
    videoHeight: vh,
    canvasWidth: cw,
    canvasHeight: ch,
    glassesImage: img,
  } = options

  if (!landmarks || landmarks.length < 468) return
  const [quad] = getGlassesQuad(landmarks, vw, vh, cw, ch)
  if (quad.length !== 4) return

  const imgW = img.naturalWidth || 1
  const imgH = img.naturalHeight || 1

  const [p00, p10, p11, p01] = quad

  const gw = GRID_SIZE
  const gh = GRID_SIZE

  ctx.save()

  for (let j = 0; j < gh; j++) {
    for (let i = 0; i < gw; i++) {
      const s0 = i / gw
      const t0 = j / gh
      const s1 = (i + 1) / gw
      const t1 = (j + 1) / gh

      const src00 = { x: s0, y: t0 }
      const src10 = { x: s1, y: t0 }
      const src11 = { x: s1, y: t1 }
      const src01 = { x: s0, y: t1 }

      const dst00 = bilinear(s0, t0, p00, p10, p11, p01)
      const dst10 = bilinear(s1, t0, p00, p10, p11, p01)
      const dst11 = bilinear(s1, t1, p00, p10, p11, p01)
      const dst01 = bilinear(s0, t1, p00, p10, p11, p01)

      const tri1 = getAffineFromTriangles(src00, src10, src11, dst00, dst10, dst11, imgW, imgH)
      ctx.beginPath()
      ctx.moveTo(dst00.x, dst00.y)
      ctx.lineTo(dst10.x, dst10.y)
      ctx.lineTo(dst11.x, dst11.y)
      ctx.closePath()
      ctx.clip()
      ctx.setTransform(tri1.a, tri1.b, tri1.c, tri1.d, tri1.e, tri1.f)
      ctx.drawImage(img, 0, 0, imgW, imgH, 0, 0, imgW, imgH)
      ctx.restore()
      ctx.save()

      const tri2 = getAffineFromTriangles(src00, src11, src01, dst00, dst11, dst01, imgW, imgH)
      ctx.beginPath()
      ctx.moveTo(dst00.x, dst00.y)
      ctx.lineTo(dst11.x, dst11.y)
      ctx.lineTo(dst01.x, dst01.y)
      ctx.closePath()
      ctx.clip()
      ctx.setTransform(tri2.a, tri2.b, tri2.c, tri2.d, tri2.e, tri2.f)
      ctx.drawImage(img, 0, 0, imgW, imgH, 0, 0, imgW, imgH)
      ctx.restore()
      ctx.save()
    }
  }

  ctx.restore()
}
