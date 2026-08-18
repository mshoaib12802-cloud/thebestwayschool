import { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, BookOpen, Pencil, X, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';

const emptyItem = () => ({ subject_id: '', subject_name: '', topic_covered: '', homework: '', notes: '' });
const emptyForm = () => ({
  class_id: '', academic_year_id: '', date: new Date().toISOString().slice(0, 10),
  items: [emptyItem()], general_note: '', is_published: false,
});

export default function Diary() {
  const [entries, setEntries] = useState([]);
  const [classes, setClasses] = useState([]);
  const [years, setYears] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterClass, setFilterClass] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    Promise.all([
      api.get('/school-classes'),
      api.get('/academic-years'),
      api.get('/subjects'),
    ]).then(([c, y, s]) => {
      setClasses(c.data);
      setYears(y.data);
      setSubjects(s.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (filterClass) params.class_id = filterClass;
    if (filterYear) params.academic_year_id = filterYear;
    api.get('/diary', { params })
      .then(r => setEntries(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filterClass, filterYear]);

  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg({ text: '', type: '' }), 3000); };

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setShowModal(true); };
  const openEdit = (entry) => {
    setEditing(entry._id);
    setForm({
      class_id: entry.class_id?._id || entry.class_id || '',
      academic_year_id: entry.academic_year_id?._id || entry.academic_year_id || '',
      date: entry.date?.slice(0, 10) || '',
      items: entry.items?.length ? entry.items.map(i => ({
        subject_id: i.subject_id || '', subject_name: i.subject_name || '',
        topic_covered: i.topic_covered || '', homework: i.homework || '', notes: i.notes || '',
      })) : [emptyItem()],
      general_note: entry.general_note || '',
      is_published: entry.is_published || false,
    });
    setShowModal(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        const r = await api.patch(`/diary/${editing}`, form);
        setEntries(prev => prev.map(e => e._id === editing ? r.data : e));
        flash('Entry updated');
      } else {
        const r = await api.post('/diary', form);
        setEntries(prev => [r.data, ...prev]);
        flash('Entry created');
      }
      setShowModal(false);
    } catch (err) { flash(err.response?.data?.message || 'Error saving', 'error'); }
    finally { setSaving(false); }
  };

  const togglePublish = async (entry) => {
    try {
      const r = await api.patch(`/diary/${entry._id}`, { is_published: !entry.is_published });
      setEntries(prev => prev.map(e => e._id === entry._id ? r.data : e));
    } catch {}
  };

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setItem = (idx, k, v) => setForm(p => {
    const items = [...p.items];
    items[idx] = { ...items[idx], [k]: v };
    return { ...p, items };
  });
  const addItem = () => setForm(p => ({ ...p, items: [...p.items, emptyItem()] }));
  const removeItem = (idx) => setForm(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));
  const toggleExpand = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', margin: 0 }}>Class Diary</h1>
        <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0' }}>Daily lesson records, homework assignments, and class notes</p>
      </div>

      {msg.text && (
        <div style={{ background: msg.type === 'error' ? '#fee2e2' : '#dcfce7', color: msg.type === 'error' ? '#991b1b' : '#166534', padding: '9px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13, fontWeight: 600 }}>
          {msg.text}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', background: '#fff', color: '#1e293b' }}>
          <option value="">All Classes</option>
          {classes.map(c => <option key={c._id} value={c._id}>{c.name} {c.section ? `(${c.section})` : ''}</option>)}
        </select>
        <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', background: '#fff', color: '#1e293b' }}>
          <option value="">All Years</option>
          {years.map(y => <option key={y._id} value={y._id}>{y.label}</option>)}
        </select>
        <button onClick={openCreate}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 700, marginLeft: 'auto' }}>
          <Plus size={15} /> New Entry
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading diary entries...</div>
      ) : entries.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
          <BookOpen size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
          <p style={{ margin: 0, fontSize: 14 }}>No diary entries found</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {entries.map(entry => {
            const open = expanded[entry._id];
            return (
              <div key={entry._id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer' }} onClick={() => toggleExpand(entry._id)}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: entry.is_published ? '#22c55e' : '#e2e8f0', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>
                      {fmtDate(entry.date)}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                      {entry.class_id?.name}{entry.class_id?.section ? ` (${entry.class_id.section})` : ''} &nbsp;·&nbsp;
                      {entry.items?.length || 0} subject{entry.items?.length !== 1 ? 's' : ''}
                      {!entry.is_published && <span style={{ marginLeft: 8, color: '#f59e0b', fontWeight: 600 }}>Draft</span>}
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); togglePublish(entry); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: entry.is_published ? '#16a34a' : '#94a3b8' }}>
                    {entry.is_published ? <Eye size={13} /> : <EyeOff size={13} />}
                    {entry.is_published ? 'Published' : 'Draft'}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); openEdit(entry); }}
                    style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #e2e8f0', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
                    <Pencil size={13} />
                  </button>
                  {open ? <ChevronUp size={16} color="#94a3b8" /> : <ChevronDown size={16} color="#94a3b8" />}
                </div>

                {open && (
                  <div style={{ borderTop: '1px solid #f1f5f9', padding: '14px 16px', background: '#fafafa' }}>
                    {entry.items?.map((item, i) => (
                      <div key={i} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: i < entry.items.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                        <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 14, marginBottom: 4 }}>
                          {item.subject_name || 'Subject'}
                        </div>
                        {item.topic_covered && <p style={{ margin: '2px 0', fontSize: 13, color: '#475569' }}><strong>Topic:</strong> {item.topic_covered}</p>}
                        {item.homework && <p style={{ margin: '2px 0', fontSize: 13, color: '#d97706' }}><strong>Homework:</strong> {item.homework}</p>}
                        {item.notes && <p style={{ margin: '2px 0', fontSize: 13, color: '#64748b' }}><strong>Notes:</strong> {item.notes}</p>}
                      </div>
                    ))}
                    {entry.general_note && (
                      <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748b', fontStyle: 'italic' }}>General: {entry.general_note}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000, padding: '20px 16px', overflowY: 'auto' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 620, margin: 'auto', border: '1px solid #e2e8f0', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#1e293b' }}>{editing ? 'Edit Diary Entry' : 'New Diary Entry'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
            </div>

            <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Class *</label>
                  <select value={form.class_id} onChange={e => f('class_id', e.target.value)} required
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', background: '#fff', color: '#1e293b', boxSizing: 'border-box' }}>
                    <option value="">Select class</option>
                    {classes.map(c => <option key={c._id} value={c._id}>{c.name} {c.section ? `(${c.section})` : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Academic Year</label>
                  <select value={form.academic_year_id} onChange={e => f('academic_year_id', e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', background: '#fff', color: '#1e293b', boxSizing: 'border-box' }}>
                    <option value="">Select year</option>
                    {years.map(y => <option key={y._id} value={y._id}>{y.label}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end' }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date *</label>
                  <input type="date" value={form.date} onChange={e => f('date', e.target.value)} required
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', background: '#fff', color: '#1e293b', boxSizing: 'border-box' }} />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#475569', paddingBottom: 3 }}>
                  <input type="checkbox" checked={form.is_published} onChange={e => f('is_published', e.target.checked)} style={{ width: 15, height: 15 }} />
                  Publish to students
                </label>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subject Entries</label>
                  <button type="button" onClick={addItem}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                    <Plus size={13} /> Add Subject
                  </button>
                </div>
                {form.items.map((item, idx) => (
                  <div key={idx} style={{ background: '#f8fafc', borderRadius: 10, padding: 12, marginBottom: 10, border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>Subject {idx + 1}</span>
                      {form.items.length > 1 && (
                        <button type="button" onClick={() => removeItem(idx)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 2 }}><X size={14} /></button>
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Subject</label>
                        <select value={item.subject_id} onChange={e => {
                          const sub = subjects.find(s => s._id === e.target.value);
                          setItem(idx, 'subject_id', e.target.value);
                          if (sub) setItem(idx, 'subject_name', sub.name);
                        }}
                          style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid #e2e8f0', fontSize: 12, outline: 'none', background: '#fff', color: '#1e293b', boxSizing: 'border-box' }}>
                          <option value="">Select...</option>
                          {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Topic Covered</label>
                        <input value={item.topic_covered} onChange={e => setItem(idx, 'topic_covered', e.target.value)}
                          placeholder="What was taught today"
                          style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid #e2e8f0', fontSize: 12, outline: 'none', background: '#fff', color: '#1e293b', boxSizing: 'border-box' }} />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#d97706', display: 'block', marginBottom: 4 }}>Homework</label>
                        <input value={item.homework} onChange={e => setItem(idx, 'homework', e.target.value)}
                          placeholder="Homework given"
                          style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid #fde68a', fontSize: 12, outline: 'none', background: '#fff', color: '#1e293b', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Notes</label>
                        <input value={item.notes} onChange={e => setItem(idx, 'notes', e.target.value)}
                          placeholder="Additional notes"
                          style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid #e2e8f0', fontSize: 12, outline: 'none', background: '#fff', color: '#1e293b', boxSizing: 'border-box' }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>General Note</label>
                <textarea value={form.general_note} onChange={e => f('general_note', e.target.value)} rows={2}
                  placeholder="Any general announcements or notes for the class..."
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', color: '#1e293b' }} />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setShowModal(false)}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'transparent', color: '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                <button type="submit" disabled={saving}
                  style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Saving...' : editing ? 'Update Entry' : 'Create Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
