import { useState } from 'react'
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

  return (
    <div className="app">
      <header className="header">
        <h1>Glasses King</h1>
        <p className="subtitle">가상 피팅</p>
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
                <FittingView stream={stream} selectedGlasses={selectedGlasses} />
              </div>
              <div className="camera-actions">
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
