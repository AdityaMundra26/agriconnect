import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ShoppingBag, ClipboardList, Store, Info, CheckCheck } from 'lucide-react';
import { listNotifications, markNotificationRead, markAllNotificationsRead } from '../api/notifications.js';
import { timeAgo } from '../utils/format.js';
import { API_BASE, TOKEN_KEY } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';

const TYPE_STYLE = {
  order: { icon: ShoppingBag, tone: 'tone-blue' },
  report: { icon: ClipboardList, tone: 'tone-amber' },
  listing: { icon: Store, tone: 'tone-green' },
  info: { icon: Info, tone: 'tone-gray' },
};
const POLL_MS = 120000; // fallback only; live updates arrive over SSE

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);
  const navigate = useNavigate();
  const toast = useToast();
  // IDs already counted, so a live event that races the initial fetch isn't double-counted.
  const seen = useRef(new Set());

  const load = useCallback(async () => {
    try {
      const data = await listNotifications();
      data.notifications.forEach((n) => seen.current.add(n.id));
      setItems(data.notifications);
      setUnread(data.unread);
    } catch {
      /* bell is non-critical; stay quiet on failure */
    }
  }, []);

  // Initial load + live updates over Server-Sent Events. A slow poll stays on
  // as a safety net in case a proxy or network drops the stream.
  useEffect(() => {
    load();
    const poll = setInterval(load, POLL_MS);

    let source;
    const token = localStorage.getItem(TOKEN_KEY);
    if (token && typeof EventSource !== 'undefined') {
      source = new EventSource(`${API_BASE}/notifications/stream?token=${encodeURIComponent(token)}`);
      source.addEventListener('notification', (e) => {
        try {
          const n = JSON.parse(e.data);
          if (seen.current.has(n.id)) return;
          seen.current.add(n.id);
          setItems((list) => [n, ...list].slice(0, 30));
          setUnread((u) => u + 1);
          toast.info(n.message);
        } catch {
          /* ignore malformed event */
        }
      });
    }
    return () => {
      clearInterval(poll);
      source?.close();
    };
  }, [load, toast]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  async function openItem(n) {
    setOpen(false);
    if (!n.is_read) {
      setItems((list) => list.map((i) => (i.id === n.id ? { ...i, is_read: true } : i)));
      setUnread((u) => Math.max(0, u - 1));
      markNotificationRead(n.id).catch(() => {});
    }
    if (n.link) navigate(n.link);
  }

  async function readAll() {
    setItems((list) => list.map((i) => ({ ...i, is_read: true })));
    setUnread(0);
    await markAllNotificationsRead().catch(() => {});
  }

  return (
    <div className="popover-anchor" ref={ref}>
      <button
        className="btn btn-ghost btn-icon"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) load();
        }}
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
        style={{ position: 'relative' }}
      >
        <Bell size={19} />
        {unread > 0 && <span className="bell-dot">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="popover">
          <div className="popover-header">
            <h3>Notifications</h3>
            {unread > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={readAll}>
                <CheckCheck size={15} /> Mark all read
              </button>
            )}
          </div>
          <div className="popover-list">
            {items.length === 0 ? (
              <div className="empty" style={{ padding: '2rem 1rem' }}>
                <p>You're all caught up.</p>
              </div>
            ) : (
              items.map((n) => {
                const s = TYPE_STYLE[n.type] || TYPE_STYLE.info;
                const Icon = s.icon;
                return (
                  <div key={n.id} className={`notif ${n.is_read ? '' : 'unread'}`} onClick={() => openItem(n)}>
                    <div className={`notif-icon ${s.tone}`}>
                      <Icon size={16} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p>{n.message}</p>
                      <span className="subtle">{timeAgo(n.created_at)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
