import apiClient from './client';

export const reviewsApi = {
  getHomepageReviews: () => apiClient.get('/reviews/homepage/'),
  getProductReviews: (productId, params) => apiClient.get(`/reviews/products/${productId}/`, { params }),
  createReview: (productId, data) => apiClient.post(`/reviews/products/${productId}/`, data),
  deleteReview: (reviewId) => apiClient.delete(`/reviews/${reviewId}/`),
  // Admin moderation
  getAllReviews: (params) => apiClient.get('/reviews/all/', { params }),
  approveReview: (reviewId) => apiClient.patch(`/reviews/${reviewId}/approve/`),
};
