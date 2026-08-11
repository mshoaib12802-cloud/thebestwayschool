import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { Upload, Trash2, Download, FileText, Search, X, FolderOpen, User } from 'lucide-react';

const CATEGORIES = ['b_form','cnic','birth_certificate','leaving_certificate','medical_report','vaccination','contract','experience_letter','marksheet','photo','fee_receipt','other'];
const CAT_LABEL = { b_form:'B-Form', cnic:'CNIC', birth_certificate:'Birth Certificate', leaving_certificate:'Leaving Certificate', medical_report:'Medical Report', vaccination:'Vaccination', contract:'Contract', experience_letter:'Experience Letter', marksheet:'Marksheet', photo:'Photo', fee_receipt:'Fee Receipt', other:'Other' };
const CAT_COLOR = { b_form:'#3b82f6', cnic:'#8b5cf6', birth_certificate:'#10b981', leaving_certificate:'#f59e0b', medical_report:'#ef4444', vaccination:'#06b6d4', contract:'#f97316', experience_letter:'#84cc16', marksheet:'#6366f1', photo:'#ec4899', fee_receipt:'#14b8a6', other:'#94a3b8' };

function fmtSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Documents() {
  const [entityType, setEntityType] = useState('student');
  const [search, setSearch] = useState('');
  const [entities, setEntities] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [form, setForm] = useState({ title: '', category: 'other', notes: '' });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const fileRef = useRef();

  useEffect(() => {
    if (!search.trim()) { setEntities([]); return; }
    const timer = setTimeout(() => {
      const endpoint = entityType === 'student' ? `/students?search=${search}` : `/staff?search=${search}`;
      api.get(endpoint).then(r => setEntities(r.data?.students || r.data?.staff || r.data || [])).catch(() => {});
    }, 350);
    return () => clearTimeout(timer);
  }, [search, entityType]);

  const selectEntity = (e) => {
    setSelectedEntity(e);
    setSearch('');
    setEntities([]);
    loadDocs(e._id);
  };

  const loadDocs = (id) => {
    setLoading(true);
    api.get(`/documents?entity_type=${entityType}&entity_id=${id}`)
      .then(r => setDocs(r.data))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  };

  const upload = async (e) => {
    e.preventDefault();
    if (!file || !form.title || !selectedEntity) return;
    setSaving(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('entity_type', entityType);
    fd.append('entity_id', selectedEntity._id);
    fd.append('title', form.title);
    fd.append('category', form.category);
    fd.append('notes', form.notes);
    try {
      const r = await api.post('/documents', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setDocs(prev => [r.data, ...prev]);
      setShowUpload(false);
      setForm({ title: '', category: 'other', notes: '' });
      setFile(null);
      setMsg('Document uploaded successfully');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setMsg(err.response?.data?.message || 'Upload failed');
    } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!confirm('Delete this document?')) return;
    try {
      await api.delete(`/documents/${id}`);
      setDocs(prev => prev.filter(d => d._id !== id));
    } catch (err) {
      setMsg(err.response?.data?.message || 'Delete failed');
    }
  };

  const entityName = (e) => e?.full_name || e?.name || '';

  return (
    <div style={{ fontFamily: 'inherit' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>Document Management</h1>
        <p style={{ color: '#64748b', fontSize: 14, margin: '4px 0 0' }}>Upload and manage documents for students and staff</p>
      </div>

      {msg && (
        <div style={{ background: msg.includes('success') ? '#dcfce7' : '#fee2e2', color: msg.includes('success') ? '#166534' : '#991b1b', padding: '10px 16px', borderRadius: 10, marginBottom: 16, fontSize: 14 }}>
          {msg}
        </div>
      )}

      {/* Entity Selection */}
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          {['student', 'staff'].map(t => (
            <button key={t} onClick={() => { setEntityType(t); setSelectedEntity(null); setDocs([]); setSearch(''); setEntities([]); }}
              style={{ padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14,
                background: entityType === t ? '#6366f1' : '#f1f5f9', color: entityType === t ? '#fff' : '#64748b' }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Search ${entityType} by name...`}
            style={{ width: '100%', padding: '10px 12px 10px 38px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
          />
          {entities.length > 0 && (
            <div style={{ position: 'absolute', top: '110%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 100, maxHeight: 220, overflowY: 'auto' }}>
              {entities.map(e => (
                <div key={e._id} onClick={() => selectEntity(e)}
                  style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: 14 }}
                  onMouseEnter={ev => ev.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={ev => ev.currentTarget.style.background = '#fff'}>
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>{entityName(e)}</span>
                  <span style={{ color: '#94a3b8', fontSize: 12, marginLeft: 8 }}>{e.roll_number || e.employee_id || ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedEntity && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, padding: '10px 14px', background: '#f0f9ff', borderRadius: 10, border: '1px solid #bae6fd' }}>
            <User size={18} style={{ color: '#0ea5e9' }} />
            <span style={{ fontWeight: 600, color: '#0c4a6e', fontSize: 14 }}>{entityName(selectedEntity)}</span>
            <span style={{ color: '#7dd3fc', fontSize: 12 }}>{selectedEntity.roll_number || selectedEntity.employee_id || ''}</span>
            <button onClick={() => { setSelectedEntity(null); setDocs([]); }} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
              <X size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Documents Area */}
      {selectedEntity && (
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
              Documents — {entityName(selectedEntity)} <span style={{ color: '#94a3b8', fontWeight: 400 }}>({docs.length})</span>
            </h2>
            <button onClick={() => setShowUpload(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
              <Upload size={16} /> Upload Document
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading...</div>
          ) : docs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>
              <FolderOpen size={40} style={{ opacity: 0.4, marginBottom: 12 }} />
              <p style={{ margin: 0, fontSize: 14 }}>No documents uploaded yet</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
              {docs.map(doc => (
                <div key={doc._id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: `${CAT_COLOR[doc.category] || '#94a3b8'}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FileText size={20} style={{ color: CAT_COLOR[doc.category] || '#94a3b8' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</p>
                      <span style={{ display: 'inline-block', marginTop: 4, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: `${CAT_COLOR[doc.category] || '#94a3b8'}18`, color: CAT_COLOR[doc.category] || '#94a3b8' }}>
                        {CAT_LABEL[doc.category] || doc.category}
                      </span>
                    </div>
                  </div>
                  {doc.notes && <p style={{ margin: '10px 0 0', fontSize: 12, color: '#64748b' }}>{doc.notes}</p>}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>{fmtSize(doc.file_size)} · {new Date(doc.createdAt).toLocaleDateString()}</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <a href={doc.file_url} target="_blank" rel="noreferrer"
                        style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1', textDecoration: 'none' }}>
                        <Download size={15} />
                      </a>
                      <button onClick={() => remove(doc._id)}
                        style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #fee2e2', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>Upload Document</h2>
              <button onClick={() => setShowUpload(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={22} /></button>
            </div>
            <form onSubmit={upload} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Title *</label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Category</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABEL[c]}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>File * (PDF, image, Word — max 10MB)</label>
                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" required onChange={e => setFile(e.target.files[0])}
                  style={{ width: '100%', fontSize: 14 }} />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setShowUpload(false)}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 14, opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
