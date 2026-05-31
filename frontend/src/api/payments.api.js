import apiClient from './client';

export const paymentsApi = {
  initiatePayment: (data) => apiClient.post('/payments/initiate/', data),
  getPaymentStatus: (orderId) => apiClient.get(`/payments/${orderId}/status/`),
  getEasypaisaInfo: () => apiClient.get('/payments/easypaisa-info/'),
  validateCoupon: (code, orderTotal) => apiClient.post('/pricing/coupons/validate/', { code, order_total: orderTotal }),
};
