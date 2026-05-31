import apiClient from './client';

export const ordersApi = {
  getOrders: () => apiClient.get('/orders/'),
  placeOrder: (data) => apiClient.post('/orders/place/', data),
  getOrder: (orderNumber) => apiClient.get(`/orders/${orderNumber}/`),
  cancelOrder: (id) => apiClient.post(`/orders/${id}/cancel/`),
  updateStatus: (id, data) => apiClient.patch(`/orders/${id}/status/`, data),
};
