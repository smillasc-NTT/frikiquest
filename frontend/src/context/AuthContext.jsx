import { createContext, useState, useEffect } from 'react'
import { authService } from '../services/authService'

export const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      verifyToken()
    } else {
      setLoading(false)
    }
  }, [])

  const verifyToken = async () => {
    try {
      const data = await authService.getMe()
      setUser(data)
    } catch {
      setToken(null)
      localStorage.removeItem('token')
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    const data = await authService.login(email, password)
    setToken(data.token)
    setUser(data.user)
    localStorage.setItem('token', data.token)
    return data
  }

  const signup = async (name, email, password) => {
    const data = await authService.signup(name, email, password)
    if (data.token) {
      setToken(data.token)
      setUser(data.user)
      localStorage.setItem('token', data.token)
    }
    return data
  }

  const refreshUser = async () => {
    try {
      const data = await authService.getMe()
      setUser(data)
    } catch {}
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}
