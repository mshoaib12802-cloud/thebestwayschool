import { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { BookMarked, Plus, Edit2, Trash2, X, Filter } from 'lucide-react';

const emptyForm = {
  name: '', code: '', class_id: '', teacher_id: '',
  total_marks: 100, passing_marks: 40,
};

export default function Subjects() {
  const [subjects, setSubjects]   = useState([]);
  const [classes, setClasses]     = useState([]);
  const [teachers, setTeachers]   = useState([]);
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState(null);
  const [form, setForm]           = useState(emptyForm);
  const [loading, setLoading]     = useState(true);
  const [filterClass, setFilterClass] = useState('');

  const load = async () => {
    try {
      const params = filterClass ? `?class_id=${filterClass}` : '';
      const [s, c, st] = await Promise.all([
        api.get(`/subjects${params}`),
        api.get('/school-classes'),
        api.get('/staff'),
      ]);
      setSubjects(s.data);
      setClasses(c.data);
      setTeachers((st.data || []).filter(u => u.role === 'teacher'));
    } catch {
      toast.error('Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filterClass]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      if (!payload.teacher_id) delete payload.teacher_id;
      if (editing) {
        const { data } = await api.put(`/subjects/${editing}`, payload);
        setSubjects(prev => prev.map(s => s._id === editing ? data : s));
        toast.success('Subject updated');
      } else {
        const { data } = await api.post('/subjects', payload);
        setSubjects(prev => [...prev, data]);
        toast.success('Subject added');
      }
      setShowForm(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    }
  };

  const openEdit = (s) => {
    setForm({
      name: s.name, code: s.code || '',
      class_id: s.class_id?._id || '',
      teacher_id: s.teacher_id?._id || '',
      total_marks: s.total_marks,
      passing_marks: s.passing_marks,
    });
    setEditing(s._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this subject?')) return;
    try {
      await api.delete(`/subjects/${id}`);
      setSubjects(prev => prev.filter(s => s._id !== id));
      toast.success('Subject deleted');
    } catch { toast.error('Failed to delete'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><BookMarked size={24} className="text-emerald-600" /> Subjects</h1>
          <p className="text-slate-500 text-sm mt-0.5">{subjects.length} subject{subjects.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { setForm(emptyForm); setEditing(null); setShowForm(true); }} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-emerald-700 transition-colors">
          <Plus size={18} /> Add Subject
        </button>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <Filter size={16} className="text-slate-400" />
        <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="">All Classes</option>
          {classes.map(c => <option key={c._id} value={c._id}>{c.name} — {c.section}</option>)}
        </select>
      </div>

      {subjects.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <BookMarked size={48} className="mx-auto mb-3 opacity-30" />
          <p>No subjects found. Add subjects for each class.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Subject</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Code</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Class</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Teacher</th>
                <th className="text-center px-5 py-3 font-semibold text-slate-600">Marks</th>
                <th className="text-center px-5 py-3 font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {subjects.map(s => (
                <tr key={s._id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-slate-800">{s.name}</td>
                  <td className="px-5 py-3 text-slate-500">{s.code || '—'}</td>
                  <td className="px-5 py-3 text-slate-600">{s.class_id ? `${s.class_id.name} — ${s.class_id.section}` : '—'}</td>
                  <td className="px-5 py-3 text-slate-600">{s.teacher_id?.name || '—'}</td>
                  <td className="px-5 py-3 text-center text-slate-500">{s.passing_marks}/{s.total_marks}</td>
                  <td className="px-5 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openEdit(s)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"><Edit2 size={15} /></button>
                      <button onClick={() => handleDelete(s._id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">{editing ? 'Edit Subject' : 'Add Subject'}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Subject Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. Mathematics" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Code</label>
                  <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. MATH-5" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Class *</label>
                <select value={form.class_id} onChange={e => setForm(f => ({ ...f, class_id: e.target.value }))} required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="">— Select Class —</option>
                  {classes.map(c => <option key={c._id} value={c._id}>{c.name} — {c.section}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Subject Teacher</label>
                <select value={form.teacher_id} onChange={e => setForm(f => ({ ...f, teacher_id: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="">— Select Teacher —</option>
                  {teachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Total Marks</label>
                  <input type="number" value={form.total_marks} onChange={e => setForm(f => ({ ...f, total_marks: Number(e.target.value) }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Passing Marks</label>
                  <input type="number" value={form.passing_marks} onChange={e => setForm(f => ({ ...f, passing_marks: Number(e.target.value) }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-xl font-semibold hover:bg-slate-50">Cancel</button>
                <button type="submit" className="flex-1 bg-emerald-600 text-white py-2 rounded-xl font-semibold hover:bg-emerald-700">{editing ? 'Update' : 'Add Subject'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
