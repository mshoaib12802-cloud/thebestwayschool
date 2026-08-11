import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import {
  PlayCircle, CheckCircle2, Lock, ChevronLeft, BookOpen,
  Clock, FileText, ArrowRight, Link2, MessageCircle, Send,
  StickyNote, Save, Star, School, Download,
} from 'lucide-react';

const API_BASE = '';

const TYPE_COLORS = {
  theory:     'bg-blue-100 text-blue-700',
  practical:  'bg-emerald-100 text-emerald-700',
  project:    'bg-violet-100 text-violet-700',
  assessment: 'bg-amber-100 text-amber-700',
  workshop:   'bg-rose-100 text-rose-700',
};

const toEmbedUrl = (url) => {
  if (!url) return '';
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1`;
  const vi = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vi) return `https://player.vimeo.com/video/${vi[1]}`;
  const gd = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (gd) return `https://drive.google.com/file/d/${gd[1]}/preview`;
  return url;
};

const timeAgo = (date) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(date).toLocaleDateString('en-PK');
};

function ProgressRing({ pct, size = 56 }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="5" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={pct === 100 ? '#10b981' : '#6366f1'} strokeWidth="5"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.5s' }} />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="#1e293b"
        fontSize={size < 48 ? 9 : 11} fontWeight="bold" className="rotate-90" style={{ transform: 'rotate(90deg)', transformOrigin: 'center' }}>
        {pct}%
      </text>
    </svg>
  );
}

export default function SchoolStudentLMS() {
  const [subjects, setSubjects]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [activeSubject, setActiveSubject] = useState(null); // { subject, lessons }
  const [activeLesson, setActiveLesson]   = useState(null); // lesson obj with progress

  // lesson viewer state
  const [videoWatched, setVideoWatched]   = useState(false);
  const [watchingVideo, setWatchingVideo] = useState(false);
  const [tab, setTab]                     = useState('video'); // 'video' | 'quiz' | 'notes' | 'qa'
  const [quizState, setQuizState]         = useState(null); // null | { answers, result }
  const [answers, setAnswers]             = useState({});
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [notes, setNotes]                 = useState('');
  const [notesSaved, setNotesSaved]       = useState(false);
  const [discussions, setDiscussions]     = useState([]);
  const [newMsg, setNewMsg]               = useState('');
  const [replyMap, setReplyMap]           = useState({});
  const [postingId, setPostingId]         = useState(null);

  useEffect(() => {
    api.get('/school-lms/my-subjects')
      .then(r => setSubjects(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openSubject = async (sub) => {
    try {
      const { data } = await api.get(`/school-lms/subject/${sub._id}/lessons`);
      setActiveSubject({ subject: sub, lessons: data });
      setActiveLesson(null);
    } catch {  }
  };

  const openLesson = (lesson) => {
    setActiveLesson(lesson);
    setVideoWatched(lesson.progress?.watched || false);
    setTab('video');
    setAnswers({});
    setQuizState(null);
    setNotes(lesson.progress?.student_notes || '');
    setNotesSaved(false);
    setDiscussions([]);
  };

  const handleMarkWatched = async () => {
    if (videoWatched || watchingVideo) return;
    setWatchingVideo(true);
    try {
      const { data } = await api.post(`/school-lms/lesson/${activeLesson._id}/watched`);
      setVideoWatched(true);
      setActiveLesson(prev => ({ ...prev, progress: data }));
      // update lesson in subject list
      setActiveSubject(prev => ({
        ...prev,
        lessons: prev.lessons.map(l => l._id === activeLesson._id ? { ...l, progress: data } : l),
      }));
      // update subject progress
      if (data.completed) {
        setSubjects(prev => prev.map(s => {
          if (s._id !== activeSubject.subject._id) return s;
          const completed = s.completed_lessons + 1;
          return { ...s, completed_lessons: completed, progress_pct: Math.round((completed / s.total_lessons) * 100) };
        }));
      }
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
    finally { setWatchingVideo(false); }
  };

  const handleSubmitQuiz = async () => {
    const qs = activeLesson.quiz?.questions || [];
    if (Object.keys(answers).length < qs.length) return alert('Please answer all questions');
    setSubmittingQuiz(true);
    try {
      const payload = qs.map(q => ({ question_id: q._id, selected_index: answers[q._id] }));
      const { data } = await api.post(`/school-lms/lesson/${activeLesson._id}/quiz`, { answers: payload });
      setQuizState(data);
      setActiveLesson(prev => ({ ...prev, progress: data.progress }));
      if (data.passed) {
        setActiveSubject(prev => ({
          ...prev,
          lessons: prev.lessons.map(l => l._id === activeLesson._id ? { ...l, progress: data.progress } : l),
        }));
        setSubjects(prev => prev.map(s => {
          if (s._id !== activeSubject.subject._id) return s;
          const completed = s.completed_lessons + 1;
          return { ...s, completed_lessons: completed, progress_pct: Math.round((completed / s.total_lessons) * 100) };
        }));
      }
    } catch (err) { alert(err.response?.data?.message || 'Quiz submission failed'); }
    finally { setSubmittingQuiz(false); }
  };

  const handleSaveNotes = async () => {
    try {
      await api.put(`/school-lms/lesson/${activeLesson._id}/notes`, { notes });
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    } catch {  }
  };

  const loadDiscussions = useCallback(async () => {
    if (!activeLesson) return;
    try {
      const { data } = await api.get(`/school-lms/lesson/${activeLesson._id}/discussions`);
      setDiscussions(data);
    } catch {  }
  }, [activeLesson]);

  useEffect(() => {
    if (tab === 'qa') loadDiscussions();
  }, [tab, loadDiscussions]);

  const postMsg = async () => {
    if (!newMsg.trim()) return;
    try {
      await api.post(`/school-lms/lesson/${activeLesson._id}/discussions`, { message: newMsg.trim() });
      setNewMsg('');
      loadDiscussions();
    } catch {  }
  };

  const postReply = async (discId) => {
    const msg = replyMap[discId]?.trim();
    if (!msg) return;
    setPostingId(discId);
    try {
      await api.post(`/school-lms/lesson/${activeLesson._id}/discussions`, { message: msg, parent_id: discId });
      setReplyMap(m => ({ ...m, [discId]: '' }));
      loadDiscussions();
    } catch {  }
    finally { setPostingId(null); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // ── Subject grid ──────────────────────────────────────────────────────────

  if (!activeSubject) return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
          <School size={24} className="text-indigo-500" /> My Video Lessons
        </h2>
        <p className="text-slate-500 mt-1">Select a subject to start learning</p>
      </div>

      {subjects.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
          <BookOpen size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No lessons available yet. Your teachers will upload video lessons soon.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map(sub => (
            <button key={sub._id} onClick={() => openSubject(sub)}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md hover:border-indigo-200 transition-all text-left group">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-extrabold text-lg shadow-sm">
                  {sub.name[0]}
                </div>
                <ProgressRing pct={sub.progress_pct} />
              </div>
              <h3 className="font-extrabold text-slate-800 group-hover:text-indigo-600 transition-colors">{sub.name}</h3>
              {sub.teacher_id?.name && <p className="text-xs text-slate-400 mt-0.5">by {sub.teacher_id.name}</p>}
              <div className="mt-3 flex items-center gap-3 text-sm">
                <span className="text-slate-500">{sub.total_lessons} lessons</span>
                <span className="text-emerald-600 font-semibold">{sub.completed_lessons} done</span>
              </div>
              {sub.total_lessons > 0 && (
                <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${sub.progress_pct}%` }} />
                </div>
              )}
              {sub.total_lessons === 0 && (
                <p className="text-xs text-amber-600 mt-2">No lessons yet</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // ── Lesson list ───────────────────────────────────────────────────────────

  const { subject, lessons } = activeSubject;

  if (!activeLesson) return (
    <div className="space-y-5">
      <button onClick={() => setActiveSubject(null)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 font-medium transition-colors">
        <ChevronLeft size={16} /> All Subjects
      </button>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800">{subject.name}</h2>
          {subject.teacher_id?.name && <p className="text-slate-400 text-sm mt-0.5">by {subject.teacher_id.name}</p>}
        </div>
        <div className="flex items-center gap-3 text-sm bg-white rounded-xl border border-slate-100 px-4 py-2 shadow-sm">
          <span className="text-slate-500">{subject.total_lessons} lessons</span>
          <span className="w-px h-4 bg-slate-200" />
          <span className="text-emerald-600 font-bold">{subject.completed_lessons} completed</span>
          <ProgressRing pct={subject.progress_pct} size={44} />
        </div>
      </div>

      {lessons.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
          <PlayCircle size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No lessons published yet. Check back soon!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lessons.map((l, i) => {
            const prog = l.progress;
            const isComplete = prog?.completed;
            const isWatched  = prog?.watched;
            const hasQuiz    = l.quiz?.questions?.length > 0;

            return (
              <button key={l._id} onClick={() => openLesson(l)}
                className={`w-full bg-white rounded-2xl border p-4 flex items-center gap-4 hover:shadow-md transition-all text-left ${isComplete ? 'border-emerald-100' : 'border-slate-100'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isComplete ? 'bg-emerald-500 text-white' : isWatched ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                  {isComplete ? <CheckCircle2 size={20} /> : isWatched ? <PlayCircle size={20} /> : <span className="font-bold text-sm">{i+1}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`font-bold ${isComplete ? 'text-emerald-700' : 'text-slate-800'}`}>{l.title}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TYPE_COLORS[l.type]}`}>{l.type}</span>
                    {l.video_url && <span className="text-[10px] bg-rose-100 text-rose-600 font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><PlayCircle size={8}/>Video</span>}
                    {hasQuiz && <span className="text-[10px] bg-amber-100 text-amber-600 font-bold px-1.5 py-0.5 rounded-full">Quiz</span>}
                    {l.pdf_files?.length > 0 && <span className="text-[10px] bg-indigo-100 text-indigo-600 font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><FileText size={8}/>{l.pdf_files.length} PDF</span>}
                  </div>
                  {l.description && <p className="text-sm text-slate-400 mt-0.5 line-clamp-1">{l.description}</p>}
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                    {l.video_duration_mins > 0 && <span className="flex items-center gap-1"><Clock size={10}/>{l.video_duration_mins}m</span>}
                    {isComplete && prog?.quiz_passed && <span className="text-emerald-600 font-semibold">Quiz passed {prog.quiz_score}/{prog.quiz_total}</span>}
                    {isComplete && !hasQuiz && <span className="text-emerald-600 font-semibold">Completed</span>}
                    {isWatched && !isComplete && hasQuiz && <span className="text-amber-600 font-semibold">Quiz pending</span>}
                  </div>
                </div>
                <ArrowRight size={16} className="text-slate-300 shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  // ── Lesson viewer ─────────────────────────────────────────────────────────

  const hasVideo = !!activeLesson.video_url;
  const hasQuiz  = (activeLesson.quiz?.questions?.length || 0) > 0;
  const hasPdfs  = (activeLesson.pdf_files?.length || 0) > 0;
  const prog     = activeLesson.progress;
  const isComplete = prog?.completed;
  const quizAttemptsDone = prog?.quiz_attempts || 0;
  const maxAttempts = 3;

  return (
    <div className="space-y-4">
      <button onClick={() => setActiveLesson(null)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 font-medium transition-colors">
        <ChevronLeft size={16} /> Back to {subject.name}
      </button>

      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex-1">
          <h2 className="text-xl font-extrabold text-slate-800">{activeLesson.title}</h2>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${TYPE_COLORS[activeLesson.type]}`}>{activeLesson.type}</span>
            {isComplete && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1"><CheckCircle2 size={10}/>Completed</span>}
            {activeLesson.video_duration_mins > 0 && <span className="text-xs text-slate-400 flex items-center gap-1"><Clock size={11}/>{activeLesson.video_duration_mins} min</span>}
          </div>
          {activeLesson.description && <p className="text-slate-500 mt-2 text-sm">{activeLesson.description}</p>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {[
          { id: 'video', label: 'Video', icon: <PlayCircle size={14}/> },
          ...(hasPdfs ? [{ id: 'pdfs', label: `PDFs (${activeLesson.pdf_files.length})`, icon: <FileText size={14}/> }] : []),
          ...(hasQuiz ? [{ id: 'quiz', label: 'Quiz', icon: <Star size={14}/> }] : []),
          { id: 'notes', label: 'Notes', icon: <StickyNote size={14}/> },
          { id: 'qa', label: 'Q&A', icon: <MessageCircle size={14}/> },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${tab === t.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── Video tab ── */}
      {tab === 'video' && (
        <div className="space-y-4">
          {hasVideo ? (
            <>
              <div className="aspect-video rounded-2xl overflow-hidden bg-slate-900 shadow-lg">
                <iframe src={toEmbedUrl(activeLesson.video_url)} className="w-full h-full" allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
              </div>
              {activeLesson.video_title && <p className="text-sm font-medium text-slate-600">{activeLesson.video_title}</p>}
              {!videoWatched && (
                <button onClick={handleMarkWatched} disabled={watchingVideo}
                  className="flex items-center gap-2 bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-indigo-600 disabled:opacity-50 transition-colors">
                  {watchingVideo
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                    : <CheckCircle2 size={16}/>}
                  {watchingVideo ? 'Marking…' : "I've Watched This Video"}
                </button>
              )}
              {videoWatched && (
                <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
                  <CheckCircle2 size={16}/> Video watched
                  {!hasQuiz && isComplete && ' · Lesson complete!'}
                  {hasQuiz && !isComplete && <span className="text-amber-600"> · Take the quiz to complete this lesson</span>}
                  {isComplete && hasQuiz && ' · Lesson complete!'}
                </div>
              )}
            </>
          ) : (
            <div className="bg-slate-50 rounded-2xl p-8 text-center border border-slate-100">
              <PlayCircle size={36} className="text-slate-300 mx-auto mb-2" />
              <p className="text-slate-400 font-medium">No video for this lesson.</p>
            </div>
          )}
          {/* Resources */}
          {activeLesson.resources?.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-100 p-4">
              <h4 className="font-bold text-slate-700 text-sm mb-2 flex items-center gap-1.5"><Link2 size={14}/> Resources</h4>
              <div className="space-y-1">
                {activeLesson.resources.map((r, i) => (
                  <a key={i} href={r.url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 text-sm text-indigo-600 hover:underline">
                    <Link2 size={12}/>{r.title}
                  </a>
                ))}
              </div>
            </div>
          )}
          {/* Teacher notes */}
          {activeLesson.notes_visible && activeLesson.teacher_notes && (
            <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-4">
              <h4 className="font-bold text-indigo-700 text-sm mb-1 flex items-center gap-1.5"><FileText size={14}/> Teacher Notes</h4>
              <p className="text-sm text-indigo-800 whitespace-pre-wrap">{activeLesson.teacher_notes}</p>
            </div>
          )}
        </div>
      )}

      {/* ── PDFs tab ── */}
      {tab === 'pdfs' && (
        <div className="space-y-3 max-w-2xl">
          <p className="text-sm font-semibold text-slate-500">Question papers and study materials uploaded by your teacher:</p>
          {activeLesson.pdf_files.map(pdf => (
            <div key={pdf._id} className="bg-white rounded-xl border border-slate-100 p-4 flex items-center gap-4 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                <FileText size={20} className="text-rose-500"/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 truncate">{pdf.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{pdf.original_name} · {(pdf.size_bytes / 1024).toFixed(0)} KB</p>
              </div>
              <a href={`${API_BASE}/uploads/lms-pdfs/${pdf.filename}`} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-indigo-600 transition-colors shrink-0">
                <Download size={14}/> Open
              </a>
            </div>
          ))}
        </div>
      )}

      {/* ── Quiz tab ── */}
      {tab === 'quiz' && (
        <div className="max-w-2xl space-y-4">
          {isComplete && prog?.quiz_passed ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
              <CheckCircle2 size={36} className="text-emerald-500 mx-auto mb-2"/>
              <h3 className="font-extrabold text-emerald-700 text-lg">Quiz Passed!</h3>
              <p className="text-emerald-600 mt-1">Score: {prog.quiz_score}/{prog.quiz_total} · {Math.round((prog.quiz_score/prog.quiz_total)*100)}%</p>
              <p className="text-xs text-emerald-500 mt-1">Attempts used: {quizAttemptsDone}/{maxAttempts}</p>
            </div>
          ) : !videoWatched ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
              <Lock size={32} className="text-amber-400 mx-auto mb-2"/>
              <p className="text-amber-700 font-semibold">Watch the video first to unlock the quiz.</p>
            </div>
          ) : quizAttemptsDone >= maxAttempts ? (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center">
              <p className="text-rose-700 font-bold">Maximum {maxAttempts} attempts reached.</p>
              <p className="text-rose-500 text-sm mt-1">Best score: {prog?.quiz_score}/{prog?.quiz_total}</p>
            </div>
          ) : (
            <>
              {quizState ? (
                <div className={`rounded-2xl p-5 border ${quizState.passed ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                  <h3 className={`font-extrabold text-lg ${quizState.passed ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {quizState.passed ? '🎉 Passed!' : '❌ Not Passed'}
                  </h3>
                  <p className="mt-1 text-slate-700">Score: {quizState.score}/{quizState.total} ({quizState.pct}%)</p>
                  <p className="text-xs text-slate-500">Attempts remaining: {quizState.attempts_remaining}</p>
                  {!quizState.passed && quizState.attempts_remaining > 0 && (
                    <button onClick={() => { setQuizState(null); setAnswers({}); }} className="mt-3 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50">
                      Try Again
                    </button>
                  )}
                </div>
              ) : null}

              {(!quizState || (!quizState.passed && quizState.attempts_remaining > 0)) && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-700">{activeLesson.quiz.questions.length} Questions · Pass {activeLesson.quiz.pass_percent}%</h4>
                    <span className="text-xs text-slate-400">Attempt {quizAttemptsDone + 1}/{maxAttempts}</span>
                  </div>
                  {activeLesson.quiz.questions.map((q, qi) => (
                    <div key={q._id} className="bg-white rounded-xl border border-slate-100 p-4">
                      <p className="font-semibold text-slate-800 mb-3">{qi+1}. {q.text}</p>
                      <div className="space-y-2">
                        {q.options.map((o, oi) => (
                          <button key={oi} onClick={() => setAnswers(a => ({ ...a, [q._id]: oi }))}
                            className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-all ${answers[q._id] === oi ? 'border-indigo-400 bg-indigo-50 text-indigo-700 font-semibold' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
                            <span className="font-bold mr-2">{String.fromCharCode(65+oi)}.</span>{o}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button onClick={handleSubmitQuiz} disabled={submittingQuiz || Object.keys(answers).length < activeLesson.quiz.questions.length}
                    className="w-full py-3 bg-indigo-500 text-white rounded-xl font-bold hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    {submittingQuiz ? 'Submitting…' : 'Submit Quiz'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Notes tab ── */}
      {tab === 'notes' && (
        <div className="max-w-2xl space-y-3">
          <h4 className="font-bold text-slate-700 flex items-center gap-2"><StickyNote size={16} className="text-amber-500"/>My Notes</h4>
          <textarea rows={10} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Write your notes here..."
            className="w-full border border-slate-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
          <button onClick={handleSaveNotes} className="flex items-center gap-2 bg-indigo-500 text-white px-5 py-2 rounded-xl font-semibold hover:bg-indigo-600 transition-colors">
            <Save size={15}/> {notesSaved ? 'Saved!' : 'Save Notes'}
          </button>
        </div>
      )}

      {/* ── Q&A tab ── */}
      {tab === 'qa' && (
        <div className="max-w-2xl space-y-4">
          <div className="flex gap-2">
            <input value={newMsg} onChange={e => setNewMsg(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && postMsg()}
              placeholder="Ask your teacher a question..."
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            <button onClick={postMsg} className="bg-indigo-500 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-600 transition-colors">
              <Send size={15}/>
            </button>
          </div>
          {discussions.length === 0
            ? <p className="text-center text-slate-400 py-8 text-sm">No questions yet. Be the first to ask!</p>
            : discussions.map(d => (
              <div key={d._id} className="bg-slate-50 rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${d.is_teacher ? 'bg-emerald-500 text-white' : 'bg-indigo-100 text-indigo-700'}`}>
                    {d.author_id?.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">{d.author_id?.name}</span>
                      {d.is_teacher && <span className="text-[9px] bg-emerald-100 text-emerald-700 font-bold px-1.5 rounded-full">Teacher</span>}
                      <span className="text-xs text-slate-400 ml-auto">{timeAgo(d.createdAt)}</span>
                    </div>
                    <p className="text-sm text-slate-700 mt-0.5">{d.message}</p>
                  </div>
                </div>
                {d.replies?.map(r => (
                  <div key={r._id} className="ml-10 mt-2 flex items-start gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${r.is_teacher ? 'bg-emerald-500 text-white' : 'bg-indigo-100 text-indigo-700'}`}>
                      {r.author_id?.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-600">{r.author_id?.name}</span>
                      {r.is_teacher && <span className="text-[9px] bg-emerald-100 text-emerald-700 font-bold px-1.5 rounded-full ml-1">Teacher</span>}
                      <p className="text-sm text-slate-600">{r.message}</p>
                    </div>
                  </div>
                ))}
                <div className="ml-10 mt-2 flex gap-2">
                  <input value={replyMap[d._id] || ''} onChange={e => setReplyMap(m => ({ ...m, [d._id]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && postReply(d._id)}
                    placeholder="Reply..."
                    className="flex-1 border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300" />
                  <button onClick={() => postReply(d._id)} disabled={postingId === d._id}
                    className="bg-indigo-500 text-white px-2 py-1 rounded-lg hover:bg-indigo-600 disabled:opacity-50">
                    <Send size={11}/>
                  </button>
                </div>
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}
