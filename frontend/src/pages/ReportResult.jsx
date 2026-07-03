import { useState, useContext } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import { resultService } from '../services/resultService'

export default function ReportResult() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const { showToast } = useContext(AppContext)
  const challenge = state?.challenge

  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)

  if (!challenge) {
    navigate('/dashboard', { replace: true })
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!value.trim()) { showToast('Ingresa un valor', 'error'); return }
    setLoading(true)
    try {
      await resultService.submitResult(challenge.id, value)
      showToast('¡Resultado registrado! +XP', 'success')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      showToast(err.message, 'error')
      setLoading(false)
    }
  }

  return (
    <div className="report-page">
      <div className="report-header">
        <button className="report-back" onClick={() => navigate(-1)}>←</button>
        <span style={{fontFamily:'JetBrains Mono',fontWeight:700,fontSize:'16px'}}>Reportar Resultado</span>
      </div>

      <div className="report-content">
        <div className="challenge-tag" style={{marginBottom:'8px'}}>⚡ Reto del día</div>
        <h2 style={{marginBottom:'12px'}}>{challenge.title}</h2>
        <p className="challenge-desc">{challenge.description}</p>
        <div className="challenge-criteria">{challenge.criteria}</div>

        <form onSubmit={handleSubmit} style={{marginTop:'32px'}}>
          <div className="input-group">
            <label>Tu resultado{challenge.type === 'numeric' ? ` (mín: ${challenge.minValue})` : ''}</label>
            <input
              className="input"
              type={challenge.type === 'numeric' ? 'number' : 'text'}
              placeholder={challenge.type === 'numeric' ? 'Ej: 55' : 'Tu respuesta...'}
              value={value}
              onChange={e => setValue(e.target.value)}
              min={challenge.minValue}
              max={challenge.maxValue}
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !value.trim()}
            style={{marginTop:'8px'}}
          >
            {loading ? '···' : 'Enviar resultado'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate(-1)}
            style={{marginTop:'8px'}}
          >
            Cancelar
          </button>
        </form>
      </div>
    </div>
  )
}
