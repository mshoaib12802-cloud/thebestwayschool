import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Plus, MessageSquare, X, Send, AlertCircle, Clock, CheckCircle2, XCircle } from 'lucide-react';

const STATUS_COLOR = { open:'#fbbf24', in_progress:'#818cf8', resolved:'#34d399', closed:'#94a3b8' };
const STATUS_ICON = { open: <AlertCircle size={13} />, in_progress: <Clock size={13} />, resolved: <CheckCircle2 size={13} />, closed: <XCircle size={13} /> };
const CATEGORIES = ['academic','fee','staff_behaviour','facility','transport','bullying','administration','other'];

const emptyForm = () => ({ subject:'', category:'academic', priority:'medium', description:'', is_anonymous: false });

export default function StudentComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [reply, setReply] = useState('');
  const [saving, setSaving] = useState(false);
  const [replying, setReplying] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get('/complaints/mine')
      .then(r => setComplaints(r.data?.complaints || r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await api.post('/complaints', form);
      setComplaints(prev => [r.data, ...prev]);
      setShowNew(false);
      setForm(emptyForm());
      setMsg('Complaint submitted successfully');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) { setMsg(err.response?.data?.message || 'Submit failed'); }
    finally { setSaving(false); }
  };

  const openDetail = async (id) => {
    try {
      const r = await api.get(`/complaints/${id}`);
      setSelected(r.data);
      setReply('');
    } catch {}
  };

  const sendReply = async () => {
    if (!reply.trim() || !selected) return;
    setReplying(true);
    try {
      const r = await api.post(`/complaints/${selected._id}/reply`, { message: reply });
      setSelected(r.data);
      setReply('');
      setComplaints(prev => prev.map(c => c._id === r.data._id ? r.data : c));
    } catch {}
    finally { setReplying(false); }
  };

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#eef2ff', margin: 0 }}>Complaints & Feedback</h1>
          <p style={{ color: '#a5b4fc', fontSize: 13, margin: '3px 0 0' }}>Submit and track your complaints</p>
        </div>
        <button onClick={() => setShowNew(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#818cf8', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
          <Plus size={15} /> New Complaint
        </button>
      </div>

      {msg && <div style={{ background: '#312e81', color: '#a5b4fc', padding: '8px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13, border: '1px solid rgba(129,140,248,0.3)' }}>{msg}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 16, alignItems: 'start' }}>
        {/* List */}
        <div>
          {loading ? (
            <p style={{ color: '#a5b4fc', fontSize: 14 }}>Loading...</p>
          ) : complaints.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#a5b4fc', opacity: 0.6, background: 'rgba(255,255,255,0.04)', borderRadius: 14 }}>
              <MessageSquare size={36} style={{ marginBottom: 10 }} />
              <p style={{ margin: 0, fontSize: 14 }}>No complaints submitted yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {complaints.map(c => (
                <div key={c._id} onClick={() => openDetail(c._id)}
                  style={{ background: selected?._id === c._id ? 'rgba(129,140,248,0.15)' : 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '14px 16px', cursor: 'pointer', border: `1px solid ${selected?._id === c._id ? 'rgba(129,140,248,0.4)' : 'rgba(165,180,252,0.12)'}` }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#818cf8' }}>{c.ticket_no}</span>
                    <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 20, fontWeight: 700, background: `${STATUS_COLOR[c.status]}22`, color: STATUS_COLOR[c.status], display: 'flex', alignItems: 'center', gap: 3 }}>
                      {STATUS_ICON[c.status]} {c.status?.replace('_', ' ')}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#eef2ff' }}>{c.subject}</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#a5b4fc', textTransform: 'capitalize' }}>
                    {c.category?.replace('_', ' ')} · {new Date(c.createdAt).toLocaleDateString()}
                    {c.replies?.length > 0 && <span style={{ marginLeft: 8, color: '#818cf8' }}>{c.replies.length} replies</span>}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail */}
        {selected && (
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 20, border: '1px solid rgba(165,180,252,0.15)', position: 'sticky', top: 20, maxHeight: '75vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#818cf8' }}>{selected.ticket_no}</span>
                <h3 style={{ margin: '4px 0 0', fontSize: 15, fontWeight: 700, color: '#eef2ff' }}>{selected.subject}</h3>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a5b4fc' }}><X size={18} /></button>
            </div>

            <p style={{ margin: '0 0 12px', fontSize: 13, color: '#c7d2fe', lineHeight: 1.6, padding: '10px 12px', background: 'rgba(129,140,248,0.1)', borderRadius: 8 }}>
              {selected.description}
            </p>

            <div style={{ flex: 1, overflowY: 'auto', marginBottom: 12 }}>
              {(selected.replies || []).map((r, i) => (
                <div key={i} style={{ marginBottom: 8, padding: '8px 12px', borderRadius: 8, background: r.by_role === 'student' ? 'rgba(129,140,248,0.12)' : 'rgba(52,211,153,0.1)' }}>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: r.by_role === 'student' ? '#818cf8' : '#34d399', marginBottom: 2 }}>{r.by_name} · {new Date(r.createdAt).toLocaleString()}</p>
                  <p style={{ margin: 0, fontSize: 13, color: '#e2e8f0' }}>{r.message}</p>
                </div>
              ))}
            </div>

            {selected.status !== 'closed' && selected.status !== 'resolved' && (
              <div style={{ display: 'flex', gap: 8 }}>
                <textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Add a comment..." rows={2}
                  style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(129,140,248,0.3)', background: 'rgba(255,255,255,0.05)', color: '#eef2ff', fontSize: 13, outline: 'none', resize: 'none' }} />
                <button onClick={sendReply} disabled={replying || !reply.trim()}
                  style={{ width: 40, borderRadius: 8, border: 'none', background: '#818cf8', color: '#fff', cursor: replying || !reply.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: replying || !reply.trim() ? 0.5 : 1 }}>
                  <Send size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Complaint Modal */}
      {showNew && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#1e1b4b', borderRadius: 16, padding: 24, width: '100%', maxWidth: 480, border: '1px solid rgba(129,140,248,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#eef2ff' }}>Submit Complaint</h2>
              <button onClick={() => setShowNew(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#818cf8' }}><X size={20} /></button>
            </div>
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#a5b4fc', display: 'block', marginBottom: 5 }}>Subject *</label>
                <input value={form.subject} onChange={e => f('subject', e.target.value)} required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(129,140,248,0.3)', background: 'rgba(255,255,255,0.05)', color: '#eef2ff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#a5b4fc', display: 'block', marginBottom: 5 }}>Category</label>
                  <select value={form.category} onChange={e => f('category', e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(129,140,248,0.3)', background: '#1e1b4b', color: '#eef2ff', fontSize: 13, outline: 'none' }}>
                    {CATEGORIES.map(c => <option key={c} value={c} style={{ background: '#1e1b4b' }}>{c.replace('_',' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#a5b4fc', display: 'block', marginBottom: 5 }}>Priority</label>
                  <select value={form.priority} onChange={e => f('priority', e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(129,140,248,0.3)', background: '#1e1b4b', color: '#eef2ff', fontSize: 13, outline: 'none' }}>
                    {['low','medium','high','urgent'].map(p => <option key={p} value={p} style={{ background: '#1e1b4b' }}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#a5b4fc', display: 'block', marginBottom: 5 }}>Description *</label>
                <textarea value={form.description} onChange={e => f('description', e.target.value)} required rows={4} placeholder="Describe your issue in detail..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(129,140,248,0.3)', background: 'rgba(255,255,255,0.05)', color: '#eef2ff', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#a5b4fc' }}>
                <input type="checkbox" checked={form.is_anonymous} onChange={e => f('is_anonymous', e.target.checked)} style={{ width: 15, height: 15 }} />
                Submit Anonymously
              </label>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setShowNew(false)}
                  style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid rgba(129,140,248,0.3)', background: 'transparent', color: '#a5b4fc', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                <button type="submit" disabled={saving}
                  style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', background: '#818cf8', color: '#fff', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
