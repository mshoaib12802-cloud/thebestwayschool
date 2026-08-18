import { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import {
  CalendarX, CheckCircle2, XCircle, Trash2, X, RefreshCw,
  User, Clock, Filter, Search, ChevronDown
} from 'lucide-react';

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-rose-400 focus:bg-white transition-colors';
const labelCls = 'block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1';

const STATUS_META = {
  pending:  { label: 'Pending',  cls: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Approved', cls: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'Rejected', cls: 'bg-red-100 text-red-700' },
};

export default function LeaveManagement() {
  const [activeTab, setActiveTab] = useState('pending');
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [search, setSearch] = useState('');

  const [rejectModal, setRejectModal] = useState(false);
  const [rejectLeave, setRejectLeave] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(null);

  useEffect(() => { fetchLeaves(); }, [activeTab, filterType]);
  useEffect(() => {
    document.body.style.overflow = rejectModal ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [rejectModal]);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const params = {};
      if (activeTab === 'pending') params.status = 'pending';
      if (filterType !== 'all') params.applicant_type = filterType;
      const { data } = await api.get('/leaves', { params });
      setLeaves(data);
    } catch { toast.error('Failed to load leaves'); }
    finally { setLoading(false); }
  };

  const approve = async (leave) => {
    setProcessing(leave._id + '_approve');
    try {
      await api.put(`/leaves/${leave._id}`, { status: 'approved' });
      toast.success('Leave approved');
      fetchLeaves();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to approve'); }
    finally { setProcessing(null); }
  };

  const openReject = (leave) => { setRejectLeave(leave); setRejectReason(''); setRejectModal(true); };

  const confirmReject = async (e) => {
    e.preventDefault();
    setProcessing(rejectLeave._id + '_reject');
    try {
      await api.put(`/leaves/${rejectLeave._id}`, { status: 'rejected', rejection_reason: rejectReason });
      toast.success('Leave rejected');
      setRejectModal(false);
      fetchLeaves();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to reject'); }
    finally { setProcessing(null); }
  };

  const deleteLeave = async (id) => {
    if (!window.confirm('Delete this leave record?')) return;
    try {
      await api.delete(`/leaves/${id}`);
      toast.success('Deleted');
      fetchLeaves();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to delete'); }
  };

  const daysBetween = (from, to) => {
    const d1 = new Date(from), d2 = new Date(to);
    return Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);
  };

  const filtered = leaves.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return l.applicant_name?.toLowerCase().includes(q) || l.leave_type?.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-rose-600 flex items-center justify-center shadow">
          <CalendarX className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Leave Management</h1>
          <p className="text-sm text-slate-500">Approve or reject staff and student leaves</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-2xl p-1 border border-slate-100 shadow-sm mb-6 w-fit">
        {[{ id: 'pending', label: 'Pending' }, { id: 'all', label: 'All Leaves' }].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === t.id ? 'bg-rose-600 text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 flex-1 max-w-xs border border-slate-200">
          <Search className="w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or leave type…"
            className="bg-transparent outline-none text-sm text-slate-700 flex-1" />
        </div>
        <div className="flex gap-2">
          {['all', 'staff', 'student'].map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${filterType === t ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
              {t}
            </button>
          ))}
        </div>
        <button onClick={fetchLeaves} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 text-xs font-bold">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="text-sm font-bold text-slate-700">{filtered.length} leave{filtered.length !== 1 ? 's' : ''}</div>
        </div>
        {loading ? (
          <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-600" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">No leaves found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3">Applicant</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Leave Type</th>
                <th className="text-left px-4 py-3">From</th>
                <th className="text-left px-4 py-3">To</th>
                <th className="text-center px-4 py-3">Days</th>
                <th className="text-left px-4 py-3">Reason</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(l => {
                  const meta = STATUS_META[l.status] || STATUS_META.pending;
                  return (
                    <tr key={l._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{l.applicant_name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${l.applicant_type === 'staff' ? 'bg-indigo-100 text-indigo-700' : 'bg-sky-100 text-sky-700'}`}>
                          {l.applicant_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{l.leave_type}</td>
                      <td className="px-4 py-3 text-slate-500">{l.from_date ? new Date(l.from_date).toLocaleDateString() : '—'}</td>
                      <td className="px-4 py-3 text-slate-500">{l.to_date ? new Date(l.to_date).toLocaleDateString() : '—'}</td>
                      <td className="px-4 py-3 text-center font-bold text-slate-700">
                        {l.from_date && l.to_date ? daysBetween(l.from_date, l.to_date) : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate">{l.reason || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${meta.cls}`}>{meta.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          {l.status === 'pending' && (
                            <>
                              <button onClick={() => approve(l)} disabled={!!processing}
                                className="flex items-center gap-1 bg-emerald-600 text-white px-2.5 py-1.5 rounded-xl text-xs font-semibold hover:bg-emerald-700 disabled:opacity-60">
                                <CheckCircle2 className="w-3 h-3" /> Approve
                              </button>
                              <button onClick={() => openReject(l)} disabled={!!processing}
                                className="flex items-center gap-1 bg-red-500 text-white px-2.5 py-1.5 rounded-xl text-xs font-semibold hover:bg-red-600 disabled:opacity-60">
                                <XCircle className="w-3 h-3" /> Reject
                              </button>
                            </>
                          )}
                          <button onClick={() => deleteLeave(l._id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModal && rejectLeave && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Reject Leave</h2>
              <button onClick={() => setRejectModal(false)} className="p-1.5 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <form onSubmit={confirmReject} className="p-5 space-y-4">
              <div className="bg-red-50 rounded-xl p-3 text-sm text-slate-600">
                Rejecting leave for <strong>{rejectLeave.applicant_name}</strong>
              </div>
              <div>
                <label className={labelCls}>Rejection Reason *</label>
                <textarea required value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
                  className={inputCls} placeholder="Provide reason for rejection…" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setRejectModal(false)} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 text-sm">Cancel</button>
                <button type="submit" disabled={!!processing} className="flex-1 bg-red-500 text-white px-4 py-2 rounded-xl font-semibold hover:bg-red-600 text-sm disabled:opacity-60">
                  {processing ? 'Rejecting…' : 'Confirm Reject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
