import { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { Wallet, TrendingUp, TrendingDown } from 'lucide-react';

export default function ParentFees() {
  const [children, setChildren] = useState([]);
  const [selected, setSelected] = useState('');
  const [txns, setTxns]         = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    api.get('/parent-portal/children')
      .then(r => { setChildren(r.data); if (r.data.length) setSelected(r.data[0]._id); })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    api.get(`/parent-portal/children/${selected}/fees`)
      .then(r => setTxns(r.data))
      .catch(() => toast.error('Failed to load fees'));
  }, [selected]);

  const totalPaid = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2 mb-6"><Wallet size={24} className="text-blue-600" /> Fee Ledger</h1>

      {children.length > 1 && (
        <div className="flex gap-2 mb-5 flex-wrap">
          {children.map(c => (
            <button key={c._id} onClick={() => setSelected(c._id)} className={`px-4 py-1.5 rounded-xl text-sm font-semibold border transition-all ${selected === c._id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-blue-50'}`}>{c.full_name}</button>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center"><Wallet size={22} className="text-blue-600" /></div>
        <div>
          <p className="text-xs text-slate-400">Total Paid</p>
          <p className="text-2xl font-bold text-slate-800">Rs. {totalPaid.toLocaleString()}</p>
        </div>
      </div>

      {txns.length === 0 ? (
        <div className="text-center py-12 text-slate-400"><Wallet size={40} className="mx-auto mb-2 opacity-30" /><p>No fee records found.</p></div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Date</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Description</th>
                <th className="text-center px-5 py-3 font-semibold text-slate-600">Type</th>
                <th className="text-right px-5 py-3 font-semibold text-slate-600">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {txns.map(t => (
                <tr key={t._id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 text-slate-600">{new Date(t.date).toLocaleDateString()}</td>
                  <td className="px-5 py-3 text-slate-700">{t.description || t.category}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`flex items-center justify-center gap-1 text-xs font-bold w-fit mx-auto px-2.5 py-1 rounded-full ${t.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                      {t.type === 'income' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {t.type}
                    </span>
                  </td>
                  <td className={`px-5 py-3 text-right font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>Rs. {t.amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
