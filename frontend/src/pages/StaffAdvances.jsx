import { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { PiggyBank, Plus, Check, X, Trash2, Clock } from 'lucide-react';

const STATUS_COLORS = {
  pending:   'bg-amber-100 text-amber-700',
  approved:  'bg-green-100 text-green-700',
  rejected:  'bg-red-100 text-red-700',
  recovered: 'bg-slate-100 text-slate-500',
};

export default function StaffAdvances() {
  const [advances, setAdvances] = useState([]);
  const [staff, setStaff]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [reviewId, setReviewId] = useState(null);
  const [rejReason, setRejReason] = useState('');
  const [filter, setFilter]     = useState('');
  const [form, setForm]         = useState({ staff_id: '', amount: '', reason: '', recovery_months: 1 });

  const load = async () => {
    try {
      const [adv, st] = await Promise.all([api.get('/staff-advances'), api.get('/staff')]);
      setAdvances(adv.data);
      setStaff(st.data || []);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/staff-advances/apply', form);
      setAdvances(prev => [data, ...prev]);
      setShowForm(false);
      setForm({ staff_id: '', amount: '', reason: '', recovery_months: 1 });
      toast.success('Advance request created');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleReview = async (id, status) => {
    try {
      const { data } = await api.put(`/staff-advances/${id}/review`, { status, notes: rejReason });
      setAdvances(prev => prev.map(a => a._id === id ? data : a));
      setReviewId(null); setRejReason('');
      toast.success(`Advance ${status}`);
    } catch { toast.error('Failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this advance record?')) return;
    try {
      await api.delete(`/staff-advances/${id}`);
      setAdvances(prev => prev.filter(a => a._id !== id));
      toast.success('Deleted');
    } catch { toast.error('Failed'); }
  };

  const displayed = filter ? advances.filter(a => a.status === filter) : advances;
  const totalPending  = advances.filter(a => a.status === 'pending').length;
  const totalApproved = advances.filter(a => ['approved'].includes(a.status)).reduce((s, a) => s + a.amount - a.recovered_amount, 0);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><PiggyBank size={24} className="text-violet-600" /> Staff Advances</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage salary advance requests and recovery</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-violet-700">
          <Plus size={18} /> New Advance
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <p className="text-xs text-slate-500 font-semibold uppercase">Pending Requests</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{totalPending}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <p className="text-xs text-slate-500 font-semibold uppercase">Outstanding Balance</p>
          <p className="text-2xl font-bold text-violet-600 mt-1">Rs. {totalApproved.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <p className="text-xs text-slate-500 font-semibold uppercase">Total Records</p>
          <p className="text-2xl font-bold text-slate-700 mt-1">{advances.length}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {['', 'pending', 'approved', 'rejected', 'recovered'].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${filter === s ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-violet-50'}`}>
            {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
          </button>
        ))}
      </div>

      {/* Table */}
      {displayed.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <PiggyBank size={48} className="mx-auto mb-3 opacity-30" />
          <p>No advance records found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-100 text-xs text-slate-500 uppercase">
              <th className="text-left px-4 py-3 font-semibold">Staff</th>
              <th className="text-left px-4 py-3 font-semibold">Amount</th>
              <th className="text-left px-4 py-3 font-semibold">Recovered</th>
              <th className="text-left px-4 py-3 font-semibold">Months</th>
              <th className="text-left px-4 py-3 font-semibold">Reason</th>
              <th className="text-left px-4 py-3 font-semibold">Status</th>
              <th className="text-left px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3"></th>
            </tr></thead>
            <tbody>
              {displayed.map(a => (
                <tr key={a._id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-semibold text-slate-800">{a.staff_id?.name || '—'}<p className="text-xs text-slate-400 font-normal">{a.staff_id?.role}</p></td>
                  <td className="px-4 py-3 font-bold text-slate-700">Rs. {a.amount?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-600">Rs. {a.recovered_amount?.toLocaleString() || 0}</td>
                  <td className="px-4 py-3 text-slate-600">{a.recovery_months}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-[180px] truncate">{a.reason}</td>
                  <td className="px-4 py-3"><span className={`text-xs font-bold px-2 py-1 rounded-full ${STATUS_COLORS[a.status]}`}>{a.status}</span></td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{new Date(a.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {a.status === 'pending' && (<>
                        <button onClick={() => handleReview(a._id, 'approved')} className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100"><Check size={14}/></button>
                        <button onClick={() => setReviewId(a._id)} className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100"><X size={14}/></button>
                      </>)}
                      <button onClick={() => handleDelete(a._id)} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500"><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reject Modal */}
      {reviewId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4">
            <h3 className="font-bold text-slate-800">Reject Advance — Add Reason</h3>
            <textarea value={rejReason} onChange={e => setRejReason(e.target.value)} rows={3} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" placeholder="Reason for rejection..." />
            <div className="flex gap-3">
              <button onClick={() => { setReviewId(null); setRejReason(''); }} className="flex-1 border border-slate-200 py-2 rounded-xl text-slate-600 font-semibold hover:bg-slate-50">Cancel</button>
              <button onClick={() => handleReview(reviewId, 'rejected')} className="flex-1 bg-red-600 text-white py-2 rounded-xl font-semibold hover:bg-red-700">Reject</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">New Advance Request</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-700"><X size={20}/></button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Staff Member *</label>
                <select value={form.staff_id} onChange={e => setForm(f => ({ ...f, staff_id: e.target.value }))} required className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                  <option value="">Select staff...</option>
                  {staff.map(s => <option key={s._id} value={s._id}>{s.name} ({s.role})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Amount (Rs.) *</label>
                  <input type="number" min="1" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Recovery Months</label>
                  <select value={form.recovery_months} onChange={e => setForm(f => ({ ...f, recovery_months: Number(e.target.value) }))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                    {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} month{n > 1 ? 's' : ''}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Reason *</label>
                <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} required rows={3} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="Reason for advance..." />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-slate-200 py-2 rounded-xl text-slate-600 font-semibold hover:bg-slate-50">Cancel</button>
                <button type="submit" className="flex-1 bg-violet-600 text-white py-2 rounded-xl font-semibold hover:bg-violet-700">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
