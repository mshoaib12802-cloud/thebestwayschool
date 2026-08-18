import { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { BookOpen, X, Upload, Clock, CheckCircle2, AlertTriangle, Award } from 'lucide-react';

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const isOverdue = (due) => due && new Date(due) < new Date();

export default function StudentAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitModal, setSubmitModal] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [subForm, setSubForm] = useState({ submission_text: '', attachment_url: '' });

  const load = () => {
    setLoading(true);
    api.get('/student-portal/assignments')
      .then(r => setAssignments(r.data))
      .catch(() => toast.error('Failed to load assignments'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post(`/student-portal/assignments/${submitModal._id}/submit`, subForm);
      toast.success('Assignment submitted successfully');
      setSubmitModal(null);
      setSubForm({ submission_text: '', attachment_url: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const pending    = assignments.filter(a => !a.submitted && !isOverdue(a.due_date));
  const overdue    = assignments.filter(a => !a.submitted && isOverdue(a.due_date));
  const submitted  = assignments.filter(a => a.submitted);

  const AssignmentCard = ({ a, type }) => {
    const colors = {
      pending:   { border: 'border-l-indigo-400', badge: 'bg-indigo-100 text-indigo-700', label: 'Pending' },
      overdue:   { border: 'border-l-red-400',    badge: 'bg-red-100 text-red-700',       label: 'Overdue' },
      submitted: { border: 'border-l-green-400',  badge: 'bg-green-100 text-green-700',   label: 'Submitted' },
    };
    const c = colors[type];
    return (
      <div className={`bg-white rounded-2xl border border-slate-100 border-l-4 ${c.border} shadow-sm p-5`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {a.subject_id?.name && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{a.subject_id.name}</span>}
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${c.badge}`}>{c.label}</span>
            </div>
            <h3 className="font-bold text-slate-800 text-base">{a.title}</h3>
            {a.description && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{a.description}</p>}
            <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 flex-wrap">
              <span className="flex items-center gap-1"><Clock size={12} /> Due: {fmt(a.due_date)}</span>
              <span className="flex items-center gap-1"><Award size={12} /> {a.total_marks} marks</span>
            </div>
            {a.submitted && a.obtained_marks != null && (
              <div className="mt-2 bg-green-50 border border-green-100 rounded-lg px-3 py-2 text-xs">
                <span className="text-green-700 font-semibold">Grade: {a.obtained_marks}/{a.total_marks}</span>
                {a.feedback && <span className="text-slate-500 ml-2">— {a.feedback}</span>}
              </div>
            )}
            {a.submitted && a.obtained_marks == null && (
              <div className="mt-2">
                <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">Awaiting grade</span>
              </div>
            )}
          </div>
          {!a.submitted && (
            <button
              onClick={() => { setSubmitModal(a); setSubForm({ submission_text: '', attachment_url: '' }); }}
              className="shrink-0 flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-indigo-700 transition"
            >
              <Upload size={13} /> Submit
            </button>
          )}
          {a.submitted && (
            <CheckCircle2 size={22} className="text-green-500 shrink-0 mt-0.5" />
          )}
        </div>
      </div>
    );
  };

  const Section = ({ title, icon, items, type, emptyMsg }) => (
    <section className="mb-8">
      <h2 className="text-base font-bold text-slate-700 mb-3 flex items-center gap-2">
        {icon} {title} ({items.length})
      </h2>
      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-center text-slate-400 text-sm">
          {emptyMsg}
        </div>
      ) : (
        <div className="space-y-3">{items.map(a => <AssignmentCard key={a._id} a={a} type={type} />)}</div>
      )}
    </section>
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
          <BookOpen size={20} className="text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My Assignments</h1>
          <p className="text-slate-500 text-sm">View and submit your class assignments</p>
        </div>
      </div>

      <Section title="Pending" icon={<Clock size={16} className="text-indigo-500" />} items={pending} type="pending" emptyMsg="No pending assignments" />
      {overdue.length > 0 && (
        <Section title="Overdue" icon={<AlertTriangle size={16} className="text-red-500" />} items={overdue} type="overdue" emptyMsg="" />
      )}
      <Section title="Submitted" icon={<CheckCircle2 size={16} className="text-green-500" />} items={submitted} type="submitted" emptyMsg="No submitted assignments yet" />

      {/* Submit Modal */}
      {submitModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Submit Assignment</h3>
                <p className="text-sm text-slate-500 mt-0.5">{submitModal.title}</p>
              </div>
              <button onClick={() => setSubmitModal(null)} className="p-1.5 hover:bg-slate-100 rounded-lg transition">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">Your Answer / Work *</label>
                <textarea required value={subForm.submission_text} onChange={e => setSubForm(p => ({ ...p, submission_text: e.target.value }))} rows={5}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" placeholder="Write your submission here..." />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">Attachment URL (optional)</label>
                <input type="url" value={subForm.attachment_url} onChange={e => setSubForm(p => ({ ...p, attachment_url: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" placeholder="https://drive.google.com/..." />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setSubmitModal(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-60">
                  {submitting ? 'Submitting...' : 'Submit Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
