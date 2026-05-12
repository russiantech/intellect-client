import { useState, useEffect, useCallback } from 'react';
import { notificationsApi } from '@/services/api';
import { Notification } from '@/types';
import { useAuth } from '@/context/AuthContext';

export function useNotifications(pollIntervalMs = 30000) {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await notificationsApi.list({ per_page: 20 });
      setNotifications(res.data.items || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch {
      // Silent fail for polling
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    fetchNotifications().finally(() => setLoading(false));

    const interval = setInterval(fetchNotifications, pollIntervalMs);
    return () => clearInterval(interval);
  }, [isAuthenticated, pollIntervalMs]);

  const markRead = async (id: number) => {
    await notificationsApi.markRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    await notificationsApi.markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  return { notifications, unreadCount, loading, markRead, markAllRead, refetch: fetchNotifications };
}
