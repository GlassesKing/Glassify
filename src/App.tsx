import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FittingView } from './components/FittingView'
import { useCamera } from './hooks/useCamera'
import { sampleGlasses } from './data/sampleGlasses'
import type { GlassesProduct } from './types'
import './App.css'

function App() {
  const { stream, error, start, stop, facingMode, switchCamera } = useCamera()
  const [selectedGlasses, setSelectedGlasses] = useState<GlassesProduct | null>(
    () => sampleGlasses.find((g) => g.id === 'davich-muse04') ?? null
  )
  const [faceWidthCm, setFaceWidthCm] = useState(15)

  return (
    <div className="app">
      <header className="header">
        <h1>Glasses King</h1>
        <p className="subtitle">가상 피팅</p>
        <Link to="/viewer" className="header-viewer-link">3D 안경 뷰어 (URL 추출)</Link>
      </header>

      <main className="main">
        <section className="camera-section">
          {!stream ? (
            <div className="camera-placeholder">
              {error ? (
                <p className="error">{error}</p>
              ) : (
                <p>카메라를 켜면 얼굴 인식이 시작됩니다</p>
              )}
              <button type="button" className="btn btn-primary" onClick={start}>
                카메라 켜기
              </button>
            </div>
          ) : (
            <>
              <div className="fitting-wrapper">
                <FittingView
                  stream={stream}
                  selectedGlasses={selectedGlasses}
                  faceWidthCm={faceWidthCm}
                />
              </div>
              <div className="camera-actions">
                <label className="face-width-label">
                  얼굴 너비 (cm):{' '}
                  <input
                    type="number"
                    min={12}
                    max={22}
                    step={0.5}
                    value={faceWidthCm}
                    onChange={(e) => setFaceWidthCm(Number(e.target.value) || 15)}
                    title="양 관자 사이 거리 등. 측정해서 넣으면 안경 크기가 실제 비율에 가깝게 표시됩니다."
                  />
                </label>
                <button type="button" className="btn btn-secondary" onClick={switchCamera}>
                  {facingMode === 'user' ? '후면 카메라' : '전면 카메라'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={stop}>
                  카메라 끄기
                </button>
              </div>
            </>
          )}
        </section>

        <aside className="product-list">
          <h2>안경 선택</h2>
          <p className="hint">클릭하면 실시간으로 얼굴에 적용됩니다</p>
          <ul>
            <li>
              <button
                type="button"
                className={`product-item ${selectedGlasses === null ? 'selected' : ''}`}
                onClick={() => setSelectedGlasses(null)}
              >
                <span className="product-name">없음</span>
              </button>
            </li>
            {sampleGlasses.map((product) => (
              <li key={product.id}>
                <button
                  type="button"
                  className={`product-item ${selectedGlasses?.id === product.id ? 'selected' : ''}`}
                  onClick={() => setSelectedGlasses(product)}
                >
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="product-thumb"
                  />
                  <span className="product-name">{product.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </main>
    </div>
  )
}

export default App
