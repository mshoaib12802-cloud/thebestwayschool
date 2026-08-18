import { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { Clock, Plus, Edit2, Trash2, X, Coffee, ArrowUp, ArrowDown, GripVertical } from 'lucide-react';

const emptyForm = { name: '', start_time: '08:00', end_time: '08:45', is_break: false };

const fmt12 = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

export default function SchoolPeriods() {
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    try {
      const { data } = await api.get('/periods');
      setPeriods(data);
    } catch { toast.error('Failed to load periods'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        const { data } = await api.put(`/periods/${editing}`, form);
        setPeriods(prev => prev.map(p => p._id === editing ? data : p));
        toast.success('Period updated');
      } else {
        const { data } = await api.post('/periods', { ...form, order: periods.length + 1 });
        setPeriods(prev => [...prev, data]);
        toast.success('Period added');
      }
      setShowForm(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this period? This will also remove all timetable entries using it.')) return;
    try {
      await api.delete(`/periods/${id}`);
      setPeriods(prev => prev.filter(p => p._id !== id));
      toast.success('Deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const move = async (idx, dir) => {
    const newList = [...periods];
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= newList.length) return;
    [newList[idx], newList[swapIdx]] = [newList[swapIdx], newList[idx]];
    setPeriods(newList);
    try {
      await api.put('/periods/reorder', { ordered_ids: newList.map(p => p._id) });
    } catch { toast.error('Reorder failed'); load(); }
  };

  const openEdit = (p) => {
    setForm({ name: p.name, start_time: p.start_time, end_time: p.end_time, is_break: p.is_break });
    setEditing(p._id);
    setShowForm(true);
  };

  const openAdd = () => { setForm(emptyForm); setEditing(null); setShowForm(true); };

  const calcDuration = (s, e) => {
    if (!s || !e) return '';
    const [sh, sm] = s.split(':').map(Number);
    const [eh, em] = e.split(':').map(Number);
    const mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins <= 0) return '';
    return `${mins} min`;
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Clock size={24} className="text-sky-600" /> School Periods</h1>
          <p className="text-slate-500 text-sm mt-0.5">Define the daily schedule of periods and breaks. Order matters — it controls the timetable grid.</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-sky-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-sky-700 transition-colors">
          <Plus size={18} /> Add Period
        </button>
      </div>

      {periods.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Clock size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No periods defined yet.</p>
          <p className="text-sm mt-1">Add your school's daily periods (e.g. Period 1, Break, Period 2, Lunch…)</p>
        </div>
      ) : (
        <div className="space-y-2">
          {periods.map((p, idx) => (
            <div key={p._id} className={`flex items-center gap-4 px-5 py-4 rounded-2xl border shadow-sm transition-all ${p.is_break ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-100'}`}>
              {/* Reorder */}
              <div className="flex flex-col gap-0.5">
                <button onClick={() => move(idx, -1)} disabled={idx === 0} className="p-0.5 text-slate-300 hover:text-sky-600 disabled:opacity-30"><ArrowUp size={14} /></button>
                <button onClick={() => move(idx, 1)} disabled={idx === periods.length - 1} className="p-0.5 text-slate-300 hover:text-sky-600 disabled:opacity-30"><ArrowDown size={14} /></button>
              </div>

              {/* Order badge */}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${p.is_break ? 'bg-slate-200 text-slate-500' : 'bg-sky-100 text-sky-700'}`}>
                {p.is_break ? <Coffee size={14} /> : idx + 1}
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-800">{p.name}</p>
                  {p.is_break && <span className="text-xs bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">Break</span>}
                </div>
                <p className="text-sm text-slate-500">{fmt12(p.start_time)} — {fmt12(p.end_time)} <span className="text-slate-300">·</span> {calcDuration(p.start_time, p.end_time)}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button onClick={() => openEdit(p)} className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg"><Edit2 size={15} /></button>
                <button onClick={() => handleDelete(p._id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}

          {/* Summary */}
          <div className="mt-4 bg-sky-50 border border-sky-100 rounded-2xl px-5 py-3 flex items-center gap-4 text-sm">
            <Clock size={16} className="text-sky-600 flex-shrink-0" />
            <span className="text-sky-800 font-medium">
              {periods.filter(p => !p.is_break).length} teaching period{periods.filter(p => !p.is_break).length !== 1 ? 's' : ''} &nbsp;·&nbsp;
              {periods.filter(p => p.is_break).length} break{periods.filter(p => p.is_break).length !== 1 ? 's' : ''} &nbsp;·&nbsp;
              Day starts {fmt12(periods[0]?.start_time)} — ends {fmt12(periods[periods.length - 1]?.end_time)}
            </span>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">{editing ? 'Edit Period' : 'Add Period'}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. Period 1, Assembly, Lunch" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Start Time *</label>
                  <input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">End Time *</label>
                  <input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
              </div>
              {form.start_time && form.end_time && (
                <p className="text-xs text-slate-400">Duration: {calcDuration(form.start_time, form.end_time)}</p>
              )}
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.is_break} onChange={e => setForm(f => ({ ...f, is_break: e.target.checked }))} className="w-4 h-4 rounded accent-sky-600" />
                <span className="text-sm font-semibold text-slate-700">This is a break / recess / lunch</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-xl font-semibold hover:bg-slate-50">Cancel</button>
                <button type="submit" className="flex-1 bg-sky-600 text-white py-2 rounded-xl font-semibold hover:bg-sky-700">{editing ? 'Update' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
