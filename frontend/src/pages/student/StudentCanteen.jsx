import { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  UtensilsCrossed, Calendar, CheckCircle2, AlertCircle,
  Clock, TrendingUp, ChevronDown, ChevronUp,
} from 'lucide-react';

const statusConfig = {
  paid:     { label: 'Paid',     color: 'bg-green-100 text-green-700',  icon: <CheckCircle2 size={14}/> },
  invoiced: { label: 'Invoiced', color: 'bg-blue-100 text-blue-700',    icon: <Clock size={14}/> },
  pending:  { label: 'Pending',  color: 'bg-amber-100 text-amber-700',  icon: <AlertCircle size={14}/> },
};

function MonthCard({ charge }) {
  const [open, setOpen] = useState(false);
  const s = statusConfig[charge.status] || statusConfig.pending;
  const monthLabel = new Date(charge.month + '-01').toLocaleDateString('en-PK', { month: 'long', year: 'numeric' });

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50/60 transition-colors" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
            <UtensilsCrossed size={20} className="text-indigo-500"/>
          </div>
          <div className="text-left">
            <p className="font-bold text-slate-800">{monthLabel}</p>
            <p className="text-xs text-slate-400 mt-0.5">Canteen Charges</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="font-extrabold text-indigo-700 text-lg">Rs. {charge.amount?.toLocaleString()}</p>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${s.color}`}>
              {s.icon} {s.label}
            </span>
          </div>
          {charge.daily_log?.length > 0 && (open ? <ChevronUp size={16} className="text-slate-400"/> : <ChevronDown size={16} className="text-slate-400"/>)}
        </div>
      </button>

      {open && charge.daily_log?.length > 0 && (
        <div className="border-t border-slate-100 px-5 pb-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-3 mb-2">Daily Breakdown</p>
          <div className="space-y-1.5">
            {charge.daily_log.map(log => (
              <div key={log._id} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    {new Date(log.date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                    {log.description && <span className="text-slate-400 font-normal ml-2">— {log.description}</span>}
                  </p>
                  {log.items?.length > 0 && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      {log.items.map(i => `${i.item_name} x${i.qty}`).join(', ')}
                    </p>
                  )}
                </div>
                <p className="text-sm font-bold text-slate-700">Rs. {log.amount?.toLocaleString()}</p>
              </div>
            ))}
          </div>
          {charge.notes && <p className="text-xs text-slate-400 mt-3 italic">Note: {charge.notes}</p>}
        </div>
      )}
      {charge.notes && !(open && charge.daily_log?.length > 0) && (
        <div className="border-t border-slate-50 px-5 py-2">
          <p className="text-xs text-slate-400 italic">{charge.notes}</p>
        </div>
      )}
    </div>
  );
}

export default function StudentCanteen() {
  const [charges, setCharges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/student-portal/canteen')
      .then(r => setCharges(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const total   = charges.reduce((s, c) => s + c.amount, 0);
  const paid    = charges.filter(c => c.status === 'paid').reduce((s, c) => s + c.amount, 0);
  const pending = charges.filter(c => c.status === 'pending').reduce((s, c) => s + c.amount, 0);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
          <UtensilsCrossed size={22} className="text-indigo-500"/> Canteen
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Your monthly canteen charges</p>
      </div>

      {charges.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center py-20 text-slate-400">
          <UtensilsCrossed size={44} className="mb-3 opacity-30"/>
          <p className="font-semibold">No canteen charges yet.</p>
          <p className="text-sm mt-1">Your canteen bill will appear here each month.</p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Total Billed', value: `Rs. ${total.toLocaleString()}`,   color: 'bg-indigo-50 text-indigo-700', icon: <TrendingUp size={18}/> },
              { label: 'Paid',         value: `Rs. ${paid.toLocaleString()}`,    color: 'bg-green-50 text-green-700',   icon: <CheckCircle2 size={18}/> },
              { label: 'Pending',      value: `Rs. ${pending.toLocaleString()}`, color: 'bg-amber-50 text-amber-700',   icon: <AlertCircle size={18}/> },
            ].map(c => (
              <div key={c.label} className={`rounded-2xl p-4 flex flex-col gap-1 ${c.color}`}>
                <div className="flex items-center gap-1.5">{c.icon}<p className="text-xs font-bold uppercase tracking-wide">{c.label}</p></div>
                <p className="text-base font-extrabold">{c.value}</p>
              </div>
            ))}
          </div>

          {/* Month Cards */}
          <div className="space-y-3">
            {charges.map(c => <MonthCard key={c._id} charge={c}/>)}
          </div>
        </>
      )}
    </div>
  );
}
