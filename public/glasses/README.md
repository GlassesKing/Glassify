# 안경 이미지

- **glasses.png** – 누끼 딴 안경(흰 배경 제거). 앱에서 이 이미지를 사용합니다.
- **source.png** – 원본(흰 배경). 이 파일을 바꾼 뒤 아래 스크립트를 다시 실행하면 `glasses.png`가 갱신됩니다.

다른 안경 이미지로 교체하려면:

1. 새 이미지를 `source.png`로 저장 (흰 배경 권장)
2. 터미널에서 실행: `node scripts/removeBackground.cjs`
3. 생성된 `glasses.png`가 앱에 적용됩니다.

외부 URL을 쓰면 403(CORS) 에러가 날 수 있으니, 가능하면 이 폴더에 이미지를 두고 사용하세요.
