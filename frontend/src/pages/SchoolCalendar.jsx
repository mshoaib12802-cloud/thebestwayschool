import { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import {
  CalendarDays, Plus, Edit2, Trash2, X, ChevronLeft, ChevronRight
} from 'lucide-react';

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-teal-400 focus:bg-white transition-colors';
const labelCls = 'block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1';

const EVENT_TYPES = {
  holiday:  { label: 'Holiday',  cls: 'bg-red-100 text-red-700',     dot: '#ef4444' },
  exam:     { label: 'Exam',     cls: 'bg-indigo-100 text-indigo-700', dot: '#6366f1' },
  ptm:      { label: 'PTM',      cls: 'bg-teal-100 text-teal-700',    dot: '#0d9488' },
  sports:   { label: 'Sports',   cls: 'bg-green-100 text-green-700',  dot: '#22c55e' },
  cultural: { label: 'Cultural', cls: 'bg-purple-100 text-purple-700', dot: '#a855f7' },
  meeting:  { label: 'Meeting',  cls: 'bg-amber-100 text-amber-700',  dot: '#f59e0b' },
  other:    { label: 'Other',    cls: 'bg-slate-100 text-slate-600',  dot: '#94a3b8' },
};

const AUDIENCES = ['all', 'students', 'parents', 'teachers', 'staff'];
const PRESET_COLORS = ['#ef4444', '#6366f1', '#0d9488', '#22c55e', '#a855f7', '#f59e0b', '#94a3b8'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const initialForm = {
  title: '', description: '', event_type: 'other',
  start_date: '', end_date: '', is_all_day: true,
  start_time: '', end_time: '', audience: ['all'], color: '#0d9488',
};

export default function SchoolCalendar() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());

  useEffect(() => { fetchEvents(); }, []);
  useEffect(() => {
    document.body.style.overflow = showModal ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showModal]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/events');
      setEvents(data);
    } catch { toast.error('Failed to load events'); }
    finally { setLoading(false); }
  };

  const openAdd = () => {
    setEditId(null);
    setForm({ ...initialForm, start_date: new Date().toISOString().split('T')[0] });
    setShowModal(true);
  };
  const openEdit = (ev) => {
    setEditId(ev._id);
    setForm({
      title: ev.title, description: ev.description || '',
      event_type: ev.event_type || 'other',
      start_date: ev.start_date ? ev.start_date.split('T')[0] : '',
      end_date: ev.end_date ? ev.end_date.split('T')[0] : '',
      is_all_day: ev.is_all_day !== false,
      start_time: ev.start_time || '', end_time: ev.end_time || '',
      audience: ev.audience || ['all'],
      color: ev.color || '#0d9488',
    });
    setShowModal(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, end_date: form.end_date || form.start_date };
      if (editId) { await api.put(`/events/${editId}`, payload); toast.success('Event updated'); }
      else { await api.post('/events', payload); toast.success('Event created'); }
      setShowModal(false);
      fetchEvents();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const deleteEvent = async (id) => {
    if (!window.confirm('Delete this event?')) return;
    try { await api.delete(`/events/${id}`); toast.success('Deleted'); fetchEvents(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to delete'); }
  };

  const toggleAudience = (aud) => {
    setForm(prev => {
      const has = prev.audience.includes(aud);
      const next = has ? prev.audience.filter(a => a !== aud) : [...prev.audience, aud];
      return { ...prev, audience: next.length === 0 ? ['all'] : next };
    });
  };

  // Calendar grid
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const prevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); };
  const nextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); };

  const eventsForDay = (day) => {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(ev => {
      const start = ev.start_date?.split('T')[0];
      const end = (ev.end_date || ev.start_date)?.split('T')[0];
      return start <= dateStr && dateStr <= end;
    });
  };

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-600 flex items-center justify-center shadow">
            <CalendarDays className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">School Calendar</h1>
            <p className="text-sm text-slate-500">Events, holidays and important dates</p>
          </div>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-teal-700 text-sm shadow">
          <Plus className="w-4 h-4" /> Add Event
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Events List */}
        <div className="lg:col-span-2 space-y-3">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="p-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-700 text-sm">All Events</h2>
            </div>
            {loading ? (
              <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" /></div>
            ) : events.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">No events yet.</div>
            ) : (
              <div className="divide-y divide-slate-50 max-h-[600px] overflow-y-auto">
                {events.map(ev => {
                  const meta = EVENT_TYPES[ev.event_type] || EVENT_TYPES.other;
                  return (
                    <div key={ev._id} className="p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1">
                          <div className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ background: ev.color || meta.dot }} />
                          <div className="flex-1">
                            <div className="font-semibold text-slate-800 text-sm">{ev.title}</div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${meta.cls}`}>{meta.label}</span>
                              <span className="text-xs text-slate-400">{ev.start_date ? new Date(ev.start_date).toLocaleDateString() : ''}</span>
                            </div>
                            {ev.audience?.length > 0 && (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {ev.audience.map(a => <span key={a} className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full capitalize">{a}</span>)}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => openEdit(ev)} className="p-1 hover:bg-teal-50 rounded-lg text-teal-600"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteEvent(ev._id)} className="p-1 hover:bg-red-50 rounded-lg text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <button onClick={prevMonth} className="p-1.5 hover:bg-slate-100 rounded-xl"><ChevronLeft className="w-5 h-5 text-slate-500" /></button>
              <h2 className="font-bold text-slate-700">{monthNames[calMonth]} {calYear}</h2>
              <button onClick={nextMonth} className="p-1.5 hover:bg-slate-100 rounded-xl"><ChevronRight className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="p-3">
              <div className="grid grid-cols-7 mb-1">
                {DAYS.map(d => <div key={d} className="text-center text-xs font-bold text-slate-400 py-1">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dayEvs = eventsForDay(day);
                  const today = new Date();
                  const isToday = today.getDate() === day && today.getMonth() === calMonth && today.getFullYear() === calYear;
                  return (
                    <div key={day} className={`min-h-[60px] rounded-lg p-1 border transition-colors ${isToday ? 'border-teal-400 bg-teal-50' : 'border-transparent hover:bg-slate-50'}`}>
                      <div className={`text-xs font-bold mb-0.5 ${isToday ? 'text-teal-700' : 'text-slate-600'}`}>{day}</div>
                      <div className="space-y-0.5">
                        {dayEvs.slice(0, 2).map(ev => (
                          <div key={ev._id} className="text-[9px] font-semibold px-1 py-0.5 rounded truncate text-white"
                            style={{ background: ev.color || EVENT_TYPES[ev.event_type]?.dot || '#94a3b8' }}>
                            {ev.title}
                          </div>
                        ))}
                        {dayEvs.length > 2 && <div className="text-[9px] text-slate-400 font-semibold">+{dayEvs.length - 2} more</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Legend */}
            <div className="px-4 pb-4 flex flex-wrap gap-3">
              {Object.entries(EVENT_TYPES).map(([k, v]) => (
                <div key={k} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: v.dot }} />
                  <span className="text-[10px] text-slate-500">{v.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">{editId ? 'Edit Event' : 'New Event'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <form onSubmit={save} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div>
                  <label className={labelCls}>Title *</label>
                  <input required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className={inputCls} placeholder="Event title" />
                </div>
                <div>
                  <label className={labelCls}>Description</label>
                  <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Event Type</label>
                    <select value={form.event_type} onChange={e => setForm(p => ({ ...p, event_type: e.target.value }))} className={inputCls}>
                      {Object.entries(EVENT_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Color</label>
                    <div className="flex gap-1.5 flex-wrap mt-1">
                      {PRESET_COLORS.map(c => (
                        <button key={c} type="button" onClick={() => setForm(p => ({ ...p, color: c }))}
                          className={`w-6 h-6 rounded-full border-2 transition-all ${form.color === c ? 'border-slate-700 scale-110' : 'border-transparent'}`}
                          style={{ background: c }} />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Start Date *</label>
                    <input required type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>End Date</label>
                    <input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} className={inputCls} />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={form.is_all_day} onChange={e => setForm(p => ({ ...p, is_all_day: e.target.checked }))} className="rounded" />
                  All Day Event
                </label>
                {!form.is_all_day && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Start Time</label>
                      <input type="time" value={form.start_time} onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>End Time</label>
                      <input type="time" value={form.end_time} onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))} className={inputCls} />
                    </div>
                  </div>
                )}
                <div>
                  <label className={labelCls}>Audience</label>
                  <div className="flex flex-wrap gap-2">
                    {AUDIENCES.map(aud => (
                      <button key={aud} type="button" onClick={() => toggleAudience(aud)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize border transition-all ${form.audience.includes(aud) ? 'bg-teal-600 text-white border-teal-600' : 'border-slate-200 text-slate-500 hover:border-teal-300'}`}>
                        {aud}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-5 border-t border-slate-100 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-teal-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-teal-700 text-sm disabled:opacity-60">
                  {saving ? 'Saving…' : editId ? 'Update' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
