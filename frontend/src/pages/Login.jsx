import { useState, useContext } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { AppContext } from '../context/AppContext'
import Input from '../components/Input'
import Button from '../components/Button'
import { validators } from '../utils/validators'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const { showToast } = useContext(AppContext)
  const navigate = useNavigate()

  const validate = () => {
    const e = {}
    if (!validators.isValidEmail(email)) e.email = 'Email inválido'
    if (!validators.isValidPassword(password)) e.password = 'Mínimo 8 caracteres'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    try {
      await login(email, password)
      showToast('¡Bienvenido de vuelta!', 'success')
      navigate('/dashboard')
    } catch (err) {
      showToast(err.message || 'Credenciales inválidas', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-box">
        <div className="auth-logo">FrikiQuest</div>
        <div className="auth-subtitle">Supera tus límites. Gamifica tu progreso.</div>
        <h2 className="auth-title">Accede a tu cuenta</h2>
        <form onSubmit={handleSubmit}>
          <Input type="email" label="Email" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} error={errors.email} required />
          <Input type="password" label="Contraseña" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} error={errors.password} required />
          <Button type="submit" loading={loading}>Entrar</Button>
        </form>
        <p className="auth-link">¿No tienes cuenta? <Link to="/signup">Crear una</Link></p>
      </div>
    </div>
  )
}
