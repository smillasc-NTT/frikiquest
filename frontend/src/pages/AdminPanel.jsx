import { useState, useEffect, useContext } from 'react'
import { AppContext } from '../context/AppContext'
import Header from '../components/Header'
import Card from '../components/Card'
import Input from '../components/Input'
import Button from '../components/Button'
import Modal from '../components/Modal'
import { challengeService } from '../services/challengeService'
import { resultService } from '../services/resultService'

function toISODate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function todayISO() {
  return toISODate(new Date())
}

function addMonths(dateStr, delta) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setMonth(d.getMonth() + delta)
  return toISODate(d)
}

function formatShort(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

function defaultAvatar(name) {
  return 'https://api.dicebear.com/9.x/avataaars/svg?seed=' + encodeURIComponent(name || 'hero') + '&backgroundColor=ffc107&backgroundType=solid&clothingColor=ffc107'
}

const emptyForm = {
  date: todayISO(),
  title: '',
  description: '',
  criteria: '',
  type: 'numeric',
  minValue: '',
  maxValue: '',
}

const typeLabels = { numeric: 'Numérico', boolean: 'Sí/No', text: 'Texto libre' }
const typeBadgeClass = { numeric: 'badge-primary', boolean: 'badge-success', text: 'badge-muted' }

export default function AdminPanel() {
  const { showToast } = useContext(AppContext)

  const [challenges, setChallenges] = useState([])
  const [listLoading, setListLoading] = useState(true)
  const [windowStart, setWindowStart] = useState(todayISO())
  const [selectedId, setSelectedId] = useState(null)

  const [showFormModal, setShowFormModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const [resultsTarget, setResultsTarget] = useState(null)
  const [results, setResults] = useState([])
  const [resultsLoading, setResultsLoading] = useState(false)

  const [resetTarget, setResetTarget] = useState(null)
  const [resetting, setResetting] = useState(false)

  const loadChallenges = async () => {
    try {
      const data = await challengeService.listChallenges()
      setChallenges(data)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setListLoading(false)
    }
  }

  useEffect(() => { loadChallenges() }, [])

  const windowEnd = addMonths(windowStart, 1)
  const visibleChallenges = challenges
    .filter(c => c.date >= windowStart && c.date < windowEnd)
    .sort((a, b) => a.date.localeCompare(b.date))

  const hasOlder = challenges.some(c => c.date < windowStart)
  const hasNewer = challenges.some(c => c.date >= windowEnd)
  const selected = challenges.find(c => c.id === selectedId) || null

  const goPrev = () => { setWindowStart(w => addMonths(w, -1)); setSelectedId(null) }
  const goNext = () => { setWindowStart(w => addMonths(w, 1)); setSelectedId(null) }

  const setField = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const validate = () => {
    if (!form.date) return 'La fecha es obligatoria'
    if (!form.title.trim()) return 'El título es obligatorio'
    if (!form.description.trim()) return 'La descripción es obligatoria'
    if (!form.criteria.trim()) return 'El criterio es obligatorio'
    if (form.type === 'numeric' && form.minValue === '') return 'El valor mínimo es obligatorio para retos numéricos'
    return null
  }

  const handleOpenAdd = () => { setForm(emptyForm); setEditingId(null); setShowFormModal(true) }

  const handleOpenEdit = (c) => {
    setForm({
      date: c.date,
      title: c.title,
      description: c.description,
      criteria: c.criteria,
      type: c.type,
      minValue: c.minValue ?? '',
      maxValue: c.maxValue ?? '',
    })
    setEditingId(c.id)
    setShowFormModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const error = validate()
    if (error) { showToast(error, 'error'); return }

    setSaving(true)
    try {
      const payload = {
        date: form.date,
        title: form.title.trim(),
        description: form.description.trim(),
        criteria: form.criteria.trim(),
        type: form.type,
        minValue: form.type === 'numeric' && form.minValue !== '' ? Number(form.minValue) : undefined,
        maxValue: form.type === 'numeric' && form.maxValue !== '' ? Number(form.maxValue) : undefined,
      }
      if (editingId) {
        await challengeService.updateChallenge(editingId, payload)
        showToast('Reto actualizado', 'success')
      } else {
        await challengeService.createChallenge(payload)
        showToast('Reto creado con éxito', 'success')
      }
      setShowFormModal(false)
      loadChallenges()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await challengeService.deleteChallenge(deleteTarget.id)
      showToast('Reto eliminado', 'success')
      if (selectedId === deleteTarget.id) setSelectedId(null)
      setDeleteTarget(null)
      loadChallenges()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setDeleting(false)
    }
  }

  const handleOpenResults = async (c) => {
    setResultsTarget(c)
    setResultsLoading(true)
    try {
      const data = await challengeService.getChallengeResults(c.id)
      setResults(data)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setResultsLoading(false)
    }
  }

  const handleConfirmReset = async () => {
    if (!resetTarget) return
    setResetting(true)
    try {
      await resultService.deleteResult(resetTarget.id)
      showToast('Resultado reseteado. El usuario ya puede volver a enviarlo.', 'success')
      setResetTarget(null)
      if (resultsTarget) {
        const data = await challengeService.getChallengeResults(resultsTarget.id)
        setResults(data)
      }
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setResetting(false)
    }
  }

  return (
    <>
      <Header title="Admin" />
      <div className="page-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="page-title" style={{ marginBottom: 0 }}>Retos</h2>
          <Button auto onClick={handleOpenAdd}>+ Añadir reto</Button>
        </div>

        {listLoading ? (
          <p className="text-muted mt-md">Cargando...</p>
        ) : (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Título</th>
                    <th>Tipo</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleChallenges.length === 0 ? (
                    <tr><td colSpan={4} className="admin-table-empty">Sin retos en este periodo</td></tr>
                  ) : visibleChallenges.map(c => (
                    <tr
                      key={c.id}
                      className={c.id === selectedId ? 'is-selected' : ''}
                      onClick={() => setSelectedId(c.id === selectedId ? null : c.id)}
                    >
                      <td>{c.date}</td>
                      <td>{c.title}</td>
                      <td><span className={'badge ' + (typeBadgeClass[c.type] || 'badge-muted')}>{typeLabels[c.type] || c.type}</span></td>
                      <td onClick={e => e.stopPropagation()}>
                        <button className="admin-row-btn" title="Ver resultados" onClick={() => handleOpenResults(c)}>📊</button>
                        <button className="admin-row-btn" title="Editar" onClick={() => handleOpenEdit(c)}>✎</button>
                        <button className="admin-row-btn admin-row-btn-danger" title="Eliminar" onClick={() => setDeleteTarget(c)}>🗑</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="admin-pagination">
              {hasOlder ? (
                <button className="btn btn-ghost btn-auto" onClick={goPrev}>← Anteriores</button>
              ) : <span />}
              <span className="admin-pagination-spacer" style={{ textAlign: 'center' }}>
                {formatShort(windowStart)} – {formatShort(windowEnd)}
              </span>
              {hasNewer ? (
                <button className="btn btn-ghost btn-auto" onClick={goNext}>Siguientes (+1 mes) →</button>
              ) : <span />}
            </div>

            {selected && (
              <div style={{ marginTop: 'var(--spacing-md)' }}>
                <Card>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3>{selected.title}</h3>
                    <span className={'badge ' + (typeBadgeClass[selected.type] || 'badge-muted')}>{typeLabels[selected.type] || selected.type}</span>
                  </div>
                  <p className="text-muted mt-sm" style={{ fontSize: '13px' }}>{selected.date}</p>
                  <p className="challenge-desc mt-md">{selected.description}</p>
                  <div className="challenge-criteria">{selected.criteria}</div>
                  {selected.type === 'numeric' && (
                    <p className="text-muted" style={{ fontSize: '13px' }}>
                      Rango: {selected.minValue ?? '—'} {selected.maxValue ? '– ' + selected.maxValue : ''}
                    </p>
                  )}
                </Card>
              </div>
            )}
          </>
        )}
      </div>

      <Modal isOpen={showFormModal} onClose={() => setShowFormModal(false)} title={editingId ? 'Editar reto' : 'Añadir reto'}>
        <form onSubmit={handleSubmit}>
          <Input type="date" label="Fecha" value={form.date} onChange={setField('date')} required />
          <Input label="Título" placeholder="Ej: 50 Flexiones" value={form.title} onChange={setField('title')} required />

          <div className="input-group">
            <label>Descripción<span style={{ color: 'var(--color-primary)' }}> *</span></label>
            <textarea
              className="input"
              rows={3}
              placeholder="Describe el reto..."
              value={form.description}
              onChange={setField('description')}
            />
          </div>

          <Input label="Criterio" placeholder="Ej: Mínimo 50 repeticiones" value={form.criteria} onChange={setField('criteria')} required />

          <div className="input-group">
            <label>Tipo<span style={{ color: 'var(--color-primary)' }}> *</span></label>
            <select className="input" value={form.type} onChange={setField('type')}>
              <option value="numeric">Numérico</option>
              <option value="boolean">Sí/No</option>
              <option value="text">Texto libre</option>
            </select>
          </div>

          {form.type === 'numeric' && (
            <div style={{ display: 'flex', gap: '12px' }}>
              <Input type="number" label="Valor mínimo" value={form.minValue} onChange={setField('minValue')} required />
              <Input type="number" label="Valor máximo (opcional)" value={form.maxValue} onChange={setField('maxValue')} />
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <Button type="submit" loading={saving}>{editingId ? 'Guardar cambios' : 'Crear reto'}</Button>
            <Button variant="secondary" onClick={() => setShowFormModal(false)} auto>Cancelar</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Eliminar reto">
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '16px' }}>
          ¿Seguro que quieres eliminar "{deleteTarget?.title}"? Se borrarán también los resultados enviados para este reto y se descontará la puntuación de los usuarios afectados. Esta acción es irreversible.
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="danger" onClick={handleConfirmDelete} loading={deleting}>Sí, eliminar</Button>
          <Button variant="secondary" onClick={() => setDeleteTarget(null)} auto>Cancelar</Button>
        </div>
      </Modal>

      <Modal isOpen={!!resultsTarget} onClose={() => setResultsTarget(null)} title={'Resultados: ' + (resultsTarget?.title || '')}>
        {resultsLoading ? (
          <p className="text-muted">Cargando...</p>
        ) : results.length === 0 ? (
          <p className="text-muted">Nadie ha enviado resultado todavía.</p>
        ) : (
          <div className="leaderboard-list">
            {results.map(r => (
              <div key={r.id} className="leaderboard-row">
                <img src={r.avatarUrl || defaultAvatar(r.userName)} alt="" className="lb-avatar" />
                <span className="lb-name">{r.userName}</span>
                <span className="text-muted" style={{ fontSize: '12px', marginRight: '8px' }}>{r.value}</span>
                <span className="lb-score">{r.score} XP</span>
                <button className="admin-row-btn" title="Resetear resultado" onClick={() => setResetTarget(r)}>↺</button>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Modal isOpen={!!resetTarget} onClose={() => setResetTarget(null)} title="Resetear resultado">
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '16px' }}>
          ¿Seguro que quieres resetear el resultado de <strong>{resetTarget?.userName}</strong>? Se eliminará su envío, se descontará su puntuación y podrá volver a reportar el resultado.
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="danger" onClick={handleConfirmReset} loading={resetting}>Sí, resetear</Button>
          <Button variant="secondary" onClick={() => setResetTarget(null)} auto>Cancelar</Button>
        </div>
      </Modal>
    </>
  )
}
