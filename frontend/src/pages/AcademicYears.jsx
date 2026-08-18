import { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { CalendarRange, Plus, Edit2, Trash2, X, CheckCircle2, Clock } from 'lucide-react';

const emptyForm = {
  label: '', start_date: '', end_date: '',
  terms: [
    { name: 'Term 1', start_date: '', end_date: '' },
    { name: 'Term 2', start_date: '', end_date: '' },
    { name: 'Annual', start_date: '', end_date: '' },
  ],
};

export default function AcademicYears() {
  const [years, setYears]       = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState(emptyForm);
  const [loading, setLoading]   = useState(true);

  const load = async () => {
    try {
      const { data } = await api.get('/academic-years');
      setYears(data);
    } catch { toast.error('Failed to load academic years'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openEdit = (y) => {
    setForm({
      label: y.label,
      start_date: y.start_date?.slice(0, 10) || '',
      end_date: y.end_date?.slice(0, 10) || '',
      terms: y.terms?.length ? y.terms.map(t => ({
        name: t.name,
        start_date: t.start_date?.slice(0, 10) || '',
        end_date: t.end_date?.slice(0, 10) || '',
      })) : emptyForm.terms,
    });
    setEditing(y._id);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        const { data } = await api.put(`/academic-years/${editing}`, form);
        setYears(prev => prev.map(y => y._id === editing ? data : y));
        toast.success('Academic year updated');
      } else {
        const { data } = await api.post('/academic-years', form);
        setYears(prev => [data, ...prev]);
        toast.success('Academic year added');
      }
      setShowForm(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this academic year?')) return;
    try {
      await api.delete(`/academic-years/${id}`);
      setYears(prev => prev.filter(y => y._id !== id));
      toast.success('Deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const setCurrent = async (id) => {
    try {
      const { data } = await api.put(`/academic-years/${id}/set-current`);
      setYears(prev => prev.map(y => ({ ...y, is_current: y._id === id })));
      toast.success(`${data.label} is now the current year`);
    } catch { toast.error('Failed to update'); }
  };

  const updateTerm = (idx, field, value) => {
    setForm(f => {
      const terms = [...f.terms];
      terms[idx] = { ...terms[idx], [field]: value };
      return { ...f, terms };
    });
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><CalendarRange size={24} className="text-violet-600" /> Academic Years</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage school years and terms</p>
        </div>
        <button onClick={() => { setForm(emptyForm); setEditing(null); setShowForm(true); }} className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-violet-700 transition-colors">
          <Plus size={18} /> Add Year
        </button>
      </div>

      {years.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <CalendarRange size={48} className="mx-auto mb-3 opacity-30" />
          <p>No academic years yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {years.map(y => (
            <div key={y._id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${y.is_current ? 'border-violet-300' : 'border-slate-100'}`}>
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${y.is_current ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500'}`}>
                    <CalendarRange size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-800">{y.label}</p>
                      {y.is_current && <span className="text-xs bg-violet-100 text-violet-700 font-bold px-2 py-0.5 rounded-full">Current</span>}
                    </div>
                    <p className="text-sm text-slate-500">
                      {y.start_date ? new Date(y.start_date).toLocaleDateString() : '—'} → {y.end_date ? new Date(y.end_date).toLocaleDateString() : '—'}
                    </p>
                    {y.terms?.length > 0 && (
                      <div className="flex gap-2 mt-1">
                        {y.terms.map(t => (
                          <span key={t.name} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{t.name}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!y.is_current && (
                    <button onClick={() => setCurrent(y._id)} className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 border border-violet-200 rounded-lg px-3 py-1.5 hover:bg-violet-50">
                      <CheckCircle2 size={14} /> Set Current
                    </button>
                  )}
                  <button onClick={() => openEdit(y)} className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg"><Edit2 size={16} /></button>
                  {!y.is_current && <button onClick={() => handleDelete(y._id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h2 className="font-bold text-slate-800">{editing ? 'Edit Academic Year' : 'Add Academic Year'}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Year Label *</label>
                <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} required placeholder="e.g. 2025-26" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Start Date *</label>
                  <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">End Date *</label>
                  <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1"><Clock size={13} /> Terms</p>
                <div className="space-y-3">
                  {form.terms.map((term, idx) => (
                    <div key={idx} className="bg-slate-50 rounded-xl p-3 space-y-2">
                      <input value={term.name} onChange={e => updateTerm(idx, 'name', e.target.value)} placeholder="Term name" className="w-full border border-slate-200 bg-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                      <div className="grid grid-cols-2 gap-2">
                        <input type="date" value={term.start_date} onChange={e => updateTerm(idx, 'start_date', e.target.value)} className="border border-slate-200 bg-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                        <input type="date" value={term.end_date} onChange={e => updateTerm(idx, 'end_date', e.target.value)} className="border border-slate-200 bg-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-xl font-semibold hover:bg-slate-50">Cancel</button>
                <button type="submit" className="flex-1 bg-violet-600 text-white py-2 rounded-xl font-semibold hover:bg-violet-700">{editing ? 'Update' : 'Add Year'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
