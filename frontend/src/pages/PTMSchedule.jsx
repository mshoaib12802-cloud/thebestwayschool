import { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import {
  CalendarClock, Plus, Eye, Trash2, X, CheckCircle2, XCircle, Clock
} from 'lucide-react';

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-teal-400 focus:bg-white transition-colors';
const labelCls = 'block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1';

const SLOT_DURATIONS = [10, 15, 20, 30];
const STATUS_META = {
  scheduled:  { label: 'Scheduled',  cls: 'bg-sky-100 text-sky-700' },
  completed:  { label: 'Completed',  cls: 'bg-emerald-100 text-emerald-700' },
  cancelled:  { label: 'Cancelled',  cls: 'bg-red-100 text-red-700' },
};

const initForm = {
  title: '', date: '', class_id: '', teacher_id: '', venue: '',
  slot_duration: 15, start_time: '09:00', end_time: '12:00',
};

function generateSlots(start, end, duration) {
  const slots = [];
  let [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const endMins = eh * 60 + em;
  while (sh * 60 + sm + duration <= endMins) {
    const hh = String(sh).padStart(2, '0');
    const mm = String(sm).padStart(2, '0');
    slots.push(`${hh}:${mm}`);
    sm += duration;
    sh += Math.floor(sm / 60);
    sm = sm % 60;
  }
  return slots;
}

export default function PTMSchedule() {
  const [ptms, setPtms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [form, setForm] = useState(initForm);
  const [creating, setCreating] = useState(false);
  const [viewPTM, setViewPTM] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(null);

  useEffect(() => { fetchPTMs(); fetchClasses(); fetchTeachers(); }, []);
  useEffect(() => {
    document.body.style.overflow = (showCreateModal || showViewModal) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showCreateModal, showViewModal]);

  const fetchPTMs = async () => {
    setLoading(true);
    try { const { data } = await api.get('/ptm'); setPtms(data); }
    catch { toast.error('Failed to load PTMs'); }
    finally { setLoading(false); }
  };
  const fetchClasses = async () => {
    try { const { data } = await api.get('/school-classes'); setClasses(data); } catch { /* optional */ }
  };
  const fetchTeachers = async () => {
    try { const { data } = await api.get('/staff'); setTeachers(data.filter(s => s.role === 'teacher')); } catch { /* optional */ }
  };

  const create = async (e) => {
    e.preventDefault();
    const slot_times = generateSlots(form.start_time, form.end_time, parseInt(form.slot_duration));
    if (slot_times.length === 0) { toast.warn('No slots generated. Check times.'); return; }
    setCreating(true);
    try {
      await api.post('/ptm', { ...form, slot_times });
      toast.success(`PTM created with ${slot_times.length} slots`);
      setShowCreateModal(false);
      fetchPTMs();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create PTM'); }
    finally { setCreating(false); }
  };

  const openView = async (ptm) => {
    try {
      const { data } = await api.get(`/ptm/${ptm._id}`);
      setViewPTM(data);
      setShowViewModal(true);
    } catch { toast.error('Failed to load PTM details'); }
  };

  const updateStatus = async (ptmId, status) => {
    setUpdatingStatus(ptmId);
    try {
      await api.put(`/ptm/${ptmId}`, { status });
      toast.success(`Status updated to ${status}`);
      fetchPTMs();
      if (viewPTM?._id === ptmId) setViewPTM(prev => ({ ...prev, status }));
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update status'); }
    finally { setUpdatingStatus(null); }
  };

  const deletePTM = async (id) => {
    if (!window.confirm('Delete this PTM?')) return;
    try { await api.delete(`/ptm/${id}`); toast.success('Deleted'); fetchPTMs(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to delete'); }
  };

  const previewSlots = generateSlots(form.start_time, form.end_time, parseInt(form.slot_duration) || 15);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-600 flex items-center justify-center shadow">
            <CalendarClock className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">PTM Schedule</h1>
            <p className="text-sm text-slate-500">Parent-Teacher Meeting management</p>
          </div>
        </div>
        <button onClick={() => { setForm(initForm); setShowCreateModal(true); }}
          className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-teal-700 text-sm shadow">
          <Plus className="w-4 h-4" /> Create PTM
        </button>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-bold text-slate-700">PTM Sessions</h2>
        </div>
        {loading ? (
          <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" /></div>
        ) : ptms.length === 0 ? (
          <div className="text-center py-16 text-slate-400">No PTMs scheduled yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3">Title</th>
                <th className="text-left px-4 py-3">Class</th>
                <th className="text-left px-4 py-3">Teacher</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Venue</th>
                <th className="text-center px-4 py-3">Slots</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {ptms.map(p => {
                  const meta = STATUS_META[p.status] || STATUS_META.scheduled;
                  const booked = (p.slots || []).filter(s => s.is_booked).length;
                  const total = (p.slots || []).length;
                  return (
                    <tr key={p._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-800">{p.title}</td>
                      <td className="px-4 py-3 text-slate-600">{p.class_name || classes.find(c => c._id === p.class_id)?.name || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{p.teacher_name || teachers.find(t => t._id === p.teacher_id)?.name || '—'}</td>
                      <td className="px-4 py-3 text-slate-500">{p.date ? new Date(p.date).toLocaleDateString() : '—'}</td>
                      <td className="px-4 py-3 text-slate-500">{p.venue || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs font-bold text-slate-700">{booked}/{total}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${meta.cls}`}>{meta.label}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => openView(p)} className="inline-flex items-center gap-1 bg-teal-600 text-white px-2.5 py-1.5 rounded-xl text-xs font-semibold hover:bg-teal-700 mr-1">
                          <Eye className="w-3 h-3" /> View
                        </button>
                        {p.status === 'scheduled' && (
                          <>
                            <button onClick={() => updateStatus(p._id, 'completed')} disabled={updatingStatus === p._id}
                              className="inline-flex items-center gap-1 bg-emerald-600 text-white px-2.5 py-1.5 rounded-xl text-xs font-semibold hover:bg-emerald-700 mr-1 disabled:opacity-60">
                              <CheckCircle2 className="w-3 h-3" />
                            </button>
                            <button onClick={() => updateStatus(p._id, 'cancelled')} disabled={updatingStatus === p._id}
                              className="inline-flex items-center gap-1 bg-red-500 text-white px-2.5 py-1.5 rounded-xl text-xs font-semibold hover:bg-red-600 mr-1 disabled:opacity-60">
                              <XCircle className="w-3 h-3" />
                            </button>
                          </>
                        )}
                        <button onClick={() => deletePTM(p._id)} className="inline-flex p-1.5 hover:bg-red-50 rounded-lg text-red-400">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Create PTM</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <form onSubmit={create} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div><label className={labelCls}>Title *</label><input required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className={inputCls} placeholder="e.g. Term 1 PTM" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Class *</label>
                    <select required value={form.class_id} onChange={e => setForm(p => ({ ...p, class_id: e.target.value }))} className={inputCls}>
                      <option value="">Select Class</option>
                      {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Teacher</label>
                    <select value={form.teacher_id} onChange={e => setForm(p => ({ ...p, teacher_id: e.target.value }))} className={inputCls}>
                      <option value="">Select Teacher</option>
                      {teachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={labelCls}>Date *</label><input required type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className={inputCls} /></div>
                  <div><label className={labelCls}>Venue</label><input value={form.venue} onChange={e => setForm(p => ({ ...p, venue: e.target.value }))} className={inputCls} placeholder="Room / Hall" /></div>
                </div>
                <div>
                  <label className={labelCls}>Slot Duration (minutes)</label>
                  <div className="flex gap-2">
                    {SLOT_DURATIONS.map(d => (
                      <button key={d} type="button" onClick={() => setForm(p => ({ ...p, slot_duration: d }))}
                        className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${form.slot_duration === d ? 'bg-teal-600 text-white border-teal-600' : 'border-slate-200 text-slate-500 hover:border-teal-300'}`}>
                        {d} min
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={labelCls}>Start Time *</label><input required type="time" value={form.start_time} onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} className={inputCls} /></div>
                  <div><label className={labelCls}>End Time *</label><input required type="time" value={form.end_time} onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))} className={inputCls} /></div>
                </div>
                {previewSlots.length > 0 && (
                  <div className="bg-teal-50 rounded-xl p-3">
                    <div className="text-xs font-bold text-teal-700 mb-2"><Clock className="w-3.5 h-3.5 inline mr-1" />{previewSlots.length} slots will be created</div>
                    <div className="flex flex-wrap gap-1.5">
                      {previewSlots.slice(0, 12).map(s => <span key={s} className="text-xs bg-white text-teal-700 px-2 py-0.5 rounded-lg font-semibold border border-teal-200">{s}</span>)}
                      {previewSlots.length > 12 && <span className="text-xs text-teal-500 font-semibold">+{previewSlots.length - 12} more</span>}
                    </div>
                  </div>
                )}
              </div>
              <div className="p-5 border-t border-slate-100 flex gap-3">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 text-sm">Cancel</button>
                <button type="submit" disabled={creating} className="flex-1 bg-teal-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-teal-700 text-sm disabled:opacity-60">
                  {creating ? 'Creating…' : 'Create PTM'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && viewPTM && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-800">{viewPTM.title}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{viewPTM.venue} — {viewPTM.date ? new Date(viewPTM.date).toLocaleDateString() : ''}</p>
              </div>
              <button onClick={() => setShowViewModal(false)} className="p-1.5 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {(viewPTM.slots || []).length === 0 ? (
                <div className="text-center py-10 text-slate-400">No slots available.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(viewPTM.slots || []).map((slot, idx) => (
                    <div key={idx} className={`flex items-center gap-3 p-3 rounded-xl border ${slot.is_booked ? 'border-teal-200 bg-teal-50' : 'border-slate-100 bg-slate-50'}`}>
                      <div className="text-sm font-bold text-teal-700 w-14 shrink-0">{slot.time}</div>
                      {slot.is_booked ? (
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-slate-700 truncate">{slot.parent_name}</div>
                          <div className="text-xs text-slate-400 truncate">{slot.student_name}</div>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400 italic">Available</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
