import apiClient from './client';

export const ordersApi = {
  getOrders: () => apiClient.get('/orders/'),
  placeOrder: (data) => apiClient.post('/orders/place/', data),
  getOrder: (orderNumber) => apiClient.get(`/orders/${orderNumber}/`),
  cancelOrder: (id, reason = '') => apiClient.post(`/orders/${id}/cancel/`, { reason }),
  updateStatus: (id, data) => apiClient.patch(`/orders/${id}/status/`, data),
  // data: { status, note?, rider_name?, tracking_note? }

  // Returns / refunds / exchanges
  getReturns: () => apiClient.get('/orders/returns/'),
  requestReturn: (orderId, data) => apiClient.post(`/orders/${orderId}/returns/`, data),
  // data: { kind: 'return'|'refund'|'exchange', reason, customer_note? }
  resolveReturn: (returnId, data) => apiClient.patch(`/orders/returns/${returnId}/`, data),
  // data: { status: 'approved'|'rejected'|'completed', admin_note? }
};
