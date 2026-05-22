import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api';
import { Bell, CheckCheck, CreditCard, Award, CalendarCheck, AlertTriangle, Info } from 'lucide-react';

const TYPE_CONFIG = {
  fee:        { icon: <CreditCard size={14}/>,    color: 'text-emerald-500', bg: 'bg-emerald-50' },
  result:     { icon: <Award size={14}/>,          color: 'text-indigo-500',  bg: 'bg-indigo-50' },
  attendance: { icon: <CalendarCheck size={14}/>,  color: 'text-blue-500',    bg: 'bg-blue-50' },
  fine:       { icon: <AlertTriangle size={14}/>,  color: 'text-rose-500',    bg: 'bg-rose-50' },
  info:       { icon: <Info size={14}/>,           color: 'text-slate-500',   bg: 'bg-slate-50' },
};

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const NotificationBell = ({ theme = 'dark' }) => {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 320 });
  const btnRef = useRef(null);
  const dropRef = useRef(null);

  const fetchCount = () => {
    api.get('/notifications/unread-count').then(r => setUnread(r.data.count)).catch(() => {});
  };

  const fetchAll = () => {
    api.get('/notifications').then(r => setNotifications(r.data)).catch(() => {});
  };

  useEffect(() => {
    fetchCount();
    const iv = setInterval(fetchCount, 30000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (open) fetchAll();
  }, [open]);

  // Recompute dropdown position whenever it opens
  useEffect(() => {
    if (open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const dropWidth = Math.min(320, window.innerWidth - 16);
      const dropMaxHeight = 420;

      // Vertical: drop below button, flip above if not enough room
      let top = rect.bottom + 8;
      if (top + dropMaxHeight > window.innerHeight - 8) {
        top = rect.top - dropMaxHeight - 8;
      }
      if (top < 8) top = 8;

      // Horizontal: right-align to button, clamp to viewport
      let left = rect.right - dropWidth;
      if (left < 8) left = 8;
      if (left + dropWidth > window.innerWidth - 8) {
        left = window.innerWidth - dropWidth - 8;
      }

      setDropPos({ top, left, width: dropWidth });
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target) &&
        dropRef.current && !dropRef.current.contains(e.target)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markRead = async (n) => {
    if (!n.is_read) {
      await api.patch(`/notifications/${n._id}/read`).catch(() => {});
      setNotifications(prev => prev.map(x => x._id === n._id ? { ...x, is_read: true } : x));
      setUnread(c => Math.max(0, c - 1));
    }
  };

  const markAllRead = async () => {
    await api.patch('/notifications/read-all').catch(() => {});
    setNotifications(prev => prev.map(x => ({ ...x, is_read: true })));
    setUnread(0);
  };

  const dropdown = open ? createPortal(
    <div
      ref={dropRef}
      style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, zIndex: 99999, width: dropPos.width ?? 320 }}
      className="bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div>
          <p className="font-bold text-slate-800 text-sm">Notifications</p>
          {unread > 0 && <p className="text-xs text-slate-400">{unread} unread</p>}
        </div>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
          >
            <CheckCheck size={13}/> Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="py-10 text-center text-slate-400">
            <Bell size={28} className="mx-auto mb-2 opacity-30"/>
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          notifications.map(n => {
            const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
            return (
              <button
                key={n._id}
                onClick={() => markRead(n)}
                className={`w-full text-left flex items-start gap-3 px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${!n.is_read ? 'bg-blue-50/40' : ''}`}
              >
                <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg} ${cfg.color}`}>
                  {cfg.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{n.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.createdAt)}</p>
                </div>
                {!n.is_read && (
                  <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"/>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen(o => !o)}
        className={`relative p-2 rounded-xl transition-colors ${
          theme === 'light'
            ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            : 'text-slate-300 hover:text-white'
        }`}
        title="Notifications"
      >
        <Bell size={20}/>
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {dropdown}
    </>
  );
};

export default NotificationBell;
