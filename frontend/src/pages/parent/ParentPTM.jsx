import { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { CalendarClock, Users, MapPin, CheckCircle2, Clock } from 'lucide-react';

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export default function ParentPTM() {
  const [children, setChildren]   = useState([]);
  const [selected, setSelected]   = useState('');
  const [ptms, setPtms]           = useState([]);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [loadingPtms, setLoadingPtms]         = useState(false);
  const [expandedId, setExpandedId]   = useState(null);
  const [slots, setSlots]             = useState({});
  const [loadingSlots, setLoadingSlots] = useState({});
  const [booking, setBooking]         = useState(null);

  useEffect(() => {
    api.get('/parent-portal/children')
      .then(r => { setChildren(r.data); if (r.data.length) setSelected(r.data[0]._id); })
      .catch(() => toast.error('Failed to load children'))
      .finally(() => setLoadingChildren(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoadingPtms(true);
    api.get(`/parent-portal/children/${selected}/ptm`)
      .then(r => setPtms(r.data))
      .catch(() => toast.error('Failed to load PTMs'))
      .finally(() => setLoadingPtms(false));
  }, [selected]);

  const toggleSlots = async (ptmId) => {
    if (expandedId === ptmId) { setExpandedId(null); return; }
    setExpandedId(ptmId);
    if (slots[ptmId]) return;
    setLoadingSlots(p => ({ ...p, [ptmId]: true }));
    try {
      const r = await api.get(`/parent-portal/ptm/${ptmId}/slots`);
      setSlots(prev => ({ ...prev, [ptmId]: r.data }));
    } catch {
      toast.error('Failed to load slots');
    } finally {
      setLoadingSlots(p => ({ ...p, [ptmId]: false }));
    }
  };

  const bookSlot = async (ptmId, slotId) => {
    if (booking) return;
    setBooking(slotId);
    try {
      await api.post('/parent-portal/ptm/book-slot', {
        ptm_id: ptmId,
        slot_id: slotId,
        student_id: selected,
      });
      toast.success('Slot booked successfully');
      // Refresh slots
      const r = await api.get(`/parent-portal/ptm/${ptmId}/slots`);
      setSlots(prev => ({ ...prev, [ptmId]: r.data }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to book slot');
    } finally {
      setBooking(null);
    }
  };

  if (loadingChildren) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
    </div>
  );

  if (!children.length) return (
    <div className="text-center py-16 text-slate-400">
      <Users size={48} className="mx-auto mb-3 opacity-30" />
      <p>No children linked to your account.</p>
    </div>
  );

  const myBooking = (ptmSlots) => ptmSlots?.find(s => s.student_id === selected && s.is_booked);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
          <CalendarClock size={20} className="text-teal-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Parent-Teacher Meetings</h1>
          <p className="text-slate-500 text-sm">View and book PTM slots for your child</p>
        </div>
      </div>

      {/* Child selector */}
      {children.length > 1 && (
        <div className="flex gap-3 mb-6 flex-wrap">
          {children.map(c => (
            <button key={c._id} onClick={() => setSelected(c._id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm border transition-all ${selected === c._id ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-teal-50'}`}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      {loadingPtms ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
        </div>
      ) : ptms.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">
          <CalendarClock size={48} className="mx-auto mb-3 opacity-30" />
          <p>No PTMs scheduled for your child's class</p>
        </div>
      ) : (
        <div className="space-y-4">
          {ptms.map(p => {
            const ptmSlots = slots[p._id] || [];
            const isOpen = expandedId === p._id;
            const bookedSlot = myBooking(ptmSlots);
            return (
              <div key={p._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-bold text-slate-800 text-lg">{p.title}</h3>
                        {bookedSlot && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-700">
                            <CheckCircle2 size={11} /> Booked
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-500 flex-wrap mt-1">
                        {(p.teacher_id?.name || p.teacher) && (
                          <span className="flex items-center gap-1"><Users size={14} /> {p.teacher_id?.name || p.teacher}</span>
                        )}
                        <span className="flex items-center gap-1"><CalendarClock size={14} /> {fmt(p.date)}</span>
                        {p.venue && <span className="flex items-center gap-1"><MapPin size={14} /> {p.venue}</span>}
                      </div>
                      {bookedSlot && (
                        <div className="mt-2 bg-teal-50 border border-teal-100 rounded-xl px-3 py-2 text-xs text-teal-700">
                          Your booked slot: <strong>{bookedSlot.start_time} – {bookedSlot.end_time}</strong>
                        </div>
                      )}
                    </div>
                    <button onClick={() => toggleSlots(p._id)} className="shrink-0 flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition">
                      {isOpen ? 'Hide Slots' : 'Book Slot'}
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
                    <h4 className="font-semibold text-slate-700 mb-3 text-sm">Available Time Slots</h4>
                    {loadingSlots[p._id] ? (
                      <div className="flex items-center gap-2 text-slate-400 text-sm">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600" />
                        Loading slots...
                      </div>
                    ) : ptmSlots.length === 0 ? (
                      <p className="text-slate-400 text-sm">No slots available</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {ptmSlots.map(slot => {
                          const isMySlot = slot.student_id === selected && slot.is_booked;
                          return (
                            <div key={slot._id}
                              className={`rounded-xl p-3 border text-xs transition ${
                                isMySlot
                                  ? 'bg-teal-100 border-teal-300 text-teal-800'
                                  : slot.is_booked
                                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                                    : 'bg-white border-slate-200 hover:border-teal-400 hover:bg-teal-50 cursor-pointer'
                              }`}
                              onClick={() => !slot.is_booked && bookSlot(p._id, slot._id)}
                            >
                              <p className="font-bold text-sm flex items-center gap-1">
                                <Clock size={11} /> {slot.start_time}–{slot.end_time}
                              </p>
                              {isMySlot ? (
                                <p className="mt-1 text-teal-700 flex items-center gap-1"><CheckCircle2 size={11} /> Your slot</p>
                              ) : slot.is_booked ? (
                                <p className="mt-1 text-slate-400">Booked</p>
                              ) : (
                                <p className="mt-1 text-teal-600">{booking === slot._id ? 'Booking...' : 'Tap to book'}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
