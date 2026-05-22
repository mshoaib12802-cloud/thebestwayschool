import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Clock, Zap, Shield } from 'lucide-react';
import api from '../../services/api';

const STATUS_META = {
  pending: { label: 'Unpaid',  cls: 'bg-yellow-100 text-yellow-700 border-yellow-200', dot: 'bg-yellow-400' },
  paid:    { label: 'Paid',    cls: 'bg-green-100 text-green-700 border-green-200',    dot: 'bg-green-500' },
  waived:  { label: 'Waived',  cls: 'bg-slate-100 text-slate-500 border-slate-200',    dot: 'bg-slate-400' },
};

export default function StudentFines() {
  const [data, setData] = useState(null);
  const [statusTab, setStatusTab] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/student-portal/fines')
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );
  if (!data) return <div className="text-center py-16 text-red-400">Failed to load fines.</div>;

  const { fines, summary } = data;

  const counts = {
    all:     fines.length,
    pending: fines.filter(f => f.status === 'pending').length,
    paid:    fines.filter(f => f.status === 'paid').length,
    waived:  fines.filter(f => f.status === 'waived').length,
  };

  const filtered = statusTab === 'all' ? fines : fines.filter(f => f.status === statusTab);
  const isAuto = (f) => (f.notes || '').toLowerCase().includes('auto-generated');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">My Fines</h1>
        <p className="text-slate-500 text-sm mt-1">All fines issued to your account</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-yellow-200 shadow-sm text-center">
          <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center mx-auto mb-2">
            <Clock size={20} className="text-yellow-600"/>
          </div>
          <p className="text-2xl font-extrabold text-yellow-600">Rs. {(summary.pending || 0).toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1 font-medium">Unpaid · {counts.pending} fine{counts.pending !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-green-200 shadow-sm text-center">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center mx-auto mb-2">
            <CheckCircle size={20} className="text-green-600"/>
          </div>
          <p className="text-2xl font-extrabold text-green-600">Rs. {(summary.paid || 0).toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1 font-medium">Paid · {counts.paid} fine{counts.paid !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm text-center">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-2">
            <Shield size={20} className="text-slate-500"/>
          </div>
          <p className="text-2xl font-extrabold text-slate-700">{counts.waived}</p>
          <p className="text-xs text-slate-500 mt-1 font-medium">Waived</p>
        </div>
      </div>

      {/* Pending Alert */}
      {summary.pending > 0 && (
        <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-2xl px-5 py-4">
          <AlertTriangle size={20} className="text-yellow-500 shrink-0 mt-0.5"/>
          <div>
            <p className="text-sm font-bold text-yellow-900">Outstanding Balance</p>
            <p className="text-xs text-yellow-700 mt-0.5">
              You have <strong>Rs. {summary.pending.toLocaleString()}</strong> in unpaid fines.
              Please visit the admin office to clear your dues.
            </p>
          </div>
        </div>
      )}

      {/* Fines List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

        {/* Status Tabs */}
        <div className="flex gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50">
          {[
            { key: 'all',     label: 'All' },
            { key: 'pending', label: 'Unpaid' },
            { key: 'paid',    label: 'Paid' },
            { key: 'waived',  label: 'Waived' },
          ].map(s => (
            <button key={s.key} onClick={() => setStatusTab(s.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusTab === s.key ? 'bg-white shadow border border-slate-200 text-slate-800' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {s.label}
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-100 text-slate-500">
                {counts[s.key]}
              </span>
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-14 text-slate-400">
            <CheckCircle size={40} className="mx-auto mb-3 text-green-200"/>
            {statusTab === 'pending' ? 'No unpaid fines! All clear.' : 'No fines in this category.'}
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.map(f => {
              const meta = STATUS_META[f.status] || STATUS_META.pending;
              return (
                <div key={f._id} className={`flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors ${f.status === 'paid' ? 'opacity-80' : ''}`}>
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    f.status === 'pending' ? 'bg-yellow-100' : f.status === 'paid' ? 'bg-green-100' : 'bg-slate-100'
                  }`}>
                    {f.status === 'paid' ? (
                      <CheckCircle size={18} className="text-green-600"/>
                    ) : f.status === 'waived' ? (
                      <Shield size={18} className="text-slate-400"/>
                    ) : (
                      <AlertTriangle size={18} className="text-yellow-600"/>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-800 text-sm capitalize">
                        {f.category.replace(/_/g, ' ')}
                      </span>
                      {isAuto(f) && (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-extrabold rounded uppercase tracking-wide border border-indigo-100">
                          <Zap size={9}/> Auto
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{f.reason}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Issued: {new Date(f.issued_date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {f.status === 'paid' && f.paid_date && ` · Paid: ${new Date(f.paid_date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                    </p>
                  </div>

                  {/* Amount + Status */}
                  <div className="text-right shrink-0">
                    <p className={`text-base font-extrabold ${f.status === 'pending' ? 'text-red-600' : 'text-slate-700'}`}>
                      Rs. {f.amount.toLocaleString()}
                    </p>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border mt-1 ${meta.cls}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`}/>
                      {meta.label}
                    </span>
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
