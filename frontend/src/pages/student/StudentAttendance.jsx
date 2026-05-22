import { useState, useEffect } from 'react';
import api from '../../services/api';
import { CalendarCheck, CheckCircle2, XCircle, Clock } from 'lucide-react';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const StudentAttendance = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const r = await api.get(`/student-portal/attendance?month=${month}&year=${year}`);
      setData(r.data);
    } catch (e) { setData(null); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAttendance(); }, [month, year]);

  const statusStyle = {
    present: { bg: '#dcfce7', color: '#16a34a', label: 'P' },
    late: { bg: '#fef3c7', color: '#ca8a04', label: 'L' },
    leave: { bg: '#dbeafe', color: '#2563eb', label: 'Le' },
    absent: { bg: '#fee2e2', color: '#dc2626', label: 'A' },
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800">Attendance</h2>
          <p className="text-slate-500 mt-1">Monthly attendance record</p>
        </div>
        <div className="flex gap-3">
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
            {[2024, 2025, 2026, 2027].map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : !data ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-100">
          <p className="text-slate-400">No attendance data for this month.</p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Present', value: data.summary.present, icon: <CheckCircle2 size={18}/>, color: '#16a34a', bg: '#dcfce7' },
              { label: 'Absent', value: data.summary.absent, icon: <XCircle size={18}/>, color: '#dc2626', bg: '#fee2e2' },
              { label: 'Leave', value: data.summary.leave, icon: <Clock size={18}/>, color: '#2563eb', bg: '#dbeafe' },
              { label: 'Attendance %', value: `${data.summary.percent}%`, icon: <CalendarCheck size={18}/>, color: '#4f46e5', bg: '#ede9fe' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 mb-2" style={{ color: s.color }}>
                  {s.icon}
                  <span className="text-xs font-bold uppercase tracking-wider">{s.label}</span>
                </div>
                <p className="text-2xl font-extrabold" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <div className="flex justify-between text-sm font-semibold text-slate-600 mb-2">
              <span>Attendance Rate</span>
              <span className={data.summary.percent >= 75 ? 'text-green-600' : 'text-red-600'}>
                {data.summary.percent}% {data.summary.percent < 75 ? '— Below required 75%' : '— Good standing'}
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3">
              <div className="h-3 rounded-full transition-all" style={{
                width: `${data.summary.percent}%`,
                background: data.summary.percent >= 75 ? '#16a34a' : '#dc2626'
              }}/>
            </div>
          </div>

          {/* Calendar grid */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 font-bold text-slate-700">
              {MONTHS[month - 1]} {year}
            </div>
            <div className="p-4 grid grid-cols-7 gap-2">
              {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
                <div key={d} className="text-center text-xs font-bold text-slate-400 pb-2">{d}</div>
              ))}
              {/* empty cells for offset */}
              {(() => {
                const firstDay = new Date(year, month - 1, 1).getDay();
                const offset = (firstDay + 6) % 7;
                return Array(offset).fill(null).map((_, i) => <div key={`e${i}`}/>);
              })()}
              {data.calendar.map(d => {
                const s = d.status ? statusStyle[d.status] || statusStyle.absent : null;
                return (
                  <div key={d.day} className="aspect-square rounded-xl flex items-center justify-center flex-col text-xs font-bold"
                    style={s ? { background: s.bg, color: s.color } : { background: '#f8fafc', color: '#cbd5e1' }}>
                    <span className="text-xs">{d.day}</span>
                    {s && <span className="text-[9px]">{s.label}</span>}
                  </div>
                );
              })}
            </div>
            <div className="px-4 pb-4 flex gap-4 flex-wrap">
              {Object.entries(statusStyle).map(([k, v]) => (
                <div key={k} className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: v.color }}>
                  <div className="w-4 h-4 rounded-md" style={{ background: v.bg }}/>
                  {k.charAt(0).toUpperCase() + k.slice(1)} ({v.label})
                </div>
              ))}
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <div className="w-4 h-4 rounded-md bg-slate-100"/>
                No record
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StudentAttendance;
