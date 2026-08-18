import { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { School, Plus, Edit2, Trash2, X, Users, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';

const GRADE_OPTIONS = [
  { value: 0, label: 'KG / Kindergarten' },
  ...Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `Grade ${i + 1}` })),
];

const SECTIONS = ['A', 'B', 'C', 'D', 'E'];

const emptyForm = {
  name: '', section: 'A', grade_level: 1,
  class_teacher: '', academic_year: '', capacity: 40, room: '',
};

export default function SchoolClasses() {
  const [classes, setClasses]         = useState([]);
  const [years, setYears]             = useState([]);
  const [teachers, setTeachers]       = useState([]);
  const [showForm, setShowForm]       = useState(false);
  const [editing, setEditing]         = useState(null);
  const [form, setForm]               = useState(emptyForm);
  const [loading, setLoading]         = useState(true);
  const [expandedId, setExpandedId]   = useState(null);
  const [classStudents, setClassStudents] = useState({});
  const [filterYear, setFilterYear]   = useState('');

  const load = async () => {
    try {
      const params = filterYear ? `?academic_year=${filterYear}` : '';
      const [c, y, s] = await Promise.all([
        api.get(`/school-classes${params}`),
        api.get('/academic-years'),
        api.get('/staff'),
      ]);
      setClasses(c.data);
      setYears(y.data);
      setTeachers((s.data || []).filter(u => u.role === 'teacher'));
    } catch {
      toast.error('Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filterYear]);

  const openAdd = () => { setForm(emptyForm); setEditing(null); setShowForm(true); };
  const openEdit = (cls) => {
    setForm({
      name: cls.name,
      section: cls.section,
      grade_level: cls.grade_level,
      class_teacher: cls.class_teacher?._id || '',
      academic_year: cls.academic_year?._id || '',
      capacity: cls.capacity,
      room: cls.room || '',
    });
    setEditing(cls._id);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      if (!payload.class_teacher) delete payload.class_teacher;
      if (!payload.academic_year) delete payload.academic_year;
      if (editing) {
        const { data } = await api.put(`/school-classes/${editing}`, payload);
        setClasses(prev => prev.map(c => c._id === editing ? data : c));
        toast.success('Class updated');
      } else {
        const { data } = await api.post('/school-classes', payload);
        setClasses(prev => [...prev, data]);
        toast.success('Class added');
      }
      setShowForm(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this class?')) return;
    try {
      await api.delete(`/school-classes/${id}`);
      setClasses(prev => prev.filter(c => c._id !== id));
      toast.success('Class deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const toggleStudents = async (id) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (!classStudents[id]) {
      try {
        const { data } = await api.get(`/school-classes/${id}/students`);
        setClassStudents(prev => ({ ...prev, [id]: data }));
      } catch { toast.error('Failed to load students'); }
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><School size={24} className="text-blue-600" /> Classes & Sections</h1>
          <p className="text-slate-500 text-sm mt-0.5">{classes.length} class{classes.length !== 1 ? 'es' : ''} configured</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-blue-700 transition-colors">
          <Plus size={18} /> Add Class
        </button>
      </div>

      {/* Filter */}
      <div className="mb-4 flex items-center gap-3">
        <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Academic Years</option>
          {years.map(y => <option key={y._id} value={y._id}>{y.label}{y.is_current ? ' (Current)' : ''}</option>)}
        </select>
      </div>

      {/* Classes Grid */}
      {classes.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <School size={48} className="mx-auto mb-3 opacity-30" />
          <p>No classes yet. Add your first class to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {classes.map(cls => (
            <div key={cls._id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center font-bold text-blue-700 text-lg">
                    {cls.grade_level === 0 ? 'KG' : cls.grade_level}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{cls.name} — Section {cls.section}</p>
                    <p className="text-sm text-slate-500">
                      {cls.class_teacher ? `Teacher: ${cls.class_teacher.name}` : 'No class teacher'}
                      {cls.room ? ` · Room ${cls.room}` : ''}
                      {cls.academic_year ? ` · ${cls.academic_year.label}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleStudents(cls._id)} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50">
                    <Users size={14} /> Students {expandedId === cls._id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  <button onClick={() => openEdit(cls)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(cls._id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {expandedId === cls._id && (
                <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
                  {!classStudents[cls._id] ? (
                    <p className="text-sm text-slate-400">Loading...</p>
                  ) : classStudents[cls._id].length === 0 ? (
                    <p className="text-sm text-slate-400">No students enrolled in this class yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {classStudents[cls._id].map(st => (
                        <div key={st._id} className="bg-white rounded-lg px-3 py-2 border border-slate-100 text-sm">
                          <p className="font-medium text-slate-700">{st.full_name}</p>
                          <p className="text-slate-400 text-xs">{st.roll_number}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">{editing ? 'Edit Class' : 'Add Class'}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Grade Level</label>
                  <select value={form.grade_level} onChange={e => {
                    const gl = Number(e.target.value);
                    setForm(f => ({ ...f, grade_level: gl, name: gl === 0 ? 'KG' : `Grade ${gl}` }));
                  }} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {GRADE_OPTIONS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Section</label>
                  <select value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Class Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. Grade 5" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Room</label>
                  <input value={form.room} onChange={e => setForm(f => ({ ...f, room: e.target.value }))} placeholder="e.g. R-101" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Capacity</label>
                  <input type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: Number(e.target.value) }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Class Teacher</label>
                <select value={form.class_teacher} onChange={e => setForm(f => ({ ...f, class_teacher: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">— Select Teacher —</option>
                  {teachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Academic Year</label>
                <select value={form.academic_year} onChange={e => setForm(f => ({ ...f, academic_year: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">— Select Year —</option>
                  {years.map(y => <option key={y._id} value={y._id}>{y.label}{y.is_current ? ' (Current)' : ''}</option>)}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-xl font-semibold hover:bg-slate-50">Cancel</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-xl font-semibold hover:bg-blue-700">
                  {editing ? 'Update' : 'Add Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
