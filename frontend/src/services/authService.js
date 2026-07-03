import { apiCall } from './api'

export const authService = {
  signup: (name, email, password) => apiCall('/api/auth/signup', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  login: (email, password) => apiCall('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  getMe: () => apiCall('/api/auth/me'),
}
