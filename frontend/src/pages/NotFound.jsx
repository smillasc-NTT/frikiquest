import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="loading-screen">
      <div style={{fontFamily:'var(--font-display)',fontSize:'64px',color:'var(--color-primary)'}}>404</div>
      <h2>Página no encontrada</h2>
      <p style={{color:'var(--color-text-muted)'}}>Esta misión no existe</p>
      <Link to="/dashboard" style={{marginTop:'16px'}}>Volver al inicio</Link>
    </div>
  )
}
