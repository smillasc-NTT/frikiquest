import { apiCall } from './api'
export const userService = {
  getUserStats: (userId) => apiCall('/api/users/' + userId + '/stats'),
  updateAvatar: (userId, avatarUrl) => apiCall('/api/users/' + userId + '/avatar', { method: 'PUT', body: JSON.stringify({ avatarUrl }) }),
  updatePassword: (userId, currentPassword, newPassword) => apiCall('/api/users/' + userId + '/password', { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) }),
  deleteUser: (userId) => apiCall('/api/users/' + userId, { method: 'DELETE' }),
}
