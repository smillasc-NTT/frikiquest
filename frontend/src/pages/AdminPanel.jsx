import { useState, useEffect, useContext } from 'react'
import { AppContext } from '../context/AppContext'
import Header from '../components/Header'
import Input from '../components/Input'
import Button from '../components/Button'
import Modal from '../components/Modal'
import { eventService } from '../services/eventService'
import { adminService } from '../services/adminService'

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
const MAX_IMAGE_SIDE = 1024
const MAX_DATA_URL_CHARS = 1400000 // backend limit (~1MB image)

/**
 * Downscales the picked image to at most MAX_IMAGE_SIDE px and re-encodes it
 * (WebP, JPEG fallback) so big photos don't hit the backend size limit.
 */
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      let data = canvas.toDataURL('image/webp', 0.85)
      if (!data.startsWith('data:image/webp')) data = canvas.toDataURL('image/jpeg', 0.85)
      resolve(data)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se ha podido leer la imagen')) }
    img.src = url
  })
}

function toISODate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatShort(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

function daysInclusive(start, end) {
  if (!start || !end || end < start) return 0
  return Math.round((new Date(end + 'T00:00:00Z') - new Date(start + 'T00:00:00Z')) / 86400000) + 1
}

// Mirrors helpers.calculateMaxHp on the backend.
function expectedHp(users, start, end, margin) {
  const days = daysInclusive(start, end)
  if (!days || !margin) return 0
  return Math.max(1, Math.ceil(Math.max(users, 1) * days * 3 * (margin / 100)))
}

function addDaysISO(dateStr, delta) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + delta)
  return toISODate(d)
}

function findOverlap(events, start, end, excludeId) {
  return events.find(ev => ev.id !== excludeId && ev.startDate <= end && ev.endDate >= start)
}

/** Proposes the first free date range (from today, until the end of that month). */
function emptyForm(events = []) {
  let start = toISODate(new Date())
  for (let guard = 0; guard < 50; guard++) {
    const clash = findOverlap(events, start, start)
    if (!clash) break
    start = addDaysISO(clash.endDate, 1)
  }
  const s = new Date(start + 'T00:00:00')
  let end = toISODate(new Date(s.getFullYear(), s.getMonth() + 1, 0))
  const next = events.filter(ev => ev.startDate > start).sort((a, b) => a.startDate.localeCompare(b.startDate))[0]
  if (next && next.startDate <= end) end = addDaysISO(next.startDate, -1)
  return { title: '', description: '', startDate: start, endDate: end, complianceMargin: 70, image: null, imagePreview: null }
}

const statusLabels = { active: 'Activo', upcoming: 'Próximo', finished: 'Terminado' }
const statusBadge = { active: 'badge-primary', upcoming: 'badge-muted', finished: 'badge-muted' }

export default function AdminPanel() {
  const { showToast } = useContext(AppContext)

  const [activeTab, setActiveTab] = useState('events')

  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [userFilter, setUserFilter] = useState('all')
  const [approvingId, setApprovingId] = useState(null)
  const [deleteUserTarget, setDeleteUserTarget] = useState(null)
  const [deletingUser, setDeletingUser] = useState(false)

  const [events, setEvents] = useState([])
  const [approvedUsers, setApprovedUsers] = useState(0)
  const [eventsLoading, setEventsLoading] = useState(true)

  const [showFormModal, setShowFormModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(() => emptyForm())
  const [processingImage, setProcessingImage] = useState(false)
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const loadEvents = async () => {
    try {
      const data = await eventService.list()
      setEvents(data.events)
      setApprovedUsers(data.approvedUsers)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setEventsLoading(false)
    }
  }

  useEffect(() => { loadEvents() }, [])

  const loadUsers = async () => {
    setUsersLoading(true)
    try {
      const data = await adminService.listUsers(userFilter === 'pending' ? 'pending' : undefined)
      setUsers(data)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setUsersLoading(false)
    }
  }

  useEffect(() => { if (activeTab === 'users') loadUsers() }, [activeTab, userFilter])

  const handleApprove = async (u) => {
    setApprovingId(u.id)
    try {
      await adminService.approveUser(u.id)
      showToast('Usuario aprobado', 'success')
      loadUsers()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setApprovingId(null)
    }
  }

  const handleConfirmDeleteUser = async () => {
    if (!deleteUserTarget) return
    setDeletingUser(true)
    try {
      await adminService.deleteUser(deleteUserTarget.id)
      showToast('Usuario eliminado', 'success')
      setDeleteUserTarget(null)
      loadUsers()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setDeletingUser(false)
    }
  }

  const setField = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleImage = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!IMAGE_TYPES.includes(file.type)) { showToast('Formato no válido: usa PNG, JPG, WEBP o GIF', 'error'); return }
    setProcessingImage(true)
    try {
      const data = await compressImage(file)
      if (data.length > MAX_DATA_URL_CHARS) throw new Error('La imagen sigue siendo demasiado grande, prueba con otra')
      setForm(f => ({ ...f, image: data, imagePreview: data }))
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setProcessingImage(false)
    }
  }

  const validate = () => {
    if (!form.title.trim()) return 'El título es obligatorio'
    if (!form.description.trim()) return 'La descripción es obligatoria'
    if (!form.startDate || !form.endDate) return 'Las fechas son obligatorias'
    if (form.endDate < form.startDate) return 'La fecha de fin debe ser posterior a la de inicio'
    const m = Number(form.complianceMargin)
    if (!Number.isInteger(m) || m < 10 || m > 100) return 'El margen debe ser un entero entre 10 y 100'
    if (!editing && !form.image) return 'La imagen del villano es obligatoria'
    const clash = findOverlap(events, form.startDate, form.endDate, editing?.id)
    if (clash) return `Las fechas se solapan con "${clash.title}" (${clash.startDate} → ${clash.endDate}). Elige otras fechas.`
    return null
  }

  const handleOpenAdd = () => { setForm(emptyForm(events)); setEditing(null); setShowFormModal(true) }

  const handleOpenEdit = (ev) => {
    setForm({
      title: ev.title,
      description: ev.description,
      startDate: ev.startDate,
      endDate: ev.endDate,
      complianceMargin: ev.complianceMargin,
      image: null,
      imagePreview: eventService.imageSrc(ev),
    })
    setEditing(ev)
    setShowFormModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const error = validate()
    if (error) { showToast(error, 'error'); return }

    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        startDate: form.startDate,
        endDate: form.endDate,
        complianceMargin: Number(form.complianceMargin),
        ...(form.image ? { image: form.image } : {}),
      }
      if (editing) {
        await eventService.update(editing.id, payload)
        showToast('Evento actualizado', 'success')
      } else {
        await eventService.create(payload)
        showToast('Evento creado', 'success')
      }
      setShowFormModal(false)
      loadEvents()
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
      await eventService.remove(deleteTarget.id)
      showToast('Evento eliminado', 'success')
      setDeleteTarget(null)
      loadEvents()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setDeleting(false)
    }
  }

  const hpPreview = expectedHp(approvedUsers, form.startDate, form.endDate, Number(form.complianceMargin))
  const daysPreview = daysInclusive(form.startDate, form.endDate)

  return (
    <>
      <Header title="Admin" />
      <div className="page-content">
        <div style={{ display: 'flex', gap: '8px', marginBottom: 'var(--spacing-md)' }}>
          <Button variant={activeTab === 'events' ? 'primary' : 'secondary'} auto onClick={() => setActiveTab('events')}>Eventos</Button>
          <Button variant={activeTab === 'users' ? 'primary' : 'secondary'} auto onClick={() => setActiveTab('users')}>Usuarios</Button>
        </div>
      </div>

      {activeTab === 'events' && (
      <div className="page-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <h2 className="page-title" style={{ marginBottom: 0 }}>Eventos</h2>
          <Button auto onClick={handleOpenAdd}>+ Nuevo evento</Button>
        </div>
        <p className="text-muted mt-sm" style={{ fontSize: '13px' }}>
          Cada hábito cumplido durante el evento quita 1 HP al villano. La vida se calcula como
          usuarios × días × 3 × margen de cumplimiento.
        </p>

        {eventsLoading ? (
          <p className="text-muted mt-md">Cargando...</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Evento</th>
                  <th>Fechas</th>
                  <th>Vida</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {events.length === 0 ? (
                  <tr><td colSpan={5} className="admin-table-empty">Todavía no hay eventos</td></tr>
                ) : events.map(ev => (
                  <tr key={ev.id}>
                    <td>
                      {ev.imageUrl
                        ? <img src={eventService.imageSrc(ev)} alt="" className="event-thumb" style={ev.isDefeated ? { filter: 'grayscale(1)' } : undefined} />
                        : <span className="event-thumb">👹</span>}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{ev.title}</div>
                      <span className={'badge ' + statusBadge[ev.status]}>{statusLabels[ev.status]}</span>
                      {ev.isDefeated && <span className="badge badge-success" style={{ marginLeft: 4 }}>Derrotado</span>}
                    </td>
                    <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {formatShort(ev.startDate)}<br />{formatShort(ev.endDate)}
                    </td>
                    <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {ev.hp} / {ev.maxHp} HP ({ev.hpPercent}%)
                      <div className="event-mini-hp"><div style={{ width: ev.hpPercent + '%' }} /></div>
                      <span className="text-muted">Margen {ev.complianceMargin}%</span>
                    </td>
                    <td>
                      <button className="admin-row-btn" title="Editar" onClick={() => handleOpenEdit(ev)}>✎</button>
                      <button className="admin-row-btn admin-row-btn-danger" title="Eliminar" onClick={() => setDeleteTarget(ev)}>🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      {activeTab === 'users' && (
      <div className="page-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="page-title" style={{ marginBottom: 0 }}>Usuarios</h2>
        </div>

        <div style={{ display: 'flex', gap: '8px', margin: 'var(--spacing-md) 0' }}>
          <Button variant={userFilter === 'all' ? 'primary' : 'secondary'} auto onClick={() => setUserFilter('all')}>Todos</Button>
          <Button variant={userFilter === 'pending' ? 'primary' : 'secondary'} auto onClick={() => setUserFilter('pending')}>Pendientes</Button>
        </div>

        {usersLoading ? (
          <p className="text-muted mt-md">Cargando...</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={5} className="admin-table-empty">Sin usuarios</td></tr>
                ) : users.map(u => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.role}</td>
                    <td><span className={'badge ' + (u.status === 'pending' ? 'badge-muted' : 'badge-success')}>{u.status === 'pending' ? 'Pendiente' : 'Aprobado'}</span></td>
                    <td>
                      {u.status === 'pending' && (
                        <button className="admin-row-btn" title="Aprobar" disabled={approvingId === u.id} onClick={() => handleApprove(u)}>✓</button>
                      )}
                      <button className="admin-row-btn admin-row-btn-danger" title="Eliminar" onClick={() => setDeleteUserTarget(u)}>🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      <Modal isOpen={showFormModal} onClose={() => setShowFormModal(false)} title={editing ? 'Editar evento' : 'Nuevo evento'}>
        <form onSubmit={handleSubmit}>
          <Input label="Título" placeholder="Ej: El Señor del Sofá" value={form.title} onChange={setField('title')} required />

          <div className="input-group">
            <label>Descripción<span style={{ color: 'var(--color-primary)' }}> *</span></label>
            <textarea
              className="input"
              rows={3}
              placeholder="Presenta al villano..."
              value={form.description}
              onChange={setField('description')}
            />
          </div>

          <div className="input-group">
            <label>Imagen del villano{!editing && <span style={{ color: 'var(--color-primary)' }}> *</span>}</label>
            <input type="file" accept={IMAGE_TYPES.join(',')} onChange={handleImage} className="input" />
            <span className="text-muted" style={{ fontSize: '12px' }}>
              PNG, JPG, WEBP o GIF · se redimensiona automáticamente{editing ? ' · déjalo vacío para mantener la actual' : ''}. Mejor con fondo transparente.
              {processingImage && ' Procesando…'}
            </span>
            {form.imagePreview && <img src={form.imagePreview} alt="Vista previa" className="event-image-preview" />}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <Input type="date" label="Inicio" value={form.startDate} onChange={setField('startDate')} required />
            <Input type="date" label="Fin" value={form.endDate} onChange={setField('endDate')} required />
          </div>

          <Input type="number" label="Margen de cumplimiento (%)" value={form.complianceMargin} onChange={setField('complianceMargin')} required />

          <div className="event-hp-calc">
            {approvedUsers} usuarios × {daysPreview} días × 3 hábitos × {form.complianceMargin || 0}% = <strong>{hpPreview} HP</strong>
            {editing && editing.damage > 0 && <> · ya ha recibido {editing.damage} golpes</>}
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <Button type="submit" loading={saving} disabled={processingImage}>{editing ? 'Guardar cambios' : 'Crear evento'}</Button>
            <Button variant="secondary" onClick={() => setShowFormModal(false)} auto>Cancelar</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Eliminar evento">
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '16px' }}>
          ¿Seguro que quieres eliminar "{deleteTarget?.title}"? Se perderá el daño acumulado del villano. El XP de los usuarios no cambia. Esta acción es irreversible.
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="danger" onClick={handleConfirmDelete} loading={deleting}>Sí, eliminar</Button>
          <Button variant="secondary" onClick={() => setDeleteTarget(null)} auto>Cancelar</Button>
        </div>
      </Modal>

      <Modal isOpen={!!deleteUserTarget} onClose={() => setDeleteUserTarget(null)} title="Eliminar usuario">
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '16px' }}>
          ¿Seguro que quieres eliminar a "{deleteUserTarget?.name}"? Se borrarán también sus registros diarios. Esta acción es irreversible.
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="danger" onClick={handleConfirmDeleteUser} loading={deletingUser}>Sí, eliminar</Button>
          <Button variant="secondary" onClick={() => setDeleteUserTarget(null)} auto>Cancelar</Button>
        </div>
      </Modal>
    </>
  )
}
