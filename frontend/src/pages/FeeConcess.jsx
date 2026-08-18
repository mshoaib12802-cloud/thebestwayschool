import { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Pencil, Trash2, Search, X, Tag, CheckCircle, XCircle } from 'lucide-react';

const TYPES = ['scholarship','sibling','staff_child','need_based','merit','custom'];
const TYPE_LABEL = { scholarship:'Scholarship', sibling:'Sibling Discount', staff_child:"Staff Child", need_based:'Need Based', merit:'Merit', custom:'Custom' };
const TYPE_COLOR = { scholarship:'#6366f1', sibling:'#10b981', staff_child:'#f59e0b', need_based:'#ef4444', merit:'#0ea5e9', custom:'#8b5cf6' };

const empty = () => ({ student_id:'', type:'scholarship', label:'', discount_type:'percentage', discount_value:'', applicable_heads:'', valid_from:'', valid_to:'', academic_year_id:'', notes:'' });

export default function FeeConcess() {
  const [concessions, setConcessions] = useState([]);
  const [students, setStudents] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty());
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [studentResults, setStudentResults] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/concessions'),
      api.get('/academic-years'),
    ]).then(([c, ay]) => {
      setConcessions(c.data);
      setAcademicYears(ay.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!studentSearch.trim()) { setStudentResults([]); return; }
    const t = setTimeout(() => {
      api.get(`/students?search=${studentSearch}`).then(r => setStudentResults(r.data?.students || r.data || [])).catch(() => {});
    }, 350);
    return () => clearTimeout(t);
  }, [studentSearch]);

  const openCreate = () => { setEditing(null); setForm(empty()); setStudentSearch(''); setShowModal(true); };
  const openEdit = (c) => {
    setEditing(c._id);
    setForm({
      student_id: c.student_id?._id || c.student_id || '',
      type: c.type, label: c.label,
      discount_type: c.discount_type,
      discount_value: c.discount_value,
      applicable_heads: (c.applicable_heads || []).join(', '),
      valid_from: c.valid_from ? c.valid_from.slice(0,10) : '',
      valid_to:   c.valid_to   ? c.valid_to.slice(0,10)   : '',
      academic_year_id: c.academic_year_id?._id || c.academic_year_id || '',
      notes: c.notes || '',
    });
    setStudentSearch(c.student_id?.full_name || '');
    setShowModal(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      discount_value: parseFloat(form.discount_value),
      applicable_heads: form.applicable_heads ? form.applicable_heads.split(',').map(s => s.trim()).filter(Boolean) : [],
    };
    try {
      if (editing) {
        const r = await api.put(`/concessions/${editing}`, payload);
        setConcessions(prev => prev.map(c => c._id === editing ? r.data : c));
        setMsg('Concession updated');
      } else {
        const r = await api.post('/concessions', payload);
        setConcessions(prev => [r.data, ...prev]);
        setMsg('Concession created');
      }
      setShowModal(false);
    } catch (err) {
      setMsg(err.response?.data?.message || 'Error saving');
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const toggleActive = async (c) => {
    try {
      const r = await api.put(`/concessions/${c._id}`, { is_active: !c.is_active });
      setConcessions(prev => prev.map(x => x._id === c._id ? { ...x, is_active: r.data.is_active } : x));
    } catch {}
  };

  const remove = async (id) => {
    if (!confirm('Delete this concession?')) return;
    try {
      await api.delete(`/concessions/${id}`);
      setConcessions(prev => prev.filter(c => c._id !== id));
    } catch (err) { setMsg(err.response?.data?.message || 'Delete failed'); }
  };

  const filtered = concessions.filter(c => {
    const name = c.student_id?.full_name || '';
    const matchSearch = !search || name.toLowerCase().includes(search.toLowerCase()) || c.label.toLowerCase().includes(search.toLowerCase());
    const matchType = !filterType || c.type === filterType;
    const matchActive = filterActive === '' ? true : filterActive === 'active' ? c.is_active : !c.is_active;
    return matchSearch && matchType && matchActive;
  });

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>Fee Concessions</h1>
        <p style={{ color: '#64748b', fontSize: 14, margin: '4px 0 0' }}>Manage scholarships and discounts for students</p>
      </div>

      {msg && (
        <div style={{ background: msg.includes('Error') || msg.includes('failed') ? '#fee2e2' : '#dcfce7', color: msg.includes('Error') || msg.includes('failed') ? '#991b1b' : '#166534', padding: '10px 16px', borderRadius: 10, marginBottom: 16, fontSize: 14 }}>
          {msg}
        </div>
      )}

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', padding: 18, marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by student or label..."
            style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }}>
          <option value="">All Types</option>
          {TYPES.map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
        </select>
        <select value={filterActive} onChange={e => setFilterActive(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button onClick={openCreate}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}>
          <Plus size={16} /> New Concession
        </button>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>
            <Tag size={36} style={{ opacity: 0.4, marginBottom: 12 }} />
            <p style={{ margin: 0, fontSize: 14 }}>No concessions found</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {['Student','Label','Type','Discount','Valid Period','Status','Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={c._id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{c.student_id?.full_name || '—'}</p>
                      <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>{c.student_id?.roll_number || ''}</p>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 14, color: '#374151' }}>{c.label}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: `${TYPE_COLOR[c.type] || '#94a3b8'}18`, color: TYPE_COLOR[c.type] || '#94a3b8' }}>
                        {TYPE_LABEL[c.type] || c.type}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
                      {c.discount_value}{c.discount_type === 'percentage' ? '%' : ' Rs.'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b' }}>
                      {c.valid_from ? new Date(c.valid_from).toLocaleDateString() : '—'} – {c.valid_to ? new Date(c.valid_to).toLocaleDateString() : 'Ongoing'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button onClick={() => toggleActive(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                        {c.is_active
                          ? <><CheckCircle size={16} style={{ color: '#10b981' }} /><span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>Active</span></>
                          : <><XCircle size={16} style={{ color: '#94a3b8' }} /><span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Inactive</span></>}
                      </button>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => openEdit(c)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => remove(c._id)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #fee2e2', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>{editing ? 'Edit Concession' : 'New Concession'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={22} /></button>
            </div>

            <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Student Search */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Student *</label>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input value={studentSearch} onChange={e => { setStudentSearch(e.target.value); if (!editing) f('student_id', ''); }} placeholder="Type to search student..."
                    style={{ width: '100%', padding: '9px 12px 9px 32px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                  {studentResults.length > 0 && (
                    <div style={{ position: 'absolute', top: '105%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 200, maxHeight: 160, overflowY: 'auto' }}>
                      {studentResults.map(s => (
                        <div key={s._id} onClick={() => { f('student_id', s._id); setStudentSearch(s.full_name); setStudentResults([]); }}
                          style={{ padding: '8px 14px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid #f1f5f9' }}
                          onMouseEnter={ev => ev.currentTarget.style.background = '#f8fafc'}
                          onMouseLeave={ev => ev.currentTarget.style.background = '#fff'}>
                          {s.full_name} <span style={{ color: '#94a3b8' }}>{s.roll_number}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Type *</label>
                  <select value={form.type} onChange={e => f('type', e.target.value)} required
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }}>
                    {TYPES.map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Label *</label>
                  <input value={form.label} onChange={e => f('label', e.target.value)} required placeholder="e.g. Full Scholarship"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Discount Type</label>
                  <select value={form.discount_type} onChange={e => f('discount_type', e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }}>
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (Rs.)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Value *</label>
                  <input value={form.discount_value} onChange={e => f('discount_value', e.target.value)} type="number" min="0" max={form.discount_type === 'percentage' ? 100 : undefined} required
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Applicable Fee Heads (comma-separated, leave blank for all)</label>
                <input value={form.applicable_heads} onChange={e => f('applicable_heads', e.target.value)} placeholder="e.g. Tuition Fee, Lab Fee"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Valid From</label>
                  <input type="date" value={form.valid_from} onChange={e => f('valid_from', e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Valid To</label>
                  <input type="date" value={form.valid_to} onChange={e => f('valid_to', e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Academic Year</label>
                <select value={form.academic_year_id} onChange={e => f('academic_year_id', e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }}>
                  <option value="">Select year (optional)</option>
                  {academicYears.map(y => <option key={y._id} value={y._id}>{y.label}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Notes</label>
                <textarea value={form.notes} onChange={e => f('notes', e.target.value)} rows={2}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setShowModal(false)}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 14, opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
