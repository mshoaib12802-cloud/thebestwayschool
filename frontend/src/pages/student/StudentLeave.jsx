import { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { CalendarOff, Info } from 'lucide-react';

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const calcDays = (from, to) => {
  if (!from || !to) return 0;
  const d = Math.ceil((new Date(to) - new Date(from)) / (1000 * 60 * 60 * 24)) + 1;
  return d > 0 ? d : 0;
};

const STATUS_STYLES = {
  pending:  { bg: 'bg-amber-100',  text: 'text-amber-700',  label: 'Pending' },
  approved: { bg: 'bg-green-100',  text: 'text-green-700',  label: 'Approved' },
  rejected: { bg: 'bg-red-100',    text: 'text-red-700',    label: 'Rejected' },
};

export default function StudentLeave() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/student-portal/leaves')
      .then(r => setLeaves(r.data))
      .catch(() => toast.error('Failed to load leave records'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
          <CalendarOff size={20} className="text-rose-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My Leave Records</h1>
          <p className="text-slate-500 text-sm">View your approved and pending leave applications</p>
        </div>
      </div>

      {/* Note banner */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6">
        <Info size={18} className="text-blue-500 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-700">
          <strong>Note:</strong> Leave requests must be submitted by your parent or guardian through the Parent Portal. You can track the status of your leave applications here.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-600" />
        </div>
      ) : leaves.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">
          <CalendarOff size={48} className="mx-auto mb-3 opacity-30" />
          <p>No leave records found</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-700">Leave History</h2>
          </div>
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
                        <span className="ml-2 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          {days} day{days !== 1 ? 's' : ''}
                        </span>
                      </p>
                      {l.reason && <p className="text-sm text-slate-500 mt-1">{l.reason}</p>}
                      {l.status === 'rejected' && l.rejection_reason && (
                        <p className="text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-lg mt-1">
                          Rejection reason: {l.rejection_reason}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 shrink-0">{fmt(l.created_at || l.applied_at)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
