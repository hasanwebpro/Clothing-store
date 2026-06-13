import { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/client';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const { isAuthenticated } = useAuth();

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Fetch on login, then poll so the bell stays in sync as the order lifecycle
  // simulation advances server-side (each due stage writes a new notification).
  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      return;
    }
    fetchNotifications();
    const id = setInterval(fetchNotifications, 20000);
    return () => clearInterval(id);
  }, [isAuthenticated]);

  const fetchNotifications = async () => {
    try {
      const { data } = await apiClient.get('/notifications/');
      setNotifications(data.results || data);
    } catch (_) {}
  };

  const markRead = async (id) => {
    await apiClient.patch(`/notifications/${id}/read/`);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    await apiClient.post('/notifications/read-all/');
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, fetchNotifications, markRead, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
