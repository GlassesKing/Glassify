import type { GlassesProduct } from '../types'

/**
 * 샘플 안경 목록 (추후 기존 쇼핑몰 API로 교체)
 * - imageUrl: 같은 출처(public/glasses/) 사용 시 403 방지. 투명 PNG 권장.
 * - 다비치마켓 상품: https://www.davichmarket.com/products/G2110151612_8811 (MUSE 04)
 */
const GLASSES_BASE = '/glasses'

/** 누끼 딴 안경 이미지 (흰 배경 제거된 PNG) */
export const GLASSES_IMAGE = `${GLASSES_BASE}/glasses.png`

export const sampleGlasses: GlassesProduct[] = [
  {
    id: 'davich-muse04',
    name: 'MUSE 04 (다비치마켓)',
    imageUrl: GLASSES_IMAGE,
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
]
