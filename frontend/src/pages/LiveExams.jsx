import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api';
import { toast } from 'react-toastify';
import { confirm } from '../utils/confirm';
import * as XLSX from 'xlsx';
import {
  Zap, Plus, X, Save, Trash2, Eye, Globe, Lock, Users,
  CheckCircle2, ChevronDown, ChevronUp, Edit3, Clock, Calendar,
  HelpCircle, BarChart2, RefreshCw, Award, Check, AlertCircle,
  Upload, Shuffle,
} from 'lucide-react';

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-violet-400 focus:bg-white transition-colors';
const labelCls = 'block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1';

const STATUS = (exam) => {
  const now = new Date();
  if (!exam.is_published) return { label: 'Draft', color: 'bg-slate-100 text-slate-500' };
  if (exam.live_start && new Date(exam.live_start) > now) return { label: 'Scheduled', color: 'bg-sky-100 text-sky-700' };
  if (exam.live_end && new Date(exam.live_end) < now) return { label: 'Ended', color: 'bg-rose-100 text-rose-700' };
  return { label: 'Live Now', color: 'bg-emerald-100 text-emerald-700' };
};

const OPTS = ['A', 'B', 'C', 'D'];

const initForm = {
  title: '', course_name: '', duration_minutes: '30', total_marks: '',
  pass_marks: '', description: '', allow_retake: false,
  shuffle_questions: false, negative_marks_per_wrong: 0,
  live_start: '', live_end: '',
};

const initQ = { text: '', options: ['', '', '', ''], correct_index: 0, marks: 1 };

/* ─── Main ─────────────────────────────────────────────────── */
const LiveExams = () => {
  const [exams, setExams]           = useState([]);
  const [courses, setCourses]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [editExam, setEditExam]     = useState(null);
  const [form, setForm]             = useState(initForm);

  const [selExam, setSelExam]       = useState(null);    // exam selected for questions/attempts
  const [tab, setTab]               = useState('questions'); // questions | attempts
  const [questions, setQuestions]   = useState([]);
  const [attempts, setAttempts]     = useState(null);
  const [qLoading, setQLoading]     = useState(false);

  const [showQForm, setShowQForm]   = useState(false);
  const [editQ, setEditQ]           = useState(null);
  const [qForm, setQForm]           = useState(initQ);
  const [savingQ, setSavingQ]       = useState(false);
  const importRef                   = useRef(null);

  useEffect(() => {
    fetchExams();
    api.get('/courses').then(r => setCourses(r.data)).catch(() => {});
  }, []);

  const fetchExams = async () => {
    setLoading(true);
    try { const { data } = await api.get('/live-exams'); setExams(data); }
    catch { toast.error('Failed to load live exams'); }
    finally { setLoading(false); }
  };

  const openManage = async (exam) => {
    if (selExam?._id === exam._id) { setSelExam(null); return; }
    setSelExam(exam); setTab('questions');
    loadQuestions(exam._id);
  };

  const loadQuestions = async (id) => {
    setQLoading(true);
    try { const { data } = await api.get(`/live-exams/${id}/questions`); setQuestions(data); }
    catch { toast.error('Failed to load questions'); }
    finally { setQLoading(false); }
  };

  const loadAttempts = async (id) => {
    setQLoading(true);
    try { const { data } = await api.get(`/live-exams/${id}/attempts`); setAttempts(data); }
    catch { toast.error('Failed to load attempts'); }
    finally { setQLoading(false); }
  };

  /* Exam CRUD */
  const handleSubmitExam = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        duration_minutes: Number(form.duration_minutes) || 30,
        total_marks: Number(form.total_marks) || 0,
        pass_marks: Number(form.pass_marks) || 0,
        live_start: form.live_start || null,
        live_end: form.live_end || null,
        exam_date: form.live_start || new Date().toISOString(),
      };
      if (editExam) { await api.put(`/live-exams/${editExam._id}`, payload); toast.success('Exam updated'); }
      else { await api.post('/live-exams', payload); toast.success('Live exam created'); }
      setShowForm(false); setEditExam(null); setForm(initForm); fetchExams();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!await confirm('Delete this live exam and all its questions and attempts?', { title: 'Delete Exam' })) return;
    try { await api.delete(`/live-exams/${id}`); toast.success('Deleted'); if (selExam?._id === id) setSelExam(null); fetchExams(); }
    catch { toast.error('Failed'); }
  };

  const handlePublish = async (exam, e) => {
    e.stopPropagation();
    try {
      const { data } = await api.patch(`/live-exams/${exam._id}/publish`);
      setExams(prev => prev.map(ex => ex._id === data._id ? { ...ex, is_published: data.is_published } : ex));
      if (selExam?._id === data._id) setSelExam(p => ({ ...p, is_published: data.is_published }));
      toast.success(data.is_published ? 'Published — students can now see this exam' : 'Unpublished');
    } catch { toast.error('Failed'); }
  };

  const openEditExam = (exam, e) => {
    e.stopPropagation();
    setEditExam(exam);
    setForm({
      title: exam.title, course_name: exam.course_name,
      duration_minutes: exam.duration_minutes,
      total_marks: exam.total_marks, pass_marks: exam.pass_marks || '',
      description: exam.description || '',
      allow_retake: exam.allow_retake || false,
      shuffle_questions: exam.shuffle_questions || false,
      negative_marks_per_wrong: exam.negative_marks_per_wrong || 0,
      live_start: exam.live_start ? new Date(exam.live_start).toISOString().slice(0, 16) : '',
      live_end: exam.live_end ? new Date(exam.live_end).toISOString().slice(0, 16) : '',
    });
    setShowForm(true);
  };

  const handleImportQuestions = (e) => {
    const file = e.target.files?.[0];
    if (!file || !selExam) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const wb   = XLSX.read(ev.target.result, { type: 'array' });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const questions = rows.slice(1)
          .filter(r => r[0])
          .map(r => ({
            text: String(r[0]).trim(),
            options: [String(r[1] || ''), String(r[2] || ''), String(r[3] || ''), String(r[4] || '')],
            correct_index: Math.max(0, Math.min(3, (Number(r[5]) || 1) - 1)),
            marks: Number(r[6]) || 1,
          }))
          .filter(q => q.options.every(o => o.trim()));
        if (!questions.length) { toast.error('No valid questions found. Check format.'); return; }
        await api.post(`/live-exams/${selExam._id}/questions/import`, { questions });
        toast.success(`${questions.length} questions imported!`);
        loadQuestions(selExam._id);
        fetchExams();
      } catch (err) { toast.error(err.response?.data?.message || 'Import failed'); }
      finally { e.target.value = ''; }
    };
    reader.readAsArrayBuffer(file);
  };

  /* Question CRUD */
  const openAddQ = () => { setEditQ(null); setQForm(initQ); setShowQForm(true); };
  const openEditQ = (q) => {
    setEditQ(q);
    setQForm({ text: q.text, options: [...q.options], correct_index: q.correct_index, marks: q.marks });
    setShowQForm(true);
  };

  const handleSaveQ = async (e) => {
    e.preventDefault();
    if (qForm.options.some(o => !o.trim())) return toast.error('Fill all 4 options');
    if (!qForm.text.trim()) return toast.error('Question text required');
    setSavingQ(true);
    try {
      if (editQ) {
        const { data } = await api.put(`/live-exams/${selExam._id}/questions/${editQ._id}`, qForm);
        setQuestions(prev => prev.map(q => q._id === data._id ? data : q));
        toast.success('Question updated');
      } else {
        const { data } = await api.post(`/live-exams/${selExam._id}/questions`, qForm);
        setQuestions(prev => [...prev, data]);
        toast.success('Question added');
      }
      setShowQForm(false); setEditQ(null); setQForm(initQ);
      fetchExams();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSavingQ(false); }
  };

  const handleDeleteQ = async (qid) => {
    if (!await confirm('Delete this question?', { title: 'Delete Question' })) return;
    try {
      await api.delete(`/live-exams/${selExam._id}/questions/${qid}`);
      setQuestions(prev => prev.filter(q => q._id !== qid));
      toast.success('Deleted');
      fetchExams();
    } catch { toast.error('Failed'); }
  };

  /* ── Create/Edit Exam Modal ── */
  const examModal = showForm ? createPortal(
    <div onClick={e => { if (e.target === e.currentTarget) { setShowForm(false); setEditExam(null); setForm(initForm); } }}
      style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backgroundColor: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(6px)' }}>
      <div style={{ width: '100%', maxWidth: 560, maxHeight: 'calc(100vh - 2rem)', background: '#fff', borderRadius: '1.75rem', boxShadow: '0 32px 80px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.75rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#1e293b' }}>{editExam ? 'Edit Live Exam' : 'Create Live Exam'}</h3>
          <button onClick={() => { setShowForm(false); setEditExam(null); setForm(initForm); }} style={{ padding: '0.4rem', background: '#f1f5f9', border: 'none', borderRadius: '50%', cursor: 'pointer' }}><X size={18}/></button>
        </div>
        <form onSubmit={handleSubmitExam} style={{ overflowY: 'auto', padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className={labelCls}>Exam Title *</label>
            <input required className={inputCls} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Chapter 3 Quiz"/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Course *</label>
              <select required className={inputCls} value={form.course_name} onChange={e => setForm(p => ({ ...p, course_name: e.target.value }))}>
                <option value="">Select...</option>
                {courses.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Duration (minutes)</label>
              <input type="number" min="5" className={inputCls} value={form.duration_minutes} onChange={e => setForm(p => ({ ...p, duration_minutes: e.target.value }))}/>
            </div>
            <div>
              <label className={labelCls}>Total Marks</label>
              <input type="number" min="1" className={inputCls} value={form.total_marks} onChange={e => setForm(p => ({ ...p, total_marks: e.target.value }))} placeholder="Auto from questions"/>
            </div>
            <div>
              <label className={labelCls}>Pass Marks</label>
              <input type="number" min="0" className={inputCls} value={form.pass_marks} onChange={e => setForm(p => ({ ...p, pass_marks: e.target.value }))} placeholder="optional"/>
            </div>
            <div>
              <label className={labelCls}>Available From</label>
              <input type="datetime-local" className={inputCls} value={form.live_start} onChange={e => setForm(p => ({ ...p, live_start: e.target.value }))}/>
            </div>
            <div>
              <label className={labelCls}>Available Until</label>
              <input type="datetime-local" className={inputCls} value={form.live_end} onChange={e => setForm(p => ({ ...p, live_end: e.target.value }))}/>
            </div>
          </div>
          <div>
            <label className={labelCls}>Description (optional)</label>
            <textarea rows={2} className={inputCls} style={{ resize: 'none' }} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Instructions for students..."/>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.allow_retake} onChange={e => setForm(p => ({ ...p, allow_retake: e.target.checked }))} style={{ accentColor: '#7c3aed', width: 16, height: 16 }}/>
              Allow students to retake this exam
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.shuffle_questions} onChange={e => setForm(p => ({ ...p, shuffle_questions: e.target.checked }))} style={{ accentColor: '#7c3aed', width: 16, height: 16 }}/>
              Shuffle questions per student
            </label>
          </div>
          <div>
            <label className={labelCls}>Negative Marks per Wrong Answer (0 = disabled)</label>
            <input type="number" min="0" max="5" step="0.25" className={inputCls} style={{ maxWidth: 140 }} value={form.negative_marks_per_wrong} onChange={e => setForm(p => ({ ...p, negative_marks_per_wrong: Number(e.target.value) }))} placeholder="0"/>
          </div>
          <button type="submit" style={{ background: '#4f46e5', color: '#fff', padding: '0.875rem', borderRadius: '0.875rem', fontSize: '0.95rem', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <CheckCircle2 size={18}/>{editExam ? 'Update Exam' : 'Create Exam'}
          </button>
        </form>
      </div>
    </div>, document.body
  ) : null;

  /* ── Add/Edit Question Modal ── */
  const qModal = showQForm ? createPortal(
    <div onClick={e => { if (e.target === e.currentTarget) { setShowQForm(false); setEditQ(null); setQForm(initQ); } }}
      style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backgroundColor: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(6px)' }}>
      <div style={{ width: '100%', maxWidth: 560, background: '#fff', borderRadius: '1.75rem', boxShadow: '0 32px 80px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.75rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>{editQ ? 'Edit Question' : 'Add Question'}</h3>
          <button onClick={() => { setShowQForm(false); setEditQ(null); setQForm(initQ); }} style={{ padding: '0.4rem', background: '#f1f5f9', border: 'none', borderRadius: '50%', cursor: 'pointer' }}><X size={18}/></button>
        </div>
        <form onSubmit={handleSaveQ} style={{ padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className={labelCls}>Question Text *</label>
            <textarea required rows={3} className={inputCls} style={{ resize: 'vertical' }} value={qForm.text} onChange={e => setQForm(p => ({ ...p, text: e.target.value }))} placeholder="Type your question here..."/>
          </div>
          <div>
            <label className={labelCls}>Options (mark correct one)</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button type="button" onClick={() => setQForm(p => ({ ...p, correct_index: i }))}
                    style={{ width: 28, height: 28, borderRadius: '50%', border: qForm.correct_index === i ? 'none' : '2px solid #e2e8f0', background: qForm.correct_index === i ? '#10b981' : '#f8fafc', color: qForm.correct_index === i ? '#fff' : '#94a3b8', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {qForm.correct_index === i ? <Check size={14}/> : OPTS[i]}
                  </button>
                  <input required className={inputCls} style={{ flex: 1 }} value={qForm.options[i]}
                    onChange={e => { const opts = [...qForm.options]; opts[i] = e.target.value; setQForm(p => ({ ...p, options: opts })); }}
                    placeholder={`Option ${OPTS[i]}`}/>
                </div>
              ))}
            </div>
            <p style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 4 }}>Click the circle button to mark the correct answer (shown in green)</p>
          </div>
          <div>
            <label className={labelCls}>Marks for this question</label>
            <input type="number" min="1" max="20" className={inputCls} style={{ maxWidth: 120 }} value={qForm.marks} onChange={e => setQForm(p => ({ ...p, marks: Number(e.target.value) }))}/>
          </div>
          <button type="submit" disabled={savingQ} style={{ background: '#0f172a', color: '#fff', padding: '0.875rem', borderRadius: '0.875rem', fontSize: '0.9rem', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: savingQ ? 0.7 : 1 }}>
            {savingQ ? <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }}/> Saving...</> : <><Save size={16}/> {editQ ? 'Update Question' : 'Add Question'}</>}
          </button>
        </form>
      </div>
    </div>, document.body
  ) : null;

  /* ─── Page ───────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 flex items-center gap-3">
            <div className="p-3 bg-violet-50 text-violet-600 rounded-2xl"><Zap size={28}/></div>
            Live Exams
          </h2>
          <p className="text-slate-500 mt-1 ml-1">Create MCQ-based live exams for students</p>
        </div>
        <button onClick={() => { setForm(initForm); setEditExam(null); setShowForm(true); }}
          className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:bg-slate-800 hover:-translate-y-1 transition-all flex items-center gap-2">
          <Plus size={18}/> New Live Exam
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : exams.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
          <Zap size={44} className="text-slate-300 mx-auto mb-3"/>
          <p className="text-slate-500 font-medium">No live exams yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {exams.map(exam => {
            const st = STATUS(exam);
            const isOpen = selExam?._id === exam._id;
            return (
              <div key={exam._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Exam row */}
                <div className="flex items-center gap-4 p-5 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => openManage(exam)}>
                  <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                    <Zap size={20} className="text-violet-600"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-slate-800">{exam.title}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                      <span>{exam.course_name} · {exam.duration_minutes} min · {exam.question_count} questions · {exam.attempt_count} submitted</span>
                      {exam.shuffle_questions && <span className="flex items-center gap-0.5 text-violet-500 font-bold"><Shuffle size={10}/> Shuffle</span>}
                      {exam.negative_marks_per_wrong > 0 && <span className="text-rose-500 font-bold">-{exam.negative_marks_per_wrong} wrong</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={e => handlePublish(exam, e)} title={exam.is_published ? 'Unpublish' : 'Publish'}
                      className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${exam.is_published ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}>
                      {exam.is_published ? <><Lock size={12}/> Unpublish</> : <><Globe size={12}/> Publish</>}
                    </button>
                    <button onClick={e => openEditExam(exam, e)} className="p-1.5 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Edit3 size={14}/></button>
                    <button onClick={e => handleDelete(exam._id, e)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14}/></button>
                    {isOpen ? <ChevronUp size={18} className="text-slate-400"/> : <ChevronDown size={18} className="text-slate-400"/>}
                  </div>
                </div>

                {/* Expanded panel */}
                {isOpen && (
                  <div className="border-t border-slate-100">
                    {/* Tabs */}
                    <div className="flex border-b border-slate-100 px-5 gap-1">
                      {[
                        { id: 'questions', label: `Questions (${questions.length})`, icon: <HelpCircle size={14}/> },
                        { id: 'attempts', label: `Attempts`, icon: <Users size={14}/> },
                      ].map(t => (
                        <button key={t.id} onClick={() => { setTab(t.id); if (t.id === 'attempts') loadAttempts(exam._id); }}
                          className={`flex items-center gap-1.5 px-4 py-3 text-sm font-bold border-b-2 transition-colors ${tab === t.id ? 'border-violet-500 text-violet-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                          {t.icon}{t.label}
                        </button>
                      ))}
                    </div>

                    {/* Questions tab */}
                    {tab === 'questions' && (
                      <div className="p-5">
                        <div className="flex items-center justify-between mb-4 gap-2">
                          <p className="text-sm font-bold text-slate-600">{questions.length} question{questions.length !== 1 ? 's' : ''}</p>
                          <div className="flex gap-2">
                            <button onClick={() => importRef.current?.click()}
                              className="flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-3 py-2 rounded-xl text-sm font-bold hover:bg-emerald-200 transition-colors">
                              <Upload size={14}/> Import Excel
                            </button>
                            <input ref={importRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleImportQuestions}/>
                            <button onClick={openAddQ}
                              className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-violet-700 transition-colors">
                              <Plus size={15}/> Add Question
                            </button>
                          </div>
                        </div>
                        {qLoading ? (
                          <div className="flex justify-center py-8"><div className="w-7 h-7 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"/></div>
                        ) : questions.length === 0 ? (
                          <div className="text-center py-10 text-slate-400">
                            <HelpCircle size={36} className="mx-auto mb-2 text-slate-200"/>
                            <p className="font-medium">No questions yet.</p>
                            <p className="text-sm mt-1">Add MCQ questions for students to answer.</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {questions.map((q, idx) => (
                              <div key={q._id} style={{ border: '1px solid #f1f5f9', borderRadius: '0.875rem', padding: '0.875rem 1rem', background: '#fafafa' }}>
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1">
                                    <p className="font-bold text-slate-700 text-sm mb-2">
                                      <span className="text-violet-500 mr-2">Q{idx + 1}.</span>{q.text}
                                    </p>
                                    <div className="grid grid-cols-2 gap-1.5">
                                      {q.options.map((opt, oi) => (
                                        <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 8, background: oi === q.correct_index ? '#dcfce7' : '#f8fafc', border: `1px solid ${oi === q.correct_index ? '#86efac' : '#e2e8f0'}` }}>
                                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: oi === q.correct_index ? '#16a34a' : '#94a3b8', minWidth: 16 }}>{OPTS[oi]}</span>
                                          <span style={{ fontSize: '0.8rem', color: oi === q.correct_index ? '#15803d' : '#475569', fontWeight: oi === q.correct_index ? 700 : 500 }}>{opt}</span>
                                          {oi === q.correct_index && <Check size={12} className="ml-auto text-green-600"/>}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <span className="text-xs font-bold text-violet-600 bg-violet-50 px-2 py-1 rounded-lg">{q.marks} mk</span>
                                    <button onClick={() => openEditQ(q)} className="p-1.5 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg"><Edit3 size={13}/></button>
                                    <button onClick={() => handleDeleteQ(q._id)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={13}/></button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Attempts tab */}
                    {tab === 'attempts' && (
                      <div className="p-5">
                        {qLoading ? (
                          <div className="flex justify-center py-8"><div className="w-7 h-7 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"/></div>
                        ) : !attempts ? null : attempts.attempts.length === 0 ? (
                          <div className="text-center py-10 text-slate-400">
                            <Users size={36} className="mx-auto mb-2 text-slate-200"/>
                            <p>No submissions yet.</p>
                          </div>
                        ) : (
                          <>
                            {/* Summary */}
                            {(() => {
                              const submitted = attempts.attempts.filter(a => a.status === 'submitted');
                              const scores = submitted.map(a => a.score);
                              const avg = scores.length ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length * 10) / 10 : 0;
                              const highest = scores.length ? Math.max(...scores) : 0;
                              return (
                                <div className="grid grid-cols-3 gap-3 mb-5">
                                  {[
                                    { label: 'Submitted', value: submitted.length, color: '#4f46e5' },
                                    { label: 'Avg Score', value: avg, color: '#0891b2' },
                                    { label: 'Highest', value: highest, color: '#16a34a' },
                                  ].map(s => (
                                    <div key={s.label} style={{ background: '#f8fafc', borderRadius: '0.875rem', padding: '0.875rem', textAlign: 'center' }}>
                                      <p style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color, margin: 0 }}>{s.value}</p>
                                      <p style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '3px 0 0' }}>{s.label}</p>
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                              <thead>
                                <tr style={{ background: '#f8fafc' }}>
                                  {['#', 'Student', 'Roll No', 'Score', 'Grade', 'Time Taken', 'Status'].map((h, i) => (
                                    <th key={i} style={{ padding: '7px 10px', textAlign: i < 2 ? 'left' : 'center', fontWeight: 700, color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase' }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {[...attempts.attempts].sort((a, b) => b.score - a.score).map((a, i) => {
                                  const mins = Math.floor(a.time_taken_seconds / 60);
                                  const secs = a.time_taken_seconds % 60;
                                  const gcMap = { 'A+': '#10b981', A: '#22c55e', B: '#3b82f6', C: '#f59e0b', D: '#f97316', F: '#ef4444' };
                                  const gc = gcMap[a.grade] || '#94a3b8';
                                  return (
                                    <tr key={a._id} style={{ borderTop: '1px solid #f1f5f9' }}>
                                      <td style={{ padding: '7px 10px', color: '#94a3b8', fontWeight: 700 }}>{i + 1}</td>
                                      <td style={{ padding: '7px 10px', fontWeight: 600, color: '#334155' }}>{a.student_id?.full_name || '—'}</td>
                                      <td style={{ padding: '7px 10px', textAlign: 'center', color: '#94a3b8', fontFamily: 'monospace', fontSize: '0.8rem' }}>{a.student_id?.roll_number || '—'}</td>
                                      <td style={{ padding: '7px 10px', textAlign: 'center', fontWeight: 700, color: '#334155' }}>{a.score}/{a.total_marks}</td>
                                      <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                                        <span style={{ background: gc + '22', color: gc, fontWeight: 700, padding: '2px 10px', borderRadius: 20, fontSize: '0.78rem' }}>{a.grade || '—'}</span>
                                      </td>
                                      <td style={{ padding: '7px 10px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>{a.status === 'submitted' ? `${mins}m ${secs}s` : '—'}</td>
                                      <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                                        <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: 12,
                                          background: a.status === 'submitted' ? '#dcfce7' : a.status === 'timed_out' ? '#fef2f2' : '#fef3c7',
                                          color: a.status === 'submitted' ? '#16a34a' : a.status === 'timed_out' ? '#dc2626' : '#d97706'
                                        }}>{a.status}</span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {examModal}
      {qModal}
    </div>
  );
};

export default LiveExams;
