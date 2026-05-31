import apiClient from './client';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const authApi = {
  register: (data) => apiClient.post('/auth/register/', data),
  login: (email, password) => apiClient.post('/auth/login/', { email, password }),
  logout: () => apiClient.post('/auth/logout/', {}),
  // Use raw axios (not apiClient) to avoid the 401-intercept loop on refresh
  refresh: () => axios.post(`${BASE_URL}/auth/refresh/`, {}, { withCredentials: true }),
  getProfile: () => apiClient.get('/auth/profile/'),
  updateProfile: (data) => apiClient.patch('/auth/profile/', data),
  changePassword: (data) => apiClient.post('/auth/change-password/', data),
  requestPasswordReset: (email) => apiClient.post('/auth/password-reset/', { email }),
  confirmPasswordReset: (token, newPassword, confirmPassword) =>
    apiClient.post('/auth/password-reset-confirm/', { token, new_password: newPassword, confirm_password: confirmPassword }),

  // Addresses
  getAddresses: () => apiClient.get('/auth/addresses/'),
  createAddress: (data) => apiClient.post('/auth/addresses/', data),
  updateAddress: (id, data) => apiClient.patch(`/auth/addresses/${id}/`, data),
  deleteAddress: (id) => apiClient.delete(`/auth/addresses/${id}/`),

  // Google OAuth
  googleAuth: (credential) => apiClient.post('/auth/google/', { credential }),

  // Admin
  getUsers: () => apiClient.get('/auth/users/'),
  updateUser: (id, data) => apiClient.patch(`/auth/users/${id}/`, data),
};
