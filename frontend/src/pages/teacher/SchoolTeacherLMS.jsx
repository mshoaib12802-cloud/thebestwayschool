import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import {
  PlayCircle, BookOpen, Plus, Edit2, Trash2, Eye, EyeOff,
  ChevronRight, Users, CheckCircle2, Clock, FileText,
  Save, X, Upload, Link2, MessageCircle, Send, ChevronDown,
  GraduationCap, School, FileUp, Download,
} from 'lucide-react';

const API_BASE = '';

function Tooltip({ text, children, dir = 'top' }) {
  const dirStyles = {
    top:    { bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)' },
    bottom: { top:    'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)' },
    left:   { right:  'calc(100% + 6px)', top:  '50%', transform: 'translateY(-50%)' },
    right:  { left:   'calc(100% + 6px)', top:  '50%', transform: 'translateY(-50%)' },
  };
  const arrowStyles = {
    top:    { top: '100%',  left: '50%', transform: 'translateX(-50%)', borderTopColor: '#1e293b',    borderColor: 'transparent', borderTopWidth: 4, borderWidth: 4 },
    bottom: { bottom:'100%',left: '50%', transform: 'translateX(-50%)', borderBottomColor: '#1e293b', borderColor: 'transparent', borderBottomWidth: 4, borderWidth: 4 },
    left:   { left: '100%', top:  '50%', transform: 'translateY(-50%)', borderLeftColor: '#1e293b',   borderColor: 'transparent', borderLeftWidth: 4, borderWidth: 4 },
    right:  { right:'100%', top:  '50%', transform: 'translateY(-50%)', borderRightColor: '#1e293b',  borderColor: 'transparent', borderRightWidth: 4, borderWidth: 4 },
  };
  return (
    <div style={{ position: 'relative', display: 'inline-flex' }} className="group/tip">
      {children}
      <div style={{
        position: 'absolute', ...dirStyles[dir],
        background: '#1e293b', color: '#fff',
        fontSize: 11, fontWeight: 600, lineHeight: 1.3,
        padding: '5px 9px', borderRadius: 7,
        whiteSpace: 'nowrap', pointerEvents: 'none',
        opacity: 0, transition: 'opacity 0.15s, transform 0.15s',
        zIndex: 9999, boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
      }} className="group-hover/tip:opacity-100">
        {text}
        <div style={{ position: 'absolute', borderStyle: 'solid', ...arrowStyles[dir] }}/>
      </div>
    </div>
  );
}

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
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
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

const EMPTY_LESSON = {
  title: '', description: '', type: 'theory',
  video_url: '', video_title: '', video_duration_mins: '',
  resources: [], teacher_notes: '', quiz: { pass_percent: 70, questions: [] },
};

export default function SchoolTeacherLMS() {
  const [subjects, setSubjects]   = useState([]);
  const [active, setActive]       = useState(null);
  const [lessons, setLessons]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState('lessons'); // 'lessons' | 'progress' | 'preview'
  const [progress, setProgress]   = useState(null);
  const [previewLesson, setPreviewLesson] = useState(null);

  // Lesson form
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState(null); // lesson being edited
  const [form, setForm]           = useState(EMPTY_LESSON);
  const [saving, setSaving]       = useState(false);

  // PDF upload
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const pdfInputRef = useRef(null);

  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !editing) return;
    e.target.value = '';
    setUploadingPdf(true);
    try {
      const fd = new FormData();
      fd.append('pdf', file);
      fd.append('title', file.name.replace(/\.pdf$/i, ''));
      const { data } = await api.post(`/school-lms/teacher/lesson/${editing._id}/pdf`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm(f => ({ ...f, pdf_files: data.pdf_files }));
      setLessons(prev => prev.map(l => l._id === editing._id ? { ...l, pdf_files: data.pdf_files } : l));
    } catch (err) { alert(err.response?.data?.message || 'Upload failed'); }
    finally { setUploadingPdf(false); }
  };

  const handleDeletePdf = async (pdfId) => {
    if (!editing || !confirm('Delete this PDF?')) return;
    try {
      await api.delete(`/school-lms/teacher/lesson/${editing._id}/pdf/${pdfId}`);
      setForm(f => ({ ...f, pdf_files: f.pdf_files.filter(p => p._id !== pdfId) }));
      setLessons(prev => prev.map(l => l._id === editing._id
        ? { ...l, pdf_files: l.pdf_files.filter(p => p._id !== pdfId) }
        : l));
    } catch (err) { alert(err.response?.data?.message || 'Delete failed'); }
  };

  // Q&A
  const [selectedMod, setSelectedMod]     = useState(null);
  const [discussions, setDiscussions]     = useState([]);
  const [replyMap, setReplyMap]           = useState({});
  const [postingId, setPostingId]         = useState(null);
  const [expandedDisc, setExpandedDisc]   = useState(null);
  const [newQuestion, setNewQuestion]     = useState('');

  useEffect(() => {
    api.get('/school-lms/teacher/subjects')
      .then(r => {
        setSubjects(r.data);
        if (r.data.length) setActive(r.data[0]._id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!active) return;
    setLessons([]);
    setProgress(null);
    setSelectedMod(null);
    setDiscussions([]);
    api.get(`/school-lms/teacher/subject/${active}/lessons`)
      .then(r => setLessons(r.data)).catch(() => {});
  }, [active]);

  useEffect(() => {
    if (tab !== 'progress' || !active) return;
    api.get(`/school-lms/teacher/subject/${active}/progress`)
      .then(r => setProgress(r.data)).catch(() => {});
  }, [tab, active]);

  useEffect(() => {
    if (tab !== 'qa' || !selectedMod) return;
    api.get(`/school-lms/lesson/${selectedMod}/discussions`)
      .then(r => setDiscussions(r.data)).catch(() => {});
  }, [tab, selectedMod]);

  const openAdd = () => { setEditing(null); setForm({ ...EMPTY_LESSON, pdf_files: [] }); setShowForm(true); };
  const openEdit = (l) => { setEditing(l); setForm({ ...l, pdf_files: l.pdf_files || [], video_duration_mins: l.video_duration_mins || '' }); setShowForm(true); };

  const saveLesson = async () => {
    if (!form.title.trim()) return alert('Title is required');
    setSaving(true);
    try {
      const payload = { ...form, video_duration_mins: Number(form.video_duration_mins) || 0 };
      if (editing) {
        const { data } = await api.put(`/school-lms/teacher/lesson/${editing._id}`, payload);
        setLessons(prev => prev.map(l => l._id === editing._id ? data : l));
      } else {
        const { data } = await api.post(`/school-lms/teacher/subject/${active}/lessons`, payload);
        setLessons(prev => [...prev, data]);
        setSubjects(prev => prev.map(s => s._id === active ? { ...s, total_lessons: s.total_lessons + 1 } : s));
      }
      setShowForm(false);
    } catch (err) { alert(err.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const togglePublish = async (l) => {
    try {
      const { data } = await api.patch(`/school-lms/teacher/lesson/${l._id}/publish`);
      setLessons(prev => prev.map(x => x._id === l._id ? data : x));
      setSubjects(prev => prev.map(s => {
        if (s._id !== active) return s;
        const delta = data.is_published ? 1 : -1;
        return { ...s, published_lessons: s.published_lessons + delta };
      }));
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
  };

  const deleteLesson = async (l) => {
    if (!confirm(`Delete "${l.title}"?`)) return;
    try {
      await api.delete(`/school-lms/teacher/lesson/${l._id}`);
      setLessons(prev => prev.filter(x => x._id !== l._id));
      setSubjects(prev => prev.map(s => {
        if (s._id !== active) return s;
        return { ...s, total_lessons: s.total_lessons - 1, published_lessons: l.is_published ? s.published_lessons - 1 : s.published_lessons };
      }));
    } catch (err) { alert(err.response?.data?.message || 'Delete failed'); }
  };

  const postReply = async (discId) => {
    const msg = replyMap[discId]?.trim();
    if (!msg) return;
    setPostingId(discId);
    try {
      await api.post(`/school-lms/lesson/${selectedMod}/discussions`, { message: msg, parent_id: discId });
      const { data } = await api.get(`/school-lms/lesson/${selectedMod}/discussions`);
      setDiscussions(data);
      setReplyMap(m => ({ ...m, [discId]: '' }));
    } catch {  }
    finally { setPostingId(null); }
  };

  const postNewQuestion = async () => {
    if (!newQuestion.trim() || !selectedMod) return;
    try {
      await api.post(`/school-lms/lesson/${selectedMod}/discussions`, { message: newQuestion.trim() });
      const { data } = await api.get(`/school-lms/lesson/${selectedMod}/discussions`);
      setDiscussions(data);
      setNewQuestion('');
    } catch {  }
  };

  const addResource = () => setForm(f => ({ ...f, resources: [...f.resources, { title: '', url: '' }] }));
  const updateResource = (i, field, val) => setForm(f => {
    const rs = [...f.resources]; rs[i] = { ...rs[i], [field]: val }; return { ...f, resources: rs };
  });
  const removeResource = (i) => setForm(f => ({ ...f, resources: f.resources.filter((_, idx) => idx !== i) }));

  const addQuestion = () => setForm(f => ({
    ...f, quiz: { ...f.quiz, questions: [...f.quiz.questions, { text: '', options: ['', '', '', ''], correct_index: 0, marks: 1 }] }
  }));
  const updateQuestion = (qi, field, val) => setForm(f => {
    const qs = [...f.quiz.questions]; qs[qi] = { ...qs[qi], [field]: val };
    return { ...f, quiz: { ...f.quiz, questions: qs } };
  });
  const updateOption = (qi, oi, val) => setForm(f => {
    const qs = [...f.quiz.questions]; qs[qi] = { ...qs[qi], options: qs[qi].options.map((o, i) => i === oi ? val : o) };
    return { ...f, quiz: { ...f.quiz, questions: qs } };
  });
  const removeQuestion = (qi) => setForm(f => ({ ...f, quiz: { ...f.quiz, questions: f.quiz.questions.filter((_, i) => i !== qi) } }));

  const activeSub = subjects.find(s => s._id === active);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!subjects.length) return (
    <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
      <BookOpen size={40} className="text-slate-300 mx-auto mb-3" />
      <p className="text-slate-500 font-medium">No subjects assigned. Make sure you are assigned to classes in the timetable.</p>
    </div>
  );

  return (
    <div className="flex gap-4 h-[calc(100vh-160px)] min-h-[600px]">
      {/* Subject sidebar */}
      <div className="w-64 shrink-0 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-y-auto">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
            <School size={16} className="text-emerald-500" /> My Subjects
          </h3>
        </div>
        {subjects.map(sub => (
          <button
            key={sub._id}
            onClick={() => { setActive(sub._id); setTab('lessons'); }}
            className={`w-full text-left px-4 py-3 border-b border-slate-50 transition-colors ${active === sub._id ? 'bg-emerald-50 border-l-4 border-l-emerald-500' : 'hover:bg-slate-50'}`}
          >
            <p className={`font-semibold text-sm ${active === sub._id ? 'text-emerald-700' : 'text-slate-700'}`}>{sub.name}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Class {sub.class_id?.name}{sub.class_id?.section ? ` ${sub.class_id.section}` : ''}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-medium text-slate-500">{sub.total_lessons} lessons</span>
              <span className="text-[10px] text-emerald-600">· {sub.published_lessons} live</span>
            </div>
          </button>
        ))}
      </div>

      {/* Main panel */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4 shrink-0">
          <div>
            <h2 className="font-extrabold text-slate-800 text-lg">{activeSub?.name}</h2>
            <p className="text-sm text-slate-400">
              Class {activeSub?.class_id?.name}{activeSub?.class_id?.section ? ` ${activeSub.class_id.section}` : ''}
              {activeSub?.class_id?.grade_level ? ` · Grade ${activeSub.class_id.grade_level}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {['lessons', 'progress', 'qa'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${tab === t ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {t === 'lessons' ? 'Lessons' : t === 'progress' ? 'Progress' : 'Q&A'}
              </button>
            ))}
            {tab === 'lessons' && (
              <Tooltip text="Create a new lesson for this subject">
                <button onClick={openAdd}
                  className="flex items-center gap-1.5 bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-emerald-600 ml-2">
                  <Plus size={15} /> Add Lesson
                </button>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* ── Lessons tab ── */}
          {tab === 'lessons' && (
            lessons.length === 0 ? (
              <div className="text-center py-16">
                <PlayCircle size={40} className="text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 font-medium">No lessons yet. Click <strong>Add Lesson</strong> to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lessons.map((l, i) => (
                  <div key={l._id} className={`rounded-xl border p-4 flex gap-4 items-start ${l.is_published ? 'border-emerald-100 bg-emerald-50/30' : 'border-slate-100 bg-white'}`}>
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-500 shrink-0">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-slate-800">{l.title}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TYPE_COLORS[l.type]}`}>{l.type}</span>
                        {l.video_url && <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><PlayCircle size={9}/> Video</span>}
                        {l.quiz?.questions?.length > 0 && <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">{l.quiz.questions.length}Q Quiz</span>}
                        {l.pdf_files?.length > 0 && <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5"><FileText size={9}/>{l.pdf_files.length} PDF</span>}
                        {!l.is_published && <span className="text-[10px] bg-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded-full">Draft</span>}
                      </div>
                      {l.description && <p className="text-sm text-slate-500 mt-1 line-clamp-1">{l.description}</p>}
                      {l.video_duration_mins > 0 && <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1"><Clock size={10}/>{l.video_duration_mins} min</p>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Tooltip text="Preview lesson">
                        <button onClick={() => { setPreviewLesson(l); setTab('preview'); }}
                          className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors">
                          <Eye size={15} />
                        </button>
                      </Tooltip>
                      <Tooltip text="Edit lesson">
                        <button onClick={() => openEdit(l)}
                          className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors">
                          <Edit2 size={15} />
                        </button>
                      </Tooltip>
                      <Tooltip text={l.is_published ? 'Click to unpublish' : 'Publish so students can see it'}>
                        <button onClick={() => togglePublish(l)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                            l.is_published
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100 animate-pulse'
                          }`}>
                          {l.is_published ? <><CheckCircle2 size={12}/> Live</> : <><EyeOff size={12}/> Publish</>}
                        </button>
                      </Tooltip>
                      <Tooltip text="Delete lesson">
                        <button onClick={() => deleteLesson(l)}
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* ── Preview tab ── */}
          {tab === 'preview' && previewLesson && (
            <div>
              <button onClick={() => setTab('lessons')} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
                <ChevronRight size={14} className="rotate-180" /> Back to lessons
              </button>
              <h3 className="font-extrabold text-slate-800 text-xl mb-2">{previewLesson.title}</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${TYPE_COLORS[previewLesson.type]}`}>{previewLesson.type}</span>
                {previewLesson.is_published
                  ? <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">Published</span>
                  : <span className="text-xs bg-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded-full">Draft</span>}
              </div>
              {previewLesson.description && <p className="text-slate-600 mb-4">{previewLesson.description}</p>}
              {previewLesson.video_url && (
                <div className="aspect-video rounded-xl overflow-hidden bg-black mb-4">
                  <iframe src={toEmbedUrl(previewLesson.video_url)} className="w-full h-full" allowFullScreen />
                </div>
              )}
              {previewLesson.resources?.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-bold text-slate-700 mb-2">Resources</h4>
                  {previewLesson.resources.map((r, i) => (
                    <a key={i} href={r.url} target="_blank" rel="noreferrer"
                      className="flex items-center gap-2 text-sm text-indigo-600 hover:underline mb-1">
                      <Link2 size={13} />{r.title}
                    </a>
                  ))}
                </div>
              )}
              {previewLesson.quiz?.questions?.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <h4 className="font-bold text-amber-800 mb-2">{previewLesson.quiz.questions.length} Quiz Questions · Pass {previewLesson.quiz.pass_percent}%</h4>
                  {previewLesson.quiz.questions.map((q, i) => (
                    <div key={i} className="mb-3 last:mb-0">
                      <p className="text-sm font-semibold text-amber-900">{i+1}. {q.text}</p>
                      {q.options.map((o, oi) => (
                        <p key={oi} className={`text-xs ml-4 mt-0.5 ${oi === q.correct_index ? 'text-emerald-700 font-bold' : 'text-slate-600'}`}>
                          {oi === q.correct_index ? '✓ ' : '  '}{String.fromCharCode(65+oi)}. {o}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Progress tab ── */}
          {tab === 'progress' && (
            !progress ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : progress.students.length === 0 ? (
              <div className="text-center py-16 text-slate-400">No student progress yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs">
                      <th className="text-left p-3 rounded-l-xl font-semibold">Student</th>
                      {progress.lessons.map(l => (
                        <th key={l._id} className="text-center p-3 font-semibold max-w-[80px]">
                          <p className="truncate">{l.title}</p>
                        </th>
                      ))}
                      <th className="text-center p-3 rounded-r-xl font-semibold">Overall</th>
                    </tr>
                  </thead>
                  <tbody>
                    {progress.students.map(s => (
                      <tr key={s.student_id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="p-3 font-medium text-slate-700">{s.student_name}</td>
                        {progress.lessons.map(l => {
                          const p = s.lessons[l._id];
                          return (
                            <td key={l._id} className="p-3 text-center">
                              {p?.completed
                                ? <span className="inline-block w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 text-xs flex items-center justify-center">✓</span>
                                : p?.watched
                                  ? <span className="inline-block w-5 h-5 rounded-full bg-amber-100 text-amber-600 text-xs flex items-center justify-center">▶</span>
                                  : <span className="inline-block w-5 h-5 rounded-full bg-slate-100 text-slate-400 text-xs flex items-center justify-center">–</span>
                              }
                            </td>
                          );
                        })}
                        <td className="p-3 text-center">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.pct >= 80 ? 'bg-emerald-100 text-emerald-700' : s.pct >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                            {s.pct}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* ── Q&A tab ── */}
          {tab === 'qa' && (
            <div className="flex gap-4">
              {/* Lesson selector */}
              <div className="w-48 shrink-0 space-y-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Lesson</p>
                {lessons.filter(l => l.is_published).map(l => (
                  <button key={l._id} onClick={() => setSelectedMod(l._id)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${selectedMod === l._id ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'hover:bg-slate-50 text-slate-600'}`}>
                    {l.title}
                  </button>
                ))}
                {!lessons.filter(l => l.is_published).length && (
                  <p className="text-xs text-slate-400 px-3">Publish a lesson to see Q&A</p>
                )}
              </div>
              {/* Discussions */}
              <div className="flex-1">
                {!selectedMod ? (
                  <p className="text-slate-400 text-sm">Select a lesson to view Q&A</p>
                ) : (
                  <>
                    <div className="mb-4 flex gap-2">
                      <input value={newQuestion} onChange={e => setNewQuestion(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && postNewQuestion()}
                        placeholder="Reply or post an announcement..."
                        className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                      <Tooltip text="Send message" dir="top">
                        <button onClick={postNewQuestion} className="bg-emerald-500 text-white px-4 py-2 rounded-xl hover:bg-emerald-600">
                          <Send size={15} />
                        </button>
                      </Tooltip>
                    </div>
                    {discussions.length === 0
                      ? <p className="text-slate-400 text-sm text-center py-8">No questions yet.</p>
                      : discussions.map(d => (
                        <div key={d._id} className="mb-3 bg-slate-50 rounded-xl p-3">
                          <div className="flex items-start gap-2">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${d.is_teacher ? 'bg-emerald-500 text-white' : 'bg-indigo-100 text-indigo-700'}`}>
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
                          {/* Replies */}
                          {d.replies?.map(r => (
                            <div key={r._id} className="ml-9 mt-2 flex items-start gap-2">
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
                          {/* Reply input */}
                          <div className="ml-9 mt-2 flex gap-2">
                            <input value={replyMap[d._id] || ''} onChange={e => setReplyMap(m => ({ ...m, [d._id]: e.target.value }))}
                              onKeyDown={e => e.key === 'Enter' && postReply(d._id)}
                              placeholder="Reply..."
                              className="flex-1 border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-300" />
                            <Tooltip text="Send reply" dir="top">
                              <button onClick={() => postReply(d._id)} disabled={postingId === d._id}
                                className="bg-emerald-500 text-white px-2 py-1 rounded-lg text-xs hover:bg-emerald-600 disabled:opacity-50">
                                <Send size={11} />
                              </button>
                            </Tooltip>
                          </div>
                        </div>
                      ))
                    }
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Lesson Form Modal ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl my-6 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-800">{editing ? 'Edit Lesson' : 'Add Lesson'}</h3>
              <Tooltip text="Close" dir="left">
                <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={16} /></button>
              </Tooltip>
            </div>
            <div className="p-6 space-y-4">
              {/* Title + Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Title *</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Type</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300">
                    {['theory', 'practical', 'project', 'assessment', 'workshop'].map(t => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
              {/* Description */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Description</label>
                <textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
              </div>
              {/* Video */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1"><PlayCircle size={12} /> Video</p>
                <input value={form.video_url} onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))}
                  placeholder="YouTube / Vimeo / Google Drive URL"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                <div className="grid grid-cols-2 gap-3">
                  <input value={form.video_title} onChange={e => setForm(f => ({ ...f, video_title: e.target.value }))}
                    placeholder="Video title (optional)"
                    className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                  <input type="number" value={form.video_duration_mins} onChange={e => setForm(f => ({ ...f, video_duration_mins: e.target.value }))}
                    placeholder="Duration (minutes)"
                    className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                </div>
              </div>
              {/* Resources */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1"><Link2 size={11}/> Resources</label>
                  <Tooltip text="Add a link resource">
                    <button onClick={addResource} className="text-xs text-emerald-600 font-semibold hover:text-emerald-700 flex items-center gap-0.5"><Plus size={11}/>Add</button>
                  </Tooltip>
                </div>
                {form.resources.map((r, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input value={r.title} onChange={e => updateResource(i, 'title', e.target.value)} placeholder="Label"
                      className="w-1/3 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                    <input value={r.url} onChange={e => updateResource(i, 'url', e.target.value)} placeholder="URL"
                      className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                    <Tooltip text="Remove resource" dir="left">
                      <button onClick={() => removeResource(i)} className="p-2 hover:bg-rose-50 rounded-xl text-slate-300 hover:text-rose-500"><X size={13}/></button>
                    </Tooltip>
                  </div>
                ))}
              </div>
              {/* Quiz */}
              <div className="bg-amber-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Quiz</p>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <label className="text-xs text-amber-700">Pass %:</label>
                      <input type="number" value={form.quiz.pass_percent}
                        onChange={e => setForm(f => ({ ...f, quiz: { ...f.quiz, pass_percent: Number(e.target.value) } }))}
                        className="w-16 border border-amber-200 rounded-lg px-2 py-1 text-xs bg-white" />
                    </div>
                    <Tooltip text="Add a quiz question">
                      <button onClick={addQuestion} className="text-xs text-amber-700 font-bold hover:text-amber-800 flex items-center gap-0.5"><Plus size={11}/>Question</button>
                    </Tooltip>
                  </div>
                </div>
                {form.quiz.questions.map((q, qi) => (
                  <div key={qi} className="bg-white rounded-xl p-3 border border-amber-100">
                    <div className="flex gap-2 mb-2">
                      <input value={q.text} onChange={e => updateQuestion(qi, 'text', e.target.value)} placeholder={`Question ${qi+1}`}
                        className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
                      <input type="number" value={q.marks} onChange={e => updateQuestion(qi, 'marks', Number(e.target.value))} placeholder="Marks"
                        className="w-16 border border-slate-200 rounded-lg px-2 py-1.5 text-sm" />
                      <Tooltip text="Remove question" dir="left">
                        <button onClick={() => removeQuestion(qi)} className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-300 hover:text-rose-500"><X size={12}/></button>
                      </Tooltip>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {q.options.map((o, oi) => (
                        <div key={oi} className="flex items-center gap-1.5">
                          <input type="radio" name={`correct_${qi}`} checked={q.correct_index === oi}
                            onChange={() => updateQuestion(qi, 'correct_index', oi)}
                            className="accent-emerald-500" />
                          <input value={o} onChange={e => updateOption(qi, oi, e.target.value)}
                            placeholder={`Option ${String.fromCharCode(65+oi)}`}
                            className={`flex-1 border rounded-lg px-2 py-1 text-xs focus:outline-none ${q.correct_index === oi ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200'}`} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {form.quiz.questions.length === 0 && <p className="text-xs text-amber-600 text-center py-2">No quiz questions yet. Students skip directly to completion.</p>}
              </div>
              {/* Teacher notes */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Teacher Notes (visible to students)</label>
                <textarea rows={2} value={form.teacher_notes} onChange={e => setForm(f => ({ ...f, teacher_notes: e.target.value }))}
                  className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
              </div>

              {/* PDF Files */}
              <div className="bg-rose-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-rose-700 uppercase tracking-wide flex items-center gap-1"><FileText size={12}/> PDF Question Papers</p>
                  {editing ? (
                    <label className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${uploadingPdf ? 'bg-rose-200 text-rose-400' : 'bg-rose-500 text-white hover:bg-rose-600'}`}>
                      {uploadingPdf
                        ? <><div className="w-3 h-3 border-2 border-rose-400 border-t-transparent rounded-full animate-spin"/>Uploading…</>
                        : <><FileUp size={12}/>Upload PDF</>}
                      <input ref={pdfInputRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={handlePdfUpload} disabled={uploadingPdf}/>
                    </label>
                  ) : (
                    <span className="text-[11px] text-rose-500 italic">Save lesson first to upload PDFs</span>
                  )}
                </div>
                {(form.pdf_files || []).length === 0 ? (
                  <p className="text-xs text-rose-400 text-center py-2">No PDFs uploaded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {(form.pdf_files || []).map(pdf => (
                      <div key={pdf._id} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-rose-100">
                        <FileText size={14} className="text-rose-500 shrink-0"/>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-700 truncate">{pdf.title}</p>
                          <p className="text-[10px] text-slate-400">{pdf.original_name} · {(pdf.size_bytes / 1024).toFixed(0)} KB</p>
                        </div>
                        <Tooltip text="Open PDF in new tab" dir="top">
                          <a href={`${API_BASE}/uploads/lms-pdfs/${pdf.filename}`} target="_blank" rel="noreferrer"
                            className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-500 transition-colors">
                            <Download size={13}/>
                          </a>
                        </Tooltip>
                        {editing && (
                          <Tooltip text="Delete this PDF" dir="left">
                            <button onClick={() => handleDeletePdf(pdf._id)}
                              className="p-1.5 hover:bg-rose-100 rounded-lg text-slate-300 hover:text-rose-500 transition-colors">
                              <X size={13}/>
                            </button>
                          </Tooltip>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
              <button onClick={saveLesson} disabled={saving}
                className="px-5 py-2 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-2">
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Save size={14}/>}
                {saving ? 'Saving…' : 'Save Lesson'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
