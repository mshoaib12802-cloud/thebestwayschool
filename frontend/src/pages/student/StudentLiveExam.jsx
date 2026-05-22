import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { confirm } from '../../utils/confirm';
import {
  Zap, Clock, CheckCircle2, XCircle, ChevronLeft, ChevronRight,
  Send, Award, RotateCcw, Eye, AlertTriangle, BookOpen, Flag,
} from 'lucide-react';

const OPTS = ['A', 'B', 'C', 'D'];

const gradeStyle = (g) => {
  if (!g || g === 'F') return { bg: '#fef2f2', color: '#dc2626' };
  if (g.startsWith('A')) return { bg: '#f0fdf4', color: '#16a34a' };
  if (g === 'B') return { bg: '#eff6ff', color: '#2563eb' };
  return { bg: '#fefce8', color: '#ca8a04' };
};

/* ── Timer ────────────────────────────────────────────────── */
const Timer = ({ seconds, onExpire }) => {
  const [remaining, setRemaining] = useState(seconds);
  const ref = useRef(null);
  useEffect(() => { setRemaining(seconds); }, [seconds]);
  useEffect(() => {
    if (remaining <= 0) { onExpire?.(); return; }
    ref.current = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(ref.current);
  }, [remaining, onExpire]);
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const urgent = remaining <= 60;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 12, background: urgent ? '#fef2f2' : '#f0fdf4', border: `1.5px solid ${urgent ? '#fca5a5' : '#86efac'}` }}>
      <Clock size={16} color={urgent ? '#dc2626' : '#16a34a'}/>
      <span style={{ fontWeight: 800, fontSize: '1.1rem', fontFamily: 'monospace', color: urgent ? '#dc2626' : '#15803d' }}>
        {String(mins).padStart(2,'0')}:{String(secs).padStart(2,'0')}
      </span>
    </div>
  );
};

/* ── Main ─────────────────────────────────────────────────── */
const StudentLiveExam = () => {
  const [view, setView]         = useState('list');
  const [exams, setExams]       = useState([]);
  const [loading, setLoading]   = useState(true);

  const [activeExam, setActiveExam]   = useState(null);
  const [questions, setQuestions]     = useState([]);
  const [answers, setAnswers]         = useState({});      // { q_id: selected_index }
  const [flagged, setFlagged]         = useState(new Set()); // flagged q_ids
  const [currentQ, setCurrentQ]       = useState(0);
  const [remaining, setRemaining]     = useState(null);
  const [submitting, setSubmitting]   = useState(false);
  const [lastResult, setLastResult]   = useState(null);
  const [reviewData, setReviewData]   = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [pastResults, setPastResults] = useState([]);

  // Per-question time tracking
  const questionEnteredAt = useRef(null);   // timestamp when current Q was shown
  const questionTimes     = useRef({});     // { q_id: totalMs }

  useEffect(() => { loadExams(); loadPastResults(); }, []);

  // beforeunload — warn student before closing mid-exam
  useEffect(() => {
    if (view !== 'taking') return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [view]);

  const loadExams = async () => {
    setLoading(true);
    try { const { data } = await api.get('/live-exams/student/available'); setExams(data); }
    catch { toast.error('Failed to load exams'); }
    finally { setLoading(false); }
  };
  const loadPastResults = async () => {
    try { const { data } = await api.get('/live-exams/student/results'); setPastResults(data); }
    catch {}
  };

  /* Track time when navigating between questions */
  const recordTimeOnCurrentQ = useCallback(() => {
    if (!questions[currentQ] || !questionEnteredAt.current) return;
    const qid = questions[currentQ]._id;
    const spent = Date.now() - questionEnteredAt.current;
    questionTimes.current[qid] = (questionTimes.current[qid] || 0) + spent;
    questionEnteredAt.current = Date.now();
  }, [currentQ, questions]);

  const goToQuestion = useCallback((idx) => {
    recordTimeOnCurrentQ();
    setCurrentQ(idx);
    questionEnteredAt.current = Date.now();
  }, [recordTimeOnCurrentQ]);

  const toggleFlag = (qid) => {
    setFlagged(prev => {
      const next = new Set(prev);
      next.has(qid) ? next.delete(qid) : next.add(qid);
      return next;
    });
  };

  const handleStart = async (exam) => {
    try {
      await api.post(`/live-exams/student/${exam._id}/start`);
      const { data } = await api.get(`/live-exams/student/${exam._id}/take`);
      setActiveExam(data.exam);
      setQuestions(data.questions);
      setAnswers({}); setFlagged(new Set());
      setCurrentQ(0); setRemaining(data.remaining_seconds);
      questionTimes.current = {};
      questionEnteredAt.current = Date.now();
      setView('taking');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to start'); }
  };

  const handleResume = async (exam) => {
    try {
      const { data } = await api.get(`/live-exams/student/${exam._id}/take`);
      setActiveExam(data.exam);
      setQuestions(data.questions);
      const ans = {};
      (data.attempt?.answers || []).forEach(a => { if (a.selected_index !== -1) ans[a.question_id] = a.selected_index; });
      setAnswers(ans); setFlagged(new Set());
      setCurrentQ(0); setRemaining(data.remaining_seconds);
      questionTimes.current = {};
      questionEnteredAt.current = Date.now();
      setView('taking');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to resume'); }
  };

  const handleSubmit = useCallback(async (force = false) => {
    if (!force && !await confirm(`Submit your exam? Answered: ${Object.keys(answers).length}/${questions.length} · Flagged: ${flagged.size}. You cannot change answers after submission.`, { title: 'Submit Exam', confirmText: 'Submit', danger: false })) return;
    // Record time on current question
    recordTimeOnCurrentQ();
    setSubmitting(true);
    try {
      const payload = questions.map(q => ({
        question_id: q._id,
        selected_index: answers[q._id] ?? -1,
        time_spent_seconds: Math.round((questionTimes.current[q._id] || 0) / 1000),
        flagged: flagged.has(q._id),
      }));
      const { data } = await api.post(`/live-exams/student/${activeExam._id}/submit`, { answers: payload });
      setLastResult({ ...data, examTitle: activeExam.title, courseName: activeExam.course_name });
      setView('result');
      loadExams(); loadPastResults();
    } catch (err) { toast.error(err.response?.data?.message || 'Submission failed'); }
    finally { setSubmitting(false); }
  }, [answers, questions, flagged, activeExam, recordTimeOnCurrentQ]);

  const handleTimerExpire = useCallback(() => {
    toast.warning('Time is up! Auto-submitting...');
    handleSubmit(true);
  }, [handleSubmit]);

  const handleReview = async (attemptId) => {
    setReviewLoading(true); setView('review');
    try {
      const { data } = await api.get(`/live-exams/student/attempts/${attemptId}/review`);
      setReviewData(data);
    } catch { toast.error('Failed to load review'); setView('list'); }
    finally { setReviewLoading(false); }
  };

  const answered  = Object.keys(answers).length;
  const progress  = questions.length > 0 ? Math.round((answered / questions.length) * 100) : 0;
  const unanswered = questions.length - answered;

  /* ── TAKING ─────────────────────────────────────────────── */
  if (view === 'taking' && activeExam && questions.length > 0) {
    const q = questions[currentQ];
    const selected = answers[q._id];
    const isFlagged = flagged.has(q._id);
    const isLast = currentQ === questions.length - 1;
    const negMarking = activeExam.negative_marks_per_wrong > 0;

    return (
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ background: '#fff', borderRadius: '1.5rem', padding: '1rem 1.25rem', marginBottom: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: '#1e293b' }}>{activeExam.title}</h2>
            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>{activeExam.course_name} · {questions.length} Qs</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {negMarking && (
              <span style={{ fontSize: '0.72rem', fontWeight: 700, background: '#fef2f2', color: '#dc2626', padding: '4px 10px', borderRadius: 8, border: '1px solid #fca5a5' }}>
                -{activeExam.negative_marks_per_wrong} per wrong
              </span>
            )}
            {remaining !== null && <Timer seconds={remaining} onExpire={handleTimerExpire}/>}
            <button onClick={() => handleSubmit(false)} disabled={submitting}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '0.75rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', opacity: submitting ? 0.7 : 1 }}>
              <Send size={14}/> {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ background: '#fff', borderRadius: '1rem', padding: '0.75rem 1.25rem', marginBottom: '0.875rem', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ height: 7, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg,#4f46e5,#7c3aed)', width: `${progress}%`, transition: 'width 0.3s' }}/>
            </div>
          </div>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap' }}>
            {answered} answered · {flagged.size > 0 && <span style={{ color: '#f59e0b' }}>{flagged.size} flagged · </span>}
            {unanswered} left
          </span>
        </div>

        {/* Question navigator */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: '0.875rem', background: '#fff', borderRadius: '1rem', padding: '0.875rem 1.25rem' }}>
          {questions.map((qq, i) => {
            const isAns = answers[qq._id] !== undefined;
            const isFlag = flagged.has(qq._id);
            const isCur = i === currentQ;
            let bg = '#f8fafc', color = '#94a3b8', border = '1.5px solid #e2e8f0';
            if (isCur)       { bg = '#4f46e5'; color = '#fff'; border = '2px solid #4f46e5'; }
            else if (isFlag) { bg = '#fef3c7'; color = '#d97706'; border = '1.5px solid #fcd34d'; }
            else if (isAns)  { bg = '#dcfce7'; color = '#16a34a'; border = '1.5px solid #86efac'; }
            return (
              <button key={qq._id} onClick={() => goToQuestion(i)} title={isFlag ? 'Flagged for review' : isAns ? 'Answered' : 'Not answered'}
                style={{ width: 34, height: 34, borderRadius: 8, border, background: bg, color, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>
                {i + 1}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 12, marginBottom: '0.875rem', fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', paddingLeft: 4 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: '#4f46e5', display: 'inline-block' }}/> Current</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: '#dcfce7', border: '1px solid #86efac', display: 'inline-block' }}/> Answered</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: '#fef3c7', border: '1px solid #fcd34d', display: 'inline-block' }}/> Flagged</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: '#f8fafc', border: '1px solid #e2e8f0', display: 'inline-block' }}/> Not answered</span>
        </div>

        {/* Question card */}
        <div style={{ background: '#fff', borderRadius: '1.5rem', padding: '1.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', gap: 8 }}>
            <p style={{ fontWeight: 800, color: '#1e293b', fontSize: '1rem', flex: 1, lineHeight: 1.6 }}>
              <span style={{ color: '#7c3aed', marginRight: 6, fontWeight: 900 }}>Q{currentQ + 1}.</span>{q.text}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
              <span style={{ background: '#f0f9ff', color: '#0369a1', fontWeight: 700, fontSize: '0.72rem', padding: '3px 10px', borderRadius: 8 }}>{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
              <button onClick={() => toggleFlag(q._id)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 8, border: `1.5px solid ${isFlagged ? '#fcd34d' : '#e2e8f0'}`, background: isFlagged ? '#fef3c7' : '#f8fafc', color: isFlagged ? '#d97706' : '#94a3b8', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer' }}>
                <Flag size={12}/> {isFlagged ? 'Flagged' : 'Flag'}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {q.options.map((opt, oi) => {
              const isSel = selected === oi;
              return (
                <button key={oi} onClick={() => setAnswers(prev => ({ ...prev, [q._id]: oi }))}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderRadius: '0.875rem', cursor: 'pointer', textAlign: 'left', width: '100%', border: isSel ? '2px solid #4f46e5' : '1.5px solid #e2e8f0', background: isSel ? 'linear-gradient(135deg,#ede9fe,#f5f3ff)' : '#fafafa', transform: isSel ? 'scale(1.01)' : 'scale(1)', transition: 'all 0.15s' }}>
                  <span style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.82rem', flexShrink: 0, background: isSel ? '#4f46e5' : '#f1f5f9', color: isSel ? '#fff' : '#94a3b8', border: isSel ? 'none' : '2px solid #e2e8f0' }}>{OPTS[oi]}</span>
                  <span style={{ fontWeight: isSel ? 700 : 500, color: isSel ? '#4338ca' : '#475569', fontSize: '0.92rem' }}>{opt}</span>
                  {isSel && <CheckCircle2 size={17} color="#4f46e5" style={{ marginLeft: 'auto', flexShrink: 0 }}/>}
                </button>
              );
            })}
          </div>

          {selected !== undefined && (
            <button onClick={() => setAnswers(prev => { const n = { ...prev }; delete n[q._id]; return n; })}
              style={{ marginTop: 10, fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
              Clear selection
            </button>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
            <button onClick={() => goToQuestion(Math.max(0, currentQ - 1))} disabled={currentQ === 0}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: '#f1f5f9', border: 'none', borderRadius: '0.75rem', fontWeight: 700, fontSize: '0.85rem', color: '#64748b', cursor: 'pointer', opacity: currentQ === 0 ? 0.4 : 1 }}>
              <ChevronLeft size={16}/> Previous
            </button>
            {isLast ? (
              <button onClick={() => handleSubmit(false)} disabled={submitting}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '0.75rem', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', opacity: submitting ? 0.7 : 1 }}>
                <Send size={14}/> Submit Exam
              </button>
            ) : (
              <button onClick={() => goToQuestion(Math.min(questions.length - 1, currentQ + 1))}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '0.75rem', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                Next <ChevronRight size={16}/>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── RESULT ──────────────────────────────────────────────── */
  if (view === 'result' && lastResult) {
    const gc = gradeStyle(lastResult.grade);
    const pct = lastResult.total_marks > 0 ? Math.round((lastResult.score / lastResult.total_marks) * 100) : 0;
    const passed = lastResult.grade && lastResult.grade !== 'F';
    const mins = Math.floor(lastResult.time_taken_seconds / 60);
    const secs = lastResult.time_taken_seconds % 60;
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center', paddingTop: '2rem' }}>
        <div style={{ background: '#fff', borderRadius: '2rem', padding: '2.5rem', boxShadow: '0 8px 40px rgba(0,0,0,0.10)' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>{passed ? '🎉' : '📚'}</div>
          <h2 style={{ fontWeight: 900, color: '#1e293b', margin: '0 0 4px', fontSize: '1.5rem' }}>{passed ? 'Well Done!' : 'Keep Practicing!'}</h2>
          <p style={{ color: '#94a3b8', marginBottom: '2rem', fontSize: '0.9rem' }}>{lastResult.examTitle}</p>
          <div style={{ width: 120, height: 120, borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', background: gc.bg, border: `3px solid ${gc.color}40` }}>
            <span style={{ fontWeight: 900, fontSize: '2.25rem', color: gc.color, lineHeight: 1 }}>{lastResult.grade}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.75rem' }}>
            {[{ label: 'Score', value: `${lastResult.score}/${lastResult.total_marks}` }, { label: 'Percentage', value: `${pct}%` }, { label: 'Time', value: `${mins}m ${secs}s` }].map(s => (
              <div key={s.label} style={{ background: '#f8fafc', borderRadius: '0.875rem', padding: '0.875rem' }}>
                <p style={{ fontWeight: 800, color: '#1e293b', margin: 0, fontSize: '1.1rem' }}>{s.value}</p>
                <p style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '3px 0 0' }}>{s.label}</p>
              </div>
            ))}
          </div>
          <div style={{ height: 10, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden', marginBottom: '1.75rem' }}>
            <div style={{ height: '100%', borderRadius: 99, background: pct >= 80 ? '#16a34a' : pct >= 50 ? '#4f46e5' : '#dc2626', width: `${pct}%`, transition: 'width 1s ease' }}/>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button onClick={() => setView('list')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: '#f1f5f9', border: 'none', borderRadius: '0.75rem', fontWeight: 700, cursor: 'pointer', color: '#475569' }}><ChevronLeft size={14}/> Back</button>
            {lastResult.attempt_id && (
              <button onClick={() => handleReview(lastResult.attempt_id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '0.75rem', fontWeight: 700, cursor: 'pointer' }}><Eye size={14}/> Review Answers</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── REVIEW ──────────────────────────────────────────────── */
  if (view === 'review') {
    if (reviewLoading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"/></div>;
    if (!reviewData) return null;
    const { exam, attempt, questions: rqs } = reviewData;
    const correct = rqs.filter(q => q.is_correct).length;
    const wrong   = rqs.filter(q => q.selected_index !== -1 && !q.is_correct).length;
    const skipped = rqs.filter(q => q.selected_index === -1).length;
    return (
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.25rem' }}>
          <button onClick={() => setView('list')} style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#475569', fontSize: '0.85rem' }}><ChevronLeft size={14}/> Back</button>
          <div>
            <h2 style={{ margin: 0, fontWeight: 800, color: '#1e293b', fontSize: '1.1rem' }}>Review: {exam.title}</h2>
            <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
              {[{ label: `${correct} Correct`, color: '#16a34a', bg: '#dcfce7' }, { label: `${wrong} Wrong`, color: '#dc2626', bg: '#fef2f2' }, { label: `${skipped} Skipped`, color: '#94a3b8', bg: '#f8fafc' }].map(s => (
                <span key={s.label} style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 10px', borderRadius: 8, background: s.bg, color: s.color }}>{s.label}</span>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {rqs.map((q, idx) => (
            <div key={q._id} style={{ background: '#fff', borderRadius: '1.25rem', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: `1.5px solid ${q.is_correct ? '#86efac' : q.selected_index === -1 ? '#e2e8f0' : '#fca5a5'}` }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: '0.875rem', flexWrap: 'wrap' }}>
                <span style={{ background: q.is_correct ? '#dcfce7' : q.selected_index === -1 ? '#f8fafc' : '#fef2f2', color: q.is_correct ? '#16a34a' : q.selected_index === -1 ? '#94a3b8' : '#dc2626', fontWeight: 700, fontSize: '0.72rem', padding: '3px 10px', borderRadius: 8 }}>
                  {q.is_correct ? '✓ Correct' : q.selected_index === -1 ? 'Skipped' : '✗ Wrong'}
                </span>
                <span style={{ background: '#f0f9ff', color: '#0369a1', fontWeight: 700, fontSize: '0.72rem', padding: '3px 10px', borderRadius: 8 }}>{q.marks} mk</span>
                {q.time_spent_seconds > 0 && <span style={{ background: '#f8fafc', color: '#64748b', fontWeight: 600, fontSize: '0.72rem', padding: '3px 10px', borderRadius: 8 }}>{q.time_spent_seconds}s</span>}
                {q.flagged && <span style={{ background: '#fef3c7', color: '#d97706', fontWeight: 700, fontSize: '0.72rem', padding: '3px 10px', borderRadius: 8 }}>🚩 Flagged</span>}
              </div>
              <p style={{ fontWeight: 700, color: '#1e293b', marginBottom: '0.875rem', lineHeight: 1.5 }}><span style={{ color: '#7c3aed', marginRight: 6 }}>Q{idx + 1}.</span>{q.text}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {q.options.map((opt, oi) => {
                  const isCorrect  = oi === q.correct_index;
                  const isSelected = oi === q.selected_index;
                  let bg = '#f8fafc', border = '#e2e8f0', col = '#475569';
                  if (isCorrect)              { bg = '#dcfce7'; border = '#86efac'; col = '#15803d'; }
                  else if (isSelected)        { bg = '#fef2f2'; border = '#fca5a5'; col = '#dc2626'; }
                  return (
                    <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: '0.625rem', background: bg, border: `1.5px solid ${border}` }}>
                      <span style={{ fontWeight: 800, fontSize: '0.72rem', color: isCorrect ? '#16a34a' : isSelected ? '#dc2626' : '#94a3b8', minWidth: 16 }}>{OPTS[oi]}</span>
                      <span style={{ fontWeight: isCorrect || isSelected ? 700 : 500, color: col, flex: 1 }}>{opt}</span>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: isCorrect ? '#16a34a' : '#dc2626' }}>
                        {isCorrect && '✓ Correct answer'}
                        {isSelected && !isCorrect && '✗ Your answer'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── LIST ────────────────────────────────────────────────── */
  const availableExams = exams.filter(e => !e.attempt || e.attempt.status !== 'submitted' || e.allow_retake);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2"><Zap size={24} className="text-violet-500"/> Live Exams</h2>
        <p className="text-slate-500 mt-1">Take your online MCQ exams and get instant results</p>
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"/></div>
      ) : (
        <>
          <div>
            <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-3">Available Now</h3>
            {availableExams.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center border border-slate-100">
                <BookOpen size={40} className="text-slate-300 mx-auto mb-3"/>
                <p className="text-slate-400 font-medium">No live exams available right now.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableExams.map(exam => {
                  const inProgress = exam.attempt?.status === 'in_progress';
                  const now = new Date();
                  const canTake = (!exam.live_start || new Date(exam.live_start) <= now) && (!exam.live_end || new Date(exam.live_end) > now);
                  return (
                    <div key={exam._id} style={{ background: '#fff', borderRadius: '1.25rem', padding: '1.25rem 1.5rem', border: `1.5px solid ${inProgress ? '#c4b5fd' : '#f1f5f9'}`, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                            <h3 style={{ fontWeight: 800, color: '#1e293b', margin: 0 }}>{exam.title}</h3>
                            {inProgress && <span style={{ background: '#fef3c7', color: '#d97706', fontWeight: 700, fontSize: '0.7rem', padding: '2px 8px', borderRadius: 8 }}>IN PROGRESS</span>}
                            {exam.shuffle_questions && <span style={{ background: '#f3f4f6', color: '#6b7280', fontWeight: 700, fontSize: '0.7rem', padding: '2px 8px', borderRadius: 8 }}>🔀 Shuffled</span>}
                            {exam.negative_marks_per_wrong > 0 && <span style={{ background: '#fef2f2', color: '#dc2626', fontWeight: 700, fontSize: '0.7rem', padding: '2px 8px', borderRadius: 8 }}>-{exam.negative_marks_per_wrong} negative</span>}
                          </div>
                          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 6px' }}>{exam.course_name}</p>
                          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12}/> {exam.duration_minutes} min</span>
                            <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>{exam.question_count} questions</span>
                            {exam.live_end && <span style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={12}/> Until {new Date(exam.live_end).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
                          </div>
                          {exam.description && <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: 6, fontStyle: 'italic' }}>{exam.description}</p>}
                        </div>
                        <div>
                          {canTake ? (
                            inProgress ? (
                              <button onClick={() => handleResume(exam)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '0.75rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}><RotateCcw size={14}/> Resume</button>
                            ) : (
                              <button onClick={() => handleStart(exam)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '0.75rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}><Zap size={14}/> Start Exam</button>
                            )
                          ) : (
                            <button disabled style={{ padding: '10px 20px', background: '#f1f5f9', color: '#94a3b8', border: 'none', borderRadius: '0.75rem', fontWeight: 700, fontSize: '0.85rem', cursor: 'not-allowed' }}>Not Available</button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {pastResults.length > 0 && (
            <div>
              <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-3">Completed</h3>
              <div className="space-y-3">
                {pastResults.map(attempt => {
                  const exam = attempt.exam_id;
                  const gc = gradeStyle(attempt.grade);
                  const pct = attempt.total_marks > 0 ? Math.round((attempt.score / attempt.total_marks) * 100) : 0;
                  const mins = Math.floor(attempt.time_taken_seconds / 60);
                  const secs = attempt.time_taken_seconds % 60;
                  return (
                    <div key={attempt._id} style={{ background: '#fff', borderRadius: '1.25rem', padding: '1.25rem 1.5rem', border: '1.5px solid #f1f5f9', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <h3 style={{ fontWeight: 800, color: '#1e293b', margin: 0 }}>{exam?.title}</h3>
                            {attempt.grade !== 'F'
                              ? <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#dcfce7', color: '#16a34a', fontWeight: 700, fontSize: '0.7rem', padding: '2px 8px', borderRadius: 8 }}><CheckCircle2 size={10}/> Pass</span>
                              : <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#fef2f2', color: '#dc2626', fontWeight: 700, fontSize: '0.7rem', padding: '2px 8px', borderRadius: 8 }}><XCircle size={10}/> Fail</span>}
                          </div>
                          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 6px' }}>{exam?.course_name}</p>
                          <div style={{ height: 6, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden', maxWidth: 200, marginBottom: 4 }}>
                            <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: pct >= 80 ? '#16a34a' : pct >= 50 ? '#4f46e5' : '#dc2626' }}/>
                          </div>
                          <p style={{ color: '#94a3b8', fontSize: '0.78rem' }}>{attempt.score}/{attempt.total_marks} · {pct}% · {mins}m {secs}s</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 56, height: 56, borderRadius: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.4rem', background: gc.bg, color: gc.color }}>{attempt.grade}</div>
                          <button onClick={() => handleReview(attempt._id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#ede9fe', color: '#7c3aed', border: 'none', borderRadius: '0.75rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}><Eye size={13}/> Review</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StudentLiveExam;
