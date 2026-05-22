import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { confirm } from '../../utils/confirm';
import * as XLSX from 'xlsx';
import {
  Zap, Plus, X, Save, Trash2, ChevronDown, ChevronUp,
  CheckCircle2, Users, HelpCircle, Check, Edit3, RefreshCw,
  Globe, Lock, Upload, Shuffle,
} from 'lucide-react';

const OPTS = ['A', 'B', 'C', 'D'];

const STATUS = (exam) => {
  const now = new Date();
  if (!exam.is_published) return { label: 'Draft', color: 'bg-slate-100 text-slate-500' };
  if (exam.live_start && new Date(exam.live_start) > now) return { label: 'Scheduled', color: 'bg-sky-100 text-sky-700' };
  if (exam.live_end && new Date(exam.live_end) < now) return { label: 'Ended', color: 'bg-rose-100 text-rose-700' };
  return { label: 'Live Now', color: 'bg-emerald-100 text-emerald-700' };
};

const initForm = { title: '', course_name: '', duration_minutes: '30', total_marks: '', pass_marks: '', description: '', allow_retake: false, shuffle_questions: false, negative_marks_per_wrong: 0, live_start: '', live_end: '' };
const initQ    = { text: '', options: ['', '', '', ''], correct_index: 0, marks: 1 };

const TeacherLiveExams = () => {
  const [exams, setExams]       = useState([]);
  const [courses, setCourses]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState(initForm);
  const [saving, setSaving]     = useState(false);

  const [selId, setSelId]         = useState(null);
  const [tab, setTab]             = useState('questions');
  const [questions, setQuestions] = useState([]);
  const [attempts, setAttempts]   = useState(null);
  const [panelLoad, setPanelLoad] = useState(false);

  const [showQForm, setShowQForm] = useState(false);
  const [editQ, setEditQ]         = useState(null);
  const [qForm, setQForm]         = useState(initQ);
  const [savingQ, setSavingQ]     = useState(false);
  const importRef                 = useRef(null);

  const load = () => {
    setLoading(true);
    api.get('/live-exams').then(r => setExams(r.data)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    api.get('/teacher-portal/courses').then(r => setCourses(r.data)).catch(() => {});
  }, []);

  const toggle = async (exam) => {
    if (selId === exam._id) { setSelId(null); return; }
    setSelId(exam._id); setTab('questions');
    loadQuestions(exam._id);
  };

  const loadQuestions = async (id) => {
    setPanelLoad(true);
    try { const { data } = await api.get(`/live-exams/${id}/questions`); setQuestions(data); }
    catch { toast.error('Failed'); }
    finally { setPanelLoad(false); }
  };

  const loadAttempts = async (id) => {
    setPanelLoad(true);
    try { const { data } = await api.get(`/live-exams/${id}/attempts`); setAttempts(data); }
    catch { toast.error('Failed'); }
    finally { setPanelLoad(false); }
  };

  const handleCreate = async () => {
    if (!form.title || !form.course_name) return toast.error('Title and course required');
    setSaving(true);
    try {
      await api.post('/live-exams', {
        ...form,
        duration_minutes: Number(form.duration_minutes) || 30,
        negative_marks_per_wrong: Number(form.negative_marks_per_wrong) || 0,
        live_start: form.live_start || null,
        live_end: form.live_end || null,
        exam_date: form.live_start || new Date().toISOString(),
      });
      toast.success('Exam created');
      setShowForm(false); setForm(initForm); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleImportQuestions = (e) => {
    const file = e.target.files?.[0];
    if (!file || !selId) return;
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
        if (!questions.length) { toast.error('No valid questions found.'); return; }
        await api.post(`/live-exams/${selId}/questions/import`, { questions });
        toast.success(`${questions.length} questions imported!`);
        loadQuestions(selId);
        load();
      } catch (err) { toast.error(err.response?.data?.message || 'Import failed'); }
      finally { e.target.value = ''; }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDelete = async (id) => {
    if (!await confirm('Delete this exam?', { title: 'Delete Exam' })) return;
    try { await api.delete(`/live-exams/${id}`); if (selId === id) setSelId(null); toast.success('Deleted'); load(); }
    catch { toast.error('Failed'); }
  };

  const handlePublish = async (exam, e) => {
    e.stopPropagation();
    try {
      const { data } = await api.patch(`/live-exams/${exam._id}/publish`);
      setExams(prev => prev.map(ex => ex._id === data._id ? { ...ex, is_published: data.is_published } : ex));
      toast.success(data.is_published ? 'Published' : 'Unpublished');
    } catch { toast.error('Failed'); }
  };

  const openAddQ = () => { setEditQ(null); setQForm(initQ); setShowQForm(true); };
  const openEditQ = (q) => { setEditQ(q); setQForm({ text: q.text, options: [...q.options], correct_index: q.correct_index, marks: q.marks }); setShowQForm(true); };

  const saveQ = async () => {
    if (qForm.options.some(o => !o.trim()) || !qForm.text.trim()) return toast.error('Fill all fields');
    setSavingQ(true);
    try {
      if (editQ) {
        const { data } = await api.put(`/live-exams/${selId}/questions/${editQ._id}`, qForm);
        setQuestions(prev => prev.map(q => q._id === data._id ? data : q));
        toast.success('Updated');
      } else {
        const { data } = await api.post(`/live-exams/${selId}/questions`, qForm);
        setQuestions(prev => [...prev, data]);
        toast.success('Added');
      }
      setShowQForm(false); setEditQ(null); setQForm(initQ); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSavingQ(false); }
  };

  const deleteQ = async (qid) => {
    if (!await confirm('Delete question?', { title: 'Delete Question' })) return;
    try { await api.delete(`/live-exams/${selId}/questions/${qid}`); setQuestions(prev => prev.filter(q => q._id !== qid)); load(); }
    catch { toast.error('Failed'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
            <Zap size={24} className="text-violet-500"/> Live Exams
          </h2>
          <p className="text-slate-500 mt-1">Create MCQ exams for students to take online</p>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-sm">
          {showForm ? <X size={18}/> : <Plus size={18}/>}
          {showForm ? 'Cancel' : 'New Live Exam'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-violet-50 border border-violet-200 rounded-2xl p-6">
          <h3 className="font-extrabold text-slate-800 mb-4">New Live Exam</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Title *</label>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-300" placeholder="e.g. Chapter 3 Quiz"/>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Course *</label>
              <select value={form.course_name} onChange={e => setForm(p => ({ ...p, course_name: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-300">
                <option value="">Select course...</option>
                {courses.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Duration (minutes)</label>
              <input type="number" min="5" value={form.duration_minutes} onChange={e => setForm(p => ({ ...p, duration_minutes: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"/>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Pass Marks</label>
              <input type="number" min="0" value={form.pass_marks} onChange={e => setForm(p => ({ ...p, pass_marks: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-300" placeholder="optional"/>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Available From</label>
              <input type="datetime-local" value={form.live_start} onChange={e => setForm(p => ({ ...p, live_start: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"/>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Available Until</label>
              <input type="datetime-local" value={form.live_end} onChange={e => setForm(p => ({ ...p, live_end: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"/>
            </div>
          </div>
          <div className="mb-4">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Instructions (optional)</label>
            <textarea rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none" placeholder="e.g. No books allowed..."/>
          </div>
          <div className="flex flex-wrap gap-4 mb-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-600 cursor-pointer">
              <input type="checkbox" checked={form.allow_retake} onChange={e => setForm(p => ({ ...p, allow_retake: e.target.checked }))} style={{ accentColor: '#7c3aed', width: 15, height: 15 }}/>
              Allow retake
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-600 cursor-pointer">
              <input type="checkbox" checked={form.shuffle_questions} onChange={e => setForm(p => ({ ...p, shuffle_questions: e.target.checked }))} style={{ accentColor: '#7c3aed', width: 15, height: 15 }}/>
              Shuffle questions
            </label>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Negative marks/wrong:</label>
              <input type="number" min="0" max="5" step="0.25" value={form.negative_marks_per_wrong} onChange={e => setForm(p => ({ ...p, negative_marks_per_wrong: e.target.value }))}
                className="w-20 border border-slate-200 rounded-xl px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"/>
            </div>
          </div>
          <button onClick={handleCreate} disabled={saving}
            className="flex items-center gap-2 bg-violet-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-violet-700 transition-colors disabled:opacity-60">
            <Save size={16}/> {saving ? 'Creating...' : 'Create Exam'}
          </button>
        </div>
      )}

      {/* Exams list */}
      {exams.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-slate-100">
          <Zap size={48} className="text-slate-200 mx-auto mb-4"/>
          <h3 className="text-xl font-extrabold text-slate-400 mb-2">No Live Exams</h3>
          <p className="text-slate-400">Create a live exam, add questions, then publish it for students.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {exams.map(exam => {
            const isOpen = selId === exam._id;
            const st = STATUS(exam);
            return (
              <div key={exam._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex items-center gap-4 p-5 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => toggle(exam)}>
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
                    <button onClick={e => handlePublish(exam, e)}
                      className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${exam.is_published ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}>
                      {exam.is_published ? <><Lock size={12}/> Unpublish</> : <><Globe size={12}/> Publish</>}
                    </button>
                    <button onClick={e => { e.stopPropagation(); handleDelete(exam._id); }} className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"><Trash2 size={16}/></button>
                    {isOpen ? <ChevronUp size={18} className="text-slate-400"/> : <ChevronDown size={18} className="text-slate-400"/>}
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-slate-100">
                    <div className="flex border-b border-slate-100 px-5">
                      {[
                        { id: 'questions', label: `Questions (${questions.length})`, icon: <HelpCircle size={14}/> },
                        { id: 'attempts', label: 'Submissions', icon: <Users size={14}/> },
                      ].map(t => (
                        <button key={t.id} onClick={() => { setTab(t.id); if (t.id === 'attempts') loadAttempts(exam._id); }}
                          className={`flex items-center gap-1.5 px-4 py-3 text-sm font-bold border-b-2 transition-colors ${tab === t.id ? 'border-violet-500 text-violet-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                          {t.icon}{t.label}
                        </button>
                      ))}
                    </div>

                    {/* Questions panel */}
                    {tab === 'questions' && (
                      <div className="p-5">
                        {!showQForm ? (
                          <div className="flex items-center justify-between mb-4 gap-2">
                            <p className="text-sm text-slate-400">{questions.length} question{questions.length !== 1 ? 's' : ''}</p>
                            <div className="flex gap-2">
                              <button onClick={() => importRef.current?.click()}
                                className="flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-3 py-2 rounded-xl text-sm font-bold hover:bg-emerald-200 transition-colors">
                                <Upload size={13}/> Import Excel
                              </button>
                              <input ref={importRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleImportQuestions}/>
                              <button onClick={openAddQ} className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-violet-700 transition-colors">
                                <Plus size={14}/> Add Question
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-violet-50 border border-violet-200 rounded-2xl p-5 mb-4 space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="font-bold text-slate-700">{editQ ? 'Edit Question' : 'New Question'}</h4>
                              <button onClick={() => { setShowQForm(false); setEditQ(null); setQForm(initQ); }} className="p-1.5 rounded-lg hover:bg-white"><X size={16}/></button>
                            </div>
                            <div>
                              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Question *</label>
                              <textarea rows={3} value={qForm.text} onChange={e => setQForm(p => ({ ...p, text: e.target.value }))}
                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none" placeholder="Type question here..."/>
                            </div>
                            <div>
                              <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Options (click circle = correct answer)</label>
                              {[0,1,2,3].map(i => (
                                <div key={i} className="flex items-center gap-2 mb-2">
                                  <button type="button" onClick={() => setQForm(p => ({ ...p, correct_index: i }))}
                                    style={{ width: 28, height: 28, borderRadius: '50%', border: qForm.correct_index === i ? 'none' : '2px solid #e2e8f0', background: qForm.correct_index === i ? '#10b981' : '#f8fafc', color: qForm.correct_index === i ? '#fff' : '#94a3b8', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {qForm.correct_index === i ? <Check size={13}/> : OPTS[i]}
                                  </button>
                                  <input value={qForm.options[i]} onChange={e => { const opts = [...qForm.options]; opts[i] = e.target.value; setQForm(p => ({ ...p, options: opts })); }}
                                    className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-300" placeholder={`Option ${OPTS[i]}`}/>
                                </div>
                              ))}
                            </div>
                            <div className="flex items-center gap-4">
                              <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Marks</label>
                                <input type="number" min="1" max="10" value={qForm.marks} onChange={e => setQForm(p => ({ ...p, marks: Number(e.target.value) }))}
                                  className="w-20 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"/>
                              </div>
                              <button onClick={saveQ} disabled={savingQ}
                                className="flex items-center gap-2 bg-violet-600 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-violet-700 disabled:opacity-60 mt-5">
                                {savingQ ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }}/> : <Save size={14}/>}
                                {editQ ? 'Update' : 'Add Question'}
                              </button>
                            </div>
                          </div>
                        )}

                        {panelLoad ? (
                          <div className="flex justify-center py-6"><div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"/></div>
                        ) : questions.length === 0 ? (
                          <p className="text-sm text-slate-400 text-center py-8">No questions yet. Add MCQ questions above.</p>
                        ) : (
                          <div className="space-y-3">
                            {questions.map((q, idx) => (
                              <div key={q._id} style={{ border: '1px solid #f1f5f9', borderRadius: '0.875rem', padding: '0.875rem 1rem', background: '#fafafa' }}>
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1">
                                    <p className="font-bold text-slate-700 text-sm mb-2"><span className="text-violet-500 mr-1">Q{idx + 1}.</span>{q.text}</p>
                                    <div className="grid grid-cols-2 gap-1.5">
                                      {q.options.map((opt, oi) => (
                                        <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 8, background: oi === q.correct_index ? '#dcfce7' : '#f8fafc', border: `1px solid ${oi === q.correct_index ? '#86efac' : '#e2e8f0'}` }}>
                                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: oi === q.correct_index ? '#16a34a' : '#94a3b8', minWidth: 14 }}>{OPTS[oi]}</span>
                                          <span style={{ fontSize: '0.78rem', color: oi === q.correct_index ? '#15803d' : '#475569', fontWeight: oi === q.correct_index ? 700 : 500 }}>{opt}</span>
                                          {oi === q.correct_index && <Check size={11} className="ml-auto text-green-600"/>}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <span className="text-xs font-bold text-violet-600 bg-violet-50 px-2 py-1 rounded-lg">{q.marks} mk</span>
                                    <button onClick={() => openEditQ(q)} className="p-1.5 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg"><Edit3 size={13}/></button>
                                    <button onClick={() => deleteQ(q._id)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={13}/></button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Attempts panel */}
                    {tab === 'attempts' && (
                      <div className="p-5">
                        {panelLoad ? (
                          <div className="flex justify-center py-6"><div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"/></div>
                        ) : !attempts || attempts.attempts.length === 0 ? (
                          <div className="text-center py-10 text-slate-400">
                            <Users size={36} className="mx-auto mb-2 text-slate-200"/>
                            <p className="font-medium">No submissions yet.</p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-slate-50">
                                <tr>
                                  {['#', 'Student', 'Roll No', 'Score', 'Grade', 'Time', 'Status'].map((h, i) => (
                                    <th key={i} className="py-2 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider" style={{ textAlign: i < 2 ? 'left' : 'center' }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                {[...attempts.attempts].sort((a, b) => b.score - a.score).map((a, i) => {
                                  const mins = Math.floor(a.time_taken_seconds / 60);
                                  const secs = a.time_taken_seconds % 60;
                                  const gcMap = { 'A+': '#10b981', A: '#22c55e', B: '#3b82f6', C: '#f59e0b', D: '#f97316', F: '#ef4444' };
                                  const gc = gcMap[a.grade] || '#94a3b8';
                                  return (
                                    <tr key={a._id} className="hover:bg-slate-50">
                                      <td className="py-2.5 px-3 text-slate-400 font-bold">{i + 1}</td>
                                      <td className="py-2.5 px-3 font-semibold text-slate-700">{a.student_id?.full_name || '—'}</td>
                                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-xs">{a.student_id?.roll_number || '—'}</td>
                                      <td className="py-2.5 px-3 text-center font-bold text-slate-700">{a.score}/{a.total_marks}</td>
                                      <td className="py-2.5 px-3 text-center">
                                        <span style={{ background: gc + '22', color: gc, fontWeight: 700, padding: '2px 10px', borderRadius: 16, fontSize: '0.78rem' }}>{a.grade || '—'}</span>
                                      </td>
                                      <td className="py-2.5 px-3 text-center text-slate-400 text-xs">{a.status === 'submitted' ? `${mins}m ${secs}s` : '—'}</td>
                                      <td className="py-2.5 px-3 text-center">
                                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: a.status === 'submitted' ? '#dcfce7' : '#fef2f2', color: a.status === 'submitted' ? '#16a34a' : '#dc2626' }}>
                                          {a.status}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
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
    </div>
  );
};

export default TeacherLiveExams;
