/**
 * @gltf-transform/core로 안경 메쉬 GLB 생성 (Node에서 동작)
 * 실행: node scripts/generateGlassesGlb.mjs
 */
import { Document, NodeIO } from '@gltf-transform/core'
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outPath = join(__dirname, '..', 'public', 'glasses', 'glasses.glb')

function makeRingVertices(innerR, outerR, segments, centerX, centerZ) {
  const positions = []
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2
    const cx = Math.cos(t)
    const sx = Math.sin(t)
    positions.push(centerX + innerR * cx, 0.01, centerZ + innerR * sx)
    positions.push(centerX + outerR * cx, 0.01, centerZ + outerR * sx)
  }
  return new Float32Array(positions)
}

function makeRingIndices(segments) {
  const indices = []
  for (let i = 0; i < segments; i++) {
    const a = i * 2
    const b = (i + 1) * 2
    indices.push(a, b, a + 1, a + 1, b, b + 1)
  }
  return new Uint32Array(indices)
}

function makeCylinderVertices(radius, halfHeight, segments, centerX) {
  const positions = []
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2
    const cx = Math.cos(t)
    const sx = Math.sin(t)
    positions.push(centerX + radius * cx, 0.01, halfHeight)
    positions.push(centerX + radius * cx, 0.01, -halfHeight)
  }
  const capCenterTop = [centerX, 0.01, halfHeight]
  const capCenterBot = [centerX, 0.01, -halfHeight]
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2
    positions.push(centerX + radius * Math.cos(t), 0.01, halfHeight)
  }
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2
    positions.push(centerX + radius * Math.cos(t), 0.01, -halfHeight)
  }
  return new Float32Array(positions)
}

async function main() {
  const document = new Document()
  const io = new NodeIO()
  const buffer = document.createBuffer('glasses-buffer')

  const lensRadius = 0.04
  const innerRadius = lensRadius * 0.7
  const templeDistance = 0.12
  const halfTemple = templeDistance / 2

  const leftPositions = makeRingVertices(innerRadius, lensRadius, 32, -halfTemple, 0)
  const rightPositions = makeRingVertices(innerRadius, lensRadius, 32, halfTemple, 0)
  const ringIndices = makeRingIndices(32)

  const bridgeRadius = 0.005
  const bridgeHalfLen = (templeDistance * 0.6) / 2
  const bridgeSegments = 8
  const cylinderPositions = []
  for (let i = 0; i <= bridgeSegments; i++) {
    const t = (i / bridgeSegments) * Math.PI * 2
    const c = Math.cos(t)
    const s = Math.sin(t)
    cylinderPositions.push(halfTemple * 0.2 + bridgeRadius * c, 0.01, bridgeHalfLen)
    cylinderPositions.push(halfTemple * 0.2 + bridgeRadius * c, 0.01, -bridgeHalfLen)
  }
  const cylinderIndices = []
  for (let i = 0; i < bridgeSegments; i++) {
    const a = i * 2
    const b = ((i + 1) % (bridgeSegments + 1)) * 2
    cylinderIndices.push(a, b, a + 1, a + 1, b, b + 1)
  }

  const material = document.createMaterial('glasses')
    .setBaseColorFactor([0.133, 0.133, 0.133, 1])
    .setMetallicFactor(0.2)
    .setRoughnessFactor(0.6)

  const leftPosAccessor = document.createAccessor().setArray(leftPositions).setType('VEC3').setBuffer(buffer)
  const leftIndicesAccessor = document.createAccessor().setArray(ringIndices).setBuffer(buffer)
  const leftPrim = document.createPrimitive()
    .setAttribute('POSITION', leftPosAccessor)
    .setIndices(leftIndicesAccessor)
    .setMaterial(material)
  const leftMesh = document.createMesh('leftLens').addPrimitive(leftPrim)

  const rightPosAccessor = document.createAccessor().setArray(rightPositions).setType('VEC3')
  const rightPrim = document.createPrimitive()
    .setAttribute('POSITION', rightPosAccessor)
    .setIndices(document.createAccessor().setArray(ringIndices))
    .setMaterial(material)
  const rightMesh = document.createMesh('rightLens').addPrimitive(rightPrim)

  const bridgePosAccessor = document.createAccessor()
    .setArray(new Float32Array(cylinderPositions))
    .setType('VEC3')
    .setBuffer(buffer)
  const bridgeIndicesAccessor = document.createAccessor()
    .setArray(new Uint32Array(cylinderIndices))
    .setBuffer(buffer)
  const bridgePrim = document.createPrimitive()
    .setAttribute('POSITION', bridgePosAccessor)
    .setIndices(bridgeIndicesAccessor)
    .setMaterial(material)
  const bridgeMesh = document.createMesh('bridge').addPrimitive(bridgePrim)

  const leftNode = document.createNode('leftLens').setMesh(leftMesh).setTranslation([-halfTemple, 0.01, 0])
  const rightNode = document.createNode('rightLens').setMesh(rightMesh).setTranslation([halfTemple, 0.01, 0])
  const bridgeNode = document.createNode('bridge').setMesh(bridgeMesh).setTranslation([0, 0.01, 0])

  const root = document.createNode('glasses')
    .addChild(leftNode)
    .addChild(rightNode)
    .addChild(bridgeNode)
  root.setScale([2.5, 2.5, 2.5])
  root.setRotation([Math.PI / 2, 0, 0])
  root.setTranslation([0, 0, -0.08])

  const scene = document.createScene().addChild(root)
  document.getRoot().setDefaultScene(scene)

  const glb = await io.writeBinary(document)
  writeFileSync(outPath, Buffer.from(glb))
  console.log('Written:', outPath)
}

main().catch((err) => {
  console.error('Export failed:', err)
  process.exit(1)
})
