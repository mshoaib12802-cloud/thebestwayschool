import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { MessageSquare, Send, X, ChevronDown, RefreshCw, AlertCircle, Clock, CheckCircle2, XCircle } from 'lucide-react';

const STATUS_COLOR = { open:'#f59e0b', in_progress:'#6366f1', resolved:'#10b981', closed:'#94a3b8' };
const STATUS_ICON = { open: <AlertCircle size={14} />, in_progress: <Clock size={14} />, resolved: <CheckCircle2 size={14} />, closed: <XCircle size={14} /> };
const PRIORITY_COLOR = { low:'#94a3b8', medium:'#f59e0b', high:'#f97316', urgent:'#ef4444' };
const CAT_LABEL = { academic:'Academic', fee:'Fee', staff_behaviour:'Staff Behaviour', facility:'Facility', transport:'Transport', bullying:'Bullying', administration:'Administration', other:'Other' };

export default function Complaints() {
  const [stats, setStats] = useState({});
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState('');
  const [replying, setReplying] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus) params.set('status', filterStatus);
    if (filterPriority) params.set('priority', filterPriority);
    Promise.all([
      api.get('/complaints/stats'),
      api.get(`/complaints?${params}`),
    ]).then(([s, c]) => {
      setStats(s.data);
      setComplaints(c.data.complaints || c.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [filterStatus, filterPriority]);

  useEffect(() => { load(); }, [load]);

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
    } catch (err) { setMsg(err.response?.data?.message || 'Reply failed'); }
    finally { setReplying(false); }
  };

  const updateStatus = async (status) => {
    if (!selected) return;
    setUpdating(true);
    try {
      const r = await api.put(`/complaints/${selected._id}/status`, { status });
      setSelected(r.data);
      setComplaints(prev => prev.map(c => c._id === r.data._id ? r.data : c));
      setMsg('Status updated');
      setTimeout(() => setMsg(''), 2000);
    } catch { setMsg('Update failed'); }
    finally { setUpdating(false); }
  };

  const StatCard = ({ label, value, color, icon }) => (
    <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>{value || 0}</p>
        <p style={{ margin: '3px 0 0', fontSize: 12, color: '#64748b', fontWeight: 600 }}>{label}</p>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>Complaints & Feedback</h1>
        <p style={{ color: '#64748b', fontSize: 14, margin: '4px 0 0' }}>Review and respond to complaints from students and parents</p>
      </div>

      {msg && (
        <div style={{ background: msg.includes('fail') ? '#fee2e2' : '#dcfce7', color: msg.includes('fail') ? '#991b1b' : '#166534', padding: '10px 16px', borderRadius: 10, marginBottom: 16, fontSize: 14 }}>
          {msg}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 20 }}>
        <StatCard label="Total" value={stats.total} color="#6366f1" icon={<MessageSquare size={20} />} />
        <StatCard label="Open" value={stats.open} color="#f59e0b" icon={<AlertCircle size={20} />} />
        <StatCard label="In Progress" value={stats.in_progress} color="#6366f1" icon={<Clock size={20} />} />
        <StatCard label="Resolved" value={stats.resolved} color="#10b981" icon={<CheckCircle2 size={20} />} />
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', padding: 16, marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }}>
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }}>
          <option value="">All Priority</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
        <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 14, color: '#64748b', marginLeft: 'auto' }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* List + Detail layout */}
      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 20, alignItems: 'start' }}>
        {/* List */}
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading...</div>
          ) : complaints.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>
              <MessageSquare size={36} style={{ opacity: 0.3, marginBottom: 10 }} />
              <p style={{ margin: 0, fontSize: 14 }}>No complaints found</p>
            </div>
          ) : complaints.map(c => (
            <div key={c._id} onClick={() => openDetail(c._id)}
              style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: selected?._id === c._id ? '#f0f9ff' : '#fff' }}
              onMouseEnter={ev => { if (selected?._id !== c._id) ev.currentTarget.style.background = '#f8fafc'; }}
              onMouseLeave={ev => { if (selected?._id !== c._id) ev.currentTarget.style.background = '#fff'; }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#6366f1' }}>{c.ticket_no}</span>
                    <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 20, fontWeight: 700, background: `${STATUS_COLOR[c.status]}18`, color: STATUS_COLOR[c.status], display: 'flex', alignItems: 'center', gap: 3 }}>
                      {STATUS_ICON[c.status]} {c.status?.replace('_', ' ')}
                    </span>
                    <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 20, fontWeight: 700, background: `${PRIORITY_COLOR[c.priority]}18`, color: PRIORITY_COLOR[c.priority] }}>
                      {c.priority}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{c.subject}</p>
                  <p style={{ margin: '3px 0 0', fontSize: 12, color: '#64748b' }}>
                    {c.is_anonymous ? 'Anonymous' : c.submitted_by_name || '—'} · {CAT_LABEL[c.category] || c.category} · {new Date(c.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {c.replies?.length > 0 && (
                  <span style={{ fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>{c.replies.length} replies</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', padding: 22, position: 'sticky', top: 20, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#6366f1' }}>{selected.ticket_no}</span>
                <h3 style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 700, color: '#1e293b' }}>{selected.subject}</h3>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, fontWeight: 700, background: `${STATUS_COLOR[selected.status]}18`, color: STATUS_COLOR[selected.status] }}>
                {selected.status?.replace('_', ' ')}
              </span>
              <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, fontWeight: 700, background: `${PRIORITY_COLOR[selected.priority]}18`, color: PRIORITY_COLOR[selected.priority] }}>
                {selected.priority}
              </span>
              <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: '#f1f5f9', color: '#64748b', fontWeight: 600 }}>
                {CAT_LABEL[selected.category] || selected.category}
              </span>
            </div>

            <div style={{ fontSize: 13, color: '#475569', padding: '12px 14px', background: '#f8fafc', borderRadius: 10, marginBottom: 14, lineHeight: 1.6 }}>
              {selected.description}
            </div>

            <p style={{ margin: '0 0 14px', fontSize: 12, color: '#94a3b8' }}>
              From: <strong style={{ color: '#475569' }}>{selected.is_anonymous ? 'Anonymous' : selected.submitted_by_name}</strong> · {new Date(selected.createdAt).toLocaleString()}
            </p>

            {/* Status update */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Update Status</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['open','in_progress','resolved','closed'].map(s => (
                  <button key={s} onClick={() => updateStatus(s)} disabled={updating || selected.status === s}
                    style={{ padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: selected.status === s ? 'default' : 'pointer', border: 'none',
                      background: selected.status === s ? `${STATUS_COLOR[s]}20` : '#f1f5f9',
                      color: selected.status === s ? STATUS_COLOR[s] : '#64748b', opacity: updating ? 0.6 : 1 }}>
                    {s.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Replies */}
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: 14 }}>
              {(selected.replies || []).map((r, i) => (
                <div key={i} style={{ marginBottom: 10, padding: '10px 12px', borderRadius: 10, background: r.by_role === 'admin' || r.by_role === 'clerk' ? '#eff6ff' : '#f0fdf4' }}>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 3 }}>{r.by_name} · {r.by_role} · {new Date(r.createdAt).toLocaleString()}</p>
                  <p style={{ margin: 0, fontSize: 13, color: '#374151' }}>{r.message}</p>
                </div>
              ))}
            </div>

            {/* Reply Box */}
            <div style={{ display: 'flex', gap: 8 }}>
              <textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Type your reply..." rows={2}
                style={{ flex: 1, padding: '8px 12px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', resize: 'none' }} />
              <button onClick={sendReply} disabled={replying || !reply.trim()}
                style={{ width: 44, borderRadius: 10, border: 'none', background: '#6366f1', color: '#fff', cursor: replying || !reply.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: replying || !reply.trim() ? 0.6 : 1 }}>
                <Send size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
