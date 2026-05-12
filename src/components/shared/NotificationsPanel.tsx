import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Notification } from '@/types';
import { notificationsApi } from '@/services/api';

interface NotificationsPanelProps {
  notifications: Notification[];
  unreadCount: number;
  onClose: () => void;
  onMarkRead: (id: number) => void;
  onMarkAllRead: () => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const TYPE_ICONS: Record<string, { icon: string; color: string }> = {
  success:  { icon: 'bi-check-circle-fill', color: '#065f46' },
  warning:  { icon: 'bi-exclamation-triangle-fill', color: '#92400e' },
  error:    { icon: 'bi-x-circle-fill', color: '#991b1b' },
  info:     { icon: 'bi-info-circle-fill', color: '#1d4ed8' },
};

export default function NotificationsPanel({
  notifications,
  unreadCount,
  onClose,
  onMarkRead,
  onMarkAllRead,
}: NotificationsPanelProps) {
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const handleClick = (n: Notification) => {
    if (!n.is_read) onMarkRead(n.id);
    if (n.link) { navigate(n.link); onClose(); }
  };

  return (
    <div ref={ref} style={{
      position: 'absolute', right: 0, top: 'calc(100% + 8px)',
      width: 360, maxHeight: 480,
      background: 'var(--card-bg)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
      display: 'flex', flexDirection: 'column', zIndex: 1001,
    }}>
      {/* Header */}
      <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="d-flex align-items-center gap-2">
          <span className="fw-700" style={{ fontSize: '0.9rem' }}>Notifications</span>
          {unreadCount > 0 && (
            <span className="badge bg-danger" style={{ fontSize: '0.65rem', borderRadius: 999 }}>{unreadCount}</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button className="btn btn-link btn-sm p-0 text-primary" style={{ fontSize: '0.75rem' }} onClick={onMarkAllRead}>
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {notifications.length === 0 ? (
          <div className="text-center text-muted py-5" style={{ fontSize: '0.875rem' }}>
            <i className="bi bi-bell-slash d-block mb-2" style={{ fontSize: '1.5rem' }} />
            No notifications yet
          </div>
        ) : (
          notifications.map(n => {
            const typeStyle = TYPE_ICONS[n.notification_type] || TYPE_ICONS.info;
            return (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                style={{
                  padding: '0.75rem 1rem',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                  cursor: n.link ? 'pointer' : 'default',
                  background: !n.is_read ? 'rgba(74,144,217,0.04)' : 'transparent',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (n.link) (e.currentTarget as HTMLDivElement).style.background = 'var(--bg)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = !n.is_read ? 'rgba(74,144,217,0.04)' : 'transparent'; }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: `${typeStyle.color}22`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <i className={`bi ${typeStyle.icon}`} style={{ color: typeStyle.color, fontSize: '0.9rem' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="fw-600" style={{ fontSize: '0.8rem', marginBottom: '0.125rem' }}>{n.title}</div>
                  {n.body && (
                    <div className="text-muted" style={{ fontSize: '0.75rem', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {n.body}
                    </div>
                  )}
                  <div className="text-muted mt-1" style={{ fontSize: '0.7rem' }}>
                    {n.created_at ? timeAgo(n.created_at) : ''}
                  </div>
                </div>
                {!n.is_read && (
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0, marginTop: 4 }} />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '0.625rem 1rem', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
        <button className="btn btn-link btn-sm text-muted p-0" style={{ fontSize: '0.75rem' }} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
