import { useState, useEffect } from 'react';
import api from '../../services/api';
import { CalendarCheck, Users, CheckCircle, XCircle, MinusCircle, Clock } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'present', label: 'P', cls: 'bg-emerald-500 text-white', full: 'Present' },
  { value: 'absent',  label: 'A', cls: 'bg-red-500 text-white',     full: 'Absent' },
  { value: 'leave',   label: 'L', cls: 'bg-amber-400 text-white',   full: 'Leave' },
];

const STATUS_BADGE = {
  present: 'bg-emerald-100 text-emerald-700',
  absent:  'bg-red-100 text-red-700',
  leave:   'bg-amber-100 text-amber-700',
  late:    'bg-orange-100 text-orange-700',
};

const TeacherAttendance = () => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear]   = useState(now.getFullYear());
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState({});

  const load = () => {
    setLoading(true);
    api.get(`/teacher-portal/attendance?month=${month}&year=${year}`)
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [month, year]);

  const getDaysInMonth = () => new Date(year, month, 0).getDate();
  const todayStr = new Date().toISOString().split('T')[0];

  const getStatus = (studentId, day) => {
    if (!data?.records) return null;
    const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const rec = data.records.find(r => {
      const recDate = new Date(r.date).toISOString().split('T')[0];
      return r.person_id === studentId && recDate === dateStr;
    });
    return rec?.status || null;
  };

  const markAttendance = async (studentId, day, status) => {
    const key = `${studentId}-${day}`;
    setMarking(m => ({ ...m, [key]: true }));
    const date = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    try {
      await api.post('/teacher-portal/attendance', { person_id: studentId, date, status });
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Error marking attendance');
    } finally {
      setMarking(m => { const n = { ...m }; delete n[key]; return n; });
    }
  };

  const getSummary = (studentId) => {
    if (!data?.records) return { present: 0, absent: 0, leave: 0 };
    const recs = data.records.filter(r => r.person_id === studentId);
    return {
      present: recs.filter(r => r.status === 'present').length,
      absent:  recs.filter(r => r.status === 'absent').length,
      leave:   recs.filter(r => r.status === 'leave').length,
    };
  };

  const days = Array.from({ length: getDaysInMonth() }, (_, i) => i + 1);
  const todayDay = now.getFullYear() === year && (now.getMonth() + 1) === month ? now.getDate() : null;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  const students = data?.students || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
            <CalendarCheck size={24} className="text-emerald-500"/> Attendance
          </h2>
          <p className="text-slate-500 mt-1">Mark and view your students' attendance</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300">
            {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300">
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {students.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-slate-100">
          <Users size={48} className="text-slate-200 mx-auto mb-4"/>
          <h3 className="text-xl font-extrabold text-slate-400 mb-2">No Students Assigned</h3>
          <p className="text-slate-400">You have no students in your courses yet.</p>
        </div>
      ) : (
        <>
          {/* Summary strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Students', value: students.length, icon: <Users size={16}/>, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
              { label: 'Days in Month', value: getDaysInMonth(), icon: <CalendarCheck size={16}/>, color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' },
              { label: 'Marked Today', value: data?.records?.filter(r => new Date(r.date).toISOString().split('T')[0] === todayStr).length || 0, icon: <CheckCircle size={16}/>, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
              { label: 'Absent Today', value: data?.records?.filter(r => new Date(r.date).toISOString().split('T')[0] === todayStr && r.status === 'absent').length || 0, icon: <XCircle size={16}/>, color: 'text-red-600', bg: 'bg-red-50 border-red-100' },
            ].map(card => (
              <div key={card.label} className={`${card.bg} border rounded-2xl p-4`}>
                <div className={`flex items-center gap-1.5 mb-1 ${card.color}`}>{card.icon}<span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{card.label}</span></div>
                <p className={`text-2xl font-extrabold ${card.color}`}>{card.value}</p>
              </div>
            ))}
          </div>

          {/* Today's quick mark */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-extrabold text-slate-700 mb-4 flex items-center gap-2">
              <Clock size={16} className="text-emerald-500"/> Today's Attendance
              <span className="text-xs font-normal text-slate-400">({new Date().toLocaleDateString()})</span>
            </h3>
            <div className="space-y-2">
              {students.map(s => {
                const currentStatus = getStatus(s._id, now.getDate());
                const courseName = s.courses?.find(c => c.trainer_id)?.course_name || s.courses?.[0]?.course_name || '';
                return (
                  <div key={s._id} className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {s.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-700 text-sm">{s.full_name}</p>
                        <p className="text-xs text-slate-400">{s.roll_number}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {STATUS_OPTIONS.map(opt => {
                        const key = `${s._id}-${now.getDate()}`;
                        const isLoading = marking[key];
                        return (
                          <button
                            key={opt.value}
                            disabled={isLoading}
                            onClick={() => markAttendance(s._id, now.getDate(), opt.value)}
                            title={opt.full}
                            className={`w-9 h-9 rounded-xl text-xs font-extrabold transition-all ${
                              currentStatus === opt.value
                                ? `${opt.cls} shadow-md scale-105`
                                : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                            } disabled:opacity-50`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                      {currentStatus && (
                        <span className={`text-xs font-bold px-2 py-1 rounded-lg ${STATUS_BADGE[currentStatus] || 'bg-slate-100 text-slate-500'}`}>
                          {currentStatus}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Monthly grid */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-700">Monthly Overview</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-4 py-3 font-bold text-slate-500 sticky left-0 bg-slate-50 min-w-[160px]">Student</th>
                    {days.map(d => (
                      <th key={d} className={`px-2 py-3 font-bold text-center min-w-[32px] ${d === todayDay ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400'}`}>
                        {d}
                      </th>
                    ))}
                    <th className="px-3 py-3 font-bold text-slate-500 text-center min-w-[80px]">Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {students.map(s => {
                    const summary = getSummary(s._id);
                    const isCurrentMonth = now.getFullYear() === year && (now.getMonth() + 1) === month;
                    const daysElapsed = isCurrentMonth ? now.getDate() : getDaysInMonth();
                    const pct = daysElapsed > 0 ? Math.round((summary.present / daysElapsed) * 100) : 0;
                    return (
                      <tr key={s._id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-2.5 sticky left-0 bg-white border-r border-slate-50">
                          <p className="font-bold text-slate-700 truncate max-w-[140px]">{s.full_name}</p>
                          <p className="text-slate-400 font-mono">{s.roll_number}</p>
                        </td>
                        {days.map(d => {
                          const status = getStatus(s._id, d);
                          const isToday = d === todayDay;
                          return (
                            <td key={d} className={`px-1 py-2 text-center ${isToday ? 'bg-emerald-50/50' : ''}`}>
                              {status === 'present' ? (
                                <span className="w-6 h-6 rounded-md bg-emerald-500 text-white font-extrabold flex items-center justify-center mx-auto text-[10px]">P</span>
                              ) : status === 'absent' ? (
                                <span className="w-6 h-6 rounded-md bg-red-400 text-white font-extrabold flex items-center justify-center mx-auto text-[10px]">A</span>
                              ) : status === 'leave' ? (
                                <span className="w-6 h-6 rounded-md bg-amber-400 text-white font-extrabold flex items-center justify-center mx-auto text-[10px]">L</span>
                              ) : status === 'late' ? (
                                <span className="w-6 h-6 rounded-md bg-orange-400 text-white font-extrabold flex items-center justify-center mx-auto text-[10px]">T</span>
                              ) : (
                                <span className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center mx-auto">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 inline-block"/>
                                </span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={`text-xs font-extrabold ${pct >= 75 ? 'text-emerald-600' : 'text-red-500'}`}>{pct}%</span>
                            <div className="flex gap-1 text-[9px] font-bold">
                              <span className="text-emerald-600">{summary.present}P</span>
                              <span className="text-red-500">{summary.absent}A</span>
                              {summary.leave > 0 && <span className="text-amber-500">{summary.leave}L</span>}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TeacherAttendance;
