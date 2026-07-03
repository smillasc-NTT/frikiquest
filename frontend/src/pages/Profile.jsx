import { useState, useContext, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { AppContext } from '../context/AppContext'
import Header from '../components/Header'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Modal from '../components/Modal'
import { userService } from '../services/userService'
import { validators } from '../utils/validators'

function defaultAvatar(name) {
  return 'https://api.dicebear.com/9.x/avataaars/svg?seed=' + encodeURIComponent(name || 'hero') + '&backgroundColor=ffc107&backgroundType=solid&clothingColor=ffc107'
}

function resizeImage(file, maxSize = 256) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = (e) => {
      img.onerror = reject
      img.onload = () => {
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1)
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

export default function Profile() {
  const { user, logout, refreshUser } = useAuth()
  const { showToast } = useContext(AppContext)
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [preview, setPreview] = useState(null)
  const [uploadLoading, setUploadLoading] = useState(false)

  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const currentAvatar = preview || user?.avatarUrl || defaultAvatar(user?.name)

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { showToast('Selecciona una imagen válida', 'error'); return }
    if (file.size > 5 * 1024 * 1024) { showToast('La imagen es demasiado grande (máx 5MB)', 'error'); return }
    try {
      const resized = await resizeImage(file, 256)
      setPreview(resized)
    } catch {
      showToast('Error al procesar la imagen', 'error')
    }
    e.target.value = ''
  }

  const handleSaveAvatar = async () => {
    if (!preview) return
    setUploadLoading(true)
    try {
      await userService.updateAvatar(user.id, preview)
      await refreshUser()
      setPreview(null)
      showToast('Avatar actualizado', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setUploadLoading(false)
    }
  }

  const handleCancelPreview = () => setPreview(null)

  const handleChangePassword = async () => {
    if (!validators.isValidPassword(newPassword)) { showToast('La contraseña debe tener al menos 8 caracteres', 'error'); return }
    if (!validators.passwordsMatch(newPassword, confirmPassword)) { showToast('Las contraseñas no coinciden', 'error'); return }
    setLoading(true)
    try {
      await userService.updatePassword(user.id, currentPassword, newPassword)
      showToast('Contraseña actualizada', 'success')
      setShowPasswordModal(false)
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    } catch (err) {
      showToast(err.message, 'error')
    } finally { setLoading(false) }
  }

  const handleDeleteUser = async () => {
    setLoading(true)
    try {
      await userService.deleteUser(user.id)
      showToast('Cuenta eliminada', 'success')
      logout()
      navigate('/login')
    } catch (err) {
      showToast(err.message, 'error')
    } finally { setLoading(false) }
  }

  return (
    <>
      <Header />
      <div className="page-content">
        <h2 className="page-title">Mi Perfil</h2>
        <div className="profile-grid">
          <Card>
            {/* Avatar section */}
            <div className="profile-avatar-section">
              <div className="profile-avatar-wrap">
                <img
                  src={currentAvatar}
                  alt="avatar"
                  className="profile-avatar-img"
                />
                {preview && <div className="profile-avatar-badge">Vista previa</div>}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              {preview ? (
                <div className="profile-avatar-actions">
                  <Button onClick={handleSaveAvatar} loading={uploadLoading} auto>
                    Guardar foto
                  </Button>
                  <Button variant="ghost" onClick={handleCancelPreview} auto>
                    Cancelar
                  </Button>
                </div>
              ) : (
                <button
                  className="profile-avatar-change-btn"
                  onClick={() => fileInputRef.current.click()}
                >
                  Cambiar foto
                </button>
              )}
            </div>

            <div className="profile-divider" />

            <div className="profile-info-item">
              <div className="profile-info-label">Nombre</div>
              <div className="profile-info-value">{user?.name}</div>
            </div>
            <div className="profile-info-item">
              <div className="profile-info-label">Email</div>
              <div className="profile-info-value" style={{ fontSize: '13px' }}>{user?.email}</div>
            </div>
            <div className="profile-info-item">
              <div className="profile-info-label">XP Total</div>
              <div className="profile-score">{user?.totalScore || 0}</div>
            </div>
          </Card>

          <Card className="actions-card">
            <div>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>Gestión de cuenta</p>
              <Button variant="secondary" onClick={() => setShowPasswordModal(true)}>Cambiar Contraseña</Button>
            </div>
            <div className="danger-zone">
              <div className="danger-zone-title">Zona de peligro</div>
              <Button variant="danger" onClick={() => setShowDeleteModal(true)}>Eliminar Cuenta</Button>
            </div>
            <div style={{marginTop:'auto',paddingTop:'var(--spacing-md)'}}>
              <Button variant="ghost" onClick={() => { logout(); navigate('/login') }}>
                Cerrar sesión
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <Modal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} title="Cambiar Contraseña">
        <Input type="password" label="Contraseña actual" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
        <Input type="password" label="Nueva contraseña" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
        <Input type="password" label="Confirmar nueva contraseña" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <Button onClick={handleChangePassword} loading={loading}>Guardar</Button>
          <Button variant="secondary" onClick={() => setShowPasswordModal(false)} auto>Cancelar</Button>
        </div>
      </Modal>

      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Eliminar Cuenta">
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '16px' }}>Esta acción es irreversible. Se eliminarán todos tus datos y resultados.</p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="danger" onClick={handleDeleteUser} loading={loading}>Sí, eliminar todo</Button>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)} auto>Cancelar</Button>
        </div>
      </Modal>
    </>
  )
}
