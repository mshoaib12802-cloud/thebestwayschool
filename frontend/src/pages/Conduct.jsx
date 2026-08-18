import { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import {
  ShieldCheck, Plus, Trash2, X, Search, Filter,
  Award, AlertTriangle, ToggleLeft, ToggleRight
} from 'lucide-react';

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-purple-400 focus:bg-white transition-colors';
const labelCls = 'block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1';

const initForm = {
  student_id: '', type: 'positive', category: '', title: '', description: '',
  action_taken: '', points: 1, parent_notified: false, date: new Date().toISOString().split('T')[0],
};

const CATEGORIES = {
  positive: ['Academic Excellence', 'Good Behaviour', 'Sports Achievement', 'Leadership', 'Helping Others', 'Community Service', 'Other'],
  negative: ['Misconduct', 'Absenteeism', 'Bullying', 'Cheating', 'Damage to Property', 'Late Submission', 'Other'],
};

export default function Conduct() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [filterClass, setFilterClass] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [studentSearch, setStudentSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(initForm);
  const [saving, setSaving] = useState(false);
  const [studentQuery, setStudentQuery] = useState('');

  useEffect(() => { fetchRecords(); fetchClasses(); fetchStudents(); }, []);
  useEffect(() => { fetchRecords(); }, [filterClass, filterType]);
  useEffect(() => {
    document.body.style.overflow = showModal ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showModal]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterClass) params.class_id = filterClass;
      if (filterType !== 'all') params.type = filterType;
      const { data } = await api.get('/conduct', { params });
      setRecords(data);
    } catch { toast.error('Failed to load conduct records'); }
    finally { setLoading(false); }
  };
  const fetchClasses = async () => {
    try { const { data } = await api.get('/school-classes'); setClasses(data); } catch { /* optional */ }
  };
  const fetchStudents = async () => {
    try { const { data } = await api.get('/students'); setStudents(data); } catch { /* optional */ }
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/conduct', form);
      toast.success('Record added');
      setShowModal(false);
      fetchRecords();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const deleteRecord = async (id) => {
    if (!window.confirm('Delete this record?')) return;
    try { await api.delete(`/conduct/${id}`); toast.success('Deleted'); fetchRecords(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to delete'); }
  };

  const totalMerits = records.filter(r => r.type === 'positive').reduce((s, r) => s + (r.points || 0), 0);
  const totalDemerits = records.filter(r => r.type === 'negative').reduce((s, r) => s + (r.points || 0), 0);
  const netPoints = totalMerits - totalDemerits;

  const filteredStudents = students.filter(s => {
    if (!studentQuery) return true;
    const q = studentQuery.toLowerCase();
    return (s.full_name || s.name || '').toLowerCase().includes(q) || (s.roll_number || '').toLowerCase().includes(q);
  });

  const filteredRecords = records.filter(r => {
    if (!studentSearch) return true;
    const q = studentSearch.toLowerCase();
    return r.student_id?.full_name?.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-600 flex items-center justify-center shadow">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Student Conduct</h1>
            <p className="text-sm text-slate-500">Discipline and merit records</p>
          </div>
        </div>
        <button onClick={() => { setForm(initForm); setStudentQuery(''); setShowModal(true); }}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-purple-700 text-sm shadow">
          <Plus className="w-4 h-4" /> Add Record
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Merits', value: totalMerits, icon: Award, color: 'emerald', textColor: 'text-emerald-600' },
          { label: 'Total Demerits', value: totalDemerits, icon: AlertTriangle, color: 'red', textColor: 'text-red-500' },
          { label: 'Net Points', value: netPoints, icon: ShieldCheck, color: 'purple', textColor: netPoints >= 0 ? 'text-emerald-600' : 'text-red-500' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl bg-${stat.color}-100 flex items-center justify-center`}>
              <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{stat.label}</div>
              <div className={`text-2xl font-bold ${stat.textColor}`}>{stat.value > 0 ? '+' : ''}{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 flex-1 max-w-xs border border-slate-200">
          <Search className="w-4 h-4 text-slate-400" />
          <input value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Search by student…"
            className="bg-transparent outline-none text-sm text-slate-700 flex-1" />
        </div>
        <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 outline-none">
          <option value="">All Classes</option>
          {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <div className="flex gap-2">
          {['all', 'positive', 'negative'].map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${filterType === t ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="p-5 border-b border-slate-100">
          <div className="text-sm font-bold text-slate-700">{filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''}</div>
        </div>
        {loading ? (
          <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600" /></div>
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-16 text-slate-400">No conduct records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3">Student</th>
                <th className="text-left px-4 py-3">Class</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Category</th>
                <th className="text-left px-4 py-3">Title</th>
                <th className="text-center px-4 py-3">Points</th>
                <th className="text-left px-4 py-3">Action Taken</th>
                <th className="text-right px-4 py-3">Delete</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {filteredRecords.map(r => (
                  <tr key={r._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-800">{r.student_id?.full_name}</td>
                    <td className="px-4 py-3 text-slate-500">{r.student_id?.school_class_id?.name || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{r.date ? new Date(r.date).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3">
                      {r.type === 'positive'
                        ? <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full"><Award className="w-3 h-3" /> Merit</span>
                        : <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full"><AlertTriangle className="w-3 h-3" /> Demerit</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{r.category || '—'}</td>
                    <td className="px-4 py-3 font-medium text-slate-700">{r.title}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-bold text-sm ${r.type === 'positive' ? 'text-emerald-600' : 'text-red-500'}`}>
                        {r.type === 'positive' ? '+' : '-'}{r.points}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 max-w-[160px] truncate">{r.action_taken || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => deleteRecord(r._id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><Trash2 className="w-4 h-4" /></button>
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Add Conduct Record</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <form onSubmit={save} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Student search */}
                <div>
                  <label className={labelCls}>Search Student</label>
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 mb-2">
                    <Search className="w-4 h-4 text-slate-400" />
                    <input value={studentQuery} onChange={e => setStudentQuery(e.target.value)} placeholder="Type name or roll number…"
                      className="bg-transparent outline-none text-sm text-slate-700 flex-1" />
                  </div>
                  <select required value={form.student_id} onChange={e => setForm(p => ({ ...p, student_id: e.target.value }))} className={inputCls} size={4}>
                    <option value="">-- Select Student --</option>
                    {filteredStudents.map(s => (
                      <option key={s._id} value={s._id}>{s.full_name || s.name} {s.roll_number ? `(${s.roll_number})` : ''}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Type</label>
                    <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value, category: '' }))} className={inputCls}>
                      <option value="positive">Positive (Merit)</option>
                      <option value="negative">Negative (Demerit)</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Date</label>
                    <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className={inputCls} />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Category</label>
                  <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className={inputCls}>
                    <option value="">Select Category</option>
                    {(CATEGORIES[form.type] || []).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Title *</label>
                  <input required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className={inputCls} placeholder="Brief title" />
                </div>

                <div>
                  <label className={labelCls}>Description</label>
                  <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} className={inputCls} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Action Taken</label>
                    <input value={form.action_taken} onChange={e => setForm(p => ({ ...p, action_taken: e.target.value }))} className={inputCls} placeholder="e.g. Counselled" />
                  </div>
                  <div>
                    <label className={labelCls}>Points</label>
                    <input type="number" min="1" value={form.points} onChange={e => setForm(p => ({ ...p, points: parseInt(e.target.value) || 1 }))} className={inputCls} />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={form.parent_notified} onChange={e => setForm(p => ({ ...p, parent_notified: e.target.checked }))} className="rounded" />
                  Parent Notified
                </label>
              </div>
              <div className="p-5 border-t border-slate-100 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-purple-700 text-sm disabled:opacity-60">
                  {saving ? 'Saving…' : 'Add Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
