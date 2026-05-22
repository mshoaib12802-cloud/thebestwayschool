import { useState, useEffect, useRef, useContext } from 'react';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { MessageCircle, Send, Briefcase } from 'lucide-react';

const fmtTime = (d) => {
  const date = new Date(d);
  const now = new Date();
  const diff = now - date;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return date.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
  return date.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
};

export default function ClientMessages() {
  const { user } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const load = () => {
    Promise.all([
      api.get('/client-portal/messages'),
      api.get('/client-portal/projects'),
    ]).then(([msgs, projs]) => {
      setMessages(msgs.data);
      setProjects(projs.data);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const body = { message: text.trim() };
      if (selectedProject) body.project_id = selectedProject;
      const res = await api.post('/client-portal/messages', body);
      setMessages(prev => [...prev, res.data]);
      setText('');
    } catch { /* silent */ } finally { setSending(false); }
  };

  const onKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
          <MessageCircle size={24} className="text-amber-500"/> Messages
        </h2>
        <p className="text-slate-500 text-sm mt-0.5">Communicate directly with our team</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col" style={{ height: '65vh' }}>
        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <MessageCircle size={40} className="mb-3 text-slate-200"/>
              <p className="font-bold">No messages yet</p>
              <p className="text-sm">Start a conversation with our team below</p>
            </div>
          )}
          {messages.map((msg) => {
            const isMe = msg.sender_type === 'client';
            return (
              <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  {!isMe && (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-amber-600 flex items-center justify-center text-xs font-bold text-white">
                        T
                      </div>
                      <span className="text-xs font-bold text-slate-500">Team</span>
                      {msg.project_id && (
                        <span className="flex items-center gap-0.5 text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                          <Briefcase size={9}/> {msg.project_id?.title || 'Project'}
                        </span>
                      )}
                    </div>
                  )}
                  {isMe && msg.project_id && (
                    <span className="flex items-center gap-0.5 text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full self-end">
                      <Briefcase size={9}/> {msg.project_id?.title || 'Project'}
                    </span>
                  )}
                  <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                    isMe
                      ? 'bg-amber-600 text-white rounded-tr-sm'
                      : 'bg-slate-100 text-slate-800 rounded-tl-sm'
                  }`}>
                    {msg.message}
                  </div>
                  <span className="text-[10px] text-slate-400 px-1">{fmtTime(msg.createdAt)}</span>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef}/>
        </div>

        {/* Input */}
        <div className="border-t border-slate-100 p-3 space-y-2">
          {projects.length > 0 && (
            <select
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 text-slate-600 bg-slate-50 focus:outline-none focus:border-amber-400">
              <option value="">No project (general inquiry)</option>
              {projects.map(p => (
                <option key={p._id} value={p._id}>{p.title}</option>
              ))}
            </select>
          )}
          <div className="flex items-end gap-2">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={onKey}
              placeholder="Type a message… (Enter to send)"
              rows={2}
              className="flex-1 resize-none border border-slate-200 rounded-2xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-amber-400 placeholder-slate-400"
            />
            <button onClick={send} disabled={!text.trim() || sending}
              className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center hover:bg-amber-700 transition-colors disabled:opacity-40 flex-shrink-0">
              <Send size={16}/>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
