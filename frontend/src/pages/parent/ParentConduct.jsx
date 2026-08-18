import { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { ShieldCheck, Users, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export default function ParentConduct() {
  const [children, setChildren]   = useState([]);
  const [selected, setSelected]   = useState('');
  const [records, setRecords]     = useState([]);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [loadingRecords, setLoadingRecords]   = useState(false);

  useEffect(() => {
    api.get('/parent-portal/children')
      .then(r => { setChildren(r.data); if (r.data.length) setSelected(r.data[0]._id); })
      .catch(() => toast.error('Failed to load children'))
      .finally(() => setLoadingChildren(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoadingRecords(true);
    api.get(`/parent-portal/children/${selected}/conduct`)
      .then(r => setRecords(r.data))
      .catch(() => toast.error('Failed to load conduct records'))
      .finally(() => setLoadingRecords(false));
  }, [selected]);

  const merits   = records.filter(r => r.type === 'merit');
  const demerits = records.filter(r => r.type === 'demerit');
  const totalMerit   = merits.reduce((s, r) => s + (r.points || 0), 0);
  const totalDemerit = demerits.reduce((s, r) => s + (r.points || 0), 0);
  const net = totalMerit - totalDemerit;

  if (loadingChildren) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600" />
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
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
          <ShieldCheck size={20} className="text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Conduct Records</h1>
          <p className="text-slate-500 text-sm">Your child's merit and demerit history</p>
        </div>
      </div>

      {/* Child selector */}
      {children.length > 1 && (
        <div className="flex gap-3 mb-6 flex-wrap">
          {children.map(c => (
            <button key={c._id} onClick={() => setSelected(c._id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm border transition-all ${selected === c._id ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-purple-50'}`}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Stats */}
      {!loadingRecords && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-center">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center mx-auto mb-2">
              <TrendingUp size={18} className="text-green-600" />
            </div>
            <p className="text-xs text-slate-500 mb-1">Total Merit Points</p>
            <p className="text-3xl font-bold text-green-600">+{totalMerit}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-center">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center mx-auto mb-2">
              <TrendingDown size={18} className="text-red-500" />
            </div>
            <p className="text-xs text-slate-500 mb-1">Total Demerit Points</p>
            <p className="text-3xl font-bold text-red-500">-{totalDemerit}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-center">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 ${net >= 0 ? 'bg-purple-100' : 'bg-orange-100'}`}>
              <Minus size={18} className={net >= 0 ? 'text-purple-600' : 'text-orange-500'} />
            </div>
            <p className="text-xs text-slate-500 mb-1">Net Points</p>
            <p className={`text-3xl font-bold ${net >= 0 ? 'text-purple-700' : 'text-orange-500'}`}>
              {net >= 0 ? '+' : ''}{net}
            </p>
          </div>
        </div>
      )}

      {/* Records list */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-700">All Records ({records.length})</h2>
        </div>
        {loadingRecords ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600" />
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <ShieldCheck size={40} className="mx-auto mb-3 opacity-30" />
            <p>No conduct records found</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {records.map(r => {
              const isMerit = r.type === 'merit';
              return (
                <div key={r._id} className="px-5 py-4 hover:bg-slate-50 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <span className={`shrink-0 mt-0.5 px-2 py-0.5 rounded-full text-xs font-semibold ${isMerit ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {isMerit ? 'Merit' : 'Demerit'}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 text-sm">{r.title}</p>
                        {r.category && <p className="text-xs text-slate-500 mt-0.5">{r.category}</p>}
                        {r.action_taken && <p className="text-xs text-slate-500 mt-1">Action: {r.action_taken}</p>}
                        <p className="text-xs text-slate-400 mt-1">{fmt(r.date || r.created_at)}</p>
                      </div>
                    </div>
                    <span className={`shrink-0 text-lg font-bold ${isMerit ? 'text-green-600' : 'text-red-500'}`}>
                      {isMerit ? '+' : '-'}{r.points || 0}
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
