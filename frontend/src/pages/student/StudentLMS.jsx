import { useState, useEffect, useCallback, useContext } from 'react';
import api from '../../services/api';
import { confirm } from '../../utils/confirm';
import { AuthContext } from '../../context/AuthContext';
import {
  PlayCircle, CheckCircle2, Lock, ChevronLeft, BookOpen,
  Clock, Award, FileText, RotateCcw, Download, Star,
  Layers, ChevronRight, XCircle, MessageCircle, StickyNote,
  Send, Search, ArrowRight, Pin, Trash2, Save,
} from 'lucide-react';
import jsPDF from 'jspdf';

// ── helpers ──────────────────────────────────────────────────────────────────

const toEmbedUrl = (url) => {
  if (!url) return '';
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vi = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vi) return `https://player.vimeo.com/video/${vi[1]}`;
  const gd = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (gd) return `https://drive.google.com/file/d/${gd[1]}/preview`;
  const lm = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
  if (lm) return `https://www.loom.com/embed/${lm[1]}`;
  return url;
};

const TYPE_COLORS = {
  theory:     'bg-blue-100 text-blue-700',
  practical:  'bg-emerald-100 text-emerald-700',
  project:    'bg-violet-100 text-violet-700',
  assessment: 'bg-amber-100 text-amber-700',
  workshop:   'bg-rose-100 text-rose-700',
};

const timeAgo = (date) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString('en-PK');
};

// ── Certificate PDF ───────────────────────────────────────────────────────────

const downloadCertificate = (data) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = 297, H = 210;

  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(6);
  doc.rect(8, 8, W - 16, H - 16);
  doc.setLineWidth(1.5);
  doc.rect(13, 13, W - 26, H - 26);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(100, 80, 10);
  doc.text('INFLORESCENCE ADVANCE SKILLS', W / 2, 32, { align: 'center' });

  doc.setFontSize(28);
  doc.setTextColor(30, 27, 75);
  doc.text('Certificate of Completion', W / 2, 52, { align: 'center' });

  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.8);
  doc.line(60, 57, W - 60, 57);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(80, 80, 80);
  doc.text('This is to certify that', W / 2, 72, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(30, 27, 75);
  doc.text(data.student_name, W / 2, 90, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(80, 80, 80);
  doc.text('has successfully completed all video lessons and assessments for the course', W / 2, 104, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(99, 102, 241);
  doc.text(`"${data.course_name}"`, W / 2, 118, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text(`Comprising ${data.modules_done} video module${data.modules_done !== 1 ? 's' : ''} with assessments`, W / 2, 128, { align: 'center' });

  const dateStr = data.completed_at
    ? new Date(data.completed_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' });

  doc.line(60, 148, W - 60, 148);
  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  doc.text(`Date of Completion: ${dateStr}`, W / 2, 156, { align: 'center' });

  doc.setLineWidth(0.5);
  doc.setDrawColor(160, 160, 160);
  doc.line(50, 178, 120, 178);
  doc.line(W - 120, 178, W - 50, 178);
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text('Course Instructor', 85, 184, { align: 'center' });
  doc.text('Institute Director', W - 85, 184, { align: 'center' });

  doc.save(`Certificate_${data.student_name.replace(/\s+/g, '_')}_${data.course_name.replace(/\s+/g, '_')}.pdf`);
};

// ── DiscussionThread ──────────────────────────────────────────────────────────

const DiscussionThread = ({ discussion: d, currentUserId, onReply, onDelete }) => {
  const [showReplies, setShowReplies] = useState(true);

  return (
    <div className={`rounded-2xl border p-4 ${d.is_pinned ? 'border-amber-200 bg-amber-50' : 'border-slate-100 bg-slate-50'}`}>
      {d.is_pinned && (
        <span className="flex items-center gap-1 text-xs font-bold text-amber-600 mb-2">
          <Pin size={10}/> Pinned
        </span>
      )}
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${d.is_teacher ? 'bg-emerald-500 text-white' : 'bg-indigo-100 text-indigo-600'}`}>
          {d.author_id?.name?.charAt(0)?.toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mb-1">
            <span className="text-sm font-bold text-slate-800">{d.author_id?.name || 'Unknown'}</span>
            {d.is_teacher && (
              <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Instructor</span>
            )}
            <span className="text-xs text-slate-400">{timeAgo(d.createdAt)}</span>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed break-words">{d.message}</p>
          <div className="flex items-center gap-4 mt-2">
            <button onClick={() => onReply(d._id, d.author_id?.name || 'Student')}
              className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold">
              Reply
            </button>
            {d.author_id?._id === currentUserId && (
              <button onClick={() => onDelete(d._id)}
                className="text-xs text-rose-400 hover:text-rose-600 font-semibold flex items-center gap-1">
                <Trash2 size={11}/> Delete
              </button>
            )}
            {d.replies?.length > 0 && (
              <button onClick={() => setShowReplies(v => !v)}
                className="text-xs text-slate-400 hover:text-slate-600 font-semibold">
                {showReplies ? 'Hide' : 'Show'} {d.replies.length} {d.replies.length === 1 ? 'reply' : 'replies'}
              </button>
            )}
          </div>
        </div>
      </div>

      {showReplies && d.replies?.length > 0 && (
        <div className="ml-11 mt-3 pl-4 border-l-2 border-slate-200 space-y-3">
          {d.replies.map(r => (
            <div key={r._id} className="flex items-start gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${r.is_teacher ? 'bg-emerald-500 text-white' : 'bg-indigo-100 text-indigo-600'}`}>
                {r.author_id?.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mb-0.5">
                  <span className="text-xs font-bold text-slate-800">{r.author_id?.name || 'Unknown'}</span>
                  {r.is_teacher && (
                    <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">Instructor</span>
                  )}
                  <span className="text-xs text-slate-400">{timeAgo(r.createdAt)}</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed break-words">{r.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Quiz Component ────────────────────────────────────────────────────────────

const QuizPanel = ({ module: mod, progress, onComplete }) => {
  const [answers, setAnswers]       = useState({});
  const [result, setResult]         = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (!mod) return null;
  const questions    = mod.quiz?.questions || [];
  const attemptsLeft = 3 - (progress?.quiz_attempts || 0);

  const handleSubmit = async () => {
    if (Object.keys(answers).length < questions.length) {
      alert('Please answer all questions before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = questions.map(q => ({ question_id: q._id, selected_index: answers[q._id] }));
      const { data } = await api.post(`/lms/module/${mod._id}/quiz`, { answers: payload });
      setResult(data);
      if (data.passed) onComplete();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit quiz');
    }
    setSubmitting(false);
  };

  if (progress?.quiz_passed) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
        <CheckCircle2 size={40} className="text-emerald-500 mx-auto mb-3"/>
        <p className="font-extrabold text-emerald-700 text-lg">Quiz Passed!</p>
        <p className="text-emerald-600 text-sm mt-1">
          Score: {progress.quiz_score}/{progress.quiz_total} ({Math.round((progress.quiz_score / progress.quiz_total) * 100)}%)
        </p>
      </div>
    );
  }

  if (result) {
    return (
      <div className={`rounded-2xl p-6 border ${result.passed ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
        <div className="text-center mb-5">
          {result.passed
            ? <CheckCircle2 size={40} className="text-emerald-500 mx-auto mb-2"/>
            : <XCircle size={40} className="text-rose-500 mx-auto mb-2"/>}
          <p className={`font-extrabold text-xl ${result.passed ? 'text-emerald-700' : 'text-rose-700'}`}>
            {result.passed ? 'Passed!' : 'Not Passed'}
          </p>
          <p className="text-slate-600 text-sm mt-1">
            Score: {result.score}/{result.total} ({result.pct}%) · Pass mark: {mod.quiz.pass_percent}%
          </p>
          {!result.passed && result.attempts_remaining > 0 && (
            <p className="text-rose-600 text-sm mt-1">{result.attempts_remaining} attempt{result.attempts_remaining !== 1 ? 's' : ''} remaining</p>
          )}
        </div>
        <div className="space-y-2">
          {result.graded_questions.map((gq, i) => {
            const q = questions[i];
            return (
              <div key={i} className={`rounded-xl p-3 ${gq.is_correct ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                <p className="text-sm font-semibold text-slate-700 mb-1">{i + 1}. {q.text}</p>
                <p className={`text-xs font-bold ${gq.is_correct ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {gq.is_correct ? '✓ Correct' : `✗ Wrong — Correct: ${q.options[q.correct_index]}`}
                </p>
              </div>
            );
          })}
        </div>
        {!result.passed && result.attempts_remaining > 0 && (
          <button onClick={() => setResult(null)} className="mt-4 w-full flex items-center justify-center gap-2 bg-slate-700 text-white py-2.5 rounded-xl font-bold hover:bg-slate-800 transition-colors">
            <RotateCcw size={15}/> Try Again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-extrabold text-slate-700 flex items-center gap-2">
          <FileText size={18} className="text-violet-500"/> Quiz ({questions.length} question{questions.length !== 1 ? 's' : ''})
        </p>
        <span className="text-xs text-slate-400">{attemptsLeft} attempt{attemptsLeft !== 1 ? 's' : ''} left</span>
      </div>
      <p className="text-xs text-slate-500">Pass mark: {mod.quiz.pass_percent}%. Answer all questions then submit.</p>

      {questions.map((q, qi) => (
        <div key={q._id} className="bg-slate-50 rounded-2xl p-4 space-y-3">
          <p className="font-semibold text-slate-800 text-sm">{qi + 1}. {q.text}</p>
          <div className="space-y-2">
            {q.options.map((opt, oi) => (
              <label key={oi} className={`flex items-center gap-3 cursor-pointer p-3 rounded-xl border transition-all ${
                answers[q._id] === oi ? 'border-violet-500 bg-violet-50' : 'border-slate-200 bg-white hover:border-violet-300'
              }`}>
                <input type="radio" name={`q-${q._id}`} value={oi}
                  checked={answers[q._id] === oi}
                  onChange={() => setAnswers(a => ({ ...a, [q._id]: oi }))}
                  className="accent-violet-600"/>
                <span className="text-sm text-slate-700">{opt}</span>
              </label>
            ))}
          </div>
        </div>
      ))}

      <button onClick={handleSubmit} disabled={submitting}
        className="w-full bg-violet-600 text-white py-3 rounded-xl font-bold hover:bg-violet-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
        {submitting ? 'Submitting…' : 'Submit Answers'}
      </button>
    </div>
  );
};

// ── Curriculum Item ───────────────────────────────────────────────────────────

const CurriculumItem = ({ mod, index, progress, isActive, onClick }) => {
  const hasVideo   = !!mod.video_url;
  const isDone     = progress?.completed;
  const isWatched  = progress?.watched;
  const hasQuiz    = (mod.quiz?.questions?.length || 0) > 0;

  return (
    <button onClick={onClick} className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
      isActive ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-100 text-slate-700'
    }`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
        isDone    ? 'bg-emerald-500 text-white' :
        isWatched ? 'bg-blue-400 text-white' :
        isActive  ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'
      }`}>
        {isDone ? <CheckCircle2 size={16}/> : !hasVideo ? <Lock size={13}/> : index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${isActive ? 'text-white' : 'text-slate-800'}`}>{mod.title}</p>
        <div className={`flex items-center gap-2 mt-0.5 text-[11px] ${isActive ? 'text-white/70' : 'text-slate-400'}`}>
          {hasVideo && <span className="flex items-center gap-1"><PlayCircle size={10}/>{mod.video_duration_mins > 0 ? `${mod.video_duration_mins}m` : 'Video'}</span>}
          {hasQuiz && <span className="flex items-center gap-1"><FileText size={10}/>Quiz</span>}
          {!hasVideo && !hasQuiz && <span>No video</span>}
        </div>
      </div>
      {isDone && <CheckCircle2 size={14} className={isActive ? 'text-emerald-300 flex-shrink-0' : 'text-emerald-500 flex-shrink-0'}/>}
    </button>
  );
};

// ── Player View ───────────────────────────────────────────────────────────────

const PlayerView = ({ mod, progress, onBack, onProgress, nextMod, onNextLesson }) => {
  const { user } = useContext(AuthContext);
  const [marking, setMarking] = useState(false);

  // Notes
  const [notes, setNotes]           = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  // Discussions
  const [discussions, setDiscussions] = useState([]);
  const [loadingDisc, setLoadingDisc] = useState(false);
  const [newMsg, setNewMsg]           = useState('');
  const [replyTo, setReplyTo]         = useState(null); // { id, name }
  const [posting, setPosting]         = useState(false);

  // Reset + load when module changes
  useEffect(() => {
    setNotes(progress?.student_notes || '');
    setDiscussions([]);
    setNewMsg('');
    setReplyTo(null);
    setNotesSaved(false);
    setLoadingDisc(true);
    api.get(`/lms/module/${mod._id}/discussions`)
      .then(r => setDiscussions(r.data))
      .catch(() => {})
      .finally(() => setLoadingDisc(false));
  }, [mod._id]);

  const markWatched = async () => {
    setMarking(true);
    try {
      await api.post(`/lms/module/${mod._id}/watched`);
      onProgress();
    } catch (err) {
      alert(err.response?.data?.message || 'Error');
    }
    setMarking(false);
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await api.put(`/lms/module/${mod._id}/notes`, { notes });
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2500);
    } catch {}
    setSavingNotes(false);
  };

  const reloadDiscussions = async () => {
    const { data } = await api.get(`/lms/module/${mod._id}/discussions`);
    setDiscussions(data);
  };

  const handlePost = async () => {
    if (!newMsg.trim()) return;
    setPosting(true);
    try {
      await api.post(`/lms/module/${mod._id}/discussions`, {
        message:   newMsg.trim(),
        parent_id: replyTo?.id || null,
      });
      setNewMsg('');
      setReplyTo(null);
      await reloadDiscussions();
    } catch {}
    setPosting(false);
  };

  const handleDeleteDisc = async (discId) => {
    if (!await confirm('Delete this message?', { title: 'Delete Message' })) return;
    try {
      await api.delete(`/lms/discussion/${discId}`);
      await reloadDiscussions();
    } catch {}
  };

  const hasVideo    = !!mod.video_url;
  const hasQuiz     = (mod.quiz?.questions?.length || 0) > 0;
  const isWatched   = progress?.watched;
  const isCompleted = progress?.completed;

  return (
    <div className="space-y-5">
      {/* Back button */}
      <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 font-semibold text-sm transition-colors">
        <ChevronLeft size={18}/> Back to Curriculum
      </button>

      {/* Module title card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${TYPE_COLORS[mod.type] || 'bg-slate-100 text-slate-600'}`}>
              {mod.type}
            </span>
            <h2 className="text-xl font-extrabold text-slate-800 mt-2">{mod.title}</h2>
            {(mod.video_title || mod.video_duration_mins > 0) && (
              <div className="flex items-center gap-3 mt-1">
                {mod.video_title && <p className="text-sm text-slate-500">{mod.video_title}</p>}
                {mod.video_duration_mins > 0 && (
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <Clock size={12}/> {mod.video_duration_mins} min
                  </span>
                )}
              </div>
            )}
            {mod.description && <p className="text-sm text-slate-500 mt-2">{mod.description}</p>}
          </div>
          {isCompleted && (
            <span className="flex items-center gap-1 text-emerald-600 font-bold text-sm flex-shrink-0 bg-emerald-50 px-3 py-1.5 rounded-xl">
              <CheckCircle2 size={16}/> Done
            </span>
          )}
        </div>
      </div>

      {/* Video Player */}
      {hasVideo ? (
        <div className="space-y-3">
          <div className="relative w-full rounded-2xl overflow-hidden shadow-xl" style={{ paddingBottom: '56.25%' }}>
            <iframe
              src={toEmbedUrl(mod.video_url)}
              title={mod.video_title || mod.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full border-0"
            />
          </div>
          {!isWatched && (
            <button onClick={markWatched} disabled={marking}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 rounded-xl font-bold hover:from-emerald-600 hover:to-teal-600 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-60">
              <CheckCircle2 size={18}/> {marking ? 'Marking…' : "I've watched this video — Continue"}
            </button>
          )}
          {isWatched && !hasQuiz && isCompleted && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl font-semibold text-sm">
              <CheckCircle2 size={16}/> Module completed! No quiz for this lesson.
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-100 rounded-2xl p-10 text-center text-slate-400">
          <PlayCircle size={40} className="mx-auto mb-3 opacity-40"/>
          <p className="font-semibold">No video added to this module yet</p>
          <p className="text-xs mt-1">Check back later or see the resources below</p>
        </div>
      )}

      {/* Next Lesson button */}
      {isCompleted && nextMod && (
        <button onClick={onNextLesson}
          className="w-full flex items-center justify-between bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-5 py-3.5 rounded-xl font-bold hover:from-indigo-700 hover:to-violet-700 transition-all shadow-md">
          <span className="text-sm font-semibold">Next Lesson</span>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-extrabold truncate max-w-[200px]">{nextMod.title}</span>
            <ArrowRight size={18} className="flex-shrink-0"/>
          </div>
        </button>
      )}

      {/* Quiz — only unlocks after watching */}
      {hasVideo && hasQuiz && isWatched && (
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <QuizPanel module={mod} progress={progress} onComplete={onProgress}/>
        </div>
      )}
      {hasVideo && hasQuiz && !isWatched && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 text-center">
          <Lock size={28} className="text-slate-300 mx-auto mb-2"/>
          <p className="font-bold text-slate-400 text-sm">Quiz locked — watch the video first</p>
        </div>
      )}

      {/* Resources */}
      {mod.resources?.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-3">
          <p className="font-bold text-slate-700 text-sm flex items-center gap-2">
            <FileText size={16} className="text-slate-400"/> Resources
          </p>
          <div className="space-y-2">
            {mod.resources.map((r, i) => (
              <a key={i} href={r.url || '#'} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-indigo-50 transition-colors group">
                <ChevronRight size={14} className="text-indigo-400 flex-shrink-0 group-hover:translate-x-0.5 transition-transform"/>
                <span className="text-sm font-medium text-slate-700">{r.title}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Instructor Notes */}
      {mod.teacher_notes && mod.notes_visible && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">Instructor Notes</p>
          <p className="text-sm text-amber-900 leading-relaxed">{mod.teacher_notes}</p>
        </div>
      )}

      {/* My Notes */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <p className="font-bold text-slate-700 text-sm flex items-center gap-2 mb-3">
          <StickyNote size={16} className="text-indigo-400"/> My Notes
        </p>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Take notes while watching this lesson… (saved per module)"
          rows={4}
          className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-700 resize-none focus:outline-none focus:border-indigo-400 bg-slate-50 placeholder-slate-300 leading-relaxed"
        />
        <div className="flex items-center justify-between mt-2">
          {notesSaved
            ? <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle2 size={12}/>Saved!</span>
            : <span className="text-xs text-slate-400">{notes.length} / 5000</span>
          }
          <button onClick={handleSaveNotes} disabled={savingNotes}
            className="flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60">
            <Save size={12}/> {savingNotes ? 'Saving…' : 'Save Notes'}
          </button>
        </div>
      </div>

      {/* Q&A / Discussion */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <p className="font-bold text-slate-700 text-sm flex items-center gap-2 mb-4">
          <MessageCircle size={16} className="text-indigo-400"/> Q&amp;A
          {discussions.length > 0 && (
            <span className="text-xs font-normal text-slate-400">
              ({discussions.length} question{discussions.length !== 1 ? 's' : ''})
            </span>
          )}
        </p>

        {/* Post form */}
        <div className="space-y-2 mb-5">
          {replyTo && (
            <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 px-3 py-2 rounded-xl text-xs text-indigo-600 font-semibold">
              <span>Replying to {replyTo.name}</span>
              <button onClick={() => setReplyTo(null)} className="text-slate-400 hover:text-slate-600 font-bold ml-3">✕</button>
            </div>
          )}
          <textarea
            value={newMsg}
            onChange={e => setNewMsg(e.target.value)}
            placeholder={replyTo ? 'Write your reply…' : 'Ask a question about this lesson…'}
            rows={3}
            className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-700 resize-none focus:outline-none focus:border-indigo-400 bg-slate-50 placeholder-slate-300"
          />
          <button onClick={handlePost} disabled={posting || !newMsg.trim()}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50">
            <Send size={14}/> {posting ? 'Posting…' : replyTo ? 'Post Reply' : 'Ask Question'}
          </button>
        </div>

        {/* Discussion list */}
        {loadingDisc ? (
          <div className="flex items-center justify-center py-6">
            <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : discussions.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No questions yet — be the first to ask!</p>
        ) : (
          <div className="space-y-3">
            {discussions.map(d => (
              <DiscussionThread
                key={d._id}
                discussion={d}
                currentUserId={user?._id}
                onReply={(id, name) => setReplyTo({ id, name })}
                onDelete={handleDeleteDisc}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function StudentLMS() {
  const [courses, setCourses]             = useState([]);
  const [loading, setLoading]             = useState(true);
  const [activeCourse, setActiveCourse]   = useState(null);
  const [modules, setModules]             = useState([]);
  const [activeModule, setActiveModule]   = useState(null);
  const [loadingMods, setLoadingMods]     = useState(false);
  const [certData, setCertData]           = useState(null);
  const [showCurriculum, setShowCurriculum] = useState(true);
  const [moduleSearch, setModuleSearch]   = useState('');

  const loadCourses = useCallback(async () => {
    try {
      const { data } = await api.get('/lms/my-courses');
      setCourses(data);
      if (data.length && !activeCourse) setActiveCourse(data[0]._id);
    } catch {}
    setLoading(false);
  }, [activeCourse]);

  useEffect(() => { loadCourses(); }, []);

  const checkCert = async (courseId) => {
    try {
      const { data } = await api.get(`/lms/course/${courseId}/certificate`);
      if (data.eligible) setCertData(data);
    } catch {}
  };

  const loadModules = useCallback(async (courseId) => {
    if (!courseId) return;
    setLoadingMods(true);
    setCertData(null);
    setModuleSearch('');
    try {
      const { data } = await api.get(`/lms/course/${courseId}/modules`);
      setModules(data);
      // Auto-select: continue where left off (first incomplete video module)
      const firstIncomplete = data.find(m => m.video_url && !m.progress?.completed);
      const autoSelect = firstIncomplete || data.find(m => m.video_url) || data[0];
      if (autoSelect) {
        setActiveModule(autoSelect._id);
        setShowCurriculum(false); // show player on mobile; desktop keeps sidebar via CSS
      }
      checkCert(courseId);
    } catch {}
    setLoadingMods(false);
  }, []);

  useEffect(() => {
    if (activeCourse) {
      setActiveModule(null);
      setShowCurriculum(true);
      loadModules(activeCourse);
    }
  }, [activeCourse, loadModules]);

  const refreshProgress = async () => {
    if (!activeCourse) return;
    await loadModules(activeCourse);
    await loadCourses();
  };

  const course       = courses.find(c => c._id === activeCourse);
  const activeMod    = modules.find(m => m._id === activeModule);
  const activeProgress = activeMod?.progress || null;

  const videoModules    = modules.filter(m => m.video_url);
  const completedCount  = videoModules.filter(m => m.progress?.completed).length;
  const pct             = videoModules.length > 0 ? Math.round((completedCount / videoModules.length) * 100) : 0;

  // Curriculum search filter
  const filteredModules = moduleSearch.trim()
    ? modules.filter(m => m.title.toLowerCase().includes(moduleSearch.toLowerCase()))
    : modules;

  // Next module for "Next Lesson" button
  const currentIndex = modules.findIndex(m => m._id === activeModule);
  const nextMod      = currentIndex >= 0 && currentIndex < modules.length - 1
    ? modules[currentIndex + 1]
    : null;

  const handleNextLesson = () => {
    if (!nextMod) return;
    setActiveModule(nextMod._id);
    setShowCurriculum(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  if (!courses.length) return (
    <div className="bg-white rounded-3xl p-16 text-center border border-slate-100">
      <BookOpen size={48} className="text-slate-200 mx-auto mb-4"/>
      <h3 className="text-xl font-extrabold text-slate-400 mb-2">No courses with video lessons yet</h3>
      <p className="text-slate-400 text-sm">Your teachers will add video lessons to your courses soon.</p>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
            <PlayCircle size={26} className="text-indigo-500"/> My Learning
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">Watch lessons, take quizzes, ask questions, earn certificates</p>
        </div>
      </div>

      {/* Course selector */}
      <div className="flex gap-2 flex-wrap">
        {courses.map(c => (
          <button key={c._id} onClick={() => setActiveCourse(c._id)}
            className={`px-5 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
              activeCourse === c._id ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
            }`}>
            {c.name}
            {c.lms?.total_videos > 0 && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${activeCourse === c._id ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-600'}`}>
                {c.lms.progress_pct}%
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Course progress bar */}
      {course && videoModules.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <span className="font-extrabold text-slate-700">{course.name}</span>
              {certData && (
                <span className="flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full">
                  <Star size={11}/> Complete!
                </span>
              )}
            </div>
            <span className="font-extrabold text-indigo-600 text-lg">{pct}%</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: pct === 100 ? 'linear-gradient(90deg,#10b981,#059669)' : 'linear-gradient(90deg,#6366f1,#8b5cf6)' }}/>
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-400 font-bold">
            <span>{completedCount} of {videoModules.length} lessons completed</span>
            {pct === 100 && <span className="text-emerald-500">All done!</span>}
          </div>

          {certData && (
            <button onClick={() => downloadCertificate(certData)}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-white py-2.5 rounded-xl font-bold hover:from-amber-600 hover:to-yellow-600 transition-all shadow-md">
              <Download size={16}/> Download Completion Certificate
            </button>
          )}
        </div>
      )}

      {!certData && pct === 100 && (
        <button onClick={() => checkCert(activeCourse)}
          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-amber-300 text-amber-600 py-2.5 rounded-xl font-bold hover:bg-amber-50 transition-colors">
          <Award size={16}/> Check Certificate Eligibility
        </button>
      )}

      {/* Main content */}
      {loadingMods ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : (
        <div className={`flex gap-5 ${activeModule ? 'flex-col md:flex-row items-start' : ''}`}>

          {/* Curriculum sidebar */}
          <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden
            ${activeModule ? 'md:w-72 flex-shrink-0' : 'w-full'}
            ${activeModule && !showCurriculum ? 'hidden md:block' : 'block'}
          `}>
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <p className="font-bold text-slate-700 text-sm flex items-center gap-2">
                  <Layers size={15} className="text-indigo-500"/> Curriculum
                  <span className="text-xs text-slate-400 font-normal">({modules.length})</span>
                </p>
                {activeModule && (
                  <button onClick={() => setShowCurriculum(false)} className="md:hidden text-slate-400 hover:text-slate-600">
                    <ChevronLeft size={16}/>
                  </button>
                )}
              </div>
              {/* Search */}
              {modules.length > 4 && (
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                  <input
                    type="search"
                    placeholder="Search lessons…"
                    value={moduleSearch}
                    onChange={e => setModuleSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-700 focus:outline-none focus:border-indigo-400 placeholder-slate-400"
                  />
                </div>
              )}
            </div>

            <div className="p-2 space-y-1 max-h-[70vh] overflow-y-auto">
              {filteredModules.length === 0 && (
                <p className="text-center text-slate-400 text-sm py-8">
                  {moduleSearch ? 'No lessons match your search' : 'No modules in this course yet'}
                </p>
              )}
              {filteredModules.map((m) => (
                <CurriculumItem key={m._id} mod={m} index={modules.indexOf(m)} progress={m.progress}
                  isActive={activeModule === m._id}
                  onClick={() => { setActiveModule(m._id); setShowCurriculum(false); }}/>
              ))}
            </div>
          </div>

          {/* Player / module detail */}
          {activeModule && activeMod && (
            <div className="flex-1 min-w-0">
              <PlayerView
                mod={activeMod}
                progress={activeProgress}
                onBack={() => { setActiveModule(null); setShowCurriculum(true); }}
                onProgress={refreshProgress}
                nextMod={nextMod}
                onNextLesson={handleNextLesson}
              />
            </div>
          )}

          {/* Empty state when curriculum shows and no module selected */}
          {!activeModule && modules.length > 0 && (
            <div className="hidden md:flex flex-1 items-center justify-center bg-white rounded-2xl border border-slate-100 shadow-sm min-h-[300px]">
              <div className="text-center text-slate-400">
                <PlayCircle size={40} className="mx-auto mb-3 opacity-30"/>
                <p className="font-semibold">Select a lesson to start learning</p>
              </div>
            </div>
          )}

          {/* Mobile: show curriculum button when module selected */}
          {activeModule && !showCurriculum && (
            <button onClick={() => setShowCurriculum(true)}
              className="md:hidden w-full flex items-center justify-center gap-2 border border-slate-200 bg-white text-slate-600 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-colors">
              <Layers size={15}/> View All Lessons
            </button>
          )}
        </div>
      )}
    </div>
  );
}
