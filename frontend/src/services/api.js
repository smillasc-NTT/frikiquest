const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token')
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token) headers['Authorization'] = 'Bearer ' + token

  const response = await fetch(API_BASE_URL + endpoint, { ...options, headers })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'API error' }))
    throw new Error(error.error || 'API error')
  }
  if (response.status === 204) return null
  return response.json()
}
