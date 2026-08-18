import { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { CalendarOff, Plus, X, Users } from 'lucide-react';

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const LEAVE_TYPES = ['casual', 'sick', 'annual', 'emergency', 'other'];

const STATUS_STYLES = {
  pending:  { bg: 'bg-amber-100',  text: 'text-amber-700',  label: 'Pending'  },
  approved: { bg: 'bg-green-100',  text: 'text-green-700',  label: 'Approved' },
  rejected: { bg: 'bg-red-100',    text: 'text-red-700',    label: 'Rejected' },
};

const calcDays = (from, to) => {
  if (!from || !to) return 0;
  const d = Math.ceil((new Date(to) - new Date(from)) / (1000 * 60 * 60 * 24)) + 1;
  return d > 0 ? d : 0;
};

export default function ParentLeave() {
  const [children, setChildren]   = useState([]);
  const [selected, setSelected]   = useState('');
  const [leaves, setLeaves]       = useState([]);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [loadingLeaves, setLoadingLeaves]     = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ leave_type: 'casual', from_date: '', to_date: '', reason: '' });

  useEffect(() => {
    api.get('/parent-portal/children')
      .then(r => { setChildren(r.data); if (r.data.length) setSelected(r.data[0]._id); })
      .catch(() => toast.error('Failed to load children'))
      .finally(() => setLoadingChildren(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoadingLeaves(true);
    api.get(`/parent-portal/children/${selected}/leaves`)
      .then(r => setLeaves(r.data))
      .catch(() => toast.error('Failed to load leave records'))
      .finally(() => setLoadingLeaves(false));
  }, [selected]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post(`/parent-portal/children/${selected}/leaves`, {
        ...form,
        total_days: calcDays(form.from_date, form.to_date),
      });
      toast.success('Leave application submitted');
      setShowForm(false);
      setForm({ leave_type: 'casual', from_date: '', to_date: '', reason: '' });
      // Reload
      const r = await api.get(`/parent-portal/children/${selected}/leaves`);
      setLeaves(r.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit leave');
    } finally {
      setSubmitting(false);
    }
  };

  const totalDays = calcDays(form.from_date, form.to_date);

  if (loadingChildren) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-600" />
    </div>
  );

  if (!children.length) return (
    <div className="text-center py-16 text-slate-400">
      <Users size={48} className="mx-auto mb-3 opacity-30" />
      <p>No children linked to your account.</p>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
            <CalendarOff size={20} className="text-rose-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Leave Requests</h1>
            <p className="text-slate-500 text-sm">Apply and track your child's leave</p>
          </div>
        </div>
        {selected && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-rose-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-rose-700 transition shadow-sm">
            <Plus size={16} /> Apply Leave
          </button>
        )}
      </div>

      {/* Child selector */}
      {children.length > 1 && (
        <div className="flex gap-3 mb-6 flex-wrap">
          {children.map(c => (
            <button key={c._id} onClick={() => setSelected(c._id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm border transition-all ${selected === c._id ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-rose-50'}`}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Apply Leave Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Apply for Leave</h3>
                <p className="text-xs text-slate-500 mt-0.5">{children.find(c => c._id === selected)?.name}</p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-slate-100 rounded-lg transition">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">Leave Type *</label>
                <select required value={form.leave_type} onChange={e => setForm(p => ({ ...p, leave_type: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white">
                  {LEAVE_TYPES.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">From Date *</label>
                  <input required type="date" value={form.from_date} onChange={e => setForm(p => ({ ...p, from_date: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">To Date *</label>
                  <input required type="date" min={form.from_date} value={form.to_date} onChange={e => setForm(p => ({ ...p, to_date: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" />
                </div>
              </div>
              {totalDays > 0 && (
                <div className="bg-rose-50 border border-rose-100 rounded-xl px-4 py-2 text-sm text-rose-700 font-semibold">
                  Total: {totalDays} day{totalDays > 1 ? 's' : ''}
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">Reason *</label>
                <textarea required value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} rows={3}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none" placeholder="Reason for leave..." />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition disabled:opacity-60">
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leave history */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-700">Leave History</h2>
        </div>
        {loadingLeaves ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-600" />
          </div>
        ) : leaves.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <CalendarOff size={40} className="mx-auto mb-3 opacity-30" />
            <p>No leave applications submitted yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {leaves.map(l => {
              const st = STATUS_STYLES[l.status] || STATUS_STYLES.pending;
              const days = l.total_days || calcDays(l.from_date, l.to_date);
              return (
                <div key={l._id} className="px-5 py-4 hover:bg-slate-50 transition">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-bold text-slate-800 capitalize">{l.leave_type} Leave</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${st.bg} ${st.text}`}>{st.label}</span>
                      </div>
                      <p className="text-sm text-slate-600">
                        {fmt(l.from_date)} — {fmt(l.to_date)}
                        <span className="ml-2 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{days} day{days !== 1 ? 's' : ''}</span>
                      </p>
                      {l.reason && <p className="text-sm text-slate-500 mt-1">{l.reason}</p>}
                      {l.status === 'rejected' && l.rejection_reason && (
                        <p className="text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-lg mt-1">
                          Reason: {l.rejection_reason}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 shrink-0">{fmt(l.created_at || l.applied_at)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
