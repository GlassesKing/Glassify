/**
 * 사진 내 안경 인식: 렌즈 두 개(원) + 그 사이 코받침 구조를 찾아
 * 인식한 안경 테두리 영역을 반환. 기본 테두리에 1:1 비율로 맞출 때 사용.
 */

export interface DetectedGlassesFrame {
  /** 이미지 내 안경 테두리 영역 (픽셀) */
  x: number
  y: number
  width: number
  height: number
  /** 좌/우 렌즈 중심 및 반지름 (픽셀) */
  leftLens: { cx: number; cy: number; r: number }
  rightLens: { cx: number; cy: number; r: number }
}

let openCvPromise: Promise<typeof import('@opencvjs/types').OpenCV> | null = null

function getOpenCV(): Promise<typeof import('@opencvjs/types').OpenCV> {
  if (!openCvPromise) {
    openCvPromise = import('@opencvjs/web').then((m) => m.loadOpenCV())
  }
  return openCvPromise
}

/**
 * 인식 실패 시 사용할 기본 영역: 이미지 중앙 80%
 */
export function getCenterGlassesFrame(img: HTMLImageElement): DetectedGlassesFrame {
  const w = img.naturalWidth || 1
  const h = img.naturalHeight || 1
  const margin = 0.1
  const x = Math.round(w * margin)
  const y = Math.round(h * margin)
  const width = Math.round(w * (1 - 2 * margin))
  const height = Math.round(h * (1 - 2 * margin))
  const cx = w / 2
  const cy = h / 2
  const r = Math.min(width, height) * 0.2
  return {
    x,
    y,
    width,
    height,
    leftLens: { cx: cx - width * 0.25, cy, r },
    rightLens: { cx: cx + width * 0.25, cy, r },
  }
}

/**
 * 이미지에서 안경(렌즈 두 개)을 인식해 테두리 영역을 반환.
 * 실패 시 null (호출부에서 getCenterGlassesFrame 사용 권장).
 */
export async function detectGlassesInImage(
  img: HTMLImageElement
): Promise<DetectedGlassesFrame | null> {
  const w = img.naturalWidth || 0
  const h = img.naturalHeight || 0
  if (w < 50 || h < 50) return null

  let cv: typeof import('@opencvjs/types').OpenCV
  try {
    cv = await getOpenCV()
  } catch {
    return null
  }
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  try {
    ctx.drawImage(img, 0, 0)
  } catch {
    return null
  }

  let src: import('@opencvjs/types').Mat | null = null
  let gray: import('@opencvjs/types').Mat | null = null
  let blurred: import('@opencvjs/types').Mat | null = null
  let circles: import('@opencvjs/types').Mat | null = null

  try {
    src = cv.imread(canvas)
    if (src.rows <= 0 || src.cols <= 0) return null
    gray = new cv.Mat()
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)
    blurred = new cv.Mat()
    cv.GaussianBlur(gray, blurred, { width: 5, height: 5 }, 1.2, 1.2)

    const minDim = Math.min(w, h)
    const minR = Math.max(8, Math.floor(minDim * 0.05))
    const maxR = Math.min(w, h) * 0.45
    const minDist = minDim * 0.2

    const paramSets: [number, number][] = [
      [100, 45],
      [100, 35],
      [80, 40],
      [100, 55],
    ]

    let pair: { left: { x: number; y: number; r: number }; right: { x: number; y: number; r: number } } | null = null
    let candidates: { x: number; y: number; r: number }[] = []

    for (const [param1, param2] of paramSets) {
      circles = new cv.Mat()
      cv.HoughCircles(
        blurred,
        circles,
        cv.HOUGH_GRADIENT,
        1,
        minDist,
        param1,
        param2,
        minR,
        maxR
      )
      if (circles.rows > 0 && circles.cols > 0) {
        const data = circles.data32F
        if (data && data.length >= 3) {
          candidates = []
          const numCircles = circles.cols === 3 ? circles.rows : Math.floor(circles.cols / 3)
          for (let i = 0; i < numCircles; i++) {
            const x = data[i * 3]
            const y = data[i * 3 + 1]
            const r = data[i * 3 + 2]
            if (Number.isFinite(x) && Number.isFinite(y) && r > 0) {
              candidates.push({ x, y, r })
            }
          }
          pair = pickLensPair(candidates, w, h)
          if (pair) break
        }
      }
      circles?.delete()
      circles = null
    }

    if (!pair && candidates.length >= 2) {
      pair = pickLensPair(candidates, w, h)
    }

    if (!pair) {
      const scaled = tryDetectOnScaledImage(cv, blurred, w, h)
      if (scaled) return scaled
      return null
    }

    const { left, right } = pair
    const margin = Math.max(left.r, right.r) * 0.35
    const x = Math.max(0, Math.min(left.x, right.x) - left.r - margin)
    const rightEdge = Math.min(w, Math.max(left.x, right.x) + right.r + margin)
    const y = Math.max(0, Math.min(left.y, right.y) - Math.max(left.r, right.r) - margin)
    const bottom = Math.min(h, Math.max(left.y, right.y) + Math.max(left.r, right.r) + margin)

    return {
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(rightEdge - x),
      height: Math.round(bottom - y),
      leftLens: { cx: left.x, cy: left.y, r: left.r },
      rightLens: { cx: right.x, cy: right.y, r: right.r },
    }
  } finally {
    src?.delete()
    gray?.delete()
    blurred?.delete()
    circles?.delete()
  }
}

function tryDetectOnScaledImage(
  cv: typeof import('@opencvjs/types').OpenCV,
  gray: import('@opencvjs/types').Mat,
  origW: number,
  origH: number
): DetectedGlassesFrame | null {
  const maxSize = 400
  const scale = Math.min(1, maxSize / Math.max(origW, origH))
  if (scale >= 1) return null
  const w = Math.round(origW * scale)
  const h = Math.round(origH * scale)
  let small: import('@opencvjs/types').Mat | null = null
  let circles: import('@opencvjs/types').Mat | null = null
  try {
    small = new cv.Mat()
    cv.resize(gray, small, { width: w, height: h }, 0, 0, cv.INTER_LINEAR)
    circles = new cv.Mat()
    const minR = Math.max(5, Math.floor(Math.min(w, h) * 0.06))
    const maxR = Math.min(w, h) * 0.45
    cv.HoughCircles(small, circles, cv.HOUGH_GRADIENT, 1, minR * 2, 80, 38, minR, maxR)
    if (circles.rows <= 0 || !circles.data32F) return null
    const data = circles.data32F
    const candidates: { x: number; y: number; r: number }[] = []
    const n = circles.cols === 3 ? circles.rows : Math.floor(circles.cols / 3)
    for (let i = 0; i < n; i++) {
      const x = data[i * 3] / scale
      const y = data[i * 3 + 1] / scale
      const r = data[i * 3 + 2] / scale
      if (Number.isFinite(x) && Number.isFinite(y) && r > 0) {
        candidates.push({ x, y, r })
      }
    }
    const pair = pickLensPair(candidates, origW, origH)
    if (!pair) return null
    const { left, right } = pair
    const margin = Math.max(left.r, right.r) * 0.35
    const x = Math.max(0, Math.min(left.x, right.x) - left.r - margin)
    const rightEdge = Math.min(origW, Math.max(left.x, right.x) + right.r + margin)
    const y = Math.max(0, Math.min(left.y, right.y) - Math.max(left.r, right.r) - margin)
    const bottom = Math.min(origH, Math.max(left.y, right.y) + Math.max(left.r, right.r) + margin)
    return {
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(rightEdge - x),
      height: Math.round(bottom - y),
      leftLens: { cx: left.x, cy: left.y, r: left.r },
      rightLens: { cx: right.x, cy: right.y, r: right.r },
    }
  } finally {
    small?.delete()
    circles?.delete()
  }
  return null
}

function pickLensPair(
  candidates: { x: number; y: number; r: number }[],
  imgW: number,
  imgH: number
): { left: { x: number; y: number; r: number }; right: { x: number; y: number; r: number } } | null {
  const centerX = imgW / 2
  const centerY = imgH / 2
  let best: { left: typeof candidates[0]; right: typeof candidates[0]; score: number } | null = null
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const a = candidates[i]
      const b = candidates[j]
      const ratio = Math.max(a.r, b.r) / (Math.min(a.r, b.r) + 1e-6)
      if (ratio > 2.5) continue
      const left = a.x < b.x ? a : b
      const right = a.x < b.x ? b : a
      const dist = right.x - left.x
      if (dist < imgW * 0.1) continue
      if (dist > imgW * 0.95) continue
      const midX = (left.x + right.x) / 2
      const midY = (left.y + right.y) / 2
      const score =
        -Math.abs(midX - centerX) * 0.5 -
        Math.abs(midY - centerY) * 0.3 -
        Math.abs(left.r - right.r) -
        (left.r + right.r) * 0.001
      if (!best || score > best.score) best = { left, right, score }
    }
  }
  return best ? { left: best.left, right: best.right } : null
}
