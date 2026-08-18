import { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { CalendarClock, Plus, X, MapPin, Clock, Users } from 'lucide-react';

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const DURATIONS = [10, 15, 20, 30];

export default function TeacherPTM() {
  const [ptms, setPtms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [slots, setSlots] = useState({});
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState({
    title: '', date: '', class_id: '', slot_start: '', slot_end: '',
    slot_duration: 15, venue: '', notes: '',
  });

  const load = () => {
    setLoading(true);
    api.get('/teacher-portal/ptm')
      .then(r => setPtms(r.data))
      .catch(() => toast.error('Failed to load PTMs'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    api.get('/school-classes').then(r => setClasses(r.data)).catch(() => {});
  }, []);

  const loadSlots = async (id) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (slots[id]) return;
    try {
      const r = await api.get(`/teacher-portal/ptm/${id}/slots`);
      setSlots(prev => ({ ...prev, [id]: r.data }));
    } catch {
      toast.error('Failed to load slots');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/teacher-portal/ptm', form);
      toast.success('PTM created successfully');
      setShowModal(false);
      setForm({ title: '', date: '', class_id: '', slot_start: '', slot_end: '', slot_duration: 15, venue: '', notes: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create PTM');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
            <CalendarClock size={20} className="text-teal-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Parent-Teacher Meetings</h1>
            <p className="text-slate-500 text-sm">Manage PTM schedules and slot bookings</p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-teal-700 transition shadow-sm">
          <Plus size={16} /> Create PTM
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
        </div>
      ) : ptms.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">
          <CalendarClock size={48} className="mx-auto mb-3 opacity-30" />
          <p>No PTMs scheduled yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {ptms.map(p => {
            const ptmSlots = slots[p._id] || [];
            const isOpen = expandedId === p._id;
            return (
              <div key={p._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-800 text-lg">{p.title}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 flex-wrap">
                        {p.class_id?.name && (
                          <span className="flex items-center gap-1"><Users size={14} /> {p.class_id.name}</span>
                        )}
                        <span className="flex items-center gap-1"><CalendarClock size={14} /> {fmt(p.date)}</span>
                        {p.venue && <span className="flex items-center gap-1"><MapPin size={14} /> {p.venue}</span>}
                        {p.slot_duration && <span className="flex items-center gap-1"><Clock size={14} /> {p.slot_duration} min slots</span>}
                        <span className="px-2 py-0.5 bg-teal-50 text-teal-700 rounded-full text-xs font-semibold">
                          {p.booked_slots || 0} booked
                        </span>
                      </div>
                      {p.notes && <p className="text-xs text-slate-500 mt-2">{p.notes}</p>}
                    </div>
                    <button onClick={() => loadSlots(p._id)} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition shrink-0">
                      {isOpen ? 'Hide Slots' : 'View Slots'}
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
                    <h4 className="font-semibold text-slate-700 mb-3 text-sm">Slot Grid</h4>
                    {ptmSlots.length === 0 ? (
                      <p className="text-slate-400 text-sm">No slots generated yet.</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {ptmSlots.map(slot => (
                          <div key={slot._id}
                            className={`rounded-xl p-3 border text-xs font-medium ${
                              slot.is_booked
                                ? 'bg-teal-50 border-teal-200 text-teal-800'
                                : 'bg-white border-slate-200 text-slate-500'
                            }`}
                          >
                            <p className="font-bold text-sm">{slot.start_time} – {slot.end_time}</p>
                            {slot.is_booked ? (
                              <div className="mt-1">
                                <p className="truncate text-teal-700">{slot.parent_name || 'Booked'}</p>
                                {slot.student_name && <p className="truncate text-teal-600 text-[10px]">({slot.student_name})</p>}
                              </div>
                            ) : (
                              <p className="mt-1 text-slate-400">Available</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-lg">Create PTM</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg transition">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">Title *</label>
                <input required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" placeholder="e.g. Term 1 PTM" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">Date *</label>
                  <input required type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">Class *</label>
                  <select required value={form.class_id} onChange={e => setForm(p => ({ ...p, class_id: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white">
                    <option value="">Select class</option>
                    {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">Start Time *</label>
                  <input required type="time" value={form.slot_start} onChange={e => setForm(p => ({ ...p, slot_start: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">End Time *</label>
                  <input required type="time" value={form.slot_end} onChange={e => setForm(p => ({ ...p, slot_end: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">Duration (min) *</label>
                  <select value={form.slot_duration} onChange={e => setForm(p => ({ ...p, slot_duration: Number(e.target.value) }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white">
                    {DURATIONS.map(d => <option key={d} value={d}>{d} min</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">Venue</label>
                <input value={form.venue} onChange={e => setForm(p => ({ ...p, venue: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" placeholder="Room number, hall name..." />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">Notes (optional)</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none" placeholder="Additional notes..." />
              </div>
              {form.slot_start && form.slot_end && form.slot_duration && (
                <div className="bg-teal-50 border border-teal-100 rounded-xl px-4 py-2 text-xs text-teal-700">
                  Slots will be auto-generated every {form.slot_duration} minutes from {form.slot_start} to {form.slot_end}
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition disabled:opacity-60">
                  {saving ? 'Creating...' : 'Create PTM'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
