import { useState, useEffect } from 'react';
import api from '../../services/api';
import { confirm } from '../../utils/confirm';
import {
  BookOpen, CheckCircle2, Play, Lock, Plus, ChevronUp, ChevronDown,
  RotateCcw, Trash2, Edit2, Link2, FileText, Clock, X, Save,
  BarChart2, TrendingUp, CalendarDays
} from 'lucide-react';

const SHIFT_COLORS = {
  Morning:   { bg: '#fef3c7', color: '#92400e' },
  Afternoon: { bg: '#dbeafe', color: '#1e40af' },
  Evening:   { bg: '#ede9fe', color: '#4c1d95' },
  Weekend:   { bg: '#dcfce7', color: '#14532d' },
};
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine
} from 'recharts';

const GRADE_BAR_COLORS = {
  'A+': '#059669', A: '#10b981', B: '#3b82f6',
  C: '#f59e0b', D: '#f97316', F: '#ef4444',
};

const AvgTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-bold text-slate-800 mb-1">{label}</p>
      <p className="text-emerald-600 font-bold">Avg: {payload[0].value}%</p>
      {payload[1] && <p className="text-blue-500 font-bold">Pass rate: {payload[1].value}%</p>}
    </div>
  );
};

const GradeTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-sm">
      <p className="font-bold text-slate-700">Grade {label}</p>
      <p className="text-slate-500">{payload[0].value} student{payload[0].value !== 1 ? 's' : ''}</p>
    </div>
  );
};

const TYPE_COLORS = {
  theory:     'bg-blue-100 text-blue-700 border-blue-200',
  practical:  'bg-emerald-100 text-emerald-700 border-emerald-200',
  project:    'bg-violet-100 text-violet-700 border-violet-200',
  assessment: 'bg-amber-100 text-amber-700 border-amber-200',
  workshop:   'bg-rose-100 text-rose-700 border-rose-200',
};

const EMPTY_FORM = { title: '', description: '', type: 'theory', duration_days: 7, resources: [], video_url: '', video_title: '', video_duration_mins: '', quiz: { pass_percent: 70, questions: [] } };

const toEmbedUrl = (url) => {
  if (!url) return '';
  // YouTube: watch, short, or already embed
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  // Vimeo: vimeo.com/123456789
  const vi = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vi) return `https://player.vimeo.com/video/${vi[1]}`;
  // Google Drive: /file/d/ID/view  →  /file/d/ID/preview
  const gd = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (gd) return `https://drive.google.com/file/d/${gd[1]}/preview`;
  // Loom: loom.com/share/ID  →  loom.com/embed/ID
  const lm = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
  if (lm) return `https://www.loom.com/embed/${lm[1]}`;
  // Otherwise pass through as-is (direct embed URL)
  return url;
};

const TeacherCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCourse, setActiveCourse] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editMod, setEditMod] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [completeDialog, setCompleteDialog] = useState(null);
  const [completeNotes, setCompleteNotes] = useState('');
  const [notesVisible, setNotesVisible] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resTitle, setResTitle] = useState('');
  const [resUrl, setResUrl] = useState('');

  // Course analytics
  const [allExams, setAllExams] = useState([]);
  const [analyticsMap, setAnalyticsMap] = useState({});
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/teacher-portal/courses')
      .then(r => {
        setCourses(r.data);
        if (r.data.length > 0 && !activeCourse) setActiveCourse(r.data[0]._id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    api.get('/teacher-portal/exams').then(r => setAllExams(r.data)).catch(() => {});
  }, []);

  const course = courses.find(c => c._id === activeCourse) || courses[0];

  const openAdd = () => { setEditMod(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (mod) => {
    setEditMod(mod._id);
    setForm({
      title: mod.title, description: mod.description || '', type: mod.type,
      duration_days: mod.duration_days, resources: mod.resources || [],
      video_url: mod.video_url || '', video_title: mod.video_title || '',
      video_duration_mins: mod.video_duration_mins || '',
      quiz: mod.quiz || { pass_percent: 70, questions: [] },
    });
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditMod(null); setForm(EMPTY_FORM); };

  const addResource = () => {
    if (!resTitle.trim()) return;
    setForm(f => ({ ...f, resources: [...f.resources, { title: resTitle.trim(), url: resUrl.trim() }] }));
    setResTitle(''); setResUrl('');
  };
  const removeResource = (i) => setForm(f => ({ ...f, resources: f.resources.filter((_, idx) => idx !== i) }));

  const handleSave = async () => {
    if (!form.title.trim() || !course) return;
    setSaving(true);
    try {
      const payload = { ...form, video_url: toEmbedUrl(form.video_url) };
      if (editMod) {
        await api.put(`/course-modules/${editMod}`, payload);
      } else {
        await api.post(`/course-modules/${course._id}`, payload);
      }
      closeForm();
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving module');
    } finally { setSaving(false); }
  };

  const handleStart = async (modId) => {
    await api.put(`/course-modules/${modId}/start`);
    load();
  };

  const openComplete = (mod) => {
    setCompleteDialog(mod);
    setCompleteNotes(mod.teacher_notes || '');
    setNotesVisible(mod.notes_visible !== false);
  };

  const handleComplete = async () => {
    if (!completeDialog) return;
    await api.put(`/course-modules/${completeDialog._id}/complete`, {
      teacher_notes: completeNotes,
      notes_visible: notesVisible
    });
    setCompleteDialog(null);
    load();
  };

  const handleReset = async (modId) => {
    if (!await confirm('Reset this module to upcoming?', { title: 'Reset Module', confirmText: 'Reset', danger: false })) return;
    await api.put(`/course-modules/${modId}/reset`);
    load();
  };

  const handleMove = async (modId, dir) => {
    await api.put(`/course-modules/${modId}/move`, { direction: dir });
    load();
  };

  const loadCourseAnalytics = async () => {
    if (!course) return;
    const examsWithResults = allExams.filter(e => e.course_name === course.name && e.result_count > 0);
    if (examsWithResults.length === 0) { setAnalyticsOpen(true); return; }
    setAnalyticsLoading(true);
    const newMap = {};
    await Promise.all(examsWithResults.map(async e => {
      try {
        const { data } = await api.get(`/exams/${e._id}/analytics`);
        newMap[e._id] = data;
      } catch {}
    }));
    setAnalyticsMap(newMap);
    setAnalyticsLoading(false);
    setAnalyticsOpen(true);
  };

  const handleDelete = async (mod) => {
    if (!await confirm(`Delete "${mod.title}"?`, { title: 'Delete Module' })) return;
    try {
      await api.delete(`/course-modules/${mod._id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Cannot delete this module');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  if (courses.length === 0) return (
    <div className="bg-white rounded-3xl p-16 text-center border border-slate-100">
      <BookOpen size={48} className="text-slate-200 mx-auto mb-4"/>
      <h3 className="text-xl font-extrabold text-slate-400 mb-2">No Courses Assigned</h3>
      <p className="text-slate-400">You haven't been assigned to any students' courses yet.</p>
    </div>
  );

  const modules = course?.modules || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
          <BookOpen size={24} className="text-emerald-500"/> My Courses
        </h2>
        <p className="text-slate-500 mt-1">Manage modules for courses you teach</p>
      </div>

      {/* Course tabs */}
      <div className="flex gap-2 flex-wrap">
        {courses.map(c => (
          <button key={c._id} onClick={() => { setActiveCourse(c._id); setAnalyticsOpen(false); setAnalyticsMap({}); }}
            className={`px-5 py-2 rounded-xl font-bold text-sm transition-all ${activeCourse === c._id ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}>
            {c.name}
          </button>
        ))}
      </div>

      {/* Progress bar */}
      {course && (
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <div>
              <span className="font-extrabold text-slate-700">{course.name}</span>
              <span className="text-slate-400 text-sm ml-2">· {course.duration}</span>
            </div>
            <span className="font-extrabold text-emerald-600 text-lg">{course.stats.progress_pct}%</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${course.stats.progress_pct}%`, background: course.stats.progress_pct === 100 ? 'linear-gradient(90deg,#10b981,#059669)' : 'linear-gradient(90deg,#6366f1,#8b5cf6)' }}/>
          </div>
          <div className="flex gap-4 mt-2 text-xs font-bold text-slate-400">
            <span className="text-emerald-500">{course.stats.completed} done</span>
            {course.stats.in_progress > 0 && <span className="text-blue-500">{course.stats.in_progress} active</span>}
            <span>{course.stats.upcoming} upcoming</span>
            <span className="ml-auto">{course.stats.total} modules</span>
          </div>

          {/* Batch info */}
          {course.batches?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <CalendarDays size={11}/> My Batches for this Course
              </p>
              <div className="flex flex-wrap gap-2">
                {course.batches.map(b => {
                  const sc = SHIFT_COLORS[b.shift] || SHIFT_COLORS.Morning;
                  return (
                    <div key={b._id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderRadius: '0.75rem', padding: '0.5rem 0.875rem' }}>
                      <div>
                        <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 800, color: '#fff' }}>{b.name}</p>
                        {(b.start_date || b.end_date) && (
                          <p style={{ margin: '0.1rem 0 0', fontSize: '0.65rem', color: '#94a3b8' }}>
                            {b.start_date ? new Date(b.start_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '?'}
                            {' → '}
                            {b.end_date ? new Date(b.end_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Ongoing'}
                          </p>
                        )}
                      </div>
                      <span style={{ background: sc.bg, color: sc.color, fontSize: '0.68rem', fontWeight: 700, padding: '2px 10px', borderRadius: 999, flexShrink: 0 }}>
                        {b.shift}
                      </span>
                      {!b.is_active && (
                        <span style={{ background: '#f1f5f9', color: '#94a3b8', fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999 }}>Inactive</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Course analytics section */}
      {course && (() => {
        const courseExams = allExams.filter(e => e.course_name === course.name);
        const examsWithResults = courseExams.filter(e => e.result_count > 0);

        const trendData = examsWithResults
          .sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date))
          .map(e => {
            const a = analyticsMap[e._id];
            return {
              name: e.title.length > 14 ? e.title.slice(0, 14) + '…' : e.title,
              avg: a ? Math.round((a.average / e.total_marks) * 100) : null,
              pass: a?.passRate ?? null,
            };
          })
          .filter(d => d.avg !== null);

        const combinedGrades = { 'A+': 0, A: 0, B: 0, C: 0, D: 0, F: 0 };
        Object.values(analyticsMap).forEach(a => {
          if (a?.gradeBreakdown) {
            Object.keys(combinedGrades).forEach(g => { combinedGrades[g] += a.gradeBreakdown[g] || 0; });
          }
        });
        const gradeData = Object.entries(combinedGrades).map(([grade, count]) => ({ grade, count }));
        const hasGrades = gradeData.some(d => d.count > 0);

        return (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <button
              onClick={() => analyticsOpen ? setAnalyticsOpen(false) : loadCourseAnalytics()}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors">
              <span className="font-bold text-slate-700 flex items-center gap-2">
                <BarChart2 size={17} className="text-emerald-500"/> Course Analytics
                {courseExams.length > 0 && (
                  <span className="text-xs font-bold text-slate-400">· {courseExams.length} exam{courseExams.length !== 1 ? 's' : ''}</span>
                )}
              </span>
              {analyticsOpen ? <ChevronUp size={16} className="text-slate-400"/> : <ChevronDown size={16} className="text-slate-400"/>}
            </button>

            {analyticsOpen && (
              <div className="border-t border-slate-100 p-5 space-y-5">
                {analyticsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"/>
                  </div>
                ) : examsWithResults.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6">No exam results recorded for this course yet.</p>
                ) : (
                  <>
                    {/* Trend chart */}
                    {trendData.length >= 2 && (
                      <div>
                        <h4 className="font-bold text-slate-600 text-sm mb-3 flex items-center gap-2">
                          <TrendingUp size={14} className="text-emerald-500"/> Class Average Trend
                        </h4>
                        <ResponsiveContainer width="100%" height={180}>
                          <LineChart data={trendData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false}/>
                            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} unit="%"/>
                            <Tooltip content={<AvgTooltip/>}/>
                            <ReferenceLine y={50} stroke="#fca5a5" strokeDasharray="4 2"/>
                            <Line type="monotone" dataKey="avg" name="avg" stroke="#10b981" strokeWidth={2.5}
                              dot={{ fill: '#10b981', r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }}/>
                            <Line type="monotone" dataKey="pass" name="pass" stroke="#3b82f6" strokeWidth={1.5}
                              strokeDasharray="4 2" dot={false}/>
                          </LineChart>
                        </ResponsiveContainer>
                        <div className="flex gap-4 mt-1 justify-center">
                          <span className="flex items-center gap-1.5 text-xs text-slate-500">
                            <span className="w-3 h-0.5 bg-emerald-500 inline-block rounded"/>Avg Score
                          </span>
                          <span className="flex items-center gap-1.5 text-xs text-slate-500">
                            <span className="w-3 h-0.5 bg-blue-400 inline-block rounded"/>Pass Rate
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Grade distribution */}
                    {hasGrades && (
                      <div>
                        <h4 className="font-bold text-slate-600 text-sm mb-3 flex items-center gap-2">
                          <BarChart2 size={14} className="text-emerald-500"/> Overall Grade Distribution
                        </h4>
                        <ResponsiveContainer width="100%" height={160}>
                          <BarChart data={gradeData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                            <XAxis dataKey="grade" tick={{ fontSize: 12, fontWeight: 700 }} tickLine={false} axisLine={false}/>
                            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false}/>
                            <Tooltip content={<GradeTooltip/>}/>
                            <Bar dataKey="count" radius={[5, 5, 0, 0]}>
                              {gradeData.map(entry => (
                                <Cell key={entry.grade} fill={GRADE_BAR_COLORS[entry.grade] || '#94a3b8'}/>
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* Add module button */}
      <div className="flex justify-end">
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-sm">
          <Plus size={18}/> Add Module
        </button>
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 space-y-4">
          <h3 className="font-extrabold text-slate-800">{editMod ? 'Edit Module' : 'New Module'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Title *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white"
                placeholder="Module title"/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white">
                  {['theory','practical','project','assessment','workshop'].map(t => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Days</label>
                <input type="number" min="1" value={form.duration_days}
                  onChange={e => setForm(f => ({ ...f, duration_days: Number(e.target.value) }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white"/>
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white resize-none"
              placeholder="Brief description..."/>
          </div>
          {/* Resources */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Resources</label>
            <div className="flex gap-2 mb-2">
              <input value={resTitle} onChange={e => setResTitle(e.target.value)} placeholder="Title"
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300"/>
              <input value={resUrl} onChange={e => setResUrl(e.target.value)} placeholder="URL (optional)"
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300"/>
              <button onClick={addResource} className="bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-700 transition-colors">
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.resources.map((r, i) => (
                <span key={i} className="flex items-center gap-1.5 text-xs bg-white border border-slate-200 px-3 py-1.5 rounded-xl font-semibold">
                  <Link2 size={10}/>{r.title}
                  <button onClick={() => removeResource(i)} className="text-red-400 hover:text-red-600 ml-1"><X size={10}/></button>
                </span>
              ))}
            </div>
          </div>

          {/* ── Video Lesson ── */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3">
            <p className="font-bold text-slate-700 flex items-center gap-2 text-sm">
              <Play size={15} className="text-red-500"/> Video Lesson
            </p>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Video URL</label>
              <input value={form.video_url}
                onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))}
                placeholder="YouTube, Vimeo, Google Drive, Loom, or any embed URL"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-300"/>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Paste a <strong>YouTube</strong> link (youtu.be/… or watch?v=…), <strong>Vimeo</strong> link, <strong>Google Drive</strong> share link, <strong>Loom</strong> share link, or any direct iframe embed URL.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Video Title (optional)</label>
                <input value={form.video_title}
                  onChange={e => setForm(f => ({ ...f, video_title: e.target.value }))}
                  placeholder="e.g. Introduction to Python"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-300"/>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Duration (minutes)</label>
                <input type="number" min="0" value={form.video_duration_mins}
                  onChange={e => setForm(f => ({ ...f, video_duration_mins: e.target.value }))}
                  placeholder="e.g. 25"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-300"/>
              </div>
            </div>
            {/* Live preview */}
            {form.video_url && (
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Preview</p>
                <div className="relative w-full rounded-2xl overflow-hidden bg-black shadow-md" style={{ paddingBottom: '56.25%' }}>
                  <iframe
                    src={toEmbedUrl(form.video_url)}
                    title="Video preview"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full border-0"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">Embed URL: <code className="bg-slate-100 px-1 rounded text-[11px] break-all">{toEmbedUrl(form.video_url)}</code></p>
              </div>
            )}
          </div>

          {/* ── Quiz Builder ── */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-bold text-slate-700 flex items-center gap-2 text-sm">
                <FileText size={15} className="text-violet-500"/> Post-Video Quiz
              </p>
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-400">Pass %</label>
                <input type="number" min="1" max="100"
                  value={form.quiz.pass_percent}
                  onChange={e => setForm(f => ({ ...f, quiz: { ...f.quiz, pass_percent: Number(e.target.value) } }))}
                  className="w-16 border border-slate-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-violet-300"/>
              </div>
            </div>
            <div className="space-y-3">
              {form.quiz.questions.map((q, qi) => (
                <div key={qi} className="bg-slate-50 rounded-xl p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-bold text-slate-400 mt-2.5 w-5 flex-shrink-0">Q{qi+1}</span>
                    <input value={q.text}
                      onChange={e => setForm(f => ({ ...f, quiz: { ...f.quiz, questions: f.quiz.questions.map((qq, i) => i===qi ? {...qq, text: e.target.value} : qq) } }))}
                      placeholder="Question text"
                      className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"/>
                    <button onClick={() => setForm(f => ({ ...f, quiz: { ...f.quiz, questions: f.quiz.questions.filter((_,i) => i!==qi) } }))}
                      className="text-red-400 hover:text-red-600 mt-2"><X size={14}/></button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pl-7">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <input type="radio" name={`correct-${qi}`} checked={q.correct_index === oi}
                          onChange={() => setForm(f => ({ ...f, quiz: { ...f.quiz, questions: f.quiz.questions.map((qq,i) => i===qi ? {...qq, correct_index: oi} : qq) } }))}
                          className="accent-emerald-600 flex-shrink-0"/>
                        <input value={opt}
                          onChange={e => setForm(f => ({ ...f, quiz: { ...f.quiz, questions: f.quiz.questions.map((qq,i) => i===qi ? {...qq, options: qq.options.map((o,j) => j===oi ? e.target.value : o)} : qq) } }))}
                          placeholder={`Option ${oi+1}`}
                          className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"/>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 pl-7">Select the radio button next to the correct answer</p>
                </div>
              ))}
              <button
                onClick={() => setForm(f => ({ ...f, quiz: { ...f.quiz, questions: [...f.quiz.questions, { text: '', options: ['','','',''], correct_index: 0, marks: 1 }] } }))}
                className="flex items-center gap-2 text-violet-600 font-bold text-sm hover:text-violet-700 transition-colors">
                <Plus size={15}/> Add Question
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-60">
              <Save size={16}/> {saving ? 'Saving...' : 'Save Module'}
            </button>
            <button onClick={closeForm} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Complete dialog */}
      {completeDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-extrabold text-slate-800 mb-1">Complete Module</h3>
            <p className="text-sm text-slate-500 mb-4">"{completeDialog.title}"</p>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Teacher Notes (optional)</label>
            <textarea value={completeNotes} onChange={e => setCompleteNotes(e.target.value)}
              rows={3} placeholder="Feedback, key takeaways..."
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none mb-3"/>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-4 cursor-pointer">
              <input type="checkbox" checked={notesVisible} onChange={e => setNotesVisible(e.target.checked)}
                className="w-4 h-4 accent-emerald-600"/>
              Show notes to student
            </label>
            <div className="flex gap-3">
              <button onClick={handleComplete}
                className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-colors">
                Mark Complete
              </button>
              <button onClick={() => setCompleteDialog(null)}
                className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl font-bold hover:bg-slate-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Module list */}
      {modules.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
          <BookOpen size={40} className="text-slate-200 mx-auto mb-3"/>
          <p className="text-slate-400 font-medium">No modules yet. Add your first module above.</p>
        </div>
      ) : (
        <div className="space-y-0">
          <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-4">Module Timeline</h3>
          {modules.map((mod, idx) => {
            const isCompleted = mod.status === 'completed';
            const isInProgress = mod.status === 'in_progress';
            const isUpcoming = mod.status === 'upcoming';
            const isLast = idx === modules.length - 1;

            return (
              <div key={mod._id} className="relative flex gap-4">
                {!isLast && (
                  <div className={`absolute left-[18px] top-10 bottom-0 w-0.5 ${isCompleted ? 'bg-emerald-200' : 'bg-slate-100'}`}/>
                )}
                <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center z-10 border-2 mt-1 ${
                  isCompleted  ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-200' :
                  isInProgress ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200' :
                  'bg-white border-slate-200 text-slate-300'
                }`}>
                  {isCompleted ? <CheckCircle2 size={16}/> : isInProgress ? <Play size={14}/> : <Lock size={13}/>}
                </div>

                <div className={`flex-1 mb-4 rounded-2xl border overflow-hidden ${
                  isCompleted  ? 'bg-emerald-50 border-emerald-100' :
                  isInProgress ? 'bg-indigo-50 border-indigo-200 shadow-lg shadow-indigo-100/50' :
                  'bg-white border-slate-100'
                }`}>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-400">#{mod.order}</span>
                          <h4 className="font-extrabold text-slate-800">{mod.title}</h4>
                          {isInProgress && (
                            <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block"/> LIVE
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${TYPE_COLORS[mod.type] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                            {mod.type}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium flex items-center gap-0.5">
                            <Clock size={9}/> {mod.duration_days}d
                          </span>
                          {isCompleted && mod.completed_date && (
                            <span className="text-[10px] text-emerald-600 font-bold">
                              Done {new Date(mod.completed_date).toLocaleDateString()}
                            </span>
                          )}
                          {isInProgress && mod.started_date && (
                            <span className="text-[10px] text-indigo-600 font-bold">
                              Started {new Date(mod.started_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                        {isUpcoming && (
                          <button onClick={() => handleStart(mod._id)}
                            className="text-[11px] bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-700 transition-colors flex items-center gap-1">
                            <Play size={10}/> Start
                          </button>
                        )}
                        {(isInProgress || isCompleted === false) && !isUpcoming && (
                          <button onClick={() => openComplete(mod)}
                            className="text-[11px] bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-emerald-700 transition-colors flex items-center gap-1">
                            <CheckCircle2 size={10}/> Complete
                          </button>
                        )}
                        {isCompleted && (
                          <button onClick={() => openComplete(mod)}
                            className="text-[11px] bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg font-bold hover:bg-slate-200 transition-colors flex items-center gap-1">
                            <FileText size={10}/> Notes
                          </button>
                        )}
                        {!isUpcoming && (
                          <button onClick={() => handleReset(mod._id)}
                            className="text-[11px] bg-amber-50 text-amber-600 px-2.5 py-1.5 rounded-lg font-bold hover:bg-amber-100 transition-colors">
                            <RotateCcw size={12}/>
                          </button>
                        )}
                        <button onClick={() => openEdit(mod)}
                          className="text-[11px] bg-slate-100 text-slate-600 px-2.5 py-1.5 rounded-lg font-bold hover:bg-slate-200 transition-colors">
                          <Edit2 size={12}/>
                        </button>
                        <div className="flex flex-col gap-0.5">
                          {idx > 0 && (
                            <button onClick={() => handleMove(mod._id, 'up')}
                              className="text-slate-400 hover:text-slate-700 transition-colors p-0.5">
                              <ChevronUp size={14}/>
                            </button>
                          )}
                          {!isLast && (
                            <button onClick={() => handleMove(mod._id, 'down')}
                              className="text-slate-400 hover:text-slate-700 transition-colors p-0.5">
                              <ChevronDown size={14}/>
                            </button>
                          )}
                        </div>
                        {isUpcoming && (
                          <button onClick={() => handleDelete(mod)}
                            className="text-[11px] bg-red-50 text-red-400 px-2.5 py-1.5 rounded-lg font-bold hover:bg-red-100 hover:text-red-600 transition-colors">
                            <Trash2 size={12}/>
                          </button>
                        )}
                      </div>
                    </div>

                    {mod.description && (
                      <p className="text-xs text-slate-500 mt-2 leading-relaxed">{mod.description}</p>
                    )}

                    {isCompleted && mod.teacher_notes && (
                      <div className="mt-3 bg-white rounded-xl p-3 border border-emerald-200">
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1 flex items-center gap-1">
                          <FileText size={9}/> Notes {!mod.notes_visible && <span className="text-slate-400">(hidden from student)</span>}
                        </p>
                        <p className="text-xs text-slate-600 leading-relaxed">{mod.teacher_notes}</p>
                      </div>
                    )}

                    {mod.resources?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {mod.resources.map((r, i) => (
                          r.url
                            ? <a key={i} href={r.url} target="_blank" rel="noreferrer"
                                className="text-[10px] bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-colors">
                                <Link2 size={9}/>{r.title}
                              </a>
                            : <span key={i} className="text-[10px] bg-white border border-slate-200 text-slate-500 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1">
                                <Link2 size={9}/>{r.title}
                              </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TeacherCourses;
