import { useState, useEffect } from 'react';
import api from '../../services/api';
import { CalendarDays, Clock, MapPin, BookOpen, Layers, LayoutGrid, List, Users, Coffee } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SCHOOL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
const fmt12Teacher = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

const DAY_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const SHIFT_COLORS = {
  Morning:   { bg: '#fffbeb', color: '#92400e', border: '#fde68a', dot: '#f59e0b' },
  Afternoon: { bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe', dot: '#3b82f6' },
  Evening:   { bg: '#f5f3ff', color: '#5b21b6', border: '#ddd6fe', dot: '#8b5cf6' },
  Weekend:   { bg: '#f0fdf4', color: '#14532d', border: '#bbf7d0', dot: '#22c55e' },
};

function fmt12(time) {
  if (!time) return '—';
  const [h, m] = time.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

export default function TeacherTimetable() {
  const [schedules, setSchedules] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('grid');
  const [filterBatch, setFilterBatch] = useState('');
  const [tab, setTab] = useState('batch');
  const [schoolEntries, setSchoolEntries] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [schoolLoading, setSchoolLoading] = useState(false);

  useEffect(() => {
    api.get('/teacher-portal/timetable')
      .then(({ data }) => {
        setSchedules(data.schedules || []);
        setBatches(data.batches || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab !== 'school') return;
    setSchoolLoading(true);
    Promise.all([
      api.get('/teacher-portal/school-timetable'),
      api.get('/periods'),
    ]).then(([e, p]) => {
      setSchoolEntries(e.data);
      setPeriods(p.data);
    }).catch(() => {}).finally(() => setSchoolLoading(false));
  }, [tab]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  const displayed = filterBatch
    ? schedules.filter(s => (s.batch_id?._id || s.batch_id) === filterBatch)
    : schedules;

  const entryMap = {};
  schoolEntries.forEach(e => { entryMap[`${e.day_of_week}__${e.period_id?._id || e.period_id}`] = e; });
  const getEntry = (day, pid) => entryMap[`${day}__${pid}`] || null;
  const usedDays = SCHOOL_DAYS.filter(day => periods.some(p => !p.is_break && getEntry(day, p._id)));
  const displayDays = usedDays.length ? usedDays : SCHOOL_DAYS.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800">My Timetable</h2>
          <p className="text-slate-500 mt-1">Your weekly class schedule across all batches</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl gap-0.5">
          <button onClick={() => setTab('batch')} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${tab === 'batch' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
            <Layers size={13}/> Batch Schedule
          </button>
          <button onClick={() => setTab('school')} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${tab === 'school' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
            <CalendarDays size={13}/> School Timetable
          </button>
        </div>
      </div>

      {tab === 'school' && (
        <>
          {schoolLoading ? (
            <div className="flex items-center justify-center h-48"><div className="w-9 h-9 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"/></div>
          ) : schoolEntries.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
              <CalendarDays size={48} className="text-slate-300 mx-auto mb-3"/>
              <p className="text-slate-600 font-semibold">No school timetable entries assigned to you yet.</p>
              <p className="text-slate-400 text-sm mt-1">Ask the admin to assign subjects to you in the Timetable Builder.</p>
            </div>
          ) : periods.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-100"><p className="text-slate-400">No periods configured.</p></div>
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
                          {period.is_break ? <Coffee size={13} className="text-amber-500 flex-shrink-0"/> : <div className="w-5 h-5 rounded-md bg-teal-100 text-teal-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">{pIdx + 1}</div>}
                          <div>
                            <p className="text-xs font-semibold text-slate-700">{period.name}</p>
                            <p className="text-[10px] text-slate-400">{fmt12Teacher(period.start_time)}</p>
                          </div>
                        </div>
                      </td>
                      {displayDays.map(day => {
                        if (period.is_break) {
                          return (
                            <td key={day} className="px-3 py-3 border-r border-slate-100 text-center">
                              <div className="bg-amber-50 border border-amber-100 rounded-lg py-1.5 text-[10px] font-semibold text-amber-600 flex items-center justify-center gap-1"><Coffee size={10}/> Break</div>
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
                                {entry.class_id && <p className="text-[10px] mt-0.5 opacity-75">{entry.class_id.grade !== undefined ? `Grade ${entry.class_id.grade === 0 ? 'KG' : entry.class_id.grade}` : ''}{entry.class_id.section ? `-${entry.class_id.section}` : ''}</p>}
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
        </>
      )}

      {tab === 'batch' && (<>

      {/* Batch summary cards */}
      {batches.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {batches.map(batch => {
            const sc = SHIFT_COLORS[batch.shift] || SHIFT_COLORS.Morning;
            const slotCount = schedules.filter(s => (s.batch_id?._id || s.batch_id)?.toString() === batch._id.toString()).length;
            return (
              <div key={batch._id} style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)', borderRadius: '1.25rem', padding: '1.125rem 1.375rem', cursor: 'pointer', border: filterBatch === batch._id ? '2px solid #34d399' : '2px solid transparent', transition: 'border-color 0.2s' }}
                onClick={() => setFilterBatch(f => f === batch._id ? '' : batch._id)}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <Layers size={13} color="#34d399"/>
                      <span style={{ color: '#6ee7b7', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                        {batch.is_active ? 'Active Batch' : 'Inactive Batch'}
                      </span>
                    </div>
                    <h4 style={{ margin: 0, color: '#fff', fontWeight: 800, fontSize: '1rem' }}>{batch.name}</h4>
                    <p style={{ margin: '0.2rem 0 0', color: '#6ee7b7', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <BookOpen size={11}/> {batch.course_name}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {batch.shift && (
                      <span style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, fontSize: '0.68rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc.dot, display: 'inline-block' }}/>
                        {batch.shift}
                      </span>
                    )}
                    <span style={{ background: 'rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: '0.68rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 999 }}>
                      <Clock size={9} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }}/>{slotCount} slot{slotCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                {(batch.start_date || batch.end_date) && (
                  <p style={{ margin: '0.5rem 0 0', color: '#64748b', fontSize: '0.72rem', fontWeight: 600 }}>
                    📅 {batch.start_date ? new Date(batch.start_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '?'}
                    {' → '}
                    {batch.end_date ? new Date(batch.end_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Ongoing'}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
      {filterBatch && (
        <p className="text-xs text-emerald-600 font-semibold -mt-2">
          Showing 1 batch · <button className="underline" onClick={() => setFilterBatch('')}>Show all</button>
        </p>
      )}

      {schedules.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
          <CalendarDays size={48} className="text-slate-300 mx-auto mb-3"/>
          <p className="text-slate-600 font-semibold text-lg">No schedule yet</p>
          <p className="text-slate-400 text-sm mt-1">
            {batches.length === 0
              ? 'No batches are assigned to you yet.'
              : 'No schedule slots have been added to your batches yet.'}
          </p>
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-slate-500 font-medium">
              {displayed.length} slot{displayed.length !== 1 ? 's' : ''} per week
            </p>
            <div className="flex bg-slate-100 p-1 rounded-xl gap-0.5">
              <button onClick={() => setView('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${view === 'grid' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                <LayoutGrid size={13}/> Grid
              </button>
              <button onClick={() => setView('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${view === 'list' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                <List size={13}/> List
              </button>
            </div>
          </div>

          {view === 'grid' ? (
            /* GRID VIEW */
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#0f172a' }}>
                {DAYS.map((day, i) => {
                  const count = displayed.filter(s => s.day_of_week === day).length;
                  return (
                    <div key={day} style={{ padding: '0.875rem 0.5rem', textAlign: 'center', borderRight: i < 6 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
                      <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 800, color: DAY_COLORS[i], textTransform: 'uppercase', letterSpacing: '0.06em' }}>{day.slice(0, 3)}</p>
                      <p style={{ margin: '0.15rem 0 0', fontSize: '0.65rem', color: count > 0 ? '#94a3b8' : '#334155', fontWeight: 600 }}>
                        {count > 0 ? `${count} class${count !== 1 ? 'es' : ''}` : '—'}
                      </p>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', alignItems: 'start', padding: '0.875rem', gap: '0.625rem' }}>
                {DAYS.map((day, di) => {
                  const daySlots = displayed.filter(s => s.day_of_week === day).sort((a, b) => a.start_time.localeCompare(b.start_time));
                  return (
                    <div key={day} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {daySlots.length === 0 ? (
                        <div style={{ minHeight: 56, border: '2px dashed #f1f5f9', borderRadius: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ color: '#e2e8f0', fontSize: '1.1rem' }}>·</span>
                        </div>
                      ) : daySlots.map(slot => {
                        const batch = slot.batch_id;
                        const sc = SHIFT_COLORS[batch?.shift] || null;
                        return (
                          <div key={slot._id} style={{ background: `${DAY_COLORS[di]}10`, border: `1.5px solid ${DAY_COLORS[di]}30`, borderRadius: '0.875rem', padding: '0.625rem 0.75rem' }}>
                            <p style={{ margin: 0, fontSize: '0.68rem', fontWeight: 800, color: DAY_COLORS[di] }}>{fmt12(slot.start_time)}</p>
                            <p style={{ margin: '0.05rem 0 0', fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>{fmt12(slot.end_time)}</p>
                            {slot.subject && (
                              <p style={{ margin: '0.2rem 0 0', fontSize: '0.7rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.3 }}>{slot.subject}</p>
                            )}
                            {batch?.name && (
                              <p style={{ margin: '0.1rem 0 0', fontSize: '0.63rem', color: '#065f46', fontWeight: 700 }}>{batch.name}</p>
                            )}
                            {batch?.course_name && (
                              <p style={{ margin: '0.05rem 0 0', fontSize: '0.6rem', color: '#6d28d9', fontWeight: 700 }}>{batch.course_name}</p>
                            )}
                            {sc && (
                              <span style={{ display: 'inline-block', marginTop: '0.15rem', fontSize: '0.58rem', fontWeight: 800, padding: '0.05rem 0.4rem', borderRadius: 999, background: sc.bg, color: sc.color }}>
                                {batch.shift}
                              </span>
                            )}
                            {slot.room && (
                              <p style={{ margin: '0.1rem 0 0', fontSize: '0.6rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 2 }}>
                                <MapPin size={9}/> {slot.room}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* LIST VIEW */
            <div className="space-y-3">
              {DAYS.map((day, di) => {
                const daySlots = displayed.filter(s => s.day_of_week === day).sort((a, b) => a.start_time.localeCompare(b.start_time));
                if (!daySlots.length) return null;
                return (
                  <div key={day} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div style={{ padding: '0.75rem 1.25rem', background: `${DAY_COLORS[di]}08`, borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: DAY_COLORS[di], display: 'inline-block', flexShrink: 0 }}/>
                      <span style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.9rem' }}>{day}</span>
                      <span style={{ marginLeft: 'auto', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8' }}>
                        {daySlots.length} class{daySlots.length !== 1 ? 'es' : ''}
                      </span>
                    </div>
                    {daySlots.map((slot, si) => {
                      const batch = slot.batch_id;
                      const sc = SHIFT_COLORS[batch?.shift] || null;
                      return (
                        <div key={slot._id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem', borderBottom: si < daySlots.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                          {/* Time block */}
                          <div style={{ background: `${DAY_COLORS[di]}12`, border: `1.5px solid ${DAY_COLORS[di]}35`, borderRadius: '0.75rem', padding: '0.5rem 0.75rem', textAlign: 'center', minWidth: 88, flexShrink: 0 }}>
                            <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 800, color: DAY_COLORS[di] }}>{fmt12(slot.start_time)}</p>
                            <p style={{ margin: '0.1rem 0 0', fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>{fmt12(slot.end_time)}</p>
                          </div>
                          {/* Details */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              {slot.subject && (
                                <p style={{ margin: 0, fontWeight: 700, color: '#1e293b', fontSize: '0.9rem' }}>{slot.subject}</p>
                              )}
                              {sc && (
                                <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '0.1rem 0.5rem', borderRadius: 999, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                                  {batch.shift}
                                </span>
                              )}
                            </div>
                            <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: '#64748b', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              {batch?.name && (
                                <span style={{ color: '#065f46', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
                                  <Layers size={11}/> {batch.name}
                                </span>
                              )}
                              {batch?.course_name && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#6d28d9', fontWeight: 600 }}>
                                  <BookOpen size={11}/> {batch.course_name}
                                </span>
                              )}
                              {slot.room && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                  <MapPin size={11}/> {slot.room}
                                </span>
                              )}
                              {batch?.enrolled_count !== undefined && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                  <Users size={11}/> {batch.enrolled_count || 0} students
                                </span>
                              )}
                            </p>
                          </div>
                          <Clock size={18} style={{ color: `${DAY_COLORS[di]}60`, flexShrink: 0 }}/>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
      </>)}
    </div>
  );
}
