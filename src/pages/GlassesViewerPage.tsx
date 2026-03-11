/**
 * 3D 뷰어: glasses1.glb 안경 모델 표시
 */
import { Link } from 'react-router-dom'
import { GlassesGLBViewer } from '../components/GlassesGLBViewer'
import './GlassesViewerPage.css'

export function GlassesViewerPage() {
  return (
    <div className="glasses-viewer-page">
      <header className="glasses-viewer-page-header">
        <Link to="/" className="glasses-viewer-page-back">
          ← 가상 피팅으로
        </Link>
        <h1>3D 뷰어</h1>
        <p className="glasses-viewer-page-sub">안경 (glasses1.glb)</p>
      </header>

      <main className="glasses-viewer-page-main">
        <GlassesGLBViewer name="안경" />
      </main>

      <footer className="glasses-viewer-page-footer">
        <p>마우스로 드래그하면 3D 모형을 회전할 수 있습니다.</p>
      </footer>
    </div>
  )
}
