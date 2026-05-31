import apiClient from './client';

export const newsletterApi = {
  subscribe: (email, firstName) => apiClient.post('/newsletter/subscribe/', { email, first_name: firstName }),
  unsubscribe: (email) => apiClient.post('/newsletter/unsubscribe/', { email }),
};
