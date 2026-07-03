import { apiCall } from './api'
export const resultService = {
  submitResult: (challengeId, value) => apiCall('/api/results', { method: 'POST', body: JSON.stringify({ challengeId, value }) }),
  getMyResultToday: () => apiCall('/api/results/my-today'),
  deleteResult: (id) => apiCall('/api/results/' + id, { method: 'DELETE' }),
}
