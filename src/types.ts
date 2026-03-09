/** MediaPipe 랜드마크 한 점 (정규화 좌표 0~1) */
export interface LandmarkPoint {
  x: number
  y: number
  z?: number
}

/** 안경 상품 정보 (추후 기존 쇼핑몰 API와 연동) */
export interface GlassesProduct {
  id: string
  name: string
  /** 안경 이미지 URL (투명 PNG, 정면 기준) */
  imageUrl: string
  /** 노즈브릿지~템플까지 비율 (이미지 비율에 맞춰 스케일 조정용) */
  aspectRatio?: number
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
