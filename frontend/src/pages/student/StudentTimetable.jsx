import { useState, useEffect } from 'react';
import api from '../../services/api';
import { CalendarDays, Clock, MapPin, BookOpen, User, Layers, LayoutGrid, List } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export default function StudentTimetable() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('grid');

  useEffect(() => {
    api.get('/student-portal/timetable')
      .then(({ data }) => setSchedules(data.schedules || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  // Collect unique batches shown in this timetable
  const batchMap = {};
  schedules.forEach(s => {
    if (s.batch_id?._id) batchMap[s.batch_id._id] = s.batch_id;
  });
  const myBatches = Object.values(batchMap);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800">My Timetable</h2>
        <p className="text-slate-500 mt-1">Your weekly class schedule</p>
      </div>

      {/* Batch info cards */}
      {myBatches.map(batch => {
        const sc = SHIFT_COLORS[batch.shift] || SHIFT_COLORS.Morning;
        return (
          <div key={batch._id} style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', borderRadius: '1.25rem', padding: '1.25rem 1.5rem' }}>
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Layers size={16} color="#2dd4bf" />
                  <span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Your Batch</span>
                </div>
                <h3 style={{ margin: 0, color: '#fff', fontWeight: 800, fontSize: '1.15rem' }}>{batch.name}</h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span style={{ color: '#a78bfa', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <BookOpen size={12} /> {batch.course_name}
                  </span>
                  {batch.trainer_id?.name && (
                    <span style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <User size={12} /> {batch.trainer_id.name}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {batch.shift && (
                  <span style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, fontSize: '0.75rem', fontWeight: 700, padding: '0.3rem 0.75rem', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: sc.dot, display: 'inline-block' }}/>
                    {batch.shift} Shift
                  </span>
                )}
                {batch.start_date && (
                  <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, background: 'rgba(255,255,255,0.06)', padding: '0.3rem 0.75rem', borderRadius: 999 }}>
                    <CalendarDays size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }}/>
                    {new Date(batch.start_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {batch.end_date ? ` → ${new Date(batch.end_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}` : ' → Ongoing'}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {schedules.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
          <CalendarDays size={48} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-semibold text-lg">No schedule yet</p>
          <p className="text-slate-400 text-sm mt-1">
            {myBatches.length === 0
              ? 'You are not enrolled in any batch. Ask your admin to assign you to a batch.'
              : 'Your batch schedule has not been set up yet. Check back soon!'}
          </p>
        </div>
      ) : (
        <>
          {/* View toggle */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 font-medium">{schedules.length} class slot{schedules.length !== 1 ? 's' : ''} per week</p>
            <div className="flex bg-slate-100 p-1 rounded-xl gap-0.5">
              <button onClick={() => setView('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${view === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                <LayoutGrid size={13} /> Grid
              </button>
              <button onClick={() => setView('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${view === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                <List size={13} /> List
              </button>
            </div>
          </div>

          {view === 'grid' ? (
            /* GRID VIEW */
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {/* Day headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#0f172a' }}>
                {DAYS.map((day, i) => {
                  const count = schedules.filter(s => s.day_of_week === day).length;
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
              {/* Slot columns */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', alignItems: 'start', padding: '0.875rem', gap: '0.625rem' }}>
                {DAYS.map((day, di) => {
                  const daySlots = schedules.filter(s => s.day_of_week === day).sort((a, b) => a.start_time.localeCompare(b.start_time));
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
                            <p style={{ margin: '0.05rem 0 0', fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>{fmt12(slot.end_time)}</p>
                            {slot.subject && (
                              <p style={{ margin: '0.2rem 0 0', fontSize: '0.7rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.3 }}>{slot.subject}</p>
                            )}
                            {batch?.name && (
                              <p style={{ margin: '0.1rem 0 0', fontSize: '0.63rem', color: '#6d28d9', fontWeight: 700 }}>{batch.name}</p>
                            )}
                            {sc && (
                              <span style={{ display: 'inline-block', marginTop: '0.15rem', fontSize: '0.58rem', fontWeight: 800, padding: '0.05rem 0.4rem', borderRadius: 999, background: sc.bg, color: sc.color }}>
                                {batch.shift}
                              </span>
                            )}
                            {slot.room && (
                              <p style={{ margin: '0.1rem 0 0', fontSize: '0.6rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 2 }}>
                                <MapPin size={9} /> {slot.room}
                              </p>
                            )}
                            {batch?.trainer_id?.name && (
                              <p style={{ margin: '0.05rem 0 0', fontSize: '0.6rem', color: '#94a3b8' }}>👨‍🏫 {batch.trainer_id.name}</p>
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
                const daySlots = schedules.filter(s => s.day_of_week === day).sort((a, b) => a.start_time.localeCompare(b.start_time));
                if (!daySlots.length) return null;
                return (
                  <div key={day} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    {/* Day header */}
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
                            <p style={{ margin: '0.1rem 0 0', fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>{fmt12(slot.end_time)}</p>
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
                                <span style={{ color: '#6d28d9', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
                                  <Layers size={11} /> {batch.name}
                                </span>
                              )}
                              {batch?.course_name && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                  <BookOpen size={11} /> {batch.course_name}
                                </span>
                              )}
                              {slot.room && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                  <MapPin size={11} /> {slot.room}
                                </span>
                              )}
                              {batch?.trainer_id?.name && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                  <User size={11} /> {batch.trainer_id.name}
                                </span>
                              )}
                            </p>
                          </div>
                          {/* Clock icon accent */}
                          <Clock size={18} style={{ color: `${DAY_COLORS[di]}60`, flexShrink: 0 }} />
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
    </div>
  );
}
