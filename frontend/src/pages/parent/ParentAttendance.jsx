import { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { CalendarCheck, Users } from 'lucide-react';

const STATUS_COLORS = {
  present:  'bg-emerald-100 text-emerald-700',
  absent:   'bg-red-100 text-red-600',
  late:     'bg-amber-100 text-amber-700',
  leave:    'bg-blue-100 text-blue-600',
  half_day: 'bg-purple-100 text-purple-600',
};

export default function ParentAttendance() {
  const [children, setChildren]   = useState([]);
  const [selected, setSelected]   = useState('');
  const [records, setRecords]     = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    api.get('/parent-portal/children')
      .then(r => { setChildren(r.data); if (r.data.length) setSelected(r.data[0]._id); })
      .catch(() => toast.error('Failed to load children'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    api.get(`/parent-portal/children/${selected}/attendance`)
      .then(r => setRecords(r.data))
      .catch(() => toast.error('Failed to load attendance'));
  }, [selected]);

  const present = records.filter(r => r.status === 'present' || r.status === 'late').length;
  const absent  = records.filter(r => r.status === 'absent').length;
  const pct     = records.length ? Math.round((present / records.length) * 100) : 0;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2 mb-6"><CalendarCheck size={24} className="text-teal-600" /> Attendance</h1>

      {children.length > 1 && (
        <div className="flex gap-2 mb-5 flex-wrap">
          {children.map(c => (
            <button key={c._id} onClick={() => setSelected(c._id)} className={`px-4 py-1.5 rounded-xl text-sm font-semibold border transition-all ${selected === c._id ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-teal-50'}`}>{c.full_name}</button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{present}</p>
          <p className="text-xs text-slate-400 mt-0.5">Present</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-red-500">{absent}</p>
          <p className="text-xs text-slate-400 mt-0.5">Absent</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-teal-600">{pct}%</p>
          <p className="text-xs text-slate-400 mt-0.5">Rate</p>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="text-center py-12 text-slate-400"><CalendarCheck size={40} className="mx-auto mb-2 opacity-30" /><p>No attendance records found.</p></div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Date</th>
                <th className="text-center px-5 py-3 font-semibold text-slate-600">Status</th>
                <th className="text-center px-5 py-3 font-semibold text-slate-600">Check-In</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {records.map(r => (
                <tr key={r._id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 text-slate-700">{new Date(r.date).toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td className="px-5 py-3 text-center"><span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[r.status] || 'bg-slate-100 text-slate-600'}`}>{r.status.replace('_', ' ')}</span></td>
                  <td className="px-5 py-3 text-center text-slate-500">{r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
