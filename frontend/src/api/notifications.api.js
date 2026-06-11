import apiClient from './client';

export const notificationsApi = {
  list: () => apiClient.get('/notifications/'),
  markRead: (id) => apiClient.patch(`/notifications/${id}/read/`),
  markAllRead: () => apiClient.post('/notifications/read-all/'),
};
