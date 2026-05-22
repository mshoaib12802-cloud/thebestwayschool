import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-toastify';
import { confirm } from '../utils/confirm';
import { createPortal } from 'react-dom';
import { AuthContext } from '../context/AuthContext';
import {
  ClipboardList, Search, Clock, CheckCircle2, XCircle, Eye,
  User, Phone, Mail, BookOpen, Calendar, Users, GraduationCap,
  ChevronRight, X, ArrowRight, AlertCircle, RefreshCw, Copy,
  Briefcase, Star,
} from 'lucide-react';

const STATUS_META = {
  pending:  { label: 'Pending Review', color: '#d97706', bg: '#fef3c7', dot: '#f59e0b' },
  approved: { label: 'Approved',       color: '#059669', bg: '#d1fae5', dot: '#10b981' },
  rejected: { label: 'Rejected',       color: '#dc2626', bg: '#fee2e2', dot: '#ef4444' },
};

const initialApprovalForm = {
  full_name: '', father_name: '', phone: '', guardian_phone: '',
  email: '', course_id: '', course_name: '', duration: '3 Months',
  shift: 'Morning', total_fee: '', monthly_fee: '',
  admission_date: new Date().toISOString().split('T')[0],
  trainer_id: '',
};

export default function AdmissionRequests() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  const [requests, setRequests] = useState([]);
  const [courses, setCourses] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Modals
  const [viewModal, setViewModal] = useState(null);       // visitor object
  const [approveModal, setApproveModal] = useState(null); // visitor object
  const [rejectModal, setRejectModal] = useState(null);   // visitor object
  const [rejectReason, setRejectReason] = useState('');
  const [credModal, setCredModal] = useState(null);       // { email, password, roll_number }

  const [approvalForm, setApprovalForm] = useState(initialApprovalForm);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    fetchRequests();
    fetchCourses();
    fetchTrainers();
  }, []);

  useEffect(() => {
    const anyOpen = viewModal || approveModal || rejectModal || credModal;
    document.body.style.overflow = anyOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [viewModal, approveModal, rejectModal, credModal]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/visitors/admission-requests');
      setRequests(data);
    } catch { toast.error('Failed to load admission requests'); }
    finally { setLoading(false); }
  };

  const fetchCourses = async () => {
    try {
      const { data } = await api.get('/courses');
      setCourses(data.filter(c => c.is_active));
    } catch {}
  };

  const fetchTrainers = async () => {
    try {
      const { data } = await api.get('/staff/trainers');
      setTrainers(data);
    } catch {}
  };

  const openApprove = (req) => {
    setApprovalForm({
      ...initialApprovalForm,
      full_name: req.name || '',
      father_name: req.father_name || '',
      phone: req.phone || '',
      email: req.email || '',
      guardian_phone: req.phone || '',
    });
    setApproveModal(req);
  };

  const handleCourseSelect = (courseId) => {
    const course = courses.find(c => c._id === courseId);
    if (!course) return setApprovalForm(f => ({ ...f, course_id: '', course_name: '', total_fee: '', monthly_fee: '', duration: '3 Months', trainer_id: '' }));
    const assignedTrainer = trainers.find(t => (t.assigned_courses || []).includes(course.name));
    setApprovalForm(f => ({
      ...f,
      course_id: course._id,
      course_name: course.name,
      total_fee: course.total_fee,
      monthly_fee: course.monthly_fee,
      duration: course.duration,
      trainer_id: assignedTrainer ? assignedTrainer._id : f.trainer_id,
    }));
  };

  const handleApprove = async (e) => {
    e.preventDefault();
    if (!approvalForm.email) return toast.error('Gmail address is required');
    if (!approvalForm.course_name) return toast.error('Please select a course');
    setApproving(true);
    try {
      const { data } = await api.post(`/visitors/${approveModal._id}/approve`, approvalForm);
      toast.success(`${approvalForm.full_name} enrolled! Credentials sent to Gmail.`);
      setApproveModal(null);
      setCredModal(data.credentials);
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Approval failed');
    } finally { setApproving(false); }
  };

  const handleReject = async () => {
    setRejecting(true);
    try {
      await api.post(`/visitors/${rejectModal._id}/reject`, { reason: rejectReason });
      toast.success('Application rejected');
      setRejectModal(null);
      setRejectReason('');
      fetchRequests();
    } catch { toast.error('Failed to reject'); }
    finally { setRejecting(false); }
  };

  const copyText = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied!');
  };

  // Counts
  const counts = {
    all: requests.length,
    pending: requests.filter(r => r.admission_status === 'pending').length,
    approved: requests.filter(r => r.admission_status === 'approved').length,
    rejected: requests.filter(r => r.admission_status === 'rejected').length,
  };

  const filtered = requests.filter(r => {
    const matchStatus = filterStatus === 'all' || r.admission_status === filterStatus;
    const q = search.toLowerCase();
    const matchSearch = !q || r.name?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q) || r.phone?.includes(q) || r.interest?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
            <ClipboardList size={24} className="text-violet-600" />
            Admission Requests
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Online applications submitted via the public admission form</p>
        </div>
        <button onClick={fetchRequests} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-semibold transition-colors">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        {[
          { key: 'all',      label: 'All Applications', icon: <ClipboardList size={14}/> },
          { key: 'pending',  label: 'Pending',          icon: <Clock size={14}/> },
          { key: 'approved', label: 'Approved',         icon: <CheckCircle2 size={14}/> },
          { key: 'rejected', label: 'Rejected',         icon: <XCircle size={14}/> },
        ].map(tab => (
          <button key={tab.key} onClick={() => setFilterStatus(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
              filterStatus === tab.key
                ? 'bg-violet-600 text-white border-violet-600 shadow-md'
                : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300'
            }`}>
            {tab.icon} {tab.label}
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${
              filterStatus === tab.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
            }`}>
              {counts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-5 max-w-sm">
        <Search size={16} className="absolute left-3 top-3 text-slate-400" />
        <input
          type="text" placeholder="Search by name, email, phone…"
          value={search} onChange={e => setSearch(e.target.value)}
          className="pl-9 pr-4 py-2.5 w-full border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400 bg-white"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <span className="w-7 h-7 border-3 border-violet-200 border-t-violet-600 rounded-full animate-spin mr-3" />
          Loading requests…
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
          <ClipboardList size={48} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-semibold">No admission requests found</p>
          <p className="text-slate-300 text-sm mt-1">Applications submitted via the public form will appear here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Applicant</th>
                <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact</th>
                <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Course Interest</th>
                <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Applied On</th>
                <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-right px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((req, i) => {
                const meta = STATUS_META[req.admission_status] || STATUS_META.pending;
                return (
                  <tr key={req._id} className={`border-b border-slate-50 hover:bg-slate-50/60 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/30'}`}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
                          style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
                          {req.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">{req.name}</div>
                          {req.father_name && <div className="text-xs text-slate-400">S/O {req.father_name}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 text-slate-600 text-xs mb-0.5">
                        <Phone size={12} className="text-slate-400" /> {req.phone}
                      </div>
                      {req.email && (
                        <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                          <Mail size={12} className="text-slate-400" /> {req.email}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold">
                        <BookOpen size={11} /> {req.interest || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 text-xs">
                      {new Date(req.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                        style={{ background: meta.bg, color: meta.color }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.dot }} />
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setViewModal(req)}
                          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors" title="View Details">
                          <Eye size={16} />
                        </button>
                        {isAdmin && req.admission_status === 'pending' && (
                          <>
                            <button onClick={() => openApprove(req)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-colors">
                              <CheckCircle2 size={13} /> Approve
                            </button>
                            <button onClick={() => { setRejectModal(req); setRejectReason(''); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-colors">
                              <XCircle size={13} /> Reject
                            </button>
                          </>
                        )}
                        {req.admission_status === 'approved' && req.enrolled_student_id && (
                          <button onClick={() => navigate(`/admissions`)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-bold transition-colors">
                            <GraduationCap size={13} /> View Student
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── VIEW DETAIL MODAL ───────────────────────────── */}
      {viewModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-[slideUp_0.25s_ease]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-800 text-lg">Application Details</h3>
              <button onClick={() => setViewModal(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Avatar + name */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-extrabold"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
                  {viewModal.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-extrabold text-slate-800 text-lg">{viewModal.name}</div>
                  {viewModal.father_name && <div className="text-sm text-slate-500">S/O {viewModal.father_name}</div>}
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold mt-1"
                    style={{ background: STATUS_META[viewModal.admission_status]?.bg, color: STATUS_META[viewModal.admission_status]?.color }}>
                    {STATUS_META[viewModal.admission_status]?.label}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 text-sm">
                {[
                  { icon: <Phone size={14}/>, label: 'Phone', value: viewModal.phone },
                  { icon: <Mail size={14}/>, label: 'Gmail', value: viewModal.email || 'Not provided' },
                  { icon: <BookOpen size={14}/>, label: 'Course Interest', value: viewModal.interest || '—' },
                  { icon: <Calendar size={14}/>, label: 'Applied On', value: new Date(viewModal.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' }) },
                ].map(row => (
                  <div key={row.label} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
                    <div className="text-violet-500 mt-0.5">{row.icon}</div>
                    <div>
                      <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-0.5">{row.label}</div>
                      <div className="font-semibold text-slate-700">{row.value}</div>
                    </div>
                  </div>
                ))}
              </div>
              {viewModal.rejection_reason && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-100 flex gap-2 text-sm">
                  <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
                  <div><span className="font-bold text-red-600">Rejection reason: </span><span className="text-red-500">{viewModal.rejection_reason}</span></div>
                </div>
              )}
              {isAdmin && viewModal.admission_status === 'pending' && (
                <div className="flex gap-3 pt-1">
                  <button onClick={() => { setViewModal(null); openApprove(viewModal); }}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2">
                    <CheckCircle2 size={15} /> Approve & Enroll
                  </button>
                  <button onClick={() => { setViewModal(null); setRejectModal(viewModal); setRejectReason(''); }}
                    className="flex-1 py-2.5 rounded-xl bg-red-50 text-red-600 font-bold text-sm hover:bg-red-100 transition-colors flex items-center justify-center gap-2">
                    <XCircle size={15} /> Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── APPROVE / ENROLL MODAL ──────────────────────── */}
      {approveModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto animate-[slideUp_0.25s_ease]">
            {/* Header */}
            <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-slate-100 z-10">
              <div>
                <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                  <GraduationCap size={20} className="text-emerald-500" /> Enroll Student
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">Approving application from <span className="font-bold text-slate-600">{approveModal.name}</span></p>
              </div>
              <button onClick={() => setApproveModal(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"><X size={18} /></button>
            </div>

            <form onSubmit={handleApprove} className="p-6 space-y-5">
              {/* Personal info */}
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Personal Information</p>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Full Name *" value={approvalForm.full_name} onChange={v => setApprovalForm(f => ({...f, full_name: v}))} required />
                  <FormField label="Father's Name" value={approvalForm.father_name} onChange={v => setApprovalForm(f => ({...f, father_name: v}))} />
                  <FormField label="Phone *" value={approvalForm.phone} onChange={v => setApprovalForm(f => ({...f, phone: v}))} required />
                  <FormField label="Guardian Phone" value={approvalForm.guardian_phone} onChange={v => setApprovalForm(f => ({...f, guardian_phone: v}))} />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Gmail Address (Login) *</label>
                <input
                  type="email" required value={approvalForm.email}
                  onChange={e => setApprovalForm(f => ({...f, email: e.target.value}))}
                  className="form-input w-full"
                  placeholder="student@gmail.com"
                />
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <Mail size={11} /> Login credentials will be sent to this Gmail after enrollment.
                </p>
              </div>

              {/* Course info */}
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Course Enrollment</p>
                <div className="grid grid-cols-2 gap-4">
                  {/* Course picker */}
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Course *</label>
                    <select
                      value={approvalForm.course_id}
                      onChange={e => handleCourseSelect(e.target.value)}
                      className="form-input w-full" required
                    >
                      <option value="">— Select Course —</option>
                      {courses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                    {approveModal.interest && (
                      <p className="text-xs text-violet-500 mt-1 flex items-center gap-1">
                        <Star size={11} /> Applicant's interest: <strong>{approveModal.interest}</strong>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Shift</label>
                    <select value={approvalForm.shift} onChange={e => setApprovalForm(f => ({...f, shift: e.target.value}))} className="form-input w-full">
                      <option>Morning</option><option>Evening</option><option>Online</option><option>Weekend</option>
                    </select>
                  </div>

                  <FormField label="Duration" value={approvalForm.duration} onChange={v => setApprovalForm(f => ({...f, duration: v}))} placeholder="e.g. 3 Months" />
                  <FormField label="Total Fee (Rs.) *" type="number" value={approvalForm.total_fee} onChange={v => setApprovalForm(f => ({...f, total_fee: v}))} required />
                  <FormField label="Monthly Fee (Rs.)" type="number" value={approvalForm.monthly_fee} onChange={v => setApprovalForm(f => ({...f, monthly_fee: v}))} />

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Assign Trainer</label>
                    <select value={approvalForm.trainer_id} onChange={e => setApprovalForm(f => ({...f, trainer_id: e.target.value}))} className="form-input w-full">
                      <option value="">— No Trainer —</option>
                      {trainers.map(t => <option key={t._id} value={t._id}>{t.name} ({t.role})</option>)}
                    </select>
                  </div>

                  <FormField label="Admission Date" type="date" value={approvalForm.admission_date} onChange={v => setApprovalForm(f => ({...f, admission_date: v}))} />
                </div>
              </div>

              {/* Confirmation notice */}
              <div className="flex gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                <div className="text-sm text-emerald-700">
                  <strong>On approval:</strong> A student account will be created, a unique roll number assigned, and login credentials emailed to <strong>{approvalForm.email || '[email not set]'}</strong>.
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setApproveModal(null)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={approving} className="flex-1 py-3 rounded-xl font-bold text-sm text-white transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}>
                  {approving
                    ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Enrolling…</>
                    : <><GraduationCap size={16} /> Approve & Send Credentials</>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── REJECT MODAL ────────────────────────────────── */}
      {rejectModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-[slideUp_0.25s_ease]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2"><XCircle size={20} className="text-red-500" /> Reject Application</h3>
              <button onClick={() => setRejectModal(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6">
              <p className="text-slate-600 text-sm mb-4">You are rejecting the application from <strong className="text-slate-800">{rejectModal.name}</strong>. This will mark the application as rejected.</p>
              <div className="mb-5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Reason (optional)</label>
                <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
                  placeholder="e.g. Course not available, incomplete information…"
                  className="form-input w-full resize-none" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setRejectModal(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button onClick={handleReject} disabled={rejecting} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                  {rejecting ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Rejecting…</> : <><XCircle size={15} /> Confirm Reject</>}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── CREDENTIALS MODAL ───────────────────────────── */}
      {credModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-[slideUp_0.25s_ease] overflow-hidden">
            <div className="h-1.5" style={{ background: 'linear-gradient(90deg, #059669, #10b981, #34d399)' }} />
            <div className="p-7 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)' }}>
                <CheckCircle2 size={32} color="#059669" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-800 mb-1">Student Enrolled!</h3>
              <p className="text-slate-500 text-sm mb-5">Credentials have been sent to the student's Gmail. You can also share them manually below.</p>

              <div className="space-y-3 text-left">
                {[
                  { label: 'Roll Number', value: credModal.roll_number, icon: <Star size={14}/> },
                  { label: 'Login Email', value: credModal.email, icon: <Mail size={14}/> },
                  { label: 'Password', value: credModal.password, icon: <AlertCircle size={14}/> },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
                    <div>
                      <div className="text-xs text-slate-400 font-semibold mb-0.5 flex items-center gap-1">{item.icon} {item.label}</div>
                      <div className="font-mono font-bold text-slate-800 text-sm">{item.value}</div>
                    </div>
                    <button onClick={() => copyText(item.value)} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 transition-colors">
                      <Copy size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <button onClick={() => setCredModal(null)} className="w-full mt-5 py-3 rounded-xl font-bold text-white text-sm transition-colors"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
                Done
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

const FormField = ({ label, value, onChange, type = 'text', required, placeholder }) => (
  <div>
    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">{label}</label>
    <input
      type={type} required={required} value={value} placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className="form-input w-full"
    />
  </div>
);
