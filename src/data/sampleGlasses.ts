import type { GlassesProduct } from '../types'

/**
 * 샘플 안경 목록 (추후 기존 쇼핑몰 API로 교체)
 * - imageUrl: 2D 이미지 (투명 PNG). 3D 텍스처/폴백용.
 * - modelUrl: 3D 오버레이용 .glb. 있으면 3D 메쉬, 없으면 2D 이미지를 3D 평면에 붙여 표시.
 * - public/glasses/ 에 .glb 넣고 경로 지정. 출처는 public/glasses/3D_모델_가이드.md 참고.
 */
const GLASSES_BASE = '/glasses'

/** 누끼 딴 안경 이미지 (흰 배경 제거된 PNG) */
export const GLASSES_IMAGE = `${GLASSES_BASE}/glasses.png`

/** 3D 안경 모델 (가상 피팅용) */
export const GLASSES_3D_MODEL = `${GLASSES_BASE}/glasses.glb`
export const GLASSES_1_GLB = `${GLASSES_BASE}/glasses1.glb`

export const sampleGlasses: GlassesProduct[] = [
  {
    id: 'davich-muse04',
    name: 'MUSE 04 (다비치마켓)',
    imageUrl: GLASSES_IMAGE,
    dimensionsMm: {
      totalLength: 145,
      width: 46,
      height: 44,
      bridge: 24,
      templeLength: 150,
    },
    frameWidthCm: 14.5,
    // 0.5에 가깝게: 다리 끝 더 숨김 / 0.7에 가깝게: 옆면 더 보임. 이미지에 따라 조정
    frontCropRatio: 0.65,
  },
  {
    id: 'sample-1',
    name: '클래식 블랙',
    imageUrl: GLASSES_IMAGE,
  },
  {
    id: 'sample-2',
    name: '라운드 골드',
    imageUrl: GLASSES_IMAGE,
  },
  {
    id: 'sample-3',
    name: '캐틀아이',
    imageUrl: GLASSES_IMAGE,
  },
  {
    id: 'sample-3d',
    name: '3D 안경 (glb)',
    imageUrl: GLASSES_IMAGE,
    modelUrl: GLASSES_3D_MODEL,
  },
  {
    id: 'glasses1-3d',
    name: 'GLB 안경 (가상 피팅)',
    imageUrl: GLASSES_IMAGE,
    modelUrl: GLASSES_1_GLB,
  },
]
