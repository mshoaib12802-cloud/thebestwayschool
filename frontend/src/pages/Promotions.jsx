import { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { ArrowUpCircle, Plus, X, CheckCircle2, RotateCcw, GraduationCap, Users } from 'lucide-react';

const STATUS_META = {
  promoted:  { label: 'Promoted',  color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 size={13} /> },
  repeated:  { label: 'Repeated',  color: 'bg-amber-100 text-amber-700',   icon: <RotateCcw size={13} /> },
  graduated: { label: 'Graduated', color: 'bg-blue-100 text-blue-700',     icon: <GraduationCap size={13} /> },
};

export default function Promotions() {
  const [promotions, setPromotions] = useState([]);
  const [classes, setClasses]       = useState([]);
  const [years, setYears]           = useState([]);
  const [students, setStudents]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [bulkMode, setBulkMode]     = useState(false);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [filterYear, setFilterYear] = useState('');
  const [form, setForm] = useState({ student_id: '', class_id: '', to_class_id: '', academic_year_id: '', status: 'promoted', remarks: '' });

  const load = async () => {
    try {
      const params = filterYear ? `?academic_year_id=${filterYear}` : '';
      const [p, c, y] = await Promise.all([
        api.get(`/promotions${params}`),
        api.get('/school-classes'),
        api.get('/academic-years'),
      ]);
      setPromotions(p.data);
      setClasses(c.data);
      setYears(y.data);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filterYear]);

  const loadClassStudents = async (classId) => {
    if (!classId) { setStudents([]); return; }
    try {
      const { data } = await api.get(`/school-classes/${classId}/students`);
      setStudents(data);
    } catch { toast.error('Failed to load students'); }
  };

  const handleSingle = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/promotions/student', form);
      setPromotions(prev => [data, ...prev]);
      toast.success('Student promoted successfully');
      setShowForm(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to promote'); }
  };

  const handleBulk = async () => {
    if (!selectedStudents.length) { toast.error('Select at least one student'); return; }
    if (!form.class_id || !form.to_class_id || !form.academic_year_id) { toast.error('Please fill all fields'); return; }
    try {
      const { data } = await api.post('/promotions/class-bulk', {
        class_id: form.class_id,
        to_class_id: form.to_class_id,
        academic_year_id: form.academic_year_id,
        student_ids: selectedStudents,
      });
      toast.success(`${data.promoted} students promoted`);
      setShowForm(false);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const toggleStudent = (id) => {
    setSelectedStudents(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><ArrowUpCircle size={24} className="text-amber-600" /> Student Promotions</h1>
          <p className="text-slate-500 text-sm mt-0.5">{promotions.length} promotion record{promotions.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { setShowForm(true); setBulkMode(false); setForm({ student_id: '', class_id: '', to_class_id: '', academic_year_id: '', status: 'promoted', remarks: '' }); setStudents([]); setSelectedStudents([]); }} className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-amber-700 transition-colors">
          <Plus size={18} /> Promote Student
        </button>
      </div>

      <div className="mb-4">
        <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
          <option value="">All Academic Years</option>
          {years.map(y => <option key={y._id} value={y._id}>{y.label}</option>)}
        </select>
      </div>

      {promotions.length === 0 ? (
        <div className="text-center py-16 text-slate-400"><ArrowUpCircle size={48} className="mx-auto mb-3 opacity-30" /><p>No promotion records yet.</p></div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Student</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">From</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">To</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Year</th>
                <th className="text-center px-5 py-3 font-semibold text-slate-600">Status</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {promotions.map(p => {
                const meta = STATUS_META[p.status] || STATUS_META.promoted;
                return (
                  <tr key={p._id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-800">{p.student_id?.full_name}<div className="text-xs text-slate-400">{p.student_id?.roll_number}</div></td>
                    <td className="px-5 py-3 text-slate-600">{p.from_class_id ? `${p.from_class_id.name} — ${p.from_class_id.section}` : '—'}</td>
                    <td className="px-5 py-3 text-slate-600">{p.to_class_id ? `${p.to_class_id.name} — ${p.to_class_id.section}` : '—'}</td>
                    <td className="px-5 py-3 text-slate-500">{p.academic_year_id?.label || '—'}</td>
                    <td className="px-5 py-3 text-center"><span className={`flex items-center justify-center gap-1 text-xs font-bold px-2 py-1 rounded-full w-fit mx-auto ${meta.color}`}>{meta.icon}{meta.label}</span></td>
                    <td className="px-5 py-3 text-slate-500">{p.promoted_by?.name || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h2 className="font-bold text-slate-800">Promote Student</h2>
              <div className="flex items-center gap-3">
                <button onClick={() => { setBulkMode(b => !b); setSelectedStudents([]); }} className={`flex items-center gap-1.5 text-xs font-semibold border rounded-lg px-3 py-1.5 transition-colors ${bulkMode ? 'bg-amber-100 text-amber-700 border-amber-300' : 'text-slate-500 border-slate-200 hover:bg-slate-50'}`}><Users size={13} />{bulkMode ? 'Bulk Mode ON' : 'Bulk Mode'}</button>
                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Academic Year (New) *</label>
                <select value={form.academic_year_id} onChange={e => setForm(f => ({ ...f, academic_year_id: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                  <option value="">Select year</option>
                  {years.map(y => <option key={y._id} value={y._id}>{y.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Current Class *</label>
                <select value={form.class_id} onChange={e => { setForm(f => ({ ...f, class_id: e.target.value })); loadClassStudents(e.target.value); setSelectedStudents([]); }} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                  <option value="">Select current class</option>
                  {classes.map(c => <option key={c._id} value={c._id}>{c.name} — {c.section}</option>)}
                </select>
              </div>

              {!bulkMode && students.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Student *</label>
                  <select value={form.student_id} onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                    <option value="">Select student</option>
                    {students.map(s => <option key={s._id} value={s._id}>{s.full_name} ({s.roll_number})</option>)}
                  </select>
                </div>
              )}

              {bulkMode && students.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-600 mb-2">Select Students ({selectedStudents.length} selected)</p>
                  <div className="border border-slate-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                    {students.map(s => (
                      <label key={s._id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50">
                        <input type="checkbox" checked={selectedStudents.includes(s._id)} onChange={() => toggleStudent(s._id)} className="rounded" />
                        <span className="text-sm">{s.full_name} <span className="text-slate-400">({s.roll_number})</span></span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Promote To Class</label>
                <select value={form.to_class_id} onChange={e => setForm(f => ({ ...f, to_class_id: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                  <option value="">Select next class</option>
                  {classes.filter(c => c._id !== form.class_id).map(c => <option key={c._id} value={c._id}>{c.name} — {c.section}</option>)}
                </select>
              </div>

              {!bulkMode && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                    <option value="promoted">Promoted</option>
                    <option value="repeated">Repeated (Same Class)</option>
                    <option value="graduated">Graduated</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Remarks</label>
                <input value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} placeholder="Optional" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-xl font-semibold hover:bg-slate-50">Cancel</button>
                <button onClick={bulkMode ? handleBulk : handleSingle} className="flex-1 bg-amber-600 text-white py-2 rounded-xl font-semibold hover:bg-amber-700">
                  {bulkMode ? `Promote ${selectedStudents.length} Students` : 'Promote'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
