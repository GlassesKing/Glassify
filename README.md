# Glasses King - 가상 피팅

MediaPipe **Face Landmarker**로 얼굴 랜드마크를 인식하고, 선택한 안경을 실시간으로 얼굴에 입혀 보는 웹 앱입니다.  
웹으로 개발 후 앱으로 감싸는 하이브리드 형태로 사용할 수 있으며, 추후 기존 웹/앱 프로젝트에 연동할 수 있도록 모듈화되어 있습니다.

## 기술 스택

- **Vite** + **React 18** + **TypeScript**
- **@mediapipe/tasks-vision** – Face Landmarker (468개 얼굴 랜드마크)
- 카메라 스트림 → Face Landmarker → 캔버스에 안경 이미지 오버레이

## 빠른 시작

```bash
# 의존성 설치
npm install

# 개발 서버 (https 권장: 카메라는 localhost 또는 HTTPS에서 동작)
npm run dev

# 빌드
npm run build
```

브라우저에서 `http://localhost:5173` 접속 후 **카메라 켜기** → **안경 선택** 시 실시간 가상 피팅이 적용됩니다.

## 프로젝트 구조 (연동 시 참고)

```
src/
├── lib/
│   ├── faceLandmarker.ts   # MediaPipe Face Landmarker 초기화·감지 (재사용 가능)
│   └── glassesOverlay.ts   # 랜드마크 기반 안경 그리기
├── hooks/
│   └── useCamera.ts        # 카메라 스트림 훅
├── components/
│   └── FittingView.tsx     # 비디오 + 캔버스 + 안경 오버레이
├── data/
│   └── sampleGlasses.ts   # 샘플 상품 (추후 API로 교체)
├── types.ts                # LandmarkPoint, GlassesProduct, GLASSES_LANDMARKS
├── App.tsx / main.tsx
└── ...
```

- **기존 웹에 연동**: `lib/faceLandmarker.ts`, `lib/glassesOverlay.ts`, `types.ts`를 복사한 뒤, 자체 UI에서 `<video>`, `<canvas>`와 연동하면 됩니다.
- **안경 상품**: `GlassesProduct`의 `imageUrl`을 기존 쇼핑몰 상품 이미지(투명 PNG 권장)로 바꾸거나, API에서 내려주는 데이터 구조에 맞춰 매핑하면 됩니다.

## 앱 래핑 (하이브리드)

- **Capacitor** 또는 **Cordova** 등으로 `dist`(빌드 결과물)를 웹뷰로 감싸면 동일 코드로 앱 배포 가능합니다.
- 카메라 권한은 각 플랫폼(Android/iOS) 설정에서 허용해야 합니다.

## 주의사항

- 카메라는 **HTTPS** 또는 **localhost** 환경에서만 사용할 수 있습니다.
- 안경 이미지는 **CORS** 허용이 있는 도메인이어야 캔버스에 정상 출력됩니다. 자사 CDN 사용을 권장합니다.
- Face Landmarker 모델은 CDN에서 로드됩니다. 오프라인/내부망에서는 모델 파일을 직접 호스팅해야 합니다.

## 라이선스

프로젝트 내부 정책에 따릅니다.
