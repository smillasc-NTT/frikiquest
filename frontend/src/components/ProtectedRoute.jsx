import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="loading-screen">
      <div className="loading-dot">◆</div>
      <span>Cargando...</span>
    </div>
  )
  if (!user) return <Navigate to="/login" />
  return children
}
