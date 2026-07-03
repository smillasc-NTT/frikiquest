import { useState, useContext } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { AppContext } from '../context/AppContext'
import Input from '../components/Input'
import Button from '../components/Button'
import { validators } from '../utils/validators'

export default function SignUp() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const { signup } = useAuth()
  const { showToast } = useContext(AppContext)
  const navigate = useNavigate()

  const validate = () => {
    const e = {}
    if (!validators.isValidName(name)) e.name = 'Nombre inválido'
    if (!validators.isValidEmail(email)) e.email = 'Email inválido'
    if (!validators.isValidPassword(password)) e.password = 'Mínimo 8 caracteres'
    if (!validators.passwordsMatch(password, confirmPassword)) e.confirmPassword = 'Las contraseñas no coinciden'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    try {
      await signup(name, email, password)
      showToast('¡Cuenta creada! Bienvenido.', 'success')
      navigate('/dashboard')
    } catch (err) {
      showToast(err.message || 'Error al crear cuenta', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-box">
        <div className="auth-logo">FrikiQuest</div>
        <div className="auth-subtitle">Supera tus límites. Gamifica tu progreso.</div>
        <h2 className="auth-title">Crea tu cuenta</h2>
        <form onSubmit={handleSubmit}>
          <Input label="Nombre de guerrero" placeholder="Tu alias épico" value={name} onChange={e => setName(e.target.value)} error={errors.name} required />
          <Input type="email" label="Email" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} error={errors.email} required />
          <Input type="password" label="Contraseña" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} error={errors.password} required />
          <Input type="password" label="Confirmar contraseña" placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} error={errors.confirmPassword} required />
          <Button type="submit" loading={loading}>Crear cuenta</Button>
        </form>
        <p className="auth-link">¿Ya tienes cuenta? <Link to="/login">Accede aquí</Link></p>
      </div>
    </div>
  )
}
