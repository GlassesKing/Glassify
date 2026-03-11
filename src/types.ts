/** MediaPipe 랜드마크 한 점 (정규화 좌표 0~1) */
export interface LandmarkPoint {
  x: number
  y: number
  z?: number
}

/** 안경 치수 (mm). 쇼핑몰 스펙 그대로 저장 */
export interface GlassesDimensionsMm {
  /** 총길이 (프레임 전체 가로) */
  totalLength: number
  /** 가로 (렌즈 폭 등) */
  width: number
  /** 세로 (렌즈 높이 등) */
  height: number
  /** 브릿지 (코받침 폭) */
  bridge: number
  /** 템플 길이 */
  templeLength: number
}

/** 안경 상품 정보 (추후 기존 쇼핑몰 API와 연동) */
export interface GlassesProduct {
  id: string
  name: string
  /** 안경 이미지 URL (투명 PNG, 정면 기준). Perspective 모드에서 사용 */
  imageUrl: string
  /** 3D 모델 URL (.glb). Face Geometry 3D 모드에서 사용. 없으면 기본 geometry */
  modelUrl?: string | null
  /** 노즈브릿지~템플까지 비율 (이미지 비율에 맞춰 스케일 조정용) */
  aspectRatio?: number
  /** 안경테 가로 폭 (cm). 있으면 얼굴 대비 실제 크기로 표시. dimensionsMm 있으면 총길이에서 자동 계산 */
  frameWidthCm?: number
  /** 안경 치수 (mm). 있으면 frameWidthCm = totalLength/10 로 사용 가능 */
  dimensionsMm?: GlassesDimensionsMm
  /** 그릴 때 이미지 가로 중앙 비율 (0~1). 작을수록 다리 끝이 더 잘림, 클수록 옆면이 더 보임. 기본 0.58 */
  frontCropRatio?: number
}

/** Face Landmarker 결과에서 안경 배치에 사용할 랜드마크 인덱스 (MediaPipe 468 포인트) */
export const GLASSES_LANDMARKS = {
  /** 코 끝 */
  noseTip: 1,
  /** 미간(코 뿌리) - 안경 중앙 정렬용 */
  noseRoot: 168,
  /** 왼쪽 눈 안쪽 */
  leftEyeInner: 133,
  /** 왼쪽 눈 바깥쪽 */
  leftEyeOuter: 33,
  /** 오른쪽 눈 안쪽 */
  rightEyeInner  : 362,
  /** 오른쪽 눈 바깥쪽 */
  rightEyeOuter: 263,
  /** 왼쪽 관자 부분 (얼굴 윤곽) */
  leftTemple: 234,
  /** 오른쪽 관자 부분 */
  rightTemple: 454,
} as const
