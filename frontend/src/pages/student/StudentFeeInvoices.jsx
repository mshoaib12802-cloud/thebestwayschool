import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Receipt, CheckCircle, Clock, AlertCircle } from 'lucide-react';

const STATUS = {
  paid:    { label: 'Paid',    cls: 'bg-green-100 text-green-700',  icon: <CheckCircle size={13}/> },
  partial: { label: 'Partial', cls: 'bg-amber-100 text-amber-700',  icon: <Clock size={13}/> },
  unpaid:  { label: 'Unpaid',  cls: 'bg-red-100 text-red-700',      icon: <AlertCircle size={13}/> },
};

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export default function StudentFeeInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.get('/student-portal/fee-invoices')
      .then(r => setInvoices(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalDue  = invoices.reduce((s, i) => s + (i.balance || 0), 0);
  const totalPaid = invoices.reduce((s, i) => s + (i.paid_amount || 0), 0);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2 mb-6"><Receipt size={24} className="text-sky-600" /> Fee Invoices</h1>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm text-center">
          <p className="text-xs text-slate-500 font-semibold uppercase">Total Invoices</p>
          <p className="text-2xl font-bold text-slate-700 mt-1">{invoices.length}</p>
        </div>
        <div className="bg-green-50 rounded-2xl p-4 border border-green-100 shadow-sm text-center">
          <p className="text-xs text-green-700 font-semibold uppercase">Total Paid</p>
          <p className="text-2xl font-bold text-green-700 mt-1">Rs. {totalPaid.toLocaleString()}</p>
        </div>
        <div className="bg-red-50 rounded-2xl p-4 border border-red-100 shadow-sm text-center">
          <p className="text-xs text-red-700 font-semibold uppercase">Balance Due</p>
          <p className="text-2xl font-bold text-red-700 mt-1">Rs. {totalDue.toLocaleString()}</p>
        </div>
      </div>

      {invoices.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Receipt size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No fee invoices found.</p>
          <p className="text-sm mt-1">Your school hasn't generated invoices yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map(inv => {
            const s = STATUS[inv.status] || STATUS.unpaid;
            return (
              <div key={inv._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setSelected(selected === inv._id ? null : inv._id)}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs">{inv.month?.slice(0, 7) || '—'}</div>
                    <div>
                      <p className="font-semibold text-slate-800">{inv.month ? new Date(inv.month + '-01').toLocaleDateString('en-PK', { month: 'long', year: 'numeric' }) : 'Invoice'}</p>
                      <p className="text-xs text-slate-400">Due: {fmtDate(inv.due_date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold text-slate-800">Rs. {inv.total_amount?.toLocaleString()}</p>
                      {inv.balance > 0 && <p className="text-xs text-red-500">Balance: Rs. {inv.balance?.toLocaleString()}</p>}
                    </div>
                    <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${s.cls}`}>{s.icon} {s.label}</span>
                  </div>
                </div>
                {selected === inv._id && (
                  <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Fee Breakdown</p>
                    <div className="space-y-1.5">
                      {(inv.items || []).map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">{item.fee_head_name}</span>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-slate-800">Rs. {item.amount?.toLocaleString()}</span>
                            {item.is_paid ? <span className="text-xs text-green-600 font-bold">✓ Paid</span> : <span className="text-xs text-red-500 font-bold">Pending</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                    {inv.notes && <p className="text-xs text-slate-400 mt-3 italic">{inv.notes}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
