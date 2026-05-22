import { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  PlayCircle, CheckCircle2, BookOpen, Users,
  MessageCircle, Send, ChevronDown,
} from 'lucide-react';

const timeAgo = (date) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(date).toLocaleDateString('en-PK');
};

export default function TeacherLMS() {
  const [courses, setCourses]       = useState([]);
  const [active, setActive]         = useState(null);
  const [progress, setProgress]     = useState(null);
  const [loading, setLoading]       = useState(true);
  const [loadingProg, setLoadingProg] = useState(false);

  // Q&A tab state
  const [activeTab, setActiveTab]   = useState('progress'); // 'progress' | 'qa'
  const [selectedMod, setSelectedMod] = useState(null);
  const [discussions, setDiscussions] = useState([]);
  const [loadingDisc, setLoadingDisc] = useState(false);
  const [replyMap, setReplyMap]     = useState({});      // { discId: text }
  const [postingId, setPostingId]   = useState(null);    // which disc is being replied to
  const [expandedDisc, setExpandedDisc] = useState(null);

  useEffect(() => {
    api.get('/teacher-portal/courses')
      .then(r => { setCourses(r.data); if (r.data.length) setActive(r.data[0]._id); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!active) return;
    setLoadingProg(true);
    setSelectedMod(null);
    setDiscussions([]);
    api.get(`/lms/course/${active}/student-progress`)
      .then(r => setProgress(r.data))
      .catch(() => setProgress(null))
      .finally(() => setLoadingProg(false));
  }, [active]);

  // Auto-select first module when progress loads
  useEffect(() => {
    const mods = progress?.modules || [];
    if (mods.length && !selectedMod) setSelectedMod(mods[0]._id);
  }, [progress]);

  // Load discussions when module selected
  useEffect(() => {
    if (!selectedMod) return;
    setLoadingDisc(true);
    api.get(`/lms/module/${selectedMod}/discussions`)
      .then(r => setDiscussions(r.data))
      .catch(() => setDiscussions([]))
      .finally(() => setLoadingDisc(false));
  }, [selectedMod]);

  const reloadDiscussions = async () => {
    if (!selectedMod) return;
    const { data } = await api.get(`/lms/module/${selectedMod}/discussions`);
    setDiscussions(data);
  };

  const postReply = async (discId) => {
    const msg = replyMap[discId]?.trim();
    if (!msg) return;
    setPostingId(discId);
    try {
      await api.post(`/lms/module/${selectedMod}/discussions`, {
        message:   msg,
        parent_id: discId,
      });
      setReplyMap(m => ({ ...m, [discId]: '' }));
      await reloadDiscussions();
    } catch {}
    setPostingId(null);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  if (!courses.length) return (
    <div className="bg-white rounded-3xl p-16 text-center border border-slate-100">
      <BookOpen size={48} className="text-slate-200 mx-auto mb-4"/>
      <h3 className="text-xl font-extrabold text-slate-400">No Courses Assigned</h3>
    </div>
  );

  const mods     = progress?.modules  || [];
  const students = progress?.students || [];

  const totalQuestions = discussions.length;
  const unanswered     = discussions.filter(d => !d.replies?.some(r => r.is_teacher)).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
          <PlayCircle size={24} className="text-emerald-500"/> LMS Dashboard
        </h2>
        <p className="text-slate-500 mt-1 text-sm">Track student progress and answer questions</p>
      </div>

      {/* Course tabs */}
      <div className="flex gap-2 flex-wrap">
        {courses.map(c => (
          <button key={c._id} onClick={() => setActive(c._id)}
            className={`px-5 py-2 rounded-xl font-bold text-sm transition-all ${active === c._id ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}>
            {c.name}
          </button>
        ))}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button onClick={() => setActiveTab('progress')}
          className={`px-5 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'progress' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          Student Progress
        </button>
        <button onClick={() => setActiveTab('qa')}
          className={`px-5 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'qa' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <MessageCircle size={15}/> Q&amp;A
          {unanswered > 0 && (
            <span className="bg-rose-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{unanswered}</span>
          )}
        </button>
      </div>

      {loadingProg ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : activeTab === 'progress' ? (

        /* ── Progress Tab ── */
        mods.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
            <PlayCircle size={36} className="text-slate-200 mx-auto mb-3"/>
            <p className="font-bold text-slate-400">No video lessons added to this course yet</p>
            <p className="text-xs text-slate-400 mt-1">Add a YouTube URL to a module to track student progress</p>
          </div>
        ) : students.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
            <Users size={36} className="text-slate-200 mx-auto mb-3"/>
            <p className="font-bold text-slate-400">No students have started watching yet</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-5 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider min-w-[160px]">Student</th>
                    {mods.map(m => (
                      <th key={m._id} className="text-center px-3 py-3 font-bold text-slate-500 text-xs min-w-[110px]">
                        <div className="max-w-[100px] mx-auto truncate" title={m.title}>{m.title}</div>
                      </th>
                    ))}
                    <th className="text-center px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Overall</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {students.map(s => (
                    <tr key={s.student_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm flex-shrink-0">
                            {s.student_name?.charAt(0)}
                          </div>
                          <span className="font-semibold text-slate-800 truncate max-w-[120px]">{s.student_name}</span>
                        </div>
                      </td>
                      {mods.map(m => {
                        const mp = s.modules[m._id] || {};
                        return (
                          <td key={m._id} className="px-3 py-3 text-center">
                            {mp.completed ? (
                              <div className="flex flex-col items-center gap-0.5">
                                <CheckCircle2 size={18} className="text-emerald-500"/>
                                {mp.quiz_total > 0 && (
                                  <span className="text-[10px] text-emerald-600 font-bold">
                                    {Math.round((mp.quiz_score / mp.quiz_total) * 100)}%
                                  </span>
                                )}
                              </div>
                            ) : mp.watched ? (
                              <div className="flex flex-col items-center gap-0.5">
                                <div className="w-4 h-4 rounded-full bg-blue-400 flex items-center justify-center">
                                  <div className="w-2 h-2 rounded-full bg-white"/>
                                </div>
                                <span className="text-[10px] text-blue-500 font-bold">Watched</span>
                              </div>
                            ) : (
                              <span className="text-slate-300 text-lg">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`font-extrabold text-sm ${s.pct === 100 ? 'text-emerald-600' : s.pct > 0 ? 'text-blue-500' : 'text-slate-300'}`}>
                            {s.pct}%
                          </span>
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all"
                              style={{ width: `${s.pct}%`, background: s.pct === 100 ? '#10b981' : '#6366f1' }}/>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center gap-6 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-emerald-500"/> Completed (quiz passed)</span>
              <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-400"/>&nbsp;Watched (quiz pending)</span>
              <span className="flex items-center gap-1.5"><span className="text-slate-300 font-bold">—</span>&nbsp;Not started</span>
            </div>
          </div>
        )

      ) : (

        /* ── Q&A Tab ── */
        <div className="space-y-4">
          {/* Module selector */}
          {mods.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
              <MessageCircle size={36} className="text-slate-200 mx-auto mb-3"/>
              <p className="font-bold text-slate-400">No video lessons — no Q&amp;A yet</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 flex-wrap">
                <label className="text-sm font-bold text-slate-600">Module:</label>
                <div className="relative">
                  <select
                    value={selectedMod || ''}
                    onChange={e => setSelectedMod(e.target.value)}
                    className="appearance-none bg-white border border-slate-200 text-slate-700 font-semibold text-sm pl-4 pr-9 py-2.5 rounded-xl focus:outline-none focus:border-emerald-400 cursor-pointer"
                  >
                    {mods.map(m => (
                      <option key={m._id} value={m._id}>{m.title}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                </div>
                {totalQuestions > 0 && (
                  <span className="text-xs text-slate-500 font-semibold">
                    {totalQuestions} question{totalQuestions !== 1 ? 's' : ''} · {unanswered} unanswered
                  </span>
                )}
              </div>

              {loadingDisc ? (
                <div className="flex items-center justify-center h-32">
                  <div className="w-7 h-7 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin"/>
                </div>
              ) : discussions.length === 0 ? (
                <div className="bg-white rounded-2xl p-10 text-center border border-slate-100">
                  <MessageCircle size={32} className="text-slate-200 mx-auto mb-3"/>
                  <p className="font-bold text-slate-400">No questions for this module yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {discussions.map(d => {
                    const answered = d.replies?.some(r => r.is_teacher);
                    const isOpen   = expandedDisc === d._id;
                    return (
                      <div key={d._id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${answered ? 'border-slate-100' : 'border-rose-200'}`}>
                        {/* Question */}
                        <div className="p-5">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm flex-shrink-0">
                              {d.author_id?.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mb-1">
                                <span className="text-sm font-bold text-slate-800">{d.author_id?.name || 'Student'}</span>
                                {!answered && (
                                  <span className="text-xs font-bold bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full">Needs Reply</span>
                                )}
                                {answered && (
                                  <span className="text-xs font-bold bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full">Answered</span>
                                )}
                                <span className="text-xs text-slate-400">{timeAgo(d.createdAt)}</span>
                              </div>
                              <p className="text-sm text-slate-700 leading-relaxed">{d.message}</p>
                            </div>
                            <button onClick={() => setExpandedDisc(isOpen ? null : d._id)}
                              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex-shrink-0 border border-emerald-200 px-3 py-1.5 rounded-xl hover:bg-emerald-50 transition-colors">
                              {isOpen ? 'Close' : 'Reply'}
                            </button>
                          </div>

                          {/* Existing replies */}
                          {d.replies?.length > 0 && (
                            <div className="ml-12 mt-3 pl-4 border-l-2 border-slate-200 space-y-3">
                              {d.replies.map(r => (
                                <div key={r._id} className="flex items-start gap-2">
                                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${r.is_teacher ? 'bg-emerald-500 text-white' : 'bg-indigo-100 text-indigo-600'}`}>
                                    {r.author_id?.name?.charAt(0)?.toUpperCase() || '?'}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <span className="text-xs font-bold text-slate-800">{r.author_id?.name}</span>
                                      {r.is_teacher && <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">Instructor</span>}
                                      <span className="text-xs text-slate-400">{timeAgo(r.createdAt)}</span>
                                    </div>
                                    <p className="text-xs text-slate-700">{r.message}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Reply form */}
                        {isOpen && (
                          <div className="border-t border-slate-100 p-5 bg-emerald-50">
                            <p className="text-xs font-bold text-emerald-700 mb-2">Your reply (shown as Instructor)</p>
                            <textarea
                              value={replyMap[d._id] || ''}
                              onChange={e => setReplyMap(m => ({ ...m, [d._id]: e.target.value }))}
                              placeholder="Write your reply…"
                              rows={3}
                              className="w-full border border-emerald-200 rounded-xl p-3 text-sm text-slate-700 resize-none focus:outline-none focus:border-emerald-400 bg-white placeholder-slate-400"
                            />
                            <button
                              onClick={() => postReply(d._id)}
                              disabled={postingId === d._id || !(replyMap[d._id] || '').trim()}
                              className="mt-2 flex items-center gap-2 bg-emerald-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50">
                              <Send size={14}/> {postingId === d._id ? 'Posting…' : 'Send Reply'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
