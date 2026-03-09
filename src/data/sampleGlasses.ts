import type { GlassesProduct } from '../types'

/**
 * 샘플 안경 목록 (추후 기존 쇼핑몰 API로 교체)
 * - imageUrl: 투명 PNG 권장. 정면에서 본 안경 이미지
 */
export const sampleGlasses: GlassesProduct[] = [
  {
    id: 'sample-1',
    name: '클래식 블랙',
    imageUrl: 'https://cdn.pixabay.com/photo/2020/06/09/22/38/glasses-5280380_1280.png',
  },
  {
    id: 'sample-2',
    name: '라운드 골드',
    imageUrl: 'https://cdn.pixabay.com/photo/2015/03/26/09/47/glasses-690547_1280.png',
  },
  {
    id: 'sample-3',
    name: '캐틀아이',
    imageUrl: 'https://cdn.pixabay.com/photo/2016/11/19/12/26/glasses-1838582_1280.png',
  },
]
