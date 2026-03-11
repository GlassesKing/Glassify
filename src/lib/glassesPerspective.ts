/**
 * WebGL perspective 오버레이 - 랜드마크 4점 사다리꼴
 * 스무딩으로 부드러운 추적, 이미지 비율 유지
 */
import type { LandmarkPoint } from '../types'
import { GLASSES_LANDMARKS } from '../types'

const SMOOTH_FACTOR = 0.42

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
in vec2 a_uv;
out vec2 v_uv;
void main() {
  v_uv = a_uv;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

const FRAGMENT_SHADER = `#version 300 es
precision mediump float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_texture;
void main() {
  fragColor = texture(u_texture, v_uv);
  if (fragColor.a < 0.01) discard;
}
`

export interface GlassesPerspectiveOptions {
  canvas: HTMLCanvasElement
  videoWidth: number
  videoHeight: number
  mirror?: boolean
}

function normToNDC(
  x: number,
  y: number,
  vw: number,
  vh: number,
  cw: number,
  ch: number,
  mirror: boolean
): [number, number] {
  const scaleX = cw / vw
  const scaleY = ch / vh
  const scale = Math.min(scaleX, scaleY)
  const offsetX = (cw - vw * scale) / 2
  const offsetY = (ch - vh * scale) / 2
  let px = (x * vw * scale + offsetX) / cw
  const py = 1 - (y * vh * scale + offsetY) / ch
  if (mirror) px = 1 - px
  return [px * 2 - 1, py * 2 - 1]
}

export class GlassesPerspectiveRenderer {
  private gl: WebGL2RenderingContext
  private program: WebGLProgram
  private texture: WebGLTexture | null = null
  private videoWidth: number
  private videoHeight: number
  private mirror: boolean
  private smoothed: [number, number][] | null = null
  /** 이미지 원본 비율 (width/height). 퀘드가 이 비율을 유지하도록 함 */
  private imageAspect = 2

  constructor(options: GlassesPerspectiveOptions) {
    const { canvas, videoWidth, videoHeight, mirror = false } = options
    this.videoWidth = videoWidth
    this.videoHeight = videoHeight
    this.mirror = mirror

    const gl = canvas.getContext('webgl2', { alpha: true })
    if (!gl) throw new Error('WebGL2 not supported')
    this.gl = gl

    gl.clearColor(0, 0, 0, 0)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    const vs = gl.createShader(gl.VERTEX_SHADER)!
    gl.shaderSource(vs, VERTEX_SHADER)
    gl.compileShader(vs)
    const fs = gl.createShader(gl.FRAGMENT_SHADER)!
    gl.shaderSource(fs, FRAGMENT_SHADER)
    gl.compileShader(fs)
    const prog = gl.createProgram()!
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    this.program = prog
  }

  setTexture(img: HTMLImageElement): void {
    const gl = this.gl
    if (this.texture) gl.deleteTexture(this.texture)
    const tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    this.texture = tex
    const w = img.naturalWidth || 1
    const h = img.naturalHeight || 1
    this.imageAspect = w / h
  }

  render(
    landmarks: LandmarkPoint[],
    cw: number,
    ch: number
  ): void {
    if (!this.texture || landmarks.length < 468) return

    const {
      leftTemple,
      rightTemple,
      leftEyeInner,
      rightEyeInner,
      leftEyeOuter,
      rightEyeOuter,
    } = GLASSES_LANDMARKS
    const lt = landmarks[leftTemple]
    const rt = landmarks[rightTemple]
    const lei = landmarks[leftEyeInner]
    const rei = landmarks[rightEyeInner]
    const le = landmarks[leftEyeOuter]
    const re = landmarks[rightEyeOuter]
    if (!lt || !rt || !lei || !rei || !le || !re) return

    const n = (x: number, y: number) =>
      normToNDC(x, y, this.videoWidth, this.videoHeight, cw, ch, this.mirror)

    const bridgeY = (lei.y + rei.y) / 2 + 0.015
    const faceWidth = Math.hypot(rt.x - lt.x, rt.y - lt.y) + 0.04
    const angle = Math.atan2(rt.y - lt.y, rt.x - lt.x)
    const cosA = Math.cos(angle)
    const sinA = Math.sin(angle)
    const frameW = faceWidth
    const frameH = frameW / this.imageAspect
    const topY = bridgeY - frameH / 2
    const bottomY = bridgeY + frameH / 2
    const topCx = (lt.x + rt.x) / 2
    const bottomCx = (le.x + re.x) / 2

    const rawCorners: [number, number][] = [
      n(topCx - (frameW / 2) * cosA, topY - (frameW / 2) * sinA),
      n(topCx + (frameW / 2) * cosA, topY + (frameW / 2) * sinA),
      n(bottomCx + (frameW / 2) * cosA, bottomY + (frameW / 2) * sinA),
      n(bottomCx - (frameW / 2) * cosA, bottomY - (frameW / 2) * sinA),
    ]

    if (!this.smoothed) {
      this.smoothed = rawCorners.map(([a, b]) => [a, b])
    } else {
      this.smoothed = this.smoothed.map((prev, i) => [
        lerp(prev[0], rawCorners[i]![0], SMOOTH_FACTOR),
        lerp(prev[1], rawCorners[i]![1], SMOOTH_FACTOR),
      ])
    }

    const [topLeft, topRight, bottomRight, bottomLeft] = this.smoothed
    if (!topLeft || !topRight || !bottomRight || !bottomLeft) return

    const gl = this.gl
    gl.viewport(0, 0, cw, ch)
    gl.clear(gl.COLOR_BUFFER_BIT)

    const positions = new Float32Array([
      ...topLeft, ...topRight, ...bottomRight,
      ...topLeft, ...bottomRight, ...bottomLeft,
    ])
    const uvs = new Float32Array([
      0, 0, 1, 0, 1, 1,
      0, 0, 1, 1, 0, 1,
    ])

    gl.useProgram(this.program)
    const posLoc = gl.getAttribLocation(this.program, 'a_position')
    const uvLoc = gl.getAttribLocation(this.program, 'a_uv')
    const texLoc = gl.getUniformLocation(this.program, 'u_texture')

    const posBuf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf)
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)
    gl.enableVertexAttribArray(posLoc)
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

    const uvBuf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf)
    gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW)
    gl.enableVertexAttribArray(uvLoc)
    gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    gl.uniform1i(texLoc, 0)

    gl.drawArrays(gl.TRIANGLES, 0, 6)
  }

  resize(videoWidth: number, videoHeight: number): void {
    this.videoWidth = videoWidth
    this.videoHeight = videoHeight
    this.smoothed = null
  }

  dispose(): void {
    if (this.texture) this.gl.deleteTexture(this.texture)
  }
}
