import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { Shield, Search, Trash2, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

const ACTION_COLOR = { create:'#10b981', update:'#6366f1', delete:'#ef4444', login:'#0ea5e9', logout:'#94a3b8', export:'#f59e0b', print:'#8b5cf6', approve:'#10b981', reject:'#ef4444' };

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterModule, setFilterModule] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg] = useState('');
  const PER_PAGE = 50;

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: PER_PAGE });
    if (search)       params.set('search', search);
    if (filterModule) params.set('module', filterModule);
    if (filterAction) params.set('action', filterAction);
    if (filterFrom)   params.set('from', filterFrom);
    if (filterTo)     params.set('to', filterTo);
    api.get(`/audit-logs?${params}`)
      .then(r => { setLogs(r.data.logs || []); setTotal(r.data.total || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, search, filterModule, filterAction, filterFrom, filterTo]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get('/audit-logs/modules').then(r => setModules(r.data || [])).catch(() => {});
  }, []);

  const deleteOld = async () => {
    const days = prompt('Delete logs older than how many days?', '90');
    if (!days || isNaN(days)) return;
    setDeleting(true);
    try {
      const r = await api.delete(`/audit-logs/old?days=${days}`);
      setMsg(`Deleted ${r.data.deleted} old logs`);
      load();
    } catch { setMsg('Delete failed'); }
    finally { setDeleting(false); setTimeout(() => setMsg(''), 3000); }
  };

  const totalPages = Math.ceil(total / PER_PAGE);

  const ACTIONS = ['create','update','delete','login','logout','export','print','approve','reject'];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>Audit Log</h1>
        <p style={{ color: '#64748b', fontSize: 14, margin: '4px 0 0' }}>Track all actions performed in the system</p>
      </div>

      {msg && (
        <div style={{ background: msg.includes('fail') ? '#fee2e2' : '#dcfce7', color: msg.includes('fail') ? '#991b1b' : '#166534', padding: '10px 16px', borderRadius: 10, marginBottom: 16, fontSize: 14 }}>
          {msg}
        </div>
      )}

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', padding: 18, marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 180px' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search user or description..."
            style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <select value={filterModule} onChange={e => { setFilterModule(e.target.value); setPage(1); }}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }}>
          <option value="">All Modules</option>
          {modules.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={filterAction} onChange={e => { setFilterAction(e.target.value); setPage(1); }}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }}>
          <option value="">All Actions</option>
          {ACTIONS.map(a => <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>)}
        </select>
        <input type="date" value={filterFrom} onChange={e => { setFilterFrom(e.target.value); setPage(1); }}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }} />
        <input type="date" value={filterTo} onChange={e => { setFilterTo(e.target.value); setPage(1); }}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }} />
        <button onClick={() => load()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 14, color: '#64748b' }}>
          <RefreshCw size={14} /> Refresh
        </button>
        <button onClick={deleteOld} disabled={deleting}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid #fee2e2', background: '#fff', cursor: 'pointer', fontSize: 14, color: '#ef4444' }}>
          <Trash2 size={14} /> Purge Old
        </button>
      </div>

      {/* Stats */}
      <div style={{ marginBottom: 16, color: '#64748b', fontSize: 13 }}>
        Showing {logs.length} of {total} records
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading...</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>
            <Shield size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p style={{ margin: 0, fontSize: 14 }}>No audit logs found</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {['Timestamp','User','Action','Module','Description','IP'].map(h => (
                    <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr key={log._id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: '#1e293b' }}>{log.user_name || '—'}</p>
                      <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', textTransform: 'capitalize' }}>{log.user_role}</p>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${ACTION_COLOR[log.action] || '#94a3b8'}18`, color: ACTION_COLOR[log.action] || '#94a3b8', textTransform: 'capitalize' }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 13, color: '#374151', fontWeight: 600 }}>{log.module}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13, color: '#475569', maxWidth: 280 }}>
                      <p style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.description || log.entity_label || '—'}</p>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>{log.ip_address || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 20 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: page === 1 ? '#cbd5e1' : '#374151' }}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: 14, color: '#64748b' }}>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: page === totalPages ? '#cbd5e1' : '#374151' }}>
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
