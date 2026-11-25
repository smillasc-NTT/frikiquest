import { apiCall } from './api'

export const adminService = {
  listUsers: (status) => apiCall('/api/admin/users' + (status ? '?status=' + status : '')),
  approveUser: (userId) => apiCall('/api/admin/users/' + userId + '/approve', { method: 'PUT' }),
  updateRole: (userId, role) => apiCall('/api/admin/users/' + userId + '/role', { method: 'PUT', body: JSON.stringify({ role }) }),
  deleteUser: (userId) => apiCall('/api/admin/users/' + userId, { method: 'DELETE' }),
  getUserDay: (userId, date) => apiCall('/api/admin/users/' + userId + '/logs/' + date),
  resetUserDay: (userId, date) => apiCall('/api/admin/users/' + userId + '/logs/' + date, { method: 'DELETE' }),
}
