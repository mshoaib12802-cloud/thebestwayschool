import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api';
import { toast } from 'react-toastify';
import { confirm } from '../utils/confirm';
import {
  CalendarDays, Plus, Trash2, X, CheckCircle2, Users, Clock,
  Edit2, Power, Search, BookOpen, LayoutGrid, List, Eye, Layers,
  UserPlus, UserMinus
} from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const SHIFT_META = {
  Morning:   { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b' },
  Afternoon: { bg: '#dbeafe', text: '#1e40af', dot: '#3b82f6' },
  Evening:   { bg: '#ede9fe', text: '#4c1d95', dot: '#8b5cf6' },
  Weekend:   { bg: '#dcfce7', text: '#14532d', dot: '#22c55e' },
};

const DAY_COLORS = [
  '#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'
];

const inputStyle = {
  width: '100%', background: '#f8fafc', border: '1.5px solid #e2e8f0',
  borderRadius: '0.75rem', padding: '0.75rem 1rem', fontSize: '0.9rem',
  fontWeight: 500, color: '#334155', outline: 'none', boxSizing: 'border-box'
};
const labelStyle = {
  display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8',
  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem'
};

const batchInit = { name: '', course_id: '', course_name: '', shift: 'Morning', start_date: '', end_date: '', trainer_id: '', capacity: 30 };
const scheduleInit = { batch_id: '', day_of_week: 'Monday', start_time: '09:00', end_time: '11:00', room: '', subject: '' };

const Timetable = () => {
  const [batches, setBatches] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('batches');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [search, setSearch] = useState('');
  const [timetableView, setTimetableView] = useState('grid'); // 'grid' | 'list'

  const [showBatchModal, setShowBatchModal] = useState(false);
  const [editBatchId, setEditBatchId] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [batchStudents, setBatchStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [viewingBatch, setViewingBatch] = useState(null);
  const [enrollSearch, setEnrollSearch] = useState('');
  const [eligibleStudents, setEligibleStudents] = useState([]);
  const [enrollTab, setEnrollTab] = useState('enrolled'); // 'enrolled' | 'add'
  const [enrolling, setEnrolling] = useState(null); // student_id being enrolled/removed

  const [batchForm, setBatchForm] = useState(batchInit);
  const [scheduleForm, setScheduleForm] = useState(scheduleInit);

  useEffect(() => { fetchBatches(); fetchTrainers(); fetchCourses(); }, []);
  useEffect(() => { fetchSchedules(); }, [selectedBatch]);

  const fetchCourses = async () => {
    try { const { data } = await api.get('/courses'); setCourses(data); } catch {}
  };

  const fetchBatches = async () => {
    setLoading(true);
    try { const { data } = await api.get('/batches'); setBatches(data); }
    catch { toast.error('Failed to load batches'); }
    finally { setLoading(false); }
  };

  const fetchTrainers = async () => {
    try { const { data } = await api.get('/staff/trainers'); setTrainers(data); } catch {}
  };

  const fetchSchedules = async () => {
    try {
      const url = selectedBatch ? `/batches/schedules?batch_id=${selectedBatch}` : '/batches/schedules';
      const { data } = await api.get(url);
      setSchedules(data);
    } catch {}
  };

  const openCreateBatch = () => {
    setEditBatchId(null);
    setBatchForm(batchInit);
    setShowBatchModal(true);
  };

  const openEditBatch = (batch) => {
    setEditBatchId(batch._id);
    setBatchForm({
      name: batch.name,
      course_id: batch.course_id?._id || batch.course_id || '',
      course_name: batch.course_name,
      shift: batch.shift,
      start_date: batch.start_date ? batch.start_date.slice(0, 10) : '',
      end_date: batch.end_date ? batch.end_date.slice(0, 10) : '',
      trainer_id: batch.trainer_id?._id || batch.trainer_id || '',
      capacity: batch.capacity,
    });
    setShowBatchModal(true);
  };

  const handleSaveBatch = async (e) => {
    e.preventDefault();
    const payload = { ...batchForm, capacity: Number(batchForm.capacity) };
    if (!payload.course_name && payload.course_id) {
      const c = courses.find(x => x._id === payload.course_id);
      if (c) payload.course_name = c.name;
    }
    try {
      if (editBatchId) {
        await api.put(`/batches/${editBatchId}`, payload);
        toast.success('Batch updated!');
      } else {
        await api.post('/batches', payload);
        toast.success('Batch created!');
      }
      setShowBatchModal(false);
      setBatchForm(batchInit);
      setEditBatchId(null);
      fetchBatches();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDeleteBatch = async (id) => {
    if (!await confirm('Delete this batch and all its schedule slots?', { title: 'Delete Batch' })) return;
    try { await api.delete(`/batches/${id}`); toast.success('Batch deleted'); fetchBatches(); fetchSchedules(); }
    catch { toast.error('Failed'); }
  };

  const handleToggleActive = async (id) => {
    try {
      await api.put(`/batches/${id}/toggle-active`);
      fetchBatches();
    } catch { toast.error('Failed'); }
  };

  const openStudents = async (batch) => {
    setViewingBatch(batch);
    setShowStudentsModal(true);
    setStudentsLoading(true);
    setBatchStudents([]);
    setEligibleStudents([]);
    setEnrollSearch('');
    setEnrollTab('enrolled');
    try {
      const [enrolledRes, allRes] = await Promise.all([
        api.get(`/batches/${batch._id}/students`),
        api.get('/students'),
      ]);
      const enrolled = enrolledRes.data;
      setBatchStudents(enrolled);
      const enrolledIds = new Set(enrolled.map(s => s._id));
      // eligible = active students in this course but not yet in this batch
      const eligible = allRes.data.filter(s =>
        s.isActive &&
        !enrolledIds.has(s._id) &&
        s.courses?.some(c => c.course_name === batch.course_name)
      );
      setEligibleStudents(eligible);
    } catch { toast.error('Failed to load students'); }
    finally { setStudentsLoading(false); }
  };

  const handleEnroll = async (studentId) => {
    setEnrolling(studentId);
    try {
      await api.post(`/batches/${viewingBatch._id}/enroll`, { student_id: studentId });
      toast.success('Student enrolled!');
      await openStudents(viewingBatch);
      fetchBatches(); // refresh enrolled_count on cards
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setEnrolling(null); }
  };

  const handleUnenroll = async (studentId) => {
    if (!await confirm('Remove this student from the batch?', { title: 'Remove Student', confirmText: 'Remove' })) return;
    setEnrolling(studentId);
    try {
      await api.delete(`/batches/${viewingBatch._id}/unenroll/${studentId}`);
      toast.success('Student removed from batch');
      await openStudents(viewingBatch);
      fetchBatches();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setEnrolling(null); }
  };

  const handleAddSchedule = async (e) => {
    e.preventDefault();
    try {
      await api.post('/batches/schedules', scheduleForm);
      toast.success('Schedule slot added!');
      setShowScheduleModal(false);
      setScheduleForm(scheduleInit);
      fetchSchedules();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDeleteSchedule = async (id) => {
    try { await api.delete(`/batches/schedules/${id}`); toast.success('Slot removed'); fetchSchedules(); }
    catch { toast.error('Failed'); }
  };

  const filteredBatches = batches.filter(b =>
    !search || b.name.toLowerCase().includes(search.toLowerCase()) || b.course_name?.toLowerCase().includes(search.toLowerCase())
  );

  // Only show trainers assigned to the selected course
  const courseTrainers = batchForm.course_name
    ? trainers.filter(t => t.assigned_courses?.includes(batchForm.course_name))
    : [];

  const activeBatches = batches.filter(b => b.is_active).length;
  const totalEnrolled = batches.reduce((s, b) => s + (b.enrolled_count || 0), 0);
  const totalSlots = batches.reduce((s, b) => s + (b.slot_count || 0), 0);

  // ---- Batch Modal ----
  const batchModal = showBatchModal ? createPortal(
    <div onClick={e => { if (e.target === e.currentTarget) setShowBatchModal(false); }}
      style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backgroundColor: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(6px)' }}>
      <div style={{ width: '100%', maxWidth: '580px', backgroundColor: '#fff', borderRadius: '1.75rem', boxShadow: '0 32px 80px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
          <div>
            <p style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
              {editBatchId ? 'Edit' : 'New'} Batch
            </p>
            <h3 style={{ margin: '0.2rem 0 0', fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>
              {editBatchId ? 'Update Batch' : 'Create New Batch'}
            </h3>
          </div>
          <button onClick={() => setShowBatchModal(false)} style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', cursor: 'pointer', color: '#fff' }}><X size={20}/></button>
        </div>
        <form onSubmit={handleSaveBatch} style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Batch Name *</label>
            <input required value={batchForm.name} placeholder="e.g. Morning Batch — June 2026" onChange={e => setBatchForm({ ...batchForm, name: e.target.value })} style={inputStyle}/>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Course *</label>
              <select required value={batchForm.course_id} onChange={e => {
                const selected = courses.find(c => c._id === e.target.value);
                setBatchForm({ ...batchForm, course_id: e.target.value, course_name: selected?.name || '', trainer_id: '' });
              }} style={inputStyle}>
                <option value="">— Select Course —</option>
                {courses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Shift</label>
              <select value={batchForm.shift} onChange={e => setBatchForm({ ...batchForm, shift: e.target.value })} style={inputStyle}>
                {['Morning','Afternoon','Evening','Weekend'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Start Date</label>
              <input type="date" value={batchForm.start_date} onChange={e => setBatchForm({ ...batchForm, start_date: e.target.value })} style={inputStyle}/>
            </div>
            <div>
              <label style={labelStyle}>End Date</label>
              <input type="date" value={batchForm.end_date} onChange={e => setBatchForm({ ...batchForm, end_date: e.target.value })} style={inputStyle}/>
            </div>
            <div>
              <label style={labelStyle}>Trainer</label>
              {!batchForm.course_id ? (
                <div style={{ ...inputStyle, color: '#94a3b8', cursor: 'default' }}>Select a course first</div>
              ) : courseTrainers.length === 0 ? (
                <div style={{ ...inputStyle, color: '#f97316', background: '#fff7ed', border: '1.5px solid #fed7aa', cursor: 'default', fontSize: '0.82rem' }}>
                  No trainers assigned to this course
                </div>
              ) : (
                <select value={batchForm.trainer_id} onChange={e => setBatchForm({ ...batchForm, trainer_id: e.target.value })} style={inputStyle}>
                  <option value="">— No Trainer —</option>
                  {courseTrainers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
              )}
            </div>
            <div>
              <label style={labelStyle}>Capacity</label>
              <input type="number" min="1" value={batchForm.capacity} onChange={e => setBatchForm({ ...batchForm, capacity: e.target.value })} style={inputStyle}/>
            </div>
          </div>
          <button type="submit" style={{ background: 'linear-gradient(135deg, #0f172a, #1e40af)', color: '#fff', padding: '0.9rem', borderRadius: '0.875rem', fontSize: '0.95rem', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: '0.5rem' }}>
            <CheckCircle2 size={20} color="#34d399"/> {editBatchId ? 'Save Changes' : 'Create Batch'}
          </button>
        </form>
      </div>
    </div>, document.body
  ) : null;

  // ---- Schedule Modal ----
  const scheduleModal = showScheduleModal ? createPortal(
    <div onClick={e => { if (e.target === e.currentTarget) setShowScheduleModal(false); }}
      style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backgroundColor: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(6px)' }}>
      <div style={{ width: '100%', maxWidth: '480px', backgroundColor: '#fff', borderRadius: '1.75rem', boxShadow: '0 32px 80px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #4f46e5, #6366f1)' }}>
          <div>
            <p style={{ color: '#c7d2fe', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Timetable</p>
            <h3 style={{ margin: '0.2rem 0 0', fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>Add Schedule Slot</h3>
          </div>
          <button onClick={() => setShowScheduleModal(false)} style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', cursor: 'pointer', color: '#fff' }}><X size={20}/></button>
        </div>
        <form onSubmit={handleAddSchedule} style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Batch *</label>
            <select required value={scheduleForm.batch_id} onChange={e => setScheduleForm({ ...scheduleForm, batch_id: e.target.value })} style={inputStyle}>
              <option value="">— Select Batch —</option>
              {batches.map(b => <option key={b._id} value={b._id}>{b.name} ({b.course_name})</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Day *</label>
              <select required value={scheduleForm.day_of_week} onChange={e => setScheduleForm({ ...scheduleForm, day_of_week: e.target.value })} style={inputStyle}>
                {DAYS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Subject</label>
              <input value={scheduleForm.subject} placeholder="e.g. HTML/CSS" onChange={e => setScheduleForm({ ...scheduleForm, subject: e.target.value })} style={inputStyle}/>
            </div>
            <div>
              <label style={labelStyle}>Start Time *</label>
              <input required type="time" value={scheduleForm.start_time} onChange={e => setScheduleForm({ ...scheduleForm, start_time: e.target.value })} style={inputStyle}/>
            </div>
            <div>
              <label style={labelStyle}>End Time *</label>
              <input required type="time" value={scheduleForm.end_time} onChange={e => setScheduleForm({ ...scheduleForm, end_time: e.target.value })} style={inputStyle}/>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Room</label>
              <input value={scheduleForm.room} placeholder="e.g. Room A, Lab 2" onChange={e => setScheduleForm({ ...scheduleForm, room: e.target.value })} style={inputStyle}/>
            </div>
          </div>
          <button type="submit" style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: '#fff', padding: '0.9rem', borderRadius: '0.875rem', fontSize: '0.95rem', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Plus size={18}/> Add Slot
          </button>
        </form>
      </div>
    </div>, document.body
  ) : null;

  // ---- Students Modal ----
  const filteredEligible = eligibleStudents.filter(s =>
    !enrollSearch || s.full_name.toLowerCase().includes(enrollSearch.toLowerCase()) || s.roll_number?.includes(enrollSearch)
  );

  const studentsModal = showStudentsModal ? createPortal(
    <div onClick={e => { if (e.target === e.currentTarget) setShowStudentsModal(false); }}
      style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backgroundColor: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(6px)' }}>
      <div style={{ width: '100%', maxWidth: '540px', backgroundColor: '#fff', borderRadius: '1.75rem', boxShadow: '0 32px 80px rgba(0,0,0,0.3)', overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '1.25rem 1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #0f172a, #1e293b)', flexShrink: 0 }}>
          <div>
            <p style={{ color: '#94a3b8', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Batch Enrollment</p>
            <h3 style={{ margin: '0.2rem 0 0', fontSize: '1.15rem', fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>{viewingBatch?.name}</h3>
            <p style={{ margin: '0.15rem 0 0', color: '#64748b', fontSize: '0.78rem', fontWeight: 600 }}>
              {viewingBatch?.course_name} &nbsp;·&nbsp; {batchStudents.length}/{viewingBatch?.capacity} seats
            </p>
          </div>
          <button onClick={() => setShowStudentsModal(false)} style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', cursor: 'pointer', color: '#fff' }}><X size={20}/></button>
        </div>

        {/* Capacity bar */}
        {viewingBatch?.capacity > 0 && (
          <div style={{ padding: '0.5rem 1.75rem', background: '#0f172a', flexShrink: 0 }}>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, #2dd4bf, #6366f1)', width: `${Math.min(100, Math.round((batchStudents.length / viewingBatch.capacity) * 100))}%`, transition: 'width 0.5s' }}/>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
          <button onClick={() => setEnrollTab('enrolled')}
            style={{ flex: 1, padding: '0.875rem', fontWeight: 700, fontSize: '0.85rem', border: 'none', cursor: 'pointer', background: enrollTab === 'enrolled' ? '#fff' : '#f8fafc', color: enrollTab === 'enrolled' ? '#6366f1' : '#94a3b8', borderBottom: enrollTab === 'enrolled' ? '2px solid #6366f1' : '2px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Users size={15}/> Enrolled
            <span style={{ background: '#ede9fe', color: '#6d28d9', fontSize: '0.68rem', fontWeight: 800, padding: '0.1rem 0.5rem', borderRadius: 999 }}>{batchStudents.length}</span>
          </button>
          <button onClick={() => setEnrollTab('add')}
            style={{ flex: 1, padding: '0.875rem', fontWeight: 700, fontSize: '0.85rem', border: 'none', cursor: 'pointer', background: enrollTab === 'add' ? '#fff' : '#f8fafc', color: enrollTab === 'add' ? '#10b981' : '#94a3b8', borderBottom: enrollTab === 'add' ? '2px solid #10b981' : '2px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <UserPlus size={15}/> Add Student
            {eligibleStudents.length > 0 && (
              <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '0.68rem', fontWeight: 800, padding: '0.1rem 0.5rem', borderRadius: 999 }}>{eligibleStudents.length}</span>
            )}
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {studentsLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 140 }}>
              <div style={{ width: 36, height: 36, border: '4px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }}/>
            </div>
          ) : enrollTab === 'enrolled' ? (
            batchStudents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1.5rem', color: '#94a3b8' }}>
                <Users size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }}/>
                <p style={{ fontWeight: 700, color: '#475569' }}>No students enrolled yet</p>
                <p style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>Switch to "Add Student" tab to enroll students.</p>
              </div>
            ) : (
              <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {batchStudents.map((s, i) => (
                  <div key={s._id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#f8fafc', borderRadius: '0.875rem', padding: '0.75rem 0.875rem', border: '1px solid #e2e8f0' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.875rem', flexShrink: 0 }}>
                      {s.full_name?.charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 700, color: '#1e293b', fontSize: '0.875rem' }}>{s.full_name}</p>
                      <p style={{ margin: 0, color: '#64748b', fontSize: '0.73rem', fontWeight: 500 }}>{s.roll_number} • {s.phone}</p>
                    </div>
                    <span style={{ background: '#ede9fe', color: '#6d28d9', fontSize: '0.68rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: 999, flexShrink: 0 }}>#{i + 1}</span>
                    <button onClick={() => handleUnenroll(s._id)} disabled={enrolling === s._id}
                      title="Remove from batch"
                      style={{ padding: '0.4rem', background: '#fff1f2', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', color: '#f43f5e', flexShrink: 0, opacity: enrolling === s._id ? 0.5 : 1 }}>
                      <UserMinus size={14}/>
                    </button>
                  </div>
                ))}
              </div>
            )
          ) : (
            /* Add Student Tab */
            <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {/* Search */}
              <div style={{ position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}/>
                <input value={enrollSearch} onChange={e => setEnrollSearch(e.target.value)}
                  placeholder="Search by name or roll number…"
                  style={{ ...inputStyle, paddingLeft: '2.375rem' }}/>
              </div>

              {eligibleStudents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94a3b8' }}>
                  <CheckCircle2 size={36} style={{ margin: '0 auto 0.75rem', color: '#10b981', opacity: 0.5 }}/>
                  <p style={{ fontWeight: 700, color: '#475569' }}>All eligible students enrolled!</p>
                  <p style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>
                    Students must be admitted to <strong>{viewingBatch?.course_name}</strong> to appear here.
                  </p>
                </div>
              ) : filteredEligible.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#94a3b8', padding: '1.5rem', fontSize: '0.85rem' }}>No students match your search.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {filteredEligible.map(s => (
                    <div key={s._id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#f0fdf4', borderRadius: '0.875rem', padding: '0.75rem 0.875rem', border: '1px solid #bbf7d0' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.875rem', flexShrink: 0 }}>
                        {s.full_name?.charAt(0)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 700, color: '#1e293b', fontSize: '0.875rem' }}>{s.full_name}</p>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.73rem', fontWeight: 500 }}>{s.roll_number} • {s.phone}</p>
                      </div>
                      <button onClick={() => handleEnroll(s._id)} disabled={enrolling === s._id}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0.4rem 0.875rem', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: '0.625rem', cursor: 'pointer', color: '#fff', fontWeight: 700, fontSize: '0.78rem', flexShrink: 0, opacity: enrolling === s._id ? 0.6 : 1 }}>
                        <UserPlus size={13}/>{enrolling === s._id ? '…' : 'Enroll'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>, document.body
  ) : null;

  return (
    <div className="space-y-6 pb-12">

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', borderRadius: '2rem', padding: '1.75rem 2rem', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '0.4rem' }}>
            <div style={{ padding: '0.625rem', background: 'rgba(20,184,166,0.2)', borderRadius: '0.875rem' }}><CalendarDays size={26} color="#2dd4bf"/></div>
            <h2 style={{ margin: 0, fontSize: '1.9rem', fontWeight: 900, letterSpacing: '-0.02em' }}>Batches & Timetable</h2>
          </div>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem', fontWeight: 500, marginLeft: '0.25rem' }}>
            Manage batches, assign courses, and build weekly schedules.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={() => setShowScheduleModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.7rem 1.25rem', background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.15)', borderRadius: '0.875rem', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' }}>
            <Clock size={16}/> Add Slot
          </button>
          <button onClick={openCreateBatch}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.7rem 1.5rem', background: 'linear-gradient(135deg, #2dd4bf, #06b6d4)', border: 'none', borderRadius: '0.875rem', color: '#0f172a', fontWeight: 800, cursor: 'pointer', fontSize: '0.875rem', boxShadow: '0 4px 16px rgba(45,212,191,0.4)' }}>
            <Plus size={17}/> New Batch
          </button>
        </div>
      </div>

      {/* Stats Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        {[
          { label: 'Total Batches', value: batches.length, color: '#6366f1', bg: '#eef2ff' },
          { label: 'Active Batches', value: activeBatches, color: '#10b981', bg: '#ecfdf5' },
          { label: 'Students Enrolled', value: totalEnrolled, color: '#f59e0b', bg: '#fffbeb' },
          { label: 'Schedule Slots', value: totalSlots, color: '#8b5cf6', bg: '#f5f3ff' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: '1.5rem', padding: '1.25rem 1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</p>
            <p style={{ margin: '0.4rem 0 0', fontSize: '2.25rem', fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', background: '#0f172a', padding: '0.375rem', borderRadius: '0.875rem' }}>
          <button onClick={() => setActiveTab('batches')} style={{ padding: '0.5rem 1.25rem', borderRadius: '0.625rem', fontWeight: 700, fontSize: '0.875rem', border: 'none', cursor: 'pointer', transition: 'all 0.2s', background: activeTab === 'batches' ? '#2dd4bf' : 'transparent', color: activeTab === 'batches' ? '#0f172a' : '#94a3b8' }}>
            <Layers size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }}/>Batches
          </button>
          <button onClick={() => setActiveTab('timetable')} style={{ padding: '0.5rem 1.25rem', borderRadius: '0.625rem', fontWeight: 700, fontSize: '0.875rem', border: 'none', cursor: 'pointer', transition: 'all 0.2s', background: activeTab === 'timetable' ? '#6366f1' : 'transparent', color: activeTab === 'timetable' ? '#fff' : '#94a3b8' }}>
            <CalendarDays size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }}/>Timetable
          </button>
        </div>
      </div>

      {/* Batches Tab */}
      {activeTab === 'batches' && (
        <>
          {/* Search */}
          <div style={{ position: 'relative', maxWidth: 360 }}>
            <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}/>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search batches or courses…"
              style={{ ...inputStyle, paddingLeft: '2.5rem', borderRadius: '0.875rem' }}
            />
          </div>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160 }}>
              <div style={{ width: 40, height: 40, border: '4px solid #e2e8f0', borderTopColor: '#2dd4bf', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }}/>
            </div>
          ) : filteredBatches.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: '1.5rem', padding: '3rem', textAlign: 'center', border: '1px solid #f1f5f9' }}>
              <CalendarDays size={44} style={{ color: '#cbd5e1', margin: '0 auto 1rem' }}/>
              <p style={{ color: '#64748b', fontWeight: 600 }}>{search ? 'No batches match your search.' : 'No batches yet. Create your first batch!'}</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {filteredBatches.map(batch => {
                const meta = SHIFT_META[batch.shift] || SHIFT_META.Morning;
                const enrollPct = batch.capacity > 0 ? Math.min(100, Math.round((batch.enrolled_count / batch.capacity) * 100)) : 0;
                return (
                  <div key={batch._id} style={{ background: '#fff', borderRadius: '1.5rem', border: '1px solid #f1f5f9', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s, box-shadow 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'; }}>

                    {/* Card top stripe */}
                    <div style={{ height: 6, background: batch.is_active ? 'linear-gradient(90deg, #2dd4bf, #6366f1)' : '#e2e8f0' }}/>

                    <div style={{ padding: '1.25rem 1.375rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {/* Title row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', lineHeight: 1.25, wordBreak: 'break-word' }}>{batch.name}</h3>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: '0.3rem' }}>
                            <BookOpen size={12} color="#7c3aed"/>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#7c3aed', fontWeight: 700 }}>{batch.course_name}</p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button onClick={() => handleToggleActive(batch._id)} title={batch.is_active ? 'Deactivate' : 'Activate'}
                            style={{ padding: '0.4rem', background: batch.is_active ? '#ecfdf5' : '#f1f5f9', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', color: batch.is_active ? '#10b981' : '#94a3b8' }}>
                            <Power size={14}/>
                          </button>
                          <button onClick={() => openEditBatch(batch)} title="Edit"
                            style={{ padding: '0.4rem', background: '#eff6ff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', color: '#3b82f6' }}>
                            <Edit2 size={14}/>
                          </button>
                          <button onClick={() => handleDeleteBatch(batch._id)} title="Delete"
                            style={{ padding: '0.4rem', background: '#fff1f2', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', color: '#f43f5e' }}>
                            <Trash2 size={14}/>
                          </button>
                        </div>
                      </div>

                      {/* Badges */}
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '999px', background: meta.bg, color: meta.text }}>
                          <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: meta.dot, marginRight: 5, verticalAlign: 'middle' }}/>
                          {batch.shift}
                        </span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '999px', background: batch.is_active ? '#ecfdf5' : '#f8fafc', color: batch.is_active ? '#059669' : '#94a3b8', border: `1px solid ${batch.is_active ? '#bbf7d0' : '#e2e8f0'}` }}>
                          {batch.is_active ? '● Active' : '○ Inactive'}
                        </span>
                        {batch.slot_count > 0 && (
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '999px', background: '#ede9fe', color: '#6d28d9' }}>
                            {batch.slot_count} slot{batch.slot_count !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      {/* Dates */}
                      {(batch.start_date || batch.end_date) && (
                        <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>
                          📅 {batch.start_date ? new Date(batch.start_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '?'}
                          {' → '}
                          {batch.end_date ? new Date(batch.end_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Ongoing'}
                        </p>
                      )}

                      {/* Trainer */}
                      {batch.trainer_id?.name && (
                        <p style={{ margin: 0, fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>
                          👨‍🏫 {batch.trainer_id.name}
                        </p>
                      )}

                      {/* Enrollment Progress */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>
                            <Users size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }}/>
                            {batch.enrolled_count || 0} / {batch.capacity} enrolled
                          </span>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: enrollPct >= 90 ? '#ef4444' : enrollPct >= 70 ? '#f59e0b' : '#10b981' }}>
                            {enrollPct}%
                          </span>
                        </div>
                        <div style={{ height: 5, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 999, background: enrollPct >= 90 ? 'linear-gradient(90deg,#ef4444,#f97316)' : enrollPct >= 70 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,#10b981,#34d399)', width: `${enrollPct}%`, transition: 'width 0.5s' }}/>
                        </div>
                        {enrollPct >= 90 && <p style={{ margin: '0.25rem 0 0', fontSize: '0.7rem', color: '#ef4444', fontWeight: 700 }}>⚠ Almost full!</p>}
                      </div>

                      {/* View Students */}
                      <button onClick={() => openStudents(batch)}
                        style={{ marginTop: 'auto', width: '100%', padding: '0.6rem', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '0.75rem', color: '#475569', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <Eye size={14}/> View Enrolled Students
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Timetable Tab */}
      {activeTab === 'timetable' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Timetable toolbar */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)}
              style={{ ...inputStyle, maxWidth: 320, width: 'auto' }}>
              <option value="">All Batches</option>
              {batches.map(b => <option key={b._id} value={b._id}>{b.name} — {b.course_name}{b.shift ? ` (${b.shift})` : ''}</option>)}
            </select>
            <div style={{ display: 'flex', background: '#f1f5f9', padding: '0.25rem', borderRadius: '0.625rem', marginLeft: 'auto' }}>
              <button onClick={() => setTimetableView('grid')} title="Grid view"
                style={{ padding: '0.4rem 0.75rem', borderRadius: '0.4rem', border: 'none', cursor: 'pointer', background: timetableView === 'grid' ? '#fff' : 'transparent', color: timetableView === 'grid' ? '#6366f1' : '#94a3b8', boxShadow: timetableView === 'grid' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', fontWeight: 700, fontSize: '0.8rem' }}>
                <LayoutGrid size={15}/>
              </button>
              <button onClick={() => setTimetableView('list')} title="List view"
                style={{ padding: '0.4rem 0.75rem', borderRadius: '0.4rem', border: 'none', cursor: 'pointer', background: timetableView === 'list' ? '#fff' : 'transparent', color: timetableView === 'list' ? '#6366f1' : '#94a3b8', boxShadow: timetableView === 'list' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', fontWeight: 700, fontSize: '0.8rem' }}>
                <List size={15}/>
              </button>
            </div>
          </div>

          {schedules.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: '1.5rem', padding: '3rem', textAlign: 'center', border: '1px solid #f1f5f9' }}>
              <Clock size={40} style={{ color: '#cbd5e1', margin: '0 auto 1rem' }}/>
              <p style={{ color: '#64748b', fontWeight: 600 }}>No schedule slots yet. Click "Add Slot" to build the timetable.</p>
            </div>
          ) : timetableView === 'grid' ? (
            /* VISUAL WEEKLY GRID — one column per day */
            <div style={{ background: '#fff', borderRadius: '1.5rem', border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
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
                          <span style={{ color: '#e2e8f0', fontSize: '1.1rem', fontWeight: 700 }}>·</span>
                        </div>
                      ) : daySlots.map(slot => {
                        const shiftMeta = SHIFT_META[slot.batch_id?.shift] || null;
                        return (
                        <div key={slot._id} style={{ background: `${DAY_COLORS[di]}12`, border: `1.5px solid ${DAY_COLORS[di]}35`, borderRadius: '0.875rem', padding: '0.625rem 0.75rem', position: 'relative' }}>
                          <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 800, color: DAY_COLORS[di] }}>{slot.start_time}–{slot.end_time}</p>
                          <p style={{ margin: '0.15rem 0 0', fontSize: '0.7rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.3, wordBreak: 'break-word' }}>{slot.batch_id?.name || '—'}</p>
                          {slot.batch_id?.course_name && (
                            <p style={{ margin: '0.1rem 0 0', fontSize: '0.62rem', color: '#7c3aed', fontWeight: 700 }}>{slot.batch_id.course_name}</p>
                          )}
                          {shiftMeta && (
                            <span style={{ display: 'inline-block', marginTop: '0.2rem', fontSize: '0.58rem', fontWeight: 800, padding: '0.1rem 0.45rem', borderRadius: 999, background: shiftMeta.bg, color: shiftMeta.text }}>
                              {slot.batch_id.shift}
                            </span>
                          )}
                          {slot.subject && <p style={{ margin: '0.1rem 0 0', fontSize: '0.65rem', color: '#475569', fontWeight: 600 }}>{slot.subject}</p>}
                          {slot.room && <p style={{ margin: '0.05rem 0 0', fontSize: '0.62rem', color: '#94a3b8' }}>📍 {slot.room}</p>}
                          <button onClick={() => handleDeleteSchedule(slot._id)}
                            style={{ position: 'absolute', top: '0.3rem', right: '0.3rem', background: 'rgba(255,255,255,0.8)', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0.1rem', lineHeight: 1, borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <X size={10}/>
                          </button>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {DAYS.map((day, di) => {
                const daySlots = schedules.filter(s => s.day_of_week === day);
                if (daySlots.length === 0) return null;
                return (
                  <div key={day} style={{ background: '#fff', borderRadius: '1.25rem', border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <div style={{ padding: '0.75rem 1.25rem', background: `${DAY_COLORS[di]}10`, borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: DAY_COLORS[di], display: 'inline-block', flexShrink: 0 }}/>
                      <span style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.9rem' }}>{day}</span>
                      <span style={{ marginLeft: 'auto', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8' }}>{daySlots.length} class{daySlots.length !== 1 ? 'es' : ''}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {daySlots.map((slot, si) => {
                        const sm = SHIFT_META[slot.batch_id?.shift] || null;
                        return (
                        <div key={slot._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1.25rem', borderBottom: si < daySlots.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ background: `${DAY_COLORS[di]}15`, border: `1.5px solid ${DAY_COLORS[di]}40`, borderRadius: '0.625rem', padding: '0.35rem 0.625rem', minWidth: 96, textAlign: 'center' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: DAY_COLORS[di] }}>{slot.start_time} – {slot.end_time}</span>
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <p style={{ margin: 0, fontWeight: 700, color: '#1e293b', fontSize: '0.875rem' }}>{slot.batch_id?.name || '—'}</p>
                                {sm && (
                                  <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '0.1rem 0.5rem', borderRadius: 999, background: sm.bg, color: sm.text }}>
                                    {slot.batch_id.shift}
                                  </span>
                                )}
                              </div>
                              <p style={{ margin: '0.1rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                                {slot.batch_id?.course_name && <span style={{ color: '#7c3aed', fontWeight: 600 }}>{slot.batch_id.course_name}</span>}
                                {slot.subject && <span>{slot.batch_id?.course_name ? ' · ' : ''}{slot.subject}</span>}
                                {slot.room && <span> • 📍 {slot.room}</span>}
                                {slot.batch_id?.trainer_id?.name && <span> • 👨‍🏫 {slot.batch_id.trainer_id.name}</span>}
                              </p>
                            </div>
                          </div>
                          <button onClick={() => handleDeleteSchedule(slot._id)}
                            style={{ padding: '0.4rem', background: '#fff1f2', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', color: '#f43f5e' }}>
                            <Trash2 size={14}/>
                          </button>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {batchModal}
      {scheduleModal}
      {studentsModal}
    </div>
  );
};

export default Timetable;
