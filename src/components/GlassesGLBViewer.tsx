/**
 * 3D 뷰어: glasses1.glb 안경 모델 표시
 */
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import './Glasses3DViewer.css'

const GLASSES_GLB = '/glasses/glasses1.glb'

/** 랜딩 시 카메라 위치 */
const INITIAL_CAMERA_POSITION = { x: 0, y: 0, z: 0 }
/** 랜딩 시 안경 크기 */
const INITIAL_GLASSES_SCALE = 0.05

/** 마우스 드래그로 X,Y,Z 회전할 때 감도 (라디안/픽셀) */
const DRAG_ROTATE_SENSITIVITY = 0.005

function radToDeg360(rad: number): number {
  return ((Math.round((rad * 180) / Math.PI) % 360) + 360) % 360
}

export interface GlassesGLBViewerProps {
  modelUrl?: string
  name?: string
}

export function GlassesGLBViewer({
  name = '안경',
}: GlassesGLBViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const frameRef = useRef<number>(0)
  const groupRef = useRef<THREE.Group | null>(null)
  const rollAngleRef = useRef(0)
  const rotXRef = useRef(-Math.PI)
  const rotYRef = useRef(0)
  const rotZRef = useRef(0)
  const [rotXDeg, setRotXDeg] = useState(180)
  const [rotYDeg, setRotYDeg] = useState(0)
  const [rotZDeg, setRotZDeg] = useState(0)
  const setRotXDegRef = useRef(setRotXDeg)
  const setRotYDegRef = useRef(setRotYDeg)
  const setRotZDegRef = useRef(setRotZDeg)
  setRotXDegRef.current = setRotXDeg
  setRotYDegRef.current = setRotYDeg
  setRotZDegRef.current = setRotZDeg

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const width = Math.max(container.clientWidth, 300)
    const height = Math.max(container.clientHeight, 200)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x333333)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.01, 100)
    camera.position.set(
      INITIAL_CAMERA_POSITION.x,
      INITIAL_CAMERA_POSITION.y,
      INITIAL_CAMERA_POSITION.z
    )
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x333333, 1)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    rendererRef.current = renderer
    container.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.screenSpacePanning = false
    controls.minDistance = 0.05
    controls.maxDistance = 10
    controls.minPolarAngle = 0
    controls.maxPolarAngle = Math.PI
    controlsRef.current = controls

    let isDragging = false
    const onPointerDown = (e: PointerEvent) => {
      if (!container.contains(e.target as Node)) return
      isDragging = true
    }
    const onPointerUp = () => { isDragging = false }
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging || !e.shiftKey) return
      e.preventDefault()
      e.stopImmediatePropagation()
      const dx = e.movementX
      const dy = e.movementY
      const k = DRAG_ROTATE_SENSITIVITY
      rotZRef.current += k * dx
      rotXRef.current -= k * dy
      if (dx !== 0 && dy !== 0) rotYRef.current += k * (dx + dy) * 0.5
      setRotXDegRef.current(radToDeg360(rotXRef.current))
      setRotYDegRef.current(radToDeg360(rotYRef.current))
      setRotZDegRef.current(radToDeg360(rotZRef.current))
    }
    container.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('pointermove', onPointerMove, true)
    document.addEventListener('pointerup', onPointerUp, true)
    document.addEventListener('pointerleave', onPointerUp, true)

    const ambient = new THREE.AmbientLight(0xffffff, 1.2)
    const dir = new THREE.DirectionalLight(0xffffff, 1)
    dir.position.set(2, 2, 2)
    scene.add(ambient)
    scene.add(dir)
  const group = new THREE.Group()
  groupRef.current = group
  scene.add(group)

  const loader = new GLTFLoader()
  const modelUrl = GLASSES_GLB
  loader.load(
    modelUrl,
    (gltf) => {
      if (!groupRef.current) return
      const model = gltf.scene
      model.position.set(0, 0, 0)
      model.scale.setScalar(INITIAL_GLASSES_SCALE)
      model.rotation.x = -Math.PI / -2
      group.add(model)
    },
    undefined,
    (err) => console.error('GLB load failed:', err)
  )

    const resize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return
      const w = Math.max(container.clientWidth, 300)
      const h = Math.max(container.clientHeight, 200)
      cameraRef.current.aspect = w / h
      cameraRef.current.updateProjectionMatrix()
      rendererRef.current.setSize(w, h)
    }
    const ro = new ResizeObserver(resize)
    ro.observe(container)
    setTimeout(resize, 100)

    const target = new THREE.Vector3(0, 0, 0)
    const worldUp = new THREE.Vector3(0, 1, 0)

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate)
      controls.update()
      if (groupRef.current) {
        groupRef.current.rotation.x = rotXRef.current
        groupRef.current.rotation.y = rotYRef.current
        groupRef.current.rotation.z = rotZRef.current
      }
      const roll = rollAngleRef.current
      const viewDir = camera.position.clone().negate().normalize()
      const rollQ = new THREE.Quaternion().setFromAxisAngle(viewDir, roll)
      const up = worldUp.clone().applyQuaternion(rollQ)
      camera.up.copy(up)
      camera.lookAt(target)
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      container.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('pointermove', onPointerMove, true)
      document.removeEventListener('pointerup', onPointerUp, true)
      document.removeEventListener('pointerleave', onPointerUp, true)
      ro.disconnect()
      cancelAnimationFrame(frameRef.current)
      controls.dispose()
      renderer.dispose()
      if (groupRef.current) {
        groupRef.current.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry?.dispose()
            if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose())
            else obj.material?.dispose()
          }
        })
      }
      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement)
      }
      groupRef.current = null
      cameraRef.current = null
      sceneRef.current = null
      rendererRef.current = null
      controlsRef.current = null
    }
  }, [])

  return (
    <div className="glasses-3d-viewer">
      <div className="glasses-3d-viewer-header">
        <h2>{name}</h2>
        <p className="glasses-3d-viewer-hint">
          드래그: 카메라 회전 · <strong>Shift+드래그</strong>: 수평→Z, 수직→X, 대각선→Y 회전
        </p>
        <div className="glasses-3d-viewer-axes">
          <div className="glasses-3d-viewer-axis">
            <label htmlFor="rot-x">X</label>
            <input
              id="rot-x"
              type="range"
              min={0}
              max={360}
              value={rotXDeg}
              onChange={(e) => {
                const deg = Number(e.target.value)
                setRotXDeg(deg)
                rotXRef.current = (deg * Math.PI) / 180
              }}
            />
            <span>{rotXDeg}°</span>
          </div>
          <div className="glasses-3d-viewer-axis">
            <label htmlFor="rot-y">Y</label>
            <input
              id="rot-y"
              type="range"
              min={0}
              max={360}
              value={rotYDeg}
              onChange={(e) => {
                const deg = Number(e.target.value)
                setRotYDeg(deg)
                rotYRef.current = (deg * Math.PI) / 180
              }}
            />
            <span>{rotYDeg}°</span>
          </div>
          <div className="glasses-3d-viewer-axis">
            <label htmlFor="rot-z">Z</label>
            <input
              id="rot-z"
              type="range"
              min={0}
              max={360}
              value={rotZDeg}
              onChange={(e) => {
                const deg = Number(e.target.value)
                setRotZDeg(deg)
                rotZRef.current = (deg * Math.PI) / 180
              }}
            />
            <span>{rotZDeg}°</span>
          </div>
          <button
            type="button"
            className="glasses-3d-viewer-reset"
            onClick={() => {
              rotXRef.current = -Math.PI
              rotYRef.current = 0
              rotZRef.current = 0
              setRotXDeg(180)
              setRotYDeg(0)
              setRotZDeg(0)
            }}
          >
            초기화
          </button>
        </div>
      </div>
      <div ref={containerRef} className="glasses-3d-viewer-canvas" />
    </div>
  )
}
