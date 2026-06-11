import apiClient from './client';

export const cartApi = {
  getCart: () => apiClient.get('/cart/'),
  addItem: (variantId, quantity = 1) => apiClient.post('/cart/add/', { variant_id: variantId, quantity }),
  updateItem: (itemId, quantity) => apiClient.patch(`/cart/items/${itemId}/`, { quantity }),
  removeItem: (itemId) => apiClient.delete(`/cart/items/${itemId}/`),
  saveForLater: (itemId) => apiClient.post(`/cart/items/${itemId}/save/`),
  moveToCart: (itemId) => apiClient.post(`/cart/items/${itemId}/move-to-cart/`),
  applyCoupon: (code) => apiClient.post('/cart/coupon/apply/', { code }),
  removeCoupon: () => apiClient.delete('/cart/coupon/'),
};
