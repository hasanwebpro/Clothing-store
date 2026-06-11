import apiClient from './client';

export const productsApi = {
  getProducts: (params) => apiClient.get('/products/', { params }),
  getFeatured: () => apiClient.get('/products/featured/'),
  getProductBySlug: (slug) => apiClient.get(`/products/${slug}/`),
  // Seller/Admin: fetch a product by numeric ID for editing.
  getProductById: (id) => apiClient.get(`/products/by-id/${id}/`),
  getMyProducts: () => apiClient.get('/products/mine/'),
  createProduct: (data) => apiClient.post('/products/create/', data),
  updateProduct: (id, data) => apiClient.patch(`/products/${id}/update/`, data),
  deleteProduct: (id) => apiClient.delete(`/products/${id}/delete/`),

  // Categories
  getCategories: () => apiClient.get('/products/categories/'),
  getCategoryProducts: (slug, params) => apiClient.get(`/products/categories/${slug}/products/`, { params }),

  // Search autocomplete
  autocomplete: (q) => apiClient.get('/products/autocomplete/', { params: { q } }),

  // Images
  uploadImage: (productId, formData) =>
    apiClient.post(`/products/${productId}/images/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteImage: (productId, imageId) =>
    apiClient.delete(`/products/${productId}/images/${imageId}/`),
};
