import { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { BookOpen, Plus, X, ChevronDown, ChevronUp, Award, Clock, CheckCircle2, XCircle } from 'lucide-react';

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const StatusBadge = ({ status }) => {
  if (status === 'active') return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">Active</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">Closed</span>;
};

export default function TeacherAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [submissions, setSubmissions] = useState({});
  const [grades, setGrades] = useState({});
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', class_id: '', subject_id: '',
    due_date: '', total_marks: '', attachment_url: '',
  });

  const load = () => {
    setLoading(true);
    api.get('/teacher-portal/assignments')
      .then(r => setAssignments(r.data))
      .catch(() => toast.error('Failed to load assignments'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    api.get('/school-classes').then(r => setClasses(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!form.class_id) { setSubjects([]); return; }
    api.get(`/subjects?class_id=${form.class_id}`)
      .then(r => setSubjects(r.data))
      .catch(() => api.get('/subjects').then(r => setSubjects(r.data)).catch(() => {}));
  }, [form.class_id]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/teacher-portal/assignments', form);
      toast.success('Assignment created');
      setShowModal(false);
      setForm({ title: '', description: '', class_id: '', subject_id: '', due_date: '', total_marks: '', attachment_url: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create assignment');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async (id) => {
    try {
      await api.put(`/teacher-portal/assignments/${id}`, { status: 'closed' });
      toast.success('Assignment closed');
      load();
    } catch {
      toast.error('Failed to close assignment');
    }
  };

  const loadSubmissions = async (id) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (submissions[id]) return;
    try {
      const r = await api.get(`/teacher-portal/assignments/${id}/submissions`);
      setSubmissions(prev => ({ ...prev, [id]: r.data }));
    } catch {
      toast.error('Failed to load submissions');
    }
  };

  const saveGrade = async (assignmentId, submissionId) => {
    const g = grades[submissionId] || {};
    try {
      await api.put(`/teacher-portal/assignments/${assignmentId}/submissions/${submissionId}`, {
        obtained_marks: g.marks, feedback: g.feedback,
      });
      toast.success('Grade saved');
      const r = await api.get(`/teacher-portal/assignments/${assignmentId}/submissions`);
      setSubmissions(prev => ({ ...prev, [assignmentId]: r.data }));
    } catch {
      toast.error('Failed to save grade');
    }
  };

  const active = assignments.filter(a => a.status === 'active');
  const closed = assignments.filter(a => a.status !== 'active');

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
    </div>
  );

  const AssignmentCard = ({ a }) => {
    const subs = submissions[a._id] || [];
    const isOpen = expandedId === a._id;
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <StatusBadge status={a.status} />
                {a.subject_id?.name && <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{a.subject_id.name}</span>}
                {a.class_id?.name && <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{a.class_id.name}</span>}
              </div>
              <h3 className="font-bold text-slate-800 text-lg truncate">{a.title}</h3>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 flex-wrap">
                <span className="flex items-center gap-1"><Clock size={14} /> Due: {fmt(a.due_date)}</span>
                <span className="flex items-center gap-1"><Award size={14} /> {a.total_marks} marks</span>
                <span className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                  {a.submissions_count ?? 0} submissions
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {a.status === 'active' && (
                <button onClick={() => handleClose(a._id)} className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition">
                  Close
                </button>
              )}
              <button onClick={() => loadSubmissions(a._id)} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition">
                Submissions {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
          </div>
        </div>

        {isOpen && (
          <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
            <h4 className="font-semibold text-slate-700 mb-3 text-sm">Student Submissions</h4>
            {subs.length === 0 ? (
              <p className="text-slate-400 text-sm">No submissions yet.</p>
            ) : (
              <div className="space-y-3">
                {subs.map(s => (
                  <div key={s._id} className="bg-white rounded-xl border border-slate-100 p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{s.student_id?.name || 'Student'}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Roll: {s.student_id?.roll_number || '—'} · Submitted: {fmt(s.submitted_at)}</p>
                        {s.submission_text && <p className="text-xs text-slate-600 mt-1 line-clamp-2">{s.submission_text}</p>}
                        {s.attachment_url && <a href={s.attachment_url} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 underline mt-1 block">View Attachment</a>}
                        {s.obtained_marks != null && (
                          <p className="text-xs mt-1">
                            Grade: <span className="font-semibold text-indigo-700">{s.obtained_marks}/{a.total_marks}</span>
                            {s.feedback && <span className="text-slate-500 ml-2">— {s.feedback}</span>}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 min-w-[200px]">
                        <input
                          type="number" min={0} max={a.total_marks}
                          placeholder={`Marks /${a.total_marks}`}
                          defaultValue={s.obtained_marks ?? ''}
                          onChange={e => setGrades(prev => ({ ...prev, [s._id]: { ...prev[s._id], marks: e.target.value } }))}
                          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                        <input
                          type="text" placeholder="Feedback (optional)"
                          defaultValue={s.feedback ?? ''}
                          onChange={e => setGrades(prev => ({ ...prev, [s._id]: { ...prev[s._id], feedback: e.target.value } }))}
                          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                        <button onClick={() => saveGrade(a._id, s._id)} className="bg-indigo-600 text-white rounded-lg py-1.5 text-xs font-semibold hover:bg-indigo-700 transition">
                          Save Grade
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <BookOpen size={20} className="text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Assignments</h1>
            <p className="text-slate-500 text-sm">Manage and grade student assignments</p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition shadow-sm">
          <Plus size={16} /> Create Assignment
        </button>
      </div>

      {/* Active */}
      <section className="mb-8">
        <h2 className="text-base font-bold text-slate-700 mb-3 flex items-center gap-2">
          <CheckCircle2 size={16} className="text-indigo-500" /> Active ({active.length})
        </h2>
        {active.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center text-slate-400">
            <BookOpen size={40} className="mx-auto mb-2 opacity-30" />
            <p>No active assignments</p>
          </div>
        ) : (
          <div className="space-y-4">{active.map(a => <AssignmentCard key={a._id} a={a} />)}</div>
        )}
      </section>

      {/* Closed */}
      {closed.length > 0 && (
        <section>
          <h2 className="text-base font-bold text-slate-700 mb-3 flex items-center gap-2">
            <XCircle size={16} className="text-slate-400" /> Closed ({closed.length})
          </h2>
          <div className="space-y-4">{closed.map(a => <AssignmentCard key={a._id} a={a} />)}</div>
        </section>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-lg">Create Assignment</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg transition">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">Title *</label>
                <input required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" placeholder="Assignment title" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" placeholder="Instructions..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">Class *</label>
                  <select required value={form.class_id} onChange={e => setForm(p => ({ ...p, class_id: e.target.value, subject_id: '' }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                    <option value="">Select class</option>
                    {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">Subject *</label>
                  <select required value={form.subject_id} onChange={e => setForm(p => ({ ...p, subject_id: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                    <option value="">Select subject</option>
                    {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">Due Date *</label>
                  <input required type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">Total Marks *</label>
                  <input required type="number" min={1} value={form.total_marks} onChange={e => setForm(p => ({ ...p, total_marks: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" placeholder="e.g. 100" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">Attachment URL (optional)</label>
                <input type="url" value={form.attachment_url} onChange={e => setForm(p => ({ ...p, attachment_url: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" placeholder="https://..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-60">
                  {saving ? 'Creating...' : 'Create Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
