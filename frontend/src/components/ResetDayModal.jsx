import { useState, useEffect } from 'react'
import Modal from './Modal'
import Input from './Input'
import Button from './Button'
import { adminService } from '../services/adminService'

const LABELS = { training: 'Entreno', steps: '10.000 pasos', nutrition: 'Nutrición' }

function todayISO() {
  // 'sv-SE' formats as YYYY-MM-DD; same time zone the backend uses by default.
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' })
}

/** Admin dialog to wipe one user's marks for a chosen day. Open while `user` is set. */
export default function ResetDayModal({ user, onClose, onReset, showToast }) {
  const [date, setDate] = useState(todayISO)
  const [day, setDay] = useState(null)
  const [loading, setLoading] = useState(false)
  const [resetting, setResetting] = useState(false)

  // Every time the dialog opens it starts on today.
  useEffect(() => { if (user) setDate(todayISO()) }, [user?.id])

  useEffect(() => {
    setDay(null)
    if (!user || !date || date > todayISO()) return
    let cancelled = false
    setLoading(true)
    adminService.getUserDay(user.id, date)
      .then(data => { if (!cancelled) setDay(data) })
      .catch(err => { if (!cancelled) showToast(err.message, 'error') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user?.id, date])

  const marked = day ? Object.keys(LABELS).filter(k => day[k] === 'done') : []
  const hasData = !!day && (marked.length > 0 || day.hits > 0)

  const handleReset = async () => {
    setResetting(true)
    try {
      const res = await adminService.resetUserDay(user.id, date)
      const healed = res.hitsRemoved ? ` · el villano recupera ${res.hitsRemoved} HP` : ''
      showToast(`Día reiniciado: -${res.xpRemoved} XP${healed}`, 'success')
      onClose()
      onReset() // refresh the villain's life in the events table
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setResetting(false)
    }
  }

  let summary
  if (date > todayISO()) summary = 'Elige hoy o una fecha anterior.'
  else if (loading) summary = 'Cargando...'
  else if (!day) summary = 'Elige una fecha.'
  else if (!hasData) summary = 'No hay nada marcado ese día.'
  else summary = (
    <>
      Marcado: <strong>{marked.map(k => LABELS[k]).join(', ') || 'nada'}</strong><br />
      Se quitarán <strong>{day.xp} XP</strong>
      {day.hits > 0 && <> y el villano recuperará <strong>{day.hits} HP</strong></>}.
    </>
  )

  return (
    <Modal isOpen={!!user} onClose={onClose} title="Reiniciar día">
      <p className="text-muted" style={{ marginBottom: '16px' }}>
        Borra las misiones de "{user?.name}" en la fecha elegida. Si es hoy, podrá volver a marcarlas.
      </p>
      <Input type="date" label="Fecha" value={date} max={todayISO()} onChange={e => setDate(e.target.value)} />
      <div className="event-hp-calc" role="status">{summary}</div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <Button variant="danger" onClick={handleReset} loading={resetting} disabled={!hasData || loading}>Reiniciar día</Button>
        <Button variant="secondary" onClick={onClose} auto>Cancelar</Button>
      </div>
    </Modal>
  )
}
