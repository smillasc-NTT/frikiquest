import { apiCall } from './api'
export const logService = {
  getToday: () => apiCall('/api/logs/today'),
  markToday: (category, value) => apiCall('/api/logs/today', { method: 'POST', body: JSON.stringify({ category, value }) }),
}
