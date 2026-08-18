import { useState, useRef, useEffect, useContext } from 'react';
import { X, Send, Sparkles, RotateCcw, ChevronDown } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const QUICK_PROMPTS = [
  'Which classes have cleared all fees?',
  'Show fee collection summary for all classes',
  'Who are the top fee defaulters?',
  "What is today's attendance?",
  'Show class-wise attendance today',
  'How many students are enrolled in each class?',
  'Show this month financial summary',
  'Which classes have the best exam results?',
  'Show pending leave requests',
  'Show recent announcements',
];

function TypingDots() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '10px 14px' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 7, height: 7, borderRadius: '50%',
          background: '#6366f1',
          animation: `aiBounce 1.1s ease-in-out ${i * 0.18}s infinite`,
        }}/>
      ))}
    </div>
  );
}

// Very basic markdown renderer (bold, bullet points, line breaks)
function MdText({ text }) {
  const lines = text.split('\n');
  return (
    <div style={{ fontSize: 13, lineHeight: 1.65, color: '#1e293b' }}>
      {lines.map((line, i) => {
        // Bold **text**
        const parts = line.split(/\*\*(.*?)\*\*/g);
        const rendered = parts.map((part, j) =>
          j % 2 === 1 ? <strong key={j}>{part}</strong> : part
        );
        // Bullet point
        if (line.startsWith('* ') || line.startsWith('- ') || line.startsWith('• ')) {
          return (
            <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 2 }}>
              <span style={{ color: '#6366f1', fontWeight: 700, marginTop: 1 }}>•</span>
              <span>{rendered.slice(1)}</span>
            </div>
          );
        }
        // Heading ##
        if (line.startsWith('## ')) {
          return <p key={i} style={{ fontWeight: 800, fontSize: 14, color: '#1e293b', margin: '8px 0 4px' }}>{line.slice(3)}</p>;
        }
        if (line.startsWith('# ')) {
          return <p key={i} style={{ fontWeight: 800, fontSize: 15, color: '#1e293b', margin: '8px 0 4px' }}>{line.slice(2)}</p>;
        }
        if (line.trim() === '') return <div key={i} style={{ height: 6 }}/>;
        return <p key={i} style={{ margin: '2px 0' }}>{rendered}</p>;
      })}
    </div>
  );
}

export default function AIAssistant() {
  const { user } = useContext(AuthContext);
  const [open,     setOpen]     = useState(false);
  const [input,    setInput]    = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: `Hello! I'm your AI School Assistant powered by Gemini. I can read the live database and answer questions like:\n\n* Which classes have cleared fees?\n* What is today's attendance?\n* Show me fee defaulters\n* Financial summary this month\n\nWhat would you like to know?`,
    },
  ]);
  const [loading,  setLoading]  = useState(false);
  const [showQuick, setShowQuick] = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  // Only show for admin roles
  if (!user || !['admin', 'clerk', 'accountant', 'office_boy'].includes(user.role)) return null;

  const scrollBottom = () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => { scrollBottom(); }, [messages, loading]);
  useEffect(() => { if (open) { setTimeout(() => inputRef.current?.focus(), 150); } }, [open]);

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    setShowQuick(false);

    const userMsg  = { role: 'user', text: msg };
    const newMsgs  = [...messages, userMsg];
    setMessages(newMsgs);
    setLoading(true);

    // Build history (exclude system welcome message from API call)
    const history = newMsgs.slice(1, -1).map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', text: m.text }));

    try {
      const { data } = await api.post('/ai/chat', { message: msg, history });
      setMessages(prev => [...prev, { role: 'assistant', text: data.reply }]);
    } catch (err) {
      const errText = err.response?.data?.message || 'Failed to get response. Check your GEMINI_API_KEY.';
      setMessages(prev => [...prev, { role: 'assistant', text: `⚠️ ${errText}` }]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      text: 'Chat cleared. Ask me anything about the school data!',
    }]);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <>
      <style>{`
        @keyframes aiBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40%            { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes aiPulseRing {
          0%   { transform: scale(1);    opacity: 0.6; }
          100% { transform: scale(1.55); opacity: 0; }
        }
        @keyframes aiSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
      `}</style>

      {/* ── Floating Button ── */}
      <div style={{ position: 'fixed', bottom: 24, right: 20, zIndex: 9000 }}>
        {/* Pulse ring */}
        {!open && (
          <span style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            animation: 'aiPulseRing 1.8s ease-out infinite',
          }}/>
        )}
        <button
          onClick={() => setOpen(o => !o)}
          title="AI School Assistant"
          style={{
            width: 56, height: 56, borderRadius: '50%', border: 'none',
            background: open
              ? 'linear-gradient(135deg, #374151, #1f2937)'
              : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            cursor: 'pointer', position: 'relative', zIndex: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(99,102,241,0.5)',
            transition: 'background 0.25s, transform 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          {open
            ? <X size={22} color="#fff"/>
            : <Sparkles size={22} color="#fff"/>
          }
        </button>

        {/* Label tooltip when closed */}
        {!open && (
          <div style={{
            position: 'absolute', right: 64, top: '50%', transform: 'translateY(-50%)',
            background: '#1e293b', color: '#fff', fontSize: 12, fontWeight: 700,
            padding: '5px 10px', borderRadius: 8, whiteSpace: 'nowrap',
            pointerEvents: 'none', opacity: 0.9,
          }}>
            AI Assistant
          </div>
        )}
      </div>

      {/* ── Chat Panel ── */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 92, right: 20, zIndex: 8999,
          width: 'min(460px, calc(100vw - 32px))',
          height: 'min(580px, calc(100vh - 120px))',
          background: '#fff',
          borderRadius: 20,
          boxShadow: '0 12px 48px rgba(99,102,241,0.22), 0 2px 12px rgba(0,0,0,0.1)',
          border: '1px solid #e0e7ff',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          animation: 'aiSlideUp 0.25s ease',
        }}>

          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            padding: '14px 18px', flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Sparkles size={18} color="#fff"/>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ color: '#fff', fontWeight: 800, fontSize: 15, margin: 0 }}>AI School Assistant</p>
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, margin: 0 }}>Powered by Gemini · Live database access</p>
            </div>
            <button onClick={clearChat} title="Clear chat"
              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#fff', display: 'flex' }}>
              <RotateCcw size={15}/>
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                {m.role === 'assistant' && (
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0, marginRight: 8, marginTop: 2,
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Sparkles size={13} color="#fff"/>
                  </div>
                )}
                <div style={{
                  maxWidth: '82%',
                  background: m.role === 'user'
                    ? 'linear-gradient(135deg, #6366f1, #7c3aed)'
                    : '#f8fafc',
                  color: m.role === 'user' ? '#fff' : '#1e293b',
                  borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  padding: '10px 14px',
                  boxShadow: m.role === 'user'
                    ? '0 2px 8px rgba(99,102,241,0.3)'
                    : '0 1px 4px rgba(0,0,0,0.06)',
                  border: m.role === 'assistant' ? '1px solid #e2e8f0' : 'none',
                }}>
                  {m.role === 'user'
                    ? <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>{m.text}</p>
                    : <MdText text={m.text}/>
                  }
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Sparkles size={13} color="#fff"/>
                </div>
                <div style={{ background: '#f8fafc', borderRadius: '18px 18px 18px 4px', border: '1px solid #e2e8f0' }}>
                  <TypingDots/>
                </div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          {/* Quick prompts */}
          {showQuick && (
            <div style={{ padding: '0 12px 8px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {QUICK_PROMPTS.map(q => (
                <button key={q} onClick={() => sendMessage(q)}
                  style={{
                    background: '#eef2ff', border: '1px solid #c7d2fe', color: '#4338ca',
                    borderRadius: 20, padding: '4px 10px', fontSize: 11, fontWeight: 600,
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#c7d2fe'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#eef2ff'; }}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input bar */}
          <div style={{
            padding: '10px 12px', borderTop: '1px solid #f1f5f9',
            background: '#fafafa', flexShrink: 0,
          }}>
            {/* Quick prompts toggle */}
            <button onClick={() => setShowQuick(s => !s)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#6366f1', fontSize: 11, fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8,
                padding: 0,
              }}>
              <ChevronDown size={13} style={{ transform: showQuick ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}/>
              Quick questions
            </button>

            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask anything about the school…"
                rows={1}
                disabled={loading}
                style={{
                  flex: 1, border: '1.5px solid #e2e8f0', borderRadius: 14,
                  padding: '9px 14px', fontSize: 13, resize: 'none',
                  outline: 'none', fontFamily: 'inherit', maxHeight: 80,
                  lineHeight: 1.4, background: '#fff', transition: 'border 0.2s',
                }}
                onFocus={e => { e.target.style.borderColor = '#6366f1'; }}
                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; }}
              />
              <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
                style={{
                  width: 42, height: 42, borderRadius: '50%', border: 'none',
                  background: input.trim() && !loading
                    ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                    : '#e2e8f0',
                  cursor: input.trim() && !loading ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, transition: 'background 0.2s',
                  boxShadow: input.trim() && !loading ? '0 2px 8px rgba(99,102,241,0.4)' : 'none',
                }}>
                <Send size={16} color={input.trim() && !loading ? '#fff' : '#94a3b8'} style={{ transform: 'translateX(1px)' }}/>
              </button>
            </div>
            <p style={{ fontSize: 10, color: '#94a3b8', margin: '6px 0 0', textAlign: 'center' }}>
              Gemini reads live school data • Press Enter to send
            </p>
          </div>
        </div>
      )}
    </>
  );
}
