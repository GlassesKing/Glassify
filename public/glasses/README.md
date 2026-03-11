# 안경 에셋 (이미지 + 3D)

- **glasses.png** – 누끼 딴 안경(흰 배경 제거). 2D/3D 텍스처용.
- **source.png** – 원본(흰 배경). 이 파일을 바꾼 뒤 아래 스크립트를 다시 실행하면 `glasses.png`가 갱신됩니다.
- **3D 모델**: `.glb` 파일을 이 폴더에 넣고 상품에 `modelUrl: '/glasses/파일명.glb'` 지정 시 3D 오버레이로 표시됩니다. 자세한 출처·사용법은 **3D_모델_가이드.md** 를 보세요.

## 이미지 교체

1. 새 이미지를 `source.png`로 저장 (흰 배경 권장)
2. 터미널에서 실행: `node scripts/removeBackground.cjs`
3. 생성된 `glasses.png`가 앱에 적용됩니다.

외부 URL을 쓰면 403(CORS) 에러가 날 수 있으니, 가능하면 이 폴더에 이미지를 두고 사용하세요.
