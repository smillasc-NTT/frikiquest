import { apiCall } from './api'
export const challengeService = {
  getTodayChallenge: () => apiCall('/api/challenges/today'),
  listChallenges: () => apiCall('/api/challenges'),
  createChallenge: (data) => apiCall('/api/challenges', { method: 'POST', body: JSON.stringify(data) }),
  updateChallenge: (id, data) => apiCall('/api/challenges/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  deleteChallenge: (id) => apiCall('/api/challenges/' + id, { method: 'DELETE' }),
  getChallengeResults: (id) => apiCall('/api/challenges/' + id + '/results'),
}
