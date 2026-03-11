# Node.js 설치 가이드 (Windows)

## 방법 1: 터미널에서 설치 (winget)

PowerShell 또는 **명령 프롬프트(cmd)** 에서 아래 중 하나를 실행하세요. 설치가 끝날 때까지 기다립니다.

**winget이 PATH에 있는 경우:**
```powershell
winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
```

**winget 명령이 안 먹히는 경우 (전체 경로 사용):**
```powershell
& "$env:LOCALAPPDATA\Microsoft\WindowsApps\winget.exe" install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
```

- 설치 중에 **"Add to PATH"** 관련 옵션이 나오면 체크된 채로 두고 진행하세요.
- 끝나면 **터미널/Cursor를 완전히 닫았다가 다시 열고** 아래로 확인:
  ```powershell
  node -v
  npm -v
  ```

---

## 방법 2: 공식 사이트에서 설치

1. **다운로드**: https://nodejs.org/ko → **LTS** 버전 다운로드  
2. **설치**: `.msi` 실행 후 마법사 따라가기 (Add to PATH 체크 유지)  
3. **확인**: 터미널을 새로 연 뒤 `node -v`, `npm -v` 로 버전 확인

---

## 설치 후 Glassify 실행

Node.js 설치가 끝나면 프로젝트 폴더에서:

```powershell
cd c:\Users\kby20\IdeaProjects\Glassify
npm in[Glasses.glb](..%2F..%2FDownloads%2FGlasses.glb)
[Glasses (1).glb](..%2F..%2FDownloads%2FGlasses%20%281%29.glb)stall
npm run dev
```

브라우저에서 **http://localhost:5173** 으로 접속하면 됩니다.
