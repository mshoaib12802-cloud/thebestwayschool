import { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Pencil, Trash2, BookOpen, X, Search, Star } from 'lucide-react';

const TYPES = ['homework','classwork','project','reading','revision','other'];
const TYPE_COLOR = { homework:'#6366f1', classwork:'#10b981', project:'#f59e0b', reading:'#0ea5e9', revision:'#8b5cf6', other:'#94a3b8' };

const empty = () => ({ class_id:'', subject_id:'', date: new Date().toISOString().slice(0,10), title:'', description:'', due_date:'', type:'homework', is_important: false });

export default function HomeworkDiary() {
  const [homework, setHomework] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterClass, setFilterClass] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty());
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/homework'),
      api.get('/school-classes'),
      api.get('/subjects'),
    ]).then(([h, c, s]) => {
      setHomework(h.data);
      setClasses(c.data);
      setSubjects(s.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const openCreate = () => { setEditing(null); setForm(empty()); setShowModal(true); };
  const openEdit = (h) => {
    setEditing(h._id);
    setForm({
      class_id: h.class_id?._id || h.class_id || '',
      subject_id: h.subject_id?._id || h.subject_id || '',
      date: h.date ? h.date.slice(0,10) : '',
      title: h.title,
      description: h.description || '',
      due_date: h.due_date ? h.due_date.slice(0,10) : '',
      type: h.type,
      is_important: h.is_important || false,
    });
    setShowModal(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        const r = await api.put(`/homework/${editing}`, form);
        setHomework(prev => prev.map(h => h._id === editing ? r.data : h));
        setMsg('Updated successfully');
      } else {
        const r = await api.post('/homework', form);
        setHomework(prev => [r.data, ...prev]);
        setMsg('Created successfully');
      }
      setShowModal(false);
    } catch (err) {
      setMsg(err.response?.data?.message || 'Error saving');
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this entry?')) return;
    try {
      await api.delete(`/homework/${id}`);
      setHomework(prev => prev.filter(h => h._id !== id));
    } catch {}
  };

  const filtered = homework.filter(h => {
    const cls = h.class_id?._id || h.class_id || '';
    const matchClass = !filterClass || cls === filterClass;
    const matchType = !filterType || h.type === filterType;
    const matchDate = !filterDate || h.date?.slice(0,10) === filterDate;
    const matchSearch = !search || h.title?.toLowerCase().includes(search.toLowerCase());
    return matchClass && matchType && matchDate && matchSearch;
  });

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const className = (id) => classes.find(c => c._id === id)?.name || id;
  const subjectName = (id) => subjects.find(s => s._id === id)?.name || id;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>Homework Diary</h1>
        <p style={{ color: '#64748b', fontSize: 14, margin: '4px 0 0' }}>Manage daily homework and classwork for all classes</p>
      </div>

      {msg && (
        <div style={{ background: msg.includes('Error') ? '#fee2e2' : '#dcfce7', color: msg.includes('Error') ? '#991b1b' : '#166534', padding: '10px 16px', borderRadius: 10, marginBottom: 16, fontSize: 14 }}>
          {msg}
        </div>
      )}

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', padding: 18, marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title..."
            style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }}>
          <option value="">All Classes</option>
          {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }}>
          <option value="">All Types</option>
          {TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
        <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }} />
        <button onClick={openCreate}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}>
          <Plus size={16} /> Add Homework
        </button>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8', background: '#fff', borderRadius: 14 }}>
          <BookOpen size={40} style={{ opacity: 0.4, marginBottom: 12 }} />
          <p style={{ margin: 0, fontSize: 14 }}>No homework entries found</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {filtered.map(h => (
            <div key={h._id} style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', padding: 18, position: 'relative', borderLeft: `4px solid ${TYPE_COLOR[h.type] || '#94a3b8'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: `${TYPE_COLOR[h.type] || '#94a3b8'}18`, color: TYPE_COLOR[h.type] || '#94a3b8' }}>
                      {h.type?.charAt(0).toUpperCase() + h.type?.slice(1)}
                    </span>
                    {h.is_important && <Star size={14} fill="#f59e0b" color="#f59e0b" />}
                  </div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#1e293b', lineHeight: 1.3 }}>{h.title}</p>
                </div>
                <div style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
                  <button onClick={() => openEdit(h)} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => remove(h._id)} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #fee2e2', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {h.description && <p style={{ margin: '10px 0 0', fontSize: 13, color: '#475569', lineHeight: 1.5 }}>{h.description}</p>}

              <div style={{ display: 'flex', gap: 12, marginTop: 12, paddingTop: 10, borderTop: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  <span style={{ fontWeight: 600 }}>Class:</span> {h.class_id?.name || className(h.class_id)}
                </span>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  <span style={{ fontWeight: 600 }}>Subject:</span> {h.subject_id?.name || subjectName(h.subject_id)}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>Date: {h.date ? new Date(h.date).toLocaleDateString() : '—'}</span>
                {h.due_date && <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>Due: {new Date(h.due_date).toLocaleDateString()}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>{editing ? 'Edit Entry' : 'Add Homework'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={22} /></button>
            </div>

            <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Class *</label>
                  <select value={form.class_id} onChange={e => f('class_id', e.target.value)} required
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }}>
                    <option value="">Select class</option>
                    {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Subject *</label>
                  <select value={form.subject_id} onChange={e => f('subject_id', e.target.value)} required
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }}>
                    <option value="">Select subject</option>
                    {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Title *</label>
                <input value={form.title} onChange={e => f('title', e.target.value)} required placeholder="Homework title"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Description</label>
                <textarea value={form.description} onChange={e => f('description', e.target.value)} rows={3} placeholder="Detailed instructions..."
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Type</label>
                  <select value={form.type} onChange={e => f('type', e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }}>
                    {TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Date *</label>
                  <input type="date" value={form.date} onChange={e => f('date', e.target.value)} required
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Due Date</label>
                  <input type="date" value={form.due_date} onChange={e => f('due_date', e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, color: '#374151' }}>
                <input type="checkbox" checked={form.is_important} onChange={e => f('is_important', e.target.checked)}
                  style={{ width: 16, height: 16, cursor: 'pointer' }} />
                <span>Mark as Important</span>
                <Star size={14} fill={form.is_important ? '#f59e0b' : 'none'} color="#f59e0b" />
              </label>

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
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
