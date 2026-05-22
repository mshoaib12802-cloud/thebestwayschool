import { useState, useEffect, useRef, useContext } from 'react';
import { MessageCircle, X, ChevronLeft, Send } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

// WhatsApp-style message status ticks
const TickSingle = () => (
  <svg width="14" height="10" viewBox="0 0 14 10" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <path d="M1 5l4 4 8-8" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const TickDouble = ({ seen }) => {
  const color = seen ? '#53bdeb' : '#9ca3af';
  return (
    <svg width="18" height="10" viewBox="0 0 18 10" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M1 5l4 4 8-8"     stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 5l4 4 8-8"     stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
};

const MessageStatus = ({ msg }) => {
  if (msg.read)      return <TickDouble seen />;
  if (msg.delivered) return <TickDouble seen={false} />;
  return <TickSingle />;
};

const fmt = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const fmtShort = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return fmt(ts);
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
};

const getDateLabel = (ts) => {
  const d = new Date(ts);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((today - msgDay) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return d.toLocaleDateString([], { weekday: 'long' });
  return d.toLocaleDateString([], {
    day: 'numeric', month: 'long',
    ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  });
};

const isSameDay = (a, b) => {
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
};

export default function FloatingChat() {
  const { user } = useContext(AuthContext);

  const [open,          setOpen]          = useState(false);
  const [view,          setView]          = useState('contacts'); // 'contacts' | 'thread'
  const [contacts,      setContacts]      = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [messages,      setMessages]      = useState([]);
  const [text,          setText]          = useState('');
  const [sending,       setSending]       = useState(false);
  const [unreadTotal,   setUnreadTotal]   = useState(0);
  const [loadingThread, setLoadingThread] = useState(false);

  const bottomRef    = useRef(null);
  const threadIvRef  = useRef(null);
  const contactsIvRef= useRef(null);
  const unreadIvRef  = useRef(null);
  const myId = user?._id;

  // Always poll unread badge count
  useEffect(() => {
    if (!myId) return;
    const fetch = () => api.get('/messages/unread').then(r => setUnreadTotal(r.data.count)).catch(() => {});
    fetch();
    unreadIvRef.current = setInterval(fetch, 15000);
    return () => clearInterval(unreadIvRef.current);
  }, [myId]);

  // Poll contacts while panel is open
  useEffect(() => {
    if (!open || !myId) { clearInterval(contactsIvRef.current); return; }
    const fetch = () => api.get('/messages/contacts').then(r => setContacts(r.data)).catch(() => {});
    fetch();
    contactsIvRef.current = setInterval(fetch, 10000);
    return () => clearInterval(contactsIvRef.current);
  }, [open, myId]);

  // Poll thread while a conversation is active
  useEffect(() => {
    clearInterval(threadIvRef.current);
    if (!activeContact) return;

    const fetch = async () => {
      try {
        const { data } = await api.get(`/messages/thread/${activeContact._id}`);
        setMessages(data);
        // refresh global badge after marking read
        api.get('/messages/unread').then(r => setUnreadTotal(r.data.count)).catch(() => {});
      } catch {}
    };

    setLoadingThread(true);
    fetch().finally(() => setLoadingThread(false));
    threadIvRef.current = setInterval(fetch, 5000);
    return () => clearInterval(threadIvRef.current);
  }, [activeContact]);

  // Scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openThread = (c) => { setActiveContact(c); setView('thread'); setMessages([]); };

  const backToContacts = () => {
    clearInterval(threadIvRef.current);
    setView('contacts');
    setActiveContact(null);
    setMessages([]);
    // refresh contact list unread counts
    api.get('/messages/contacts').then(r => setContacts(r.data)).catch(() => {});
  };

  const handleSend = async () => {
    if (!text.trim() || !activeContact || sending) return;
    setSending(true);
    try {
      const { data } = await api.post('/messages/send', { to: activeContact._id, text: text.trim() });
      setMessages(p => [...p, data]);
      setText('');
    } catch {}
    setSending(false);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // Only show for student / teacher
  if (!user || !['student', 'teacher'].includes(user.role)) return null;

  const accentGrad = 'linear-gradient(135deg, #25d366 0%, #128c7e 100%)';
  const avatarGrad = user.role === 'student'
    ? 'linear-gradient(135deg, #064e3b, #065f46)'
    : 'linear-gradient(135deg, #1e1b4b, #312e81)';

  return (
    <>
      {/* ── Floating button ── */}
      <button
        onClick={() => { setOpen(o => !o); if (open) { setView('contacts'); setActiveContact(null); } }}
        aria-label="Open chat"
        style={{
          position: 'fixed',
          bottom: 'calc(env(safe-area-inset-bottom) + 86px)',
          right: '16px',
          zIndex: 60,
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: open ? '#374151' : accentGrad,
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
          transition: 'background 0.25s, transform 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        {/* Unread badge */}
        {unreadTotal > 0 && !open && (
          <span style={{
            position: 'absolute', top: '-4px', right: '-4px',
            background: '#ef4444', color: '#fff',
            fontSize: '11px', fontWeight: 700,
            minWidth: '20px', height: '20px', borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 4px', border: '2px solid #fff',
          }}>
            {unreadTotal > 99 ? '99+' : unreadTotal}
          </span>
        )}
        {open
          ? <X size={22} color="#fff" />
          : <MessageCircle size={24} color="#fff" />
        }
      </button>

      {/* ── Chat panel ── */}
      {open && (
        <div style={{
          position: 'fixed',
          bottom: 'calc(env(safe-area-inset-bottom) + 155px)',
          right: '16px',
          zIndex: 59,
          width: 'min(390px, calc(100vw - 32px))',
          height: '430px',
          borderRadius: '20px',
          background: '#fff',
          boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>

          {/* ─── CONTACTS VIEW ─── */}
          {view === 'contacts' && (
            <>
              <div style={{ background: accentGrad, padding: '18px 20px', color: '#fff', flexShrink: 0 }}>
                <p style={{ fontWeight: 800, fontSize: '16px', margin: 0 }}>Messages</p>
                <p style={{ fontSize: '12px', opacity: 0.85, margin: '3px 0 0' }}>
                  {user.role === 'student' ? 'Chat with your teachers' : 'Chat with your students'}
                </p>
              </div>

              <div style={{ flex: 1, overflowY: 'auto' }}>
                {contacts.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', padding: '24px', textAlign: 'center' }}>
                    <MessageCircle size={42} style={{ marginBottom: 12, opacity: 0.35 }} />
                    <p style={{ fontWeight: 700, fontSize: '14px', margin: 0 }}>
                      {user.role === 'student' ? 'No teachers assigned yet' : 'No students assigned yet'}
                    </p>
                    <p style={{ fontSize: '12px', margin: '6px 0 0', lineHeight: 1.5 }}>
                      {user.role === 'student'
                        ? 'Your teachers will appear here once enrolled in a course'
                        : 'Your students will appear here once assigned to your course'}
                    </p>
                  </div>
                ) : contacts.map(c => (
                  <button key={c._id}
                    onClick={() => openThread(c)}
                    style={{
                      width: '100%', textAlign: 'left', padding: '12px 16px',
                      display: 'flex', alignItems: 'center', gap: '12px',
                      border: 'none', borderBottom: '1px solid #f1f5f9',
                      background: 'none', cursor: 'pointer', transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: 46, height: 46, borderRadius: '50%',
                      background: avatarGrad, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 800, fontSize: '18px',
                    }}>
                      {c.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <p style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b', margin: 0 }}>{c.name}</p>
                        {c.lastTime && (
                          <span style={{ fontSize: '11px', color: '#94a3b8', flexShrink: 0, marginLeft: 8 }}>
                            {fmtShort(c.lastTime)}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 }}>
                        <p style={{ fontSize: '12px', color: c.unread > 0 ? '#1e293b' : '#94a3b8', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: c.unread > 0 ? 600 : 400, maxWidth: '200px' }}>
                          {c.lastMessage || 'Tap to start chatting'}
                        </p>
                        {c.unread > 0 && (
                          <span style={{ background: '#25d366', color: '#fff', fontSize: '11px', fontWeight: 700, minWidth: 20, height: 20, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', flexShrink: 0, marginLeft: 6 }}>
                            {c.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ─── THREAD VIEW ─── */}
          {view === 'thread' && activeContact && (
            <>
              {/* Thread header */}
              <div style={{ background: accentGrad, padding: '10px 14px', color: '#fff', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <button onClick={backToContacts}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: 4, display: 'flex', borderRadius: 8 }}>
                  <ChevronLeft size={20} />
                </button>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '16px', flexShrink: 0 }}>
                  {activeContact.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '14px', margin: 0 }}>{activeContact.name}</p>
                  <p style={{ fontSize: '11px', opacity: 0.8, margin: 0, textTransform: 'capitalize' }}>{activeContact.role}</p>
                </div>
              </div>

              {/* Messages list */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', background: '#ece5dd', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {loadingThread && messages.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#94a3b8', paddingTop: 32, fontSize: 13 }}>Loading…</div>
                )}
                {!loadingThread && messages.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#94a3b8', paddingTop: 32, fontSize: 13 }}>
                    No messages yet. Say hello! 👋
                  </div>
                )}
                {messages.map((msg, i) => {
                  const isMe = String(msg.from) === String(myId);
                  const showDate = i === 0 || !isSameDay(messages[i - 1].createdAt, msg.createdAt);
                  return (
                    <div key={msg._id || i}>
                      {showDate && (
                        <div style={{ display: 'flex', justifyContent: 'center', margin: '6px 0 8px' }}>
                          <span style={{
                            background: 'rgba(0,0,0,0.32)', color: '#fff',
                            fontSize: '11px', fontWeight: 600,
                            padding: '3px 10px', borderRadius: 99,
                            letterSpacing: '0.02em',
                          }}>
                            {getDateLabel(msg.createdAt)}
                          </span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                        <div style={{
                          maxWidth: '75%',
                          background: isMe ? '#dcf8c6' : '#ffffff',
                          borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                          padding: '8px 12px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
                        }}>
                          <p style={{ margin: 0, fontSize: '13px', color: '#1e293b', wordBreak: 'break-word', lineHeight: 1.4 }}>{msg.text}</p>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3, marginTop: 3 }}>
                            <span style={{ fontSize: '10px', color: '#9ca3af' }}>{fmt(msg.createdAt)}</span>
                            {isMe && <MessageStatus msg={msg} />}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Input bar */}
              <div style={{ padding: '10px 12px', background: '#f0f0f0', display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Type a message…"
                  rows={1}
                  style={{
                    flex: 1, border: 'none', borderRadius: '22px',
                    padding: '10px 16px', fontSize: '13px',
                    resize: 'none', outline: 'none', fontFamily: 'inherit',
                    maxHeight: '80px', lineHeight: 1.4,
                    background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={!text.trim() || sending}
                  style={{
                    width: 42, height: 42, borderRadius: '50%', border: 'none',
                    background: text.trim() ? accentGrad : '#d1d5db',
                    cursor: text.trim() ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, transition: 'background 0.2s',
                  }}
                >
                  <Send size={16} color="#fff" style={{ transform: 'translateX(1px)' }} />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
