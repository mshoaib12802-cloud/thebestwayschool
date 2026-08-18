import { useState, useEffect, useContext } from 'react';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { Plus, Pencil, Trash2, BookOpen, X, Star } from 'lucide-react';

const TYPES = ['homework','classwork','project','reading','revision','other'];
const TYPE_COLOR = { homework:'#6ee7b7', classwork:'#10b981', project:'#f59e0b', reading:'#0ea5e9', revision:'#8b5cf6', other:'#94a3b8' };
const empty = () => ({ class_id:'', subject_id:'', date: new Date().toISOString().slice(0,10), title:'', description:'', due_date:'', type:'homework', is_important: false });

export default function TeacherHomework() {
  const { user } = useContext(AuthContext);
  const [homework, setHomework] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterClass, setFilterClass] = useState('');
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
    setForm({ class_id: h.class_id?._id || h.class_id || '', subject_id: h.subject_id?._id || h.subject_id || '', date: h.date?.slice(0,10) || '', title: h.title, description: h.description || '', due_date: h.due_date?.slice(0,10) || '', type: h.type, is_important: h.is_important || false });
    setShowModal(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        const r = await api.put(`/homework/${editing}`, form);
        setHomework(prev => prev.map(h => h._id === editing ? r.data : h));
        setMsg('Updated');
      } else {
        const r = await api.post('/homework', form);
        setHomework(prev => [r.data, ...prev]);
        setMsg('Created');
      }
      setShowModal(false);
    } catch (err) { setMsg(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); setTimeout(() => setMsg(''), 2500); }
  };

  const remove = async (id) => {
    if (!confirm('Delete this homework entry?')) return;
    try { await api.delete(`/homework/${id}`); setHomework(prev => prev.filter(h => h._id !== id)); } catch {}
  };

  const filtered = homework.filter(h => !filterClass || (h.class_id?._id || h.class_id) === filterClass);
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#064e3b', margin: 0 }}>Homework Diary</h1>
        <p style={{ color: '#6ee7b7', fontSize: 13, margin: '3px 0 0', fontWeight: 600 }}>Manage homework and classwork for your students</p>
      </div>

      {msg && <div style={{ background: '#d1fae5', color: '#065f46', padding: '8px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13 }}>{msg}</div>}

      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(110,231,183,0.3)', fontSize: 13, outline: 'none', background: 'rgba(255,255,255,0.05)', color: '#064e3b' }}>
          <option value="">All Classes</option>
          {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <button onClick={openCreate}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#6ee7b7', color: '#064e3b', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 700, marginLeft: 'auto' }}>
          <Plus size={15} /> Add Homework
        </button>
      </div>

      {loading ? (
        <p style={{ color: '#6ee7b7', fontSize: 14 }}>Loading...</p>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#6ee7b7', opacity: 0.6 }}>
          <BookOpen size={36} style={{ marginBottom: 10 }} />
          <p style={{ margin: 0, fontSize: 14 }}>No homework entries yet</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(h => (
            <div key={h._id} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 16px', border: '1px solid rgba(110,231,183,0.15)', borderLeft: `4px solid ${TYPE_COLOR[h.type] || '#94a3b8'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: `${TYPE_COLOR[h.type]}30`, color: TYPE_COLOR[h.type] || '#94a3b8' }}>
                      {h.type}
                    </span>
                    {h.is_important && <Star size={13} fill="#f59e0b" color="#f59e0b" />}
                  </div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#ecfdf5' }}>{h.title}</p>
                  {h.description && <p style={{ margin: '4px 0 0', fontSize: 13, color: '#a7f3d0' }}>{h.description}</p>}
                  <div style={{ display: 'flex', gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: '#6ee7b7' }}>Class: {h.class_id?.name || '—'} · Subject: {h.subject_id?.name || '—'}</span>
                    <span style={{ fontSize: 12, color: '#6ee7b7' }}>Date: {h.date ? new Date(h.date).toLocaleDateString() : '—'}</span>
                    {h.due_date && <span style={{ fontSize: 12, color: '#fde68a', fontWeight: 600 }}>Due: {new Date(h.due_date).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => openEdit(h)} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(110,231,183,0.3)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6ee7b7' }}>
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => remove(h._id)} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fca5a5' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#064e3b', borderRadius: 16, padding: 24, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', border: '1px solid rgba(110,231,183,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#ecfdf5' }}>{editing ? 'Edit Homework' : 'Add Homework'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6ee7b7' }}><X size={20} /></button>
            </div>
            <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Class *', key: 'class_id', type: 'select', options: classes.map(c => ({ value: c._id, label: c.name })) },
                { label: 'Subject *', key: 'subject_id', type: 'select', options: subjects.map(s => ({ value: s._id, label: s.name })) },
                { label: 'Type', key: 'type', type: 'select', options: TYPES.map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) })) },
              ].map(({ label, key, type, options }) => (
                <div key={key}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#6ee7b7', display: 'block', marginBottom: 5 }}>{label}</label>
                  <select value={form[key]} onChange={e => f(key, e.target.value)} required={label.includes('*')}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(110,231,183,0.3)', background: 'rgba(255,255,255,0.05)', color: '#ecfdf5', fontSize: 13, outline: 'none' }}>
                    <option value="" style={{ background: '#064e3b' }}>Select...</option>
                    {options.map(o => <option key={o.value} value={o.value} style={{ background: '#064e3b' }}>{o.label}</option>)}
                  </select>
                </div>
              ))}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6ee7b7', display: 'block', marginBottom: 5 }}>Title *</label>
                <input value={form.title} onChange={e => f('title', e.target.value)} required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(110,231,183,0.3)', background: 'rgba(255,255,255,0.05)', color: '#ecfdf5', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6ee7b7', display: 'block', marginBottom: 5 }}>Description</label>
                <textarea value={form.description} onChange={e => f('description', e.target.value)} rows={2}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(110,231,183,0.3)', background: 'rgba(255,255,255,0.05)', color: '#ecfdf5', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#6ee7b7', display: 'block', marginBottom: 5 }}>Date *</label>
                  <input type="date" value={form.date} onChange={e => f('date', e.target.value)} required
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(110,231,183,0.3)', background: 'rgba(255,255,255,0.05)', color: '#ecfdf5', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#6ee7b7', display: 'block', marginBottom: 5 }}>Due Date</label>
                  <input type="date" value={form.due_date} onChange={e => f('due_date', e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(110,231,183,0.3)', background: 'rgba(255,255,255,0.05)', color: '#ecfdf5', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#a7f3d0' }}>
                <input type="checkbox" checked={form.is_important} onChange={e => f('is_important', e.target.checked)} style={{ width: 15, height: 15 }} />
                Mark as Important
              </label>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setShowModal(false)}
                  style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid rgba(110,231,183,0.3)', background: 'transparent', color: '#6ee7b7', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                <button type="submit" disabled={saving}
                  style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', background: '#6ee7b7', color: '#064e3b', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, opacity: saving ? 0.7 : 1 }}>
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
