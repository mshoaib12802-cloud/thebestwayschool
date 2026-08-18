import { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { Megaphone, Pin, Plus, X, Calendar } from 'lucide-react';

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const AUDIENCE_STYLES = {
  students: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Students' },
  parents:  { bg: 'bg-violet-100', text: 'text-violet-700', label: 'Parents' },
  all:      { bg: 'bg-teal-100',   text: 'text-teal-700',   label: 'All' },
};

export default function TeacherAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [form, setForm] = useState({
    title: '', body: '', audience: 'students', is_pinned: false, expires_at: '',
  });

  const load = () => {
    setLoading(true);
    api.get('/teacher-portal/announcements')
      .then(r => setAnnouncements(r.data))
      .catch(() => toast.error('Failed to load announcements'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/teacher-portal/announcements', form);
      toast.success('Announcement posted');
      setShowModal(false);
      setForm({ title: '', body: '', audience: 'students', is_pinned: false, expires_at: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post announcement');
    } finally {
      setSaving(false);
    }
  };

  const pinned = announcements.filter(a => a.is_pinned);
  const regular = announcements.filter(a => !a.is_pinned);

  const AnnouncementCard = ({ a, highlighted }) => {
    const aud = AUDIENCE_STYLES[a.audience] || AUDIENCE_STYLES.all;
    const isExpanded = expanded[a._id];
    return (
      <div className={`rounded-2xl border shadow-sm overflow-hidden ${highlighted ? 'bg-violet-50 border-violet-200' : 'bg-white border-slate-100'}`}>
        <div className="p-5">
          <div className="flex items-start gap-3">
            {a.is_pinned && <Pin size={16} className="text-violet-500 mt-0.5 shrink-0" />}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${aud.bg} ${aud.text}`}>{aud.label}</span>
                {a.is_pinned && <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700">Pinned</span>}
                {a.expires_at && <span className="text-xs text-slate-400 flex items-center gap-1"><Calendar size={11} /> Expires: {fmt(a.expires_at)}</span>}
              </div>
              <h3 className="font-bold text-slate-800 text-base">{a.title}</h3>
              <p className={`text-sm text-slate-600 mt-1 ${isExpanded ? '' : 'line-clamp-2'}`}>{a.body}</p>
              {a.body && a.body.length > 120 && (
                <button onClick={() => setExpanded(p => ({ ...p, [a._id]: !p[a._id] }))} className="text-xs text-violet-600 mt-1 hover:underline">
                  {isExpanded ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>
            <p className="text-xs text-slate-400 shrink-0">{fmt(a.created_at)}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
            <Megaphone size={20} className="text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Announcements</h1>
            <p className="text-slate-500 text-sm">View and post school announcements</p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-violet-700 transition shadow-sm">
          <Plus size={16} /> Post Announcement
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">
          <Megaphone size={48} className="mx-auto mb-3 opacity-30" />
          <p>No announcements yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pinned.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-violet-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Pin size={12} /> Pinned
              </h2>
              <div className="space-y-3">
                {pinned.map(a => <AnnouncementCard key={a._id} a={a} highlighted />)}
              </div>
            </div>
          )}
          {regular.length > 0 && (
            <div>
              {pinned.length > 0 && <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 mt-4">Latest</h2>}
              <div className="space-y-3">
                {regular.map(a => <AnnouncementCard key={a._id} a={a} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-lg">Post Announcement</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg transition">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">Title *</label>
                <input required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" placeholder="Announcement title" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">Message *</label>
                <textarea required value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} rows={4}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none" placeholder="Write your announcement..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">Audience *</label>
                  <select value={form.audience} onChange={e => setForm(p => ({ ...p, audience: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white">
                    <option value="students">Students</option>
                    <option value="parents">Parents</option>
                    <option value="all">All</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">Expires At (optional)</label>
                  <input type="date" value={form.expires_at} onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_pinned} onChange={e => setForm(p => ({ ...p, is_pinned: e.target.checked }))}
                  className="w-4 h-4 accent-violet-600" />
                <span className="text-sm text-slate-700 font-medium">Pin this announcement</span>
              </label>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition disabled:opacity-60">
                  {saving ? 'Posting...' : 'Post Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
