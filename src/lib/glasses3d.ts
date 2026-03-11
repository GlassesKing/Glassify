/**
 * Three.js 기반 3D 안경 렌더러
 * - Face Geometry pose matrix 또는 랜드마크로 얼굴에 정렬
 * - .glb / .obj 3D 모델 또는 기본 geometry 지원
 */
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import type { LandmarkPoint } from '../types'
import { getGlassesScreenTransform } from './glassesScreenTransform'

const FOV = 100
const NEAR = 0.01
const FAR = 10

export interface Glasses3DRendererOptions {
  canvas: HTMLCanvasElement
  videoWidth: number
  videoHeight: number
  mirror?: boolean
  /** .glb 또는 .gltf 모델 URL. 없으면 기본 geometry 사용 */
  modelUrl?: string | null
}

// ─── 얼굴에 보이는 안경 위치·회전 조정 ───
/** 안경 z 좌표 (카메라 앞). 예: -0.2(가깝게) ~ -0.6(멀게) */
const GLASSES_Z = -0.3
/** x 오프셋. 양수=오른쪽, 음수=왼쪽 (월드 단위) */
const GLASSES_OFFSET_X = 0.01
/** y 오프셋. 양수=위, 음수=아래 (월드 단위) */
const GLASSES_OFFSET_Y = 0.12
/** x축 회전(라디안). 양수=위쪽이 뒤로 기울어짐(z방향 기울기, 얼굴에 붙는 느낌). 예: 0 ~ 0.2 */
const GLASSES_ROTATION_X = 1.5
/** y축 회전(라디안). 양수=오른쪽이 뒤로. 옆으로 기울기. 예: -0.1 ~ 0.1 */
const GLASSES_ROTATION_Y = 0
/** 모델 기준 폭(월드). 스케일 조정. GLB마다 조정 가능 */
const REFERENCE_MODEL_WIDTH = 0.6

export class Glasses3DRenderer {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private glasses: THREE.Group
  private mirror: boolean
  private modelUrl: string | null = null
  private modelLoaded = false
  private texturePlane: THREE.Mesh | null = null
  private textureMap: THREE.Texture | null = null

  constructor(options: Glasses3DRendererOptions) {
    const { canvas, videoWidth, videoHeight, mirror = true, modelUrl } = options
    this.mirror = mirror
    this.modelUrl = modelUrl ?? null

    const aspect = videoWidth / videoHeight
    this.camera = new THREE.PerspectiveCamera(FOV, aspect, NEAR, FAR)
    this.camera.position.set(0, 0, 0)
    this.camera.lookAt(0, 0, -1)

    this.scene = new THREE.Scene()

    this.glasses = new THREE.Group()
    this.glasses.add(this.createDefaultGlassesMesh())
    this.modelLoaded = true
    if (this.modelUrl) {
      this.loadGlbModel(this.modelUrl)
    }
    this.scene.add(this.glasses)

    const ambient = new THREE.AmbientLight(0xffffff, 0.8)
    const dir = new THREE.DirectionalLight(0xffffff, 0.6)
    dir.position.set(0, 2, 2)
    this.scene.add(ambient)
    this.scene.add(dir)

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    })
    this.renderer.setSize(videoWidth, videoHeight)
    this.renderer.setPixelRatio(1)
    this.renderer.setClearColor(0x000000, 0)
  }

  private async loadGlbModel(url: string): Promise<void> {
    const loader = new GLTFLoader()
    try {
      const gltf = await loader.loadAsync(url)
      while (this.glasses.children.length > 0) { // @ts-ignore
        this.glasses.remove(this.glasses.children[0])
      }
      const model = gltf.scene
      model.scale.setScalar(0.5)
      model.rotation.x = -Math.PI / 2
      model.position.z = -0.08
      this.glasses.add(model)
      this.modelLoaded = true
    } catch (e) {
      console.warn('GLB load failed, using default mesh:', e)
      this.modelLoaded = true
    }
  }

  /**
   * 2D 안경 이미지를 3D 평면 텍스처로 설정 (pose matrix로 자연스러운 원근)
   */
  setTexture(img: HTMLImageElement): void {
    while (this.glasses.children.length > 0) {
      const child = this.glasses.children[0]
      if (!child) break
      this.glasses.remove(child)
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose()
        const mat = child.material
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
        else mat?.dispose()
      }
    }
    this.texturePlane?.geometry?.dispose()
    ;(this.texturePlane?.material as THREE.Material)?.dispose()
    this.texturePlane = null
    this.textureMap?.dispose()
    this.textureMap = null

    const tex = new THREE.CanvasTexture(img)
    // Avoid INVALID_OPERATION on texImage3D: FLIP_Y/PREMULTIPLY_ALPHA not allowed for 3D textures
    // when same WebGL context is used elsewhere (e.g. GLB). Use 2D-friendly options only.
    tex.flipY = false
    tex.premultiplyAlpha = false
    this.textureMap = tex
    tex.needsUpdate = true
    const w = img.naturalWidth || 1
    const h = img.naturalHeight || 1
    const aspect = w / h
    const planeW = 0.12
    const planeH = planeW / aspect
    const geometry = new THREE.PlaneGeometry(planeW, planeH)
    const material = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    const plane = new THREE.Mesh(geometry, material)
    plane.rotation.x = -Math.PI / 2
    plane.position.z = -0.08
    plane.scale.setScalar(2.5)
    this.glasses.add(plane)
    this.texturePlane = plane
    this.modelLoaded = true
  }

  private createDefaultGlassesMesh(): THREE.Group {
    const group = new THREE.Group()

    const material = new THREE.MeshPhongMaterial({
      color: 0x222222,
      shininess: 80,
      emissive: 0x111111,
    })

    const lensRadius = 0.04
    const templeDistance = 0.12

    const leftLens = new THREE.Mesh(
      new THREE.RingGeometry(lensRadius * 0.7, lensRadius, 32),
      material.clone()
    )
    leftLens.rotation.x = -Math.PI / 2
    leftLens.position.set(-templeDistance / 2, 0.01, 0)

    const rightLens = new THREE.Mesh(
      new THREE.RingGeometry(lensRadius * 0.7, lensRadius, 32),
      material.clone()
    )
    rightLens.rotation.x = -Math.PI / 2
    rightLens.position.set(templeDistance / 2, 0.01, 0)

    const bridge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.005, 0.005, templeDistance * 0.6, 8),
      material.clone()
    )
    bridge.rotation.z = Math.PI / 2
    bridge.position.y = 0.01

    group.add(leftLens, rightLens, bridge)
    group.scale.setScalar(2.5)
    // 랜드마크(ortho) 배치 시 카메라를 향하도록 XY 평면에 둠. pose 배치 시에는 matrix로 덮어씀.
    return group
  }

  /** pose matrix로 렌더 (Face Geometry) */
  renderWithPose(poseMatrix: number[] | null): void {
    if (!poseMatrix || poseMatrix.length < 16 || !this.modelLoaded) return

    const m = new THREE.Matrix4()
    m.fromArray(poseMatrix)

    if (this.mirror) {
      const mirrorX = new THREE.Matrix4().makeScale(-1, 1, 1)
      m.premultiply(mirrorX)
    }

    this.glasses.matrix.copy(m)
    this.glasses.matrixAutoUpdate = false

    this.renderer.render(this.scene, this.camera)
  }

  /**
   * 랜드마크 기반 — 픽셀(centerPx, centerPy, widthPx)이 화면에 정확히 오도록
   * Perspective 투영을 역산해 위치·스케일 계산 (랜드마크와 정렬).
   */
  renderWithLandmarks(
    landmarks: LandmarkPoint[] | null,
    vw: number,
    vh: number,
    cw: number,
    ch: number,
    options?: { frameWidthCm?: number; faceWidthCm?: number; frontCropRatio?: number }
  ): void {
    if (!landmarks || landmarks.length < 468 || !this.modelLoaded) return

    const transform = getGlassesScreenTransform(landmarks, vw, vh, cw, ch, {
      frameWidthCm: options?.frameWidthCm,
      faceWidthCm: options?.faceWidthCm ?? 15,
      frontCropRatio: options?.frontCropRatio,
      mirror: false,
    })
    if (!transform) return

    const { centerPx, centerPy, widthPx, rotation } = transform

    const fovRad = (FOV * Math.PI) / 180
    const aspect = cw / ch
    const d = -GLASSES_Z

    // NDC: 화면 픽셀 → -1~1 (y는 위가 +)
    const ndcX = (centerPx / cw) * 2 - 1
    const ndcY = 1 - (centerPy / ch) * 2

    // Perspective 역산: 이 NDC에 찍히려면 z=d인 평면에서 월드 좌표가 얼마여야 하는지
    const tanHalfFov = Math.tan(fovRad / 2)
    let wx = ndcX * d * tanHalfFov * aspect
    let wy = ndcY * d * tanHalfFov

    // 위치 미세 조정 (GLASSES_OFFSET_X/Y, GLASSES_Z 상단에서 수정)
    wx += GLASSES_OFFSET_X
    wy += GLASSES_OFFSET_Y

    // widthPx만큼 보이게 할 스케일: z=d에서 1월드단위 = (cw / (2*d*tanHalfFov*aspect)) 픽셀
    const worldUnitsPerPx = (2 * d * tanHalfFov * aspect) / cw
    const s = Math.max(0.05, Math.min(2, (widthPx * worldUnitsPerPx) / REFERENCE_MODEL_WIDTH))

    const angleZ = this.mirror ? -rotation : rotation

    this.glasses.matrix.identity()
    this.glasses.matrix.compose(
      new THREE.Vector3(wx, wy, GLASSES_Z),
      new THREE.Quaternion().setFromEuler(
        new THREE.Euler(GLASSES_ROTATION_X, GLASSES_ROTATION_Y, angleZ)
      ),
      new THREE.Vector3(s, s, s)
    )
    this.glasses.matrixAutoUpdate = false

    this.renderer.render(this.scene, this.camera)
  }

  /** 얼굴 없을 때 캔버스를 투명하게 비우기 */
  clearToTransparent(): void {
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.clear(true, true, false)
  }

  /** videoWidth/Height: 카메라 aspect. canvasW/canvasH: 출력 해상도(생략 시 비디오 크기) */
  resize(
    videoWidth: number,
    videoHeight: number,
    canvasW?: number,
    canvasH?: number
  ): void {
    this.camera.aspect = videoWidth / videoHeight
    this.camera.updateProjectionMatrix()
    const w = canvasW ?? videoWidth
    const h = canvasH ?? videoHeight
    this.renderer.setSize(w, h)
  }

  dispose(): void {
    this.renderer.dispose()
    this.textureMap?.dispose()
    this.textureMap = null
    this.glasses.traverse((obj: THREE.Object3D) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose()
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m: THREE.Material) => m.dispose())
        } else {
          obj.material.dispose()
        }
      }
    })
  }
}
