import { apiCall, API_BASE_URL } from './api'
export const eventService = {
  getActive: () => apiCall('/api/events/active'),
  list: () => apiCall('/api/events'),
  create: (data) => apiCall('/api/events', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiCall('/api/events/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id) => apiCall('/api/events/' + id, { method: 'DELETE' }),
  // imageUrl from the API is a path on the backend; prefix it for cross-origin dev setups.
  imageSrc: (event) => (event?.imageUrl ? API_BASE_URL + event.imageUrl : null),
}
