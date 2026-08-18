import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Plus, BookOpen, Pencil, X, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';

const emptyItem = () => ({ subject_id: '', subject_name: '', topic_covered: '', homework: '', notes: '' });
const emptyForm = () => ({
  class_id: '', academic_year_id: '', date: new Date().toISOString().slice(0, 10),
  items: [emptyItem()], general_note: '', is_published: false,
});

export default function TeacherDiary() {
  const [entries, setEntries] = useState([]);
  const [classes, setClasses] = useState([]);
  const [years, setYears] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterClass, setFilterClass] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    Promise.all([
      api.get('/teacher-portal/courses'),
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
    api.get('/teacher-portal/diary', { params })
      .then(r => setEntries(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filterClass]);

  const flash = (text) => { setMsg(text); setTimeout(() => setMsg(''), 2500); };

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
        const r = await api.patch(`/teacher-portal/diary/${editing}`, form);
        setEntries(prev => prev.map(e => e._id === editing ? r.data : e));
        flash('Entry updated');
      } else {
        const r = await api.post('/teacher-portal/diary', form);
        setEntries(prev => [r.data, ...prev]);
        flash('Entry created');
      }
      setShowModal(false);
    } catch (err) { flash(err.response?.data?.message || 'Error saving'); }
    finally { setSaving(false); }
  };

  const togglePublish = async (entry) => {
    try {
      const r = await api.patch(`/teacher-portal/diary/${entry._id}`, { is_published: !entry.is_published });
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

  const INP = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(110,231,183,0.3)', background: 'rgba(255,255,255,0.05)', color: '#ecfdf5', fontSize: 13, outline: 'none', boxSizing: 'border-box' };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#064e3b', margin: 0 }}>Class Diary</h1>
        <p style={{ color: '#6ee7b7', fontSize: 13, margin: '3px 0 0', fontWeight: 600 }}>Record daily lessons, topics covered, and homework</p>
      </div>

      {msg && <div style={{ background: '#d1fae5', color: '#065f46', padding: '8px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13, fontWeight: 600 }}>{msg}</div>}

      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(110,231,183,0.3)', fontSize: 13, outline: 'none', background: 'rgba(255,255,255,0.05)', color: '#064e3b' }}>
          <option value="">All Classes</option>
          {classes.map(c => <option key={c._id} value={c._id}>{c.class_id?.name || c.name || c._id}</option>)}
        </select>
        <button onClick={openCreate}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#6ee7b7', color: '#064e3b', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 700, marginLeft: 'auto' }}>
          <Plus size={15} /> New Entry
        </button>
      </div>

      {loading ? (
        <p style={{ color: '#6ee7b7', fontSize: 14 }}>Loading...</p>
      ) : entries.length === 0 ? (
        <div style={{ padding: 50, textAlign: 'center', color: '#6ee7b7', opacity: 0.6 }}>
          <BookOpen size={36} style={{ marginBottom: 10 }} />
          <p style={{ margin: 0, fontSize: 14 }}>No diary entries yet. Create your first entry!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {entries.map(entry => {
            const open = expanded[entry._id];
            return (
              <div key={entry._id} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 12, border: '1px solid rgba(110,231,183,0.15)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer' }} onClick={() => toggleExpand(entry._id)}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: entry.is_published ? '#6ee7b7' : 'rgba(110,231,183,0.3)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#ecfdf5' }}>{fmtDate(entry.date)}</div>
                    <div style={{ fontSize: 12, color: '#a7f3d0', marginTop: 2 }}>
                      {entry.class_id?.name || 'Class'}{entry.class_id?.section ? ` (${entry.class_id.section})` : ''} &nbsp;·&nbsp;
                      {entry.items?.length || 0} subject{entry.items?.length !== 1 ? 's' : ''}
                      {!entry.is_published && <span style={{ marginLeft: 8, color: '#fcd34d', fontWeight: 600 }}>Draft</span>}
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); togglePublish(entry); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, border: '1px solid rgba(110,231,183,0.3)', background: 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: entry.is_published ? '#6ee7b7' : '#94a3b8' }}>
                    {entry.is_published ? <Eye size={12} /> : <EyeOff size={12} />}
                    {entry.is_published ? 'Live' : 'Draft'}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); openEdit(entry); }}
                    style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(110,231,183,0.3)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6ee7b7' }}>
                    <Pencil size={13} />
                  </button>
                  {open ? <ChevronUp size={16} color="#6ee7b7" /> : <ChevronDown size={16} color="#6ee7b7" />}
                </div>
                {open && (
                  <div style={{ borderTop: '1px solid rgba(110,231,183,0.1)', padding: '14px 16px', background: 'rgba(0,0,0,0.15)' }}>
                    {entry.items?.map((item, i) => (
                      <div key={i} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: i < entry.items.length - 1 ? '1px solid rgba(110,231,183,0.1)' : 'none' }}>
                        <div style={{ fontWeight: 700, color: '#ecfdf5', fontSize: 14, marginBottom: 4 }}>{item.subject_name || 'Subject'}</div>
                        {item.topic_covered && <p style={{ margin: '2px 0', fontSize: 13, color: '#a7f3d0' }}><strong>Topic:</strong> {item.topic_covered}</p>}
                        {item.homework && <p style={{ margin: '2px 0', fontSize: 13, color: '#fcd34d' }}><strong>Homework:</strong> {item.homework}</p>}
                        {item.notes && <p style={{ margin: '2px 0', fontSize: 13, color: '#6ee7b7' }}><strong>Notes:</strong> {item.notes}</p>}
                      </div>
                    ))}
                    {entry.general_note && <p style={{ margin: '6px 0 0', fontSize: 13, color: '#a7f3d0', fontStyle: 'italic' }}>General: {entry.general_note}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000, padding: '20px 16px', overflowY: 'auto' }}>
          <div style={{ background: '#064e3b', borderRadius: 16, padding: 24, width: '100%', maxWidth: 600, margin: 'auto', border: '1px solid rgba(110,231,183,0.2)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#ecfdf5' }}>{editing ? 'Edit Diary Entry' : 'New Diary Entry'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6ee7b7' }}><X size={20} /></button>
            </div>
            <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#6ee7b7', display: 'block', marginBottom: 5 }}>Class *</label>
                  <select value={form.class_id} onChange={e => f('class_id', e.target.value)} required style={{ ...INP }}>
                    <option value="" style={{ background: '#064e3b' }}>Select...</option>
                    {classes.map(c => <option key={c._id} value={c._id} style={{ background: '#064e3b' }}>{c.class_id?.name || c.name || c._id}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#6ee7b7', display: 'block', marginBottom: 5 }}>Date *</label>
                  <input type="date" value={form.date} onChange={e => f('date', e.target.value)} required style={{ ...INP }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#6ee7b7' }}>Subject Entries</label>
                  <button type="button" onClick={addItem}
                    style={{ fontSize: 12, color: '#6ee7b7', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Plus size={13} /> Add Subject
                  </button>
                </div>
                {form.items.map((item, idx) => (
                  <div key={idx} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 12, marginBottom: 10, border: '1px solid rgba(110,231,183,0.15)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#6ee7b7', opacity: 0.6 }}>Subject {idx + 1}</span>
                      {form.items.length > 1 && (
                        <button type="button" onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171' }}><X size={13} /></button>
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                      <div>
                        <label style={{ fontSize: 11, color: '#a7f3d0', display: 'block', marginBottom: 4 }}>Subject</label>
                        <select value={item.subject_id} onChange={e => {
                          const sub = subjects.find(s => s._id === e.target.value);
                          setItem(idx, 'subject_id', e.target.value);
                          if (sub) setItem(idx, 'subject_name', sub.name);
                        }} style={{ ...INP, padding: '7px 10px', fontSize: 12 }}>
                          <option value="" style={{ background: '#064e3b' }}>Select...</option>
                          {subjects.map(s => <option key={s._id} value={s._id} style={{ background: '#064e3b' }}>{s.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: '#a7f3d0', display: 'block', marginBottom: 4 }}>Topic Covered</label>
                        <input value={item.topic_covered} onChange={e => setItem(idx, 'topic_covered', e.target.value)} placeholder="e.g. Chapter 3 - Fractions"
                          style={{ ...INP, padding: '7px 10px', fontSize: 12 }} />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <label style={{ fontSize: 11, color: '#fcd34d', display: 'block', marginBottom: 4 }}>Homework</label>
                        <input value={item.homework} onChange={e => setItem(idx, 'homework', e.target.value)} placeholder="Homework assigned"
                          style={{ ...INP, padding: '7px 10px', fontSize: 12, borderColor: 'rgba(253,211,77,0.3)' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: '#a7f3d0', display: 'block', marginBottom: 4 }}>Notes</label>
                        <input value={item.notes} onChange={e => setItem(idx, 'notes', e.target.value)} placeholder="Additional notes"
                          style={{ ...INP, padding: '7px 10px', fontSize: 12 }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6ee7b7', display: 'block', marginBottom: 5 }}>General Note</label>
                <textarea value={form.general_note} onChange={e => f('general_note', e.target.value)} rows={2} placeholder="General class announcement..."
                  style={{ ...INP, resize: 'vertical' }} />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#a7f3d0' }}>
                <input type="checkbox" checked={form.is_published} onChange={e => f('is_published', e.target.checked)} style={{ width: 15, height: 15 }} />
                Publish to students & parents now
              </label>

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setShowModal(false)}
                  style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid rgba(110,231,183,0.3)', background: 'transparent', color: '#6ee7b7', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                <button type="submit" disabled={saving}
                  style={{ flex: 2, padding: '9px', borderRadius: 8, border: 'none', background: '#6ee7b7', color: '#064e3b', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, opacity: saving ? 0.7 : 1 }}>
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
