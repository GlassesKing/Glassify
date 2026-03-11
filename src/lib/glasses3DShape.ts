/**
 * 안경 형태의 2D Shape + ExtrudeGeometry
 * - 두 렌즈(타원) + 브릿지로 실제 3D 두께를 가진 안경 메쉬 생성
 * - 앞면·뒷면·옆면에 서로 다른 재질 적용 가능
 */
import * as THREE from 'three'

const LENS_RX = 0.2
const LENS_RY = 0.1
const BRIDGE_W = 0.06
const BRIDGE_H = 0.03
const DEPTH = 0.04

/** 안경 실루엣: 한 번에 닫힌 경로 (왼쪽 렌즈 → 브릿지 → 오른쪽 렌즈) */
function createGlassesShape(): THREE.Shape {
  const shape = new THREE.Shape()
  const cxL = -LENS_RX - BRIDGE_W / 2 - LENS_RX * 0.5
  const cxR = LENS_RX + BRIDGE_W / 2 + LENS_RX * 0.5
  const bridgeLeft = -BRIDGE_W / 2
  const bridgeRight = BRIDGE_W / 2

  shape.moveTo(cxL + LENS_RX, 0)
  shape.absellipse(cxL, 0, LENS_RX, LENS_RY, 0, -Math.PI, false)
  shape.lineTo(bridgeLeft, -BRIDGE_H / 2)
  shape.lineTo(bridgeRight, -BRIDGE_H / 2)
  shape.absellipse(cxR, 0, LENS_RX, LENS_RY, Math.PI, 0, false)
  shape.lineTo(bridgeRight, BRIDGE_H / 2)
  shape.lineTo(bridgeLeft, BRIDGE_H / 2)
  shape.lineTo(cxL + LENS_RX, 0)

  return shape
}

/** 위에서 봤을 때 ㄷ자 (프레임 + 두 다리). Y+ = 앞(눈 쪽), Y- = 안경다리 */
function createGlassesTopViewShape(): THREE.Shape {
  const FW = 0.5
  const FH = 0.08
  const AW = 0.04
  const AL = 0.18
  const shape = new THREE.Shape()
  shape.moveTo(-FW / 2, FH / 2)
  shape.lineTo(FW / 2, FH / 2)
  shape.lineTo(FW / 2, -FH / 2)
  shape.lineTo(FW / 2 - AW, -FH / 2)
  shape.lineTo(FW / 2 - AW, -FH / 2 - AL)
  shape.lineTo(FW / 2, -FH / 2 - AL)
  shape.lineTo(FW / 2, -FH / 2)
  shape.lineTo(-FW / 2, -FH / 2)
  shape.lineTo(-FW / 2 + AW, -FH / 2)
  shape.lineTo(-FW / 2 + AW, -FH / 2 - AL)
  shape.lineTo(-FW / 2, -FH / 2 - AL)
  shape.lineTo(-FW / 2, -FH / 2)
  shape.lineTo(-FW / 2, FH / 2)
  return shape
}

const EXTRUDE_DEPTH = 0.04

export function createGlassesGeometry(): THREE.ExtrudeGeometry {
  const shape = createGlassesShape()
  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: DEPTH,
    bevelEnabled: false,
  })
  geom.rotateX(-Math.PI / 2)
  geom.center()
  return geom
}

/** 위에서 보면 ㄷ자(프레임+다리). 압출 후 앞면이 +Z(카메라)를 향하도록 회전·중앙 정렬 */
export function createGlassesTopViewGeometry(): THREE.ExtrudeGeometry {
  const shape = createGlassesTopViewShape()
  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: EXTRUDE_DEPTH,
    bevelEnabled: false,
  })
  geom.rotateX(Math.PI / 2)
  geom.center()
  return geom
}
