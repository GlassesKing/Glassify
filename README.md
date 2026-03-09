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

## 브랜치 전략

Git Flow 스타일로 다음 4개 브랜치를 사용합니다.

| 브랜치 | 용도 |
|--------|------|
| **production** | 운영(실서비스) 배포용. 항상 배포 가능한 상태만 유지 |
| **develop** | 다음 버전 개발 통합. 기능들이 머지되는 메인 개발 라인 |
| **test** | QA·테스트용. develop 기준으로 테스트/스테이징 |
| **feature/dev** | 개인 개발 브랜치. 여기서 작업 후 develop으로 머지 |

### 흐름

- **일상 개발**: `feature/dev`에서 작업 → 완료 시 **develop**에 머지(또는 PR).
- **테스트**: **develop**을 **test**에 머지한 뒤 QA/자동화 테스트 실행.
- **배포**: 테스트 통과 후 **develop**을 **production**에 머지 후 배포.

### 자주 쓰는 명령

```bash
# 개발 시작 시 (develop 최신 반영 후 작업)
git checkout develop
git pull origin develop
git checkout feature/dev
git merge develop

# 원격에 브랜치 올리기
git push -u origin production develop test feature/dev
```

팀 규모가 작다면 **develop**과 **test**를 하나로 두고, 필요할 때 test 브랜치를 분리해도 됩니다.

## 앱 래핑 (하이브리드)

- **Capacitor** 또는 **Cordova** 등으로 `dist`(빌드 결과물)를 웹뷰로 감싸면 동일 코드로 앱 배포 가능합니다.
- 카메라 권한은 각 플랫폼(Android/iOS) 설정에서 허용해야 합니다.

## 주의사항

- 카메라는 **HTTPS** 또는 **localhost** 환경에서만 사용할 수 있습니다.
- 안경 이미지는 **CORS** 허용이 있는 도메인이어야 캔버스에 정상 출력됩니다. 자사 CDN 사용을 권장합니다.
- Face Landmarker 모델은 CDN에서 로드됩니다. 오프라인/내부망에서는 모델 파일을 직접 호스팅해야 합니다.

## 라이선스

프로젝트 내부 정책에 따릅니다.
