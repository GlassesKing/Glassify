/**
 * 3D 안경 뷰어: 실제 두께가 있는 압출(Extrude) 형상
 * - 마우스 드래그로 회전 (평면 사진이 아니라 3D 오브젝트)
 */
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { createGlassesGeometry } from '../lib/glasses3DShape'
import './Glasses3DViewer.css'

export interface Glasses3DViewerProps {
  frontImageUrl: string
  sideImageUrl?: string
  fallbackFrontUrl?: string
  name?: string
}

export function Glasses3DViewer({
  frontImageUrl,
  sideImageUrl,
  fallbackFrontUrl,
  name = '3D 안경',
}: Glasses3DViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const meshRef = useRef<THREE.Mesh | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x1a1a1a)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100)
    camera.position.set(0, 0, 1.2)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.screenSpacePanning = false
    controls.minDistance = 0.5
    controls.maxDistance = 3
    controls.maxPolarAngle = Math.PI / 2 + 0.4
    controlsRef.current = controls

    const loader = new THREE.TextureLoader()
    const applyFrontTex = (tex: THREE.Texture) => {
      tex.colorSpace = THREE.SRGBColorSpace
      tex.flipY = false
      if (meshRef.current && meshRef.current.material instanceof THREE.MeshBasicMaterial) {
        ;(meshRef.current.material as THREE.MeshBasicMaterial).map = tex
      }
    }
    const frontTex = loader.load(
      frontImageUrl,
      applyFrontTex,
      undefined,
      () => {
        if (fallbackFrontUrl) {
          loader.load(fallbackFrontUrl, applyFrontTex, undefined, () => {})
        }
      }
    )
    frontTex.colorSpace = THREE.SRGBColorSpace
    frontTex.flipY = false

    const geometry = createGlassesGeometry()
    const material = new THREE.MeshBasicMaterial({
      map: frontTex,
      color: 0xffffff,
      side: THREE.DoubleSide,
    })
    const mesh = new THREE.Mesh(geometry, material)
    meshRef.current = mesh
    scene.add(mesh)

    const resize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return
      const w = container.clientWidth
      const h = container.clientHeight
      cameraRef.current.aspect = w / h
      cameraRef.current.updateProjectionMatrix()
      rendererRef.current.setSize(w, h)
    }
    const ro = new ResizeObserver(resize)
    ro.observe(container)

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      ro.disconnect()
      cancelAnimationFrame(frameRef.current)
      controls.dispose()
      renderer.dispose()
      geometry.dispose()
      material.dispose()
      frontTex?.dispose()
      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement)
      }
      meshRef.current = null
      cameraRef.current = null
      sceneRef.current = null
      rendererRef.current = null
      controlsRef.current = null
    }
  }, [frontImageUrl, sideImageUrl, fallbackFrontUrl])

  return (
    <div className="glasses-3d-viewer">
      <div className="glasses-3d-viewer-header">
        <h2>{name}</h2>
        <p className="glasses-3d-viewer-hint">마우스 드래그로 3D 안경을 회전할 수 있습니다</p>
      </div>
      <div ref={containerRef} className="glasses-3d-viewer-canvas" />
    </div>
  )
}
