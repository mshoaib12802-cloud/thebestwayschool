import { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { Bell, Pin, Calendar, User } from 'lucide-react';

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const AUDIENCE_STYLES = {
  students: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Students' },
  parents:  { bg: 'bg-violet-100', text: 'text-violet-700', label: 'Parents' },
  all:      { bg: 'bg-teal-100',   text: 'text-teal-700',   label: 'All' },
};

export default function StudentAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    api.get('/student-portal/announcements')
      .then(r => setAnnouncements(r.data))
      .catch(() => toast.error('Failed to load announcements'))
      .finally(() => setLoading(false));
  }, []);

  const pinned  = announcements.filter(a => a.is_pinned);
  const regular = announcements.filter(a => !a.is_pinned);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
    </div>
  );

  const Card = ({ a, highlighted }) => {
    const aud = AUDIENCE_STYLES[a.audience] || AUDIENCE_STYLES.all;
    const isExp = expanded[a._id];
    return (
      <div className={`rounded-2xl border shadow-sm p-5 ${highlighted ? 'bg-violet-50 border-violet-200' : 'bg-white border-slate-100'}`}>
        <div className="flex items-start gap-3">
          {a.is_pinned && <Pin size={15} className="text-violet-500 mt-0.5 shrink-0" />}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${aud.bg} ${aud.text}`}>{aud.label}</span>
              {a.is_pinned && <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-semibold">Pinned</span>}
            </div>
            <h3 className="font-bold text-slate-800 text-base">{a.title}</h3>
            <p className={`text-sm text-slate-600 mt-1 ${isExp ? '' : 'line-clamp-2'}`}>{a.body}</p>
            {a.body && a.body.length > 120 && (
              <button onClick={() => setExpanded(p => ({ ...p, [a._id]: !p[a._id] }))} className="text-xs text-violet-600 mt-1 hover:underline">
                {isExp ? 'Show less' : 'Read more'}
              </button>
            )}
            <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 flex-wrap">
              <span className="flex items-center gap-1"><Calendar size={11} /> {fmt(a.created_at)}</span>
              {(a.created_by?.name || a.posted_by) && (
                <span className="flex items-center gap-1"><User size={11} /> {a.created_by?.name || a.posted_by}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
          <Bell size={20} className="text-violet-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Announcements</h1>
          <p className="text-slate-500 text-sm">School notices and updates</p>
        </div>
      </div>

      {announcements.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">
          <Bell size={48} className="mx-auto mb-3 opacity-30" />
          <p>No announcements at this time</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pinned.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-violet-600 uppercase tracking-wider mb-3 flex items-center gap-1">
                <Pin size={12} /> Pinned Announcements
              </h2>
              <div className="space-y-3">
                {pinned.map(a => <Card key={a._id} a={a} highlighted />)}
              </div>
            </div>
          )}
          {regular.length > 0 && (
            <div>
              {pinned.length > 0 && <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 mt-5">All Announcements</h2>}
              <div className="space-y-3">
                {regular.map(a => <Card key={a._id} a={a} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
