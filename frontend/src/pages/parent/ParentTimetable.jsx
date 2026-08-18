import { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { CalendarDays, Coffee } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const PALETTE = [
  { bg: '#ede9fe', text: '#5b21b6', border: '#ddd6fe' },
  { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe' },
  { bg: '#dcfce7', text: '#14532d', border: '#bbf7d0' },
  { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
  { bg: '#fce7f3', text: '#831843', border: '#fbcfe8' },
  { bg: '#ccfbf1', text: '#134e4a', border: '#99f6e4' },
  { bg: '#e0f2fe', text: '#0c4a6e', border: '#bae6fd' },
];

const subjectColor = (id) => {
  if (!id) return null;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return PALETTE[Math.abs(h) % PALETTE.length];
};

const fmt12 = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

export default function ParentTimetable() {
  const [children, setChildren] = useState([]);
  const [selected, setSelected] = useState('');
  const [entries, setEntries]   = useState([]);
  const [periods, setPeriods]   = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/parent-portal/children'),
      api.get('/periods'),
    ]).then(([c, p]) => {
      setChildren(c.data);
      setPeriods(p.data);
      if (c.data.length) setSelected(c.data[0]._id);
    }).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    api.get(`/parent-portal/children/${selected}/timetable`)
      .then(r => setEntries(r.data))
      .catch(() => setEntries([]));
  }, [selected]);

  // Build lookup
  const entryMap = {};
  entries.forEach(e => { entryMap[`${e.day_of_week}__${e.period_id?._id || e.period_id}`] = e; });
  const getEntry = (day, pid) => entryMap[`${day}__${pid}`] || null;

  // Only show days that have at least one entry
  const usedDays = DAYS.filter(day => periods.some(p => !p.is_break && getEntry(day, p._id)));
  const displayDays = usedDays.length ? usedDays : DAYS.slice(0, 5);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2 mb-6"><CalendarDays size={24} className="text-teal-600" /> Class Timetable</h1>

      {children.length > 1 && (
        <div className="flex gap-2 mb-5 flex-wrap">
          {children.map(c => (
            <button key={c._id} onClick={() => setSelected(c._id)} className={`px-4 py-1.5 rounded-xl text-sm font-semibold border transition-all ${selected === c._id ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-teal-50'}`}>{c.full_name}</button>
          ))}
        </div>
      )}

      {entries.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <CalendarDays size={48} className="mx-auto mb-3 opacity-30" />
          <p>No timetable assigned for this child's class yet.</p>
          <p className="text-sm mt-1">Please check with the school administration.</p>
        </div>
      ) : periods.length === 0 ? (
        <div className="text-center py-16 text-slate-400"><p>No periods configured yet.</p></div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
          <table className="w-full border-collapse" style={{ minWidth: `${displayDays.length * 140 + 140}px` }}>
            <thead>
              <tr>
                <th className="bg-teal-700 text-white text-left px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-tl-2xl" style={{ minWidth: 140 }}>Period</th>
                {displayDays.map((day, i) => (
                  <th key={day} className={`bg-teal-700 text-white text-center px-3 py-3 text-xs font-bold uppercase tracking-wider ${i === displayDays.length - 1 ? 'rounded-tr-2xl' : ''}`} style={{ minWidth: 130 }}>{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periods.map((period, pIdx) => (
                <tr key={period._id} className={pIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                  <td className="px-4 py-3 border-r border-slate-100">
                    <div className="flex items-center gap-2">
                      {period.is_break ? <Coffee size={13} className="text-amber-500 flex-shrink-0" /> : <div className="w-5 h-5 rounded-md bg-teal-100 text-teal-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">{pIdx + 1}</div>}
                      <div>
                        <p className="text-xs font-semibold text-slate-700">{period.name}</p>
                        <p className="text-[10px] text-slate-400">{fmt12(period.start_time)}</p>
                      </div>
                    </div>
                  </td>
                  {displayDays.map(day => {
                    if (period.is_break) {
                      return (
                        <td key={day} className="px-3 py-3 border-r border-slate-100 text-center">
                          <div className="bg-amber-50 border border-amber-100 rounded-lg py-1.5 text-[10px] font-semibold text-amber-600 flex items-center justify-center gap-1"><Coffee size={10} /> Break</div>
                        </td>
                      );
                    }
                    const entry = getEntry(day, period._id);
                    const color = entry?.subject_id ? subjectColor(entry.subject_id._id || entry.subject_id) : null;
                    return (
                      <td key={day} className="px-3 py-3 border-r border-slate-100">
                        {entry?.subject_id ? (
                          <div className="rounded-xl px-3 py-2 border" style={{ background: color?.bg, borderColor: color?.border, color: color?.text }}>
                            <p className="text-xs font-bold leading-tight">{entry.subject_id.name}</p>
                            {entry.teacher_id && <p className="text-[10px] mt-0.5 opacity-75">{entry.teacher_id.name}</p>}
                            {entry.room && <p className="text-[10px] opacity-60">Room {entry.room}</p>}
                          </div>
                        ) : (
                          <div className="text-center text-[10px] text-slate-300">—</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
