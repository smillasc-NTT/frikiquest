import { apiCall } from './api'

export const adminService = {
  listUsers: (status) => apiCall('/api/admin/users' + (status ? '?status=' + status : '')),
  approveUser: (userId) => apiCall('/api/admin/users/' + userId + '/approve', { method: 'PUT' }),
  deleteUser: (userId) => apiCall('/api/admin/users/' + userId, { method: 'DELETE' }),
}
