import apiClient from './client';

export const supportApi = {
  // Public — anyone can submit a contact request or feedback
  createTicket: (data) => apiClient.post('/support/tickets/', data),
  // data: { kind: 'contact'|'feedback', name, email, subject?, message, rating? }

  // Staff
  getTickets: (kind) => apiClient.get('/support/tickets/', { params: kind ? { kind } : {} }),
  resolveTicket: (id, data) => apiClient.patch(`/support/tickets/${id}/`, data),
};
