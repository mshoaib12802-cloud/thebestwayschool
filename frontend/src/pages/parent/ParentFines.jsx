import { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { AlertTriangle } from 'lucide-react';

export default function ParentFines() {
  const [children, setChildren] = useState([]);
  const [selected, setSelected] = useState('');
  const [fines, setFines]       = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    api.get('/parent-portal/children')
      .then(r => { setChildren(r.data); if (r.data.length) setSelected(r.data[0]._id); })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    api.get(`/parent-portal/children/${selected}/fines`)
      .then(r => setFines(r.data))
      .catch(() => toast.error('Failed to load fines'));
  }, [selected]);

  const unpaid = fines.filter(f => !f.is_paid).reduce((s, f) => s + f.amount, 0);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2 mb-6"><AlertTriangle size={24} className="text-amber-600" /> Fines</h1>

      {children.length > 1 && (
        <div className="flex gap-2 mb-5 flex-wrap">
          {children.map(c => (
            <button key={c._id} onClick={() => setSelected(c._id)} className={`px-4 py-1.5 rounded-xl text-sm font-semibold border transition-all ${selected === c._id ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-amber-50'}`}>{c.full_name}</button>
          ))}
        </div>
      )}

      {unpaid > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 flex items-center gap-3">
          <AlertTriangle size={20} className="text-amber-600 flex-shrink-0" />
          <p className="text-sm font-semibold text-amber-800">Outstanding fines: <span className="font-bold">Rs. {unpaid.toLocaleString()}</span> — Please contact the school office.</p>
        </div>
      )}

      {fines.length === 0 ? (
        <div className="text-center py-12 text-slate-400"><AlertTriangle size={40} className="mx-auto mb-2 opacity-30" /><p>No fines on record.</p></div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Category</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Reason</th>
                <th className="text-right px-5 py-3 font-semibold text-slate-600">Amount</th>
                <th className="text-center px-5 py-3 font-semibold text-slate-600">Status</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {fines.map(f => (
                <tr key={f._id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 text-slate-700 font-medium capitalize">{f.category}</td>
                  <td className="px-5 py-3 text-slate-500">{f.reason || '—'}</td>
                  <td className="px-5 py-3 text-right font-bold text-slate-800">Rs. {f.amount?.toLocaleString()}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${f.is_paid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>{f.is_paid ? 'Paid' : 'Unpaid'}</span>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{new Date(f.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
