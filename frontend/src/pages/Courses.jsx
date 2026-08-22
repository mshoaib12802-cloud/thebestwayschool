import { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { confirm } from '../utils/confirm';
import {
  BookOpen, Plus, Edit2, Trash2, X, Clock,
  Layers, CheckCircle2, Play, ChevronUp, ChevronDown,
  RotateCcw, FileText, Link2, AlertTriangle, Pencil, Save,
  ArrowRight, BarChart2, TrendingUp, Users
} from 'lucide-react';
import RupeeIcon from '../components/RupeeIcon';
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
      <p className="text-violet-600 font-bold">Avg: {payload[0].value}%</p>
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

const DURATIONS = ['1 Month', '3 Months', '6 Months', '1 Year', '2 Years'];
const MODULE_TYPES = [
  { value: 'theory', label: 'Theory', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'practical', label: 'Practical', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { value: 'project', label: 'Project', color: 'bg-violet-100 text-violet-700 border-violet-200' },
  { value: 'assessment', label: 'Assessment', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'workshop', label: 'Workshop', color: 'bg-rose-100 text-rose-700 border-rose-200' },
];

const typeStyle = (type) => MODULE_TYPES.find(t => t.value === type)?.color || 'bg-slate-100 text-slate-600 border-slate-200';

const emptyForm = { name: '', duration: '3 Months', total_fee: '', monthly_fee: '' };
const emptyModuleForm = { title: '', description: '', type: 'theory', duration_days: 3, resources: [], video_url: '', video_title: '', video_duration_mins: '', quiz: { pass_percent: 70, questions: [] } };

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

const Courses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  // Module stats for cards
  const [moduleStats, setModuleStats] = useState({}); // { courseId: {total, completed, in_progress} }

  // Module panel
  const [modulePanel, setModulePanel] = useState(null); // course object
  const [modules, setModules] = useState([]);
  const [modulesLoading, setModulesLoading] = useState(false);

  // Add / Edit module form
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [editModuleId, setEditModuleId] = useState(null);
  const [moduleForm, setModuleForm] = useState(emptyModuleForm);
  const [resourceInput, setResourceInput] = useState({ title: '', url: '' });

  // Complete dialog
  const [completeTarget, setCompleteTarget] = useState(null);
  const [completeNotes, setCompleteNotes] = useState('');
  const [completeNotesVisible, setCompleteNotesVisible] = useState(true);

  // Panel analytics
  const [panelExams, setPanelExams] = useState([]);
  const [panelAnalyticsMap, setPanelAnalyticsMap] = useState({});
  const [panelAnalyticsOpen, setPanelAnalyticsOpen] = useState(false);
  const [panelAnalyticsLoading, setPanelAnalyticsLoading] = useState(false);

  useEffect(() => { fetchCourses(); fetchModuleStats(); }, []);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/courses');
      setCourses(data);
    } catch { toast.error('Failed to load courses'); }
    finally { setLoading(false); }
  };

  const fetchModuleStats = async () => {
    try {
      const { data } = await api.get('/course-modules/stats');
      const map = {};
      data.forEach(s => { map[s._id] = s; });
      setModuleStats(map);
    } catch {}
  };

  const fetchModules = async (courseId) => {
    setModulesLoading(true);
    try {
      const { data } = await api.get(`/course-modules/${courseId}`);
      setModules(data);
    } catch { toast.error('Failed to load modules'); }
    finally { setModulesLoading(false); }
  };

  const openModulePanel = (course) => {
    setModulePanel(course);
    setShowModuleForm(false);
    setEditModuleId(null);
    setModuleForm(emptyModuleForm);
    setPanelExams([]);
    setPanelAnalyticsMap({});
    setPanelAnalyticsOpen(false);
    fetchModules(course._id);
    api.get('/exams').then(r => {
      setPanelExams(r.data.filter(e => e.course_name === course.name));
    }).catch(() => {});
  };

  const loadPanelAnalytics = async () => {
    const examsWithResults = panelExams.filter(e => e.result_count > 0);
    if (examsWithResults.length === 0) { setPanelAnalyticsOpen(true); return; }
    setPanelAnalyticsLoading(true);
    const newMap = {};
    await Promise.all(examsWithResults.map(async e => {
      try {
        const { data } = await api.get(`/exams/${e._id}/analytics`);
        newMap[e._id] = data;
      } catch {}
    }));
    setPanelAnalyticsMap(newMap);
    setPanelAnalyticsLoading(false);
    setPanelAnalyticsOpen(true);
  };

  // --- Course CRUD ---
  const openAdd = () => { setEditId(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (c) => { setEditId(c._id); setForm({ name: c.name, duration: c.duration, total_fee: c.total_fee, monthly_fee: c.monthly_fee }); setShowModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) { await api.put(`/courses/${editId}`, form); toast.success('Course updated'); }
      else { await api.post('/courses/add', form); toast.success('Course added'); }
      setShowModal(false);
      fetchCourses();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (id) => {
    if (!await confirm('Delete this course? All its modules will also be deleted.', { title: 'Delete Course' })) return;
    try { await api.delete(`/courses/${id}`); toast.success('Course deleted'); fetchCourses(); fetchModuleStats(); }
    catch { toast.error('Delete failed'); }
  };

  // --- Module CRUD ---
  const openAddModule = () => {
    setEditModuleId(null);
    setModuleForm(emptyModuleForm);
    setResourceInput({ title: '', url: '' });
    setShowModuleForm(true);
  };

  const openEditModule = (mod) => {
    setEditModuleId(mod._id);
    setModuleForm({
      title: mod.title, description: mod.description || '',
      type: mod.type, duration_days: mod.duration_days,
      resources: mod.resources || [],
      video_url: mod.video_url || '', video_title: mod.video_title || '',
      video_duration_mins: mod.video_duration_mins || '',
      quiz: mod.quiz || { pass_percent: 70, questions: [] },
    });
    setResourceInput({ title: '', url: '' });
    setShowModuleForm(true);
  };

  const addResource = () => {
    if (!resourceInput.title.trim()) return;
    setModuleForm(f => ({ ...f, resources: [...f.resources, { ...resourceInput }] }));
    setResourceInput({ title: '', url: '' });
  };

  const removeResource = (i) => {
    setModuleForm(f => ({ ...f, resources: f.resources.filter((_, idx) => idx !== i) }));
  };

  const handleModuleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...moduleForm, video_url: toEmbedUrl(moduleForm.video_url) };
    try {
      if (editModuleId) {
        await api.put(`/course-modules/${editModuleId}`, payload);
        toast.success('Module updated');
      } else {
        await api.post(`/course-modules/${modulePanel._id}`, payload);
        toast.success('Module added');
      }
      setShowModuleForm(false);
      setEditModuleId(null);
      fetchModules(modulePanel._id);
      fetchModuleStats();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDeleteModule = async (id) => {
    if (!await confirm('Delete this module?', { title: 'Delete Module' })) return;
    try {
      await api.delete(`/course-modules/${id}`);
      toast.success('Module deleted');
      fetchModules(modulePanel._id);
      fetchModuleStats();
    } catch (err) { toast.error(err.response?.data?.message || 'Delete failed'); }
  };

  const handleStartModule = async (id) => {
    try {
      await api.put(`/course-modules/${id}/start`);
      toast.success('Module started!');
      fetchModules(modulePanel._id);
      fetchModuleStats();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleCompleteModule = async () => {
    try {
      await api.put(`/course-modules/${completeTarget}/complete`, {
        teacher_notes: completeNotes,
        notes_visible: completeNotesVisible
      });
      toast.success('Module marked as complete!');
      setCompleteTarget(null);
      setCompleteNotes('');
      fetchModules(modulePanel._id);
      fetchModuleStats();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleResetModule = async (id) => {
    if (!await confirm('Reset this module back to upcoming?', { title: 'Reset Module', confirmText: 'Reset', danger: false })) return;
    try {
      await api.put(`/course-modules/${id}/reset`);
      toast.success('Module reset');
      fetchModules(modulePanel._id);
      fetchModuleStats();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleMove = async (id, direction) => {
    try {
      await api.put(`/course-modules/${id}/move`, { direction });
      fetchModules(modulePanel._id);
    } catch (err) { toast.error(err.response?.data?.message || 'Cannot move further'); }
  };

  // Derived
  const completedCount = modules.filter(m => m.status === 'completed').length;
  const inProgressCount = modules.filter(m => m.status === 'in_progress').length;
  const progressPct = modules.length > 0 ? Math.round((completedCount / modules.length) * 100) : 0;

  const totalDurationDays = modules.reduce((s, m) => s + (m.duration_days || 0), 0);
  const remainingDays = modules.filter(m => m.status !== 'completed').reduce((s, m) => s + (m.duration_days || 0), 0);

  return (
    <div className="space-y-8 animate-fade-in-up pb-12">

      {/* Header */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 flex items-center gap-3">
            <div className="p-3 bg-violet-50 text-violet-600 rounded-2xl"><BookOpen size={28}/></div>
            Course Catalog
          </h2>
          <p className="text-slate-500 mt-1 ml-1 font-medium">Define courses, add modules, track learning progress.</p>
        </div>
        <button onClick={openAdd} className="bg-violet-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-violet-200 hover:bg-violet-700 hover:-translate-y-1 transition-all flex items-center gap-2">
          <Plus size={20}/> Add Course
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-violet-500 to-violet-600 p-6 rounded-[2rem] text-white shadow-xl shadow-violet-200">
          <p className="text-xs font-bold uppercase tracking-wider opacity-80 mb-1">Total Courses</p>
          <p className="text-4xl font-extrabold">{courses.length}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Total Enrolled</p>
          <p className="text-4xl font-extrabold text-indigo-600">
            {courses.reduce((s, c) => s + (c.student_count || 0), 0)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Total Modules</p>
          <p className="text-4xl font-extrabold text-emerald-600">
            {Object.values(moduleStats).reduce((s, v) => s + (v.total || 0), 0)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Avg. Total Fee</p>
          <p className="text-4xl font-extrabold text-slate-800">
            Rs. {courses.length ? Math.round(courses.reduce((s, c) => s + c.total_fee, 0) / courses.length).toLocaleString() : 0}
          </p>
        </div>
      </div>

      {/* Course Grid */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 font-medium">Loading...</div>
      ) : courses.length === 0 ? (
        <div className="bg-white rounded-[2rem] p-16 text-center text-slate-400 border border-slate-100 shadow-sm">
          <BookOpen size={40} className="mx-auto mb-3 opacity-30"/>
          <p className="font-medium">No courses yet. Add your first course.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(c => {
            const stats = moduleStats[c._id] || { total: 0, completed: 0, in_progress: 0 };
            const pct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
            return (
              <div key={c._id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all relative overflow-hidden flex flex-col">
                <div className="absolute top-0 left-0 w-full h-20 bg-violet-500/5"/>

                <div className="relative flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center font-extrabold text-lg">
                    {c.name.charAt(0)}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(c)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"><Edit2 size={16}/></button>
                    <button onClick={() => handleDelete(c._id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"><Trash2 size={16}/></button>
                  </div>
                </div>

                <h3 className="text-xl font-extrabold text-slate-800 mb-1">{c.name}</h3>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                    <Clock size={14}/> {c.duration}
                  </div>
                  <span className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full">
                    <Users size={12}/> {c.student_count ?? 0} enrolled
                  </span>
                </div>

                {/* Module progress mini bar */}
                {stats.total > 0 ? (
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-bold text-slate-500 flex items-center gap-1"><Layers size={11}/> {stats.completed}/{stats.total} modules</span>
                      <span className="text-xs font-bold text-violet-600">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          background: pct === 100 ? '#10b981' : '#7c3aed'
                        }}
                      />
                    </div>
                    {stats.in_progress > 0 && (
                      <p className="text-[10px] text-blue-500 font-bold mt-1 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse inline-block"/>
                        {stats.in_progress} module in progress
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mb-4">
                    <p className="text-[11px] text-slate-300 font-medium flex items-center gap-1"><Layers size={11}/> No modules yet</p>
                  </div>
                )}

                <div className="border-t border-slate-100 pt-4 grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Monthly</p>
                    <p className="font-extrabold text-slate-800">Rs. {c.monthly_fee?.toLocaleString()}</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Total Fee</p>
                    <p className="font-extrabold text-slate-800">Rs. {c.total_fee?.toLocaleString()}</p>
                  </div>
                </div>

                <button
                  onClick={() => openModulePanel(c)}
                  className="mt-auto w-full bg-violet-50 hover:bg-violet-100 text-violet-700 py-2.5 rounded-xl font-bold text-sm border border-violet-100 transition-all flex items-center justify-center gap-2"
                >
                  <Layers size={15}/> Manage Modules {stats.total > 0 && <span className="bg-violet-200 text-violet-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">{stats.total}</span>}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== MODULE PANEL (slide-over) ===== */}
      {modulePanel && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="flex-1 bg-slate-900/50 backdrop-blur-sm" onClick={() => { setModulePanel(null); setShowModuleForm(false); }}/>
          <div className="w-full max-w-2xl bg-white h-full flex flex-col shadow-2xl overflow-hidden">

            {/* Panel Header */}
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-violet-600 to-indigo-600 text-white shrink-0">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-violet-200 text-xs font-bold uppercase tracking-widest mb-1">Course Modules</p>
                  <h3 className="text-2xl font-extrabold">{modulePanel.name}</h3>
                  <p className="text-violet-200 text-sm font-medium mt-1">{modulePanel.duration} • {modules.length} modules</p>
                </div>
                <button onClick={() => { setModulePanel(null); setShowModuleForm(false); }} className="p-2 rounded-full hover:bg-white/20 transition-colors"><X size={22}/></button>
              </div>

              {/* Progress Bar */}
              {modules.length > 0 && (
                <div>
                  <div className="flex justify-between text-xs font-bold text-violet-200 mb-2">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 size={12}/> {completedCount} completed
                      {inProgressCount > 0 && <span className="ml-2 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-300 animate-pulse inline-block"/>{inProgressCount} in progress</span>}
                    </span>
                    <span className="text-white font-extrabold">{progressPct}%</span>
                  </div>
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${progressPct}%`, background: progressPct === 100 ? '#10b981' : 'white' }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-violet-300 mt-1.5 font-medium">
                    <span>Total duration: {totalDurationDays} days</span>
                    <span>{remainingDays} days remaining</span>
                  </div>
                </div>
              )}
            </div>

            {/* Module List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {modulesLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"/>
                </div>
              ) : modules.length === 0 && !showModuleForm ? (
                <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl">
                  <Layers size={36} className="mx-auto text-slate-300 mb-3"/>
                  <p className="font-bold text-slate-400">No modules yet</p>
                  <p className="text-sm text-slate-300 mt-1">Click "Add Module" to define the curriculum</p>
                </div>
              ) : (
                modules.map((mod, idx) => (
                  <div
                    key={mod._id}
                    className={`rounded-2xl border transition-all ${
                      mod.status === 'completed' ? 'bg-emerald-50 border-emerald-100' :
                      mod.status === 'in_progress' ? 'bg-blue-50 border-blue-200 shadow-md shadow-blue-100' :
                      'bg-white border-slate-100'
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Status icon */}
                        <div className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center font-extrabold text-sm border-2 ${
                          mod.status === 'completed' ? 'bg-emerald-500 border-emerald-500 text-white' :
                          mod.status === 'in_progress' ? 'bg-blue-600 border-blue-600 text-white' :
                          'bg-white border-slate-200 text-slate-400'
                        }`}>
                          {mod.status === 'completed' ? <CheckCircle2 size={16}/> :
                           mod.status === 'in_progress' ? <Play size={14}/> :
                           <span>{mod.order}</span>}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-extrabold text-slate-800">{mod.title}</h4>
                            {mod.status === 'in_progress' && (
                              <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">LIVE</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${typeStyle(mod.type)}`}>{mod.type}</span>
                            <span className="text-[10px] text-slate-400 font-medium">{mod.duration_days}d</span>
                            {mod.status === 'completed' && mod.completed_date && (
                              <span className="text-[10px] text-emerald-600 font-bold">Done {new Date(mod.completed_date).toLocaleDateString()}</span>
                            )}
                            {mod.status === 'in_progress' && mod.started_date && (
                              <span className="text-[10px] text-blue-600 font-bold">
                                Started {new Date(mod.started_date).toLocaleDateString()}
                                {' • '}{Math.floor((Date.now() - new Date(mod.started_date)) / 86400000)} days ago
                              </span>
                            )}
                          </div>
                          {mod.description && (
                            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{mod.description}</p>
                          )}
                          {mod.status === 'completed' && mod.teacher_notes && (
                            <div className="mt-2 bg-white/70 rounded-xl p-2.5 border border-emerald-200">
                              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-0.5 flex items-center gap-1">
                                <FileText size={9}/> Teacher Notes {!mod.notes_visible && '(Private)'}
                              </p>
                              <p className="text-xs text-slate-600 leading-relaxed">{mod.teacher_notes}</p>
                            </div>
                          )}
                          {mod.resources?.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {mod.resources.map((r, i) => (
                                <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-lg font-medium flex items-center gap-1 border border-slate-200">
                                  <Link2 size={9}/> {r.title}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-1 shrink-0">
                          {/* Move buttons */}
                          <div className="flex gap-1">
                            <button onClick={() => handleMove(mod._id, 'up')} disabled={idx === 0} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 disabled:opacity-20 transition-colors"><ChevronUp size={14}/></button>
                            <button onClick={() => handleMove(mod._id, 'down')} disabled={idx === modules.length - 1} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 disabled:opacity-20 transition-colors"><ChevronDown size={14}/></button>
                          </div>
                          {/* Action buttons */}
                          <div className="flex gap-1">
                            {mod.status === 'upcoming' && (
                              <button onClick={() => handleStartModule(mod._id)} title="Start module" className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"><Play size={13}/></button>
                            )}
                            {mod.status === 'in_progress' && (
                              <button onClick={() => { setCompleteTarget(mod._id); setCompleteNotes(''); setCompleteNotesVisible(true); }} title="Mark complete" className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-colors"><CheckCircle2 size={13}/></button>
                            )}
                            {mod.status !== 'upcoming' && (
                              <button onClick={() => handleResetModule(mod._id)} title="Reset to upcoming" className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-500 transition-colors"><RotateCcw size={13}/></button>
                            )}
                            <button onClick={() => openEditModule(mod)} title="Edit module" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"><Pencil size={13}/></button>
                            <button onClick={() => handleDeleteModule(mod._id)} title="Delete" className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={13}/></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}

              {/* Add/Edit Module Form */}
              {showModuleForm && (
                <div className="bg-violet-50 rounded-2xl border border-violet-200 p-5">
                  <h4 className="font-extrabold text-slate-700 mb-4 flex items-center gap-2">
                    <Plus size={16} className="text-violet-600"/> {editModuleId ? 'Edit Module' : 'Add New Module'}
                  </h4>
                  <form onSubmit={handleModuleSubmit} className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Module Title *</label>
                      <input required className="form-input font-bold text-slate-700 w-full" placeholder="e.g. Introduction to HTML" value={moduleForm.title} onChange={e => setModuleForm(f => ({ ...f, title: e.target.value }))}/>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Description</label>
                      <textarea rows={2} className="form-input font-medium text-slate-700 w-full resize-none" placeholder="What will students learn in this module?" value={moduleForm.description} onChange={e => setModuleForm(f => ({ ...f, description: e.target.value }))}/>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Type</label>
                        <select className="form-select font-bold text-slate-700 w-full" value={moduleForm.type} onChange={e => setModuleForm(f => ({ ...f, type: e.target.value }))}>
                          {MODULE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Duration (days)</label>
                        <input type="number" min="1" className="form-input font-bold text-slate-700 w-full" value={moduleForm.duration_days} onChange={e => setModuleForm(f => ({ ...f, duration_days: Number(e.target.value) }))}/>
                      </div>
                    </div>

                    {/* Resources */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Resources / References</label>
                      {moduleForm.resources.map((r, i) => (
                        <div key={i} className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs bg-white px-2 py-1 rounded-lg border border-slate-200 font-medium text-slate-600 flex-1 truncate">{r.title}{r.url && ` — ${r.url}`}</span>
                          <button type="button" onClick={() => removeResource(i)} className="p-1 text-slate-300 hover:text-rose-500 transition-colors"><X size={13}/></button>
                        </div>
                      ))}
                      <div className="flex gap-2 mt-1">
                        <input className="form-input text-xs font-medium text-slate-700 flex-1" placeholder="Resource name" value={resourceInput.title} onChange={e => setResourceInput(r => ({ ...r, title: e.target.value }))}/>
                        <input className="form-input text-xs font-medium text-slate-700 w-36" placeholder="URL (optional)" value={resourceInput.url} onChange={e => setResourceInput(r => ({ ...r, url: e.target.value }))}/>
                        <button type="button" onClick={addResource} className="px-3 py-2 bg-violet-600 text-white rounded-xl text-xs font-bold hover:bg-violet-700 transition-colors flex items-center gap-1"><Plus size={12}/></button>
                      </div>
                    </div>

                    {/* Video Lesson */}
                    <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                        <ArrowRight size={10} className="text-red-500"/> Video Lesson
                      </p>
                      <input value={moduleForm.video_url}
                        onChange={e => setModuleForm(f => ({ ...f, video_url: e.target.value }))}
                        placeholder="YouTube, Vimeo, Google Drive, Loom, or any embed URL"
                        className="form-input text-xs font-medium text-slate-700 w-full"/>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        Supports: YouTube (youtu.be/… or watch?v=…), Vimeo, Google Drive share link, Loom share link, or any direct iframe embed URL.
                      </p>
                      <div className="flex gap-2">
                        <input value={moduleForm.video_title}
                          onChange={e => setModuleForm(f => ({ ...f, video_title: e.target.value }))}
                          placeholder="Video title (optional)"
                          className="form-input text-xs font-medium text-slate-700 flex-1"/>
                        <input type="number" min="0" value={moduleForm.video_duration_mins}
                          onChange={e => setModuleForm(f => ({ ...f, video_duration_mins: e.target.value }))}
                          placeholder="Duration (mins)"
                          className="form-input text-xs font-medium text-slate-700 w-32"/>
                      </div>
                      {/* Live preview */}
                      {moduleForm.video_url && (
                        <div className="mt-1">
                          <p className="text-[10px] font-bold text-slate-400 mb-1">Preview:</p>
                          <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ paddingBottom: '56.25%' }}>
                            <iframe
                              src={toEmbedUrl(moduleForm.video_url)}
                              title="Video preview"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              className="absolute inset-0 w-full h-full border-0"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Quiz Builder */}
                    <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                          <AlertTriangle size={10} className="text-violet-500"/> Post-Video Quiz
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-bold">Pass %</span>
                          <input type="number" min="1" max="100"
                            value={moduleForm.quiz.pass_percent}
                            onChange={e => setModuleForm(f => ({ ...f, quiz: { ...f.quiz, pass_percent: Number(e.target.value) } }))}
                            className="w-14 border border-slate-200 rounded-lg px-2 py-1 text-xs text-center bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"/>
                        </div>
                      </div>
                      {moduleForm.quiz.questions.map((q, qi) => (
                        <div key={qi} className="bg-white rounded-xl p-3 space-y-2 border border-slate-200">
                          <div className="flex items-start gap-2">
                            <span className="text-[10px] font-bold text-slate-400 mt-2 w-5 flex-shrink-0">Q{qi+1}</span>
                            <input value={q.text}
                              onChange={e => setModuleForm(f => ({ ...f, quiz: { ...f.quiz, questions: f.quiz.questions.map((qq,i) => i===qi ? {...qq, text: e.target.value} : qq) } }))}
                              placeholder="Question"
                              className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"/>
                            <button type="button" onClick={() => setModuleForm(f => ({ ...f, quiz: { ...f.quiz, questions: f.quiz.questions.filter((_,i) => i!==qi) } }))}
                              className="text-red-400 hover:text-red-600 mt-1.5"><X size={12}/></button>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5 pl-7">
                            {q.options.map((opt, oi) => (
                              <div key={oi} className="flex items-center gap-1.5">
                                <input type="radio" name={`correct-adm-${qi}`} checked={q.correct_index === oi}
                                  onChange={() => setModuleForm(f => ({ ...f, quiz: { ...f.quiz, questions: f.quiz.questions.map((qq,i) => i===qi ? {...qq, correct_index: oi} : qq) } }))}
                                  className="accent-violet-600 flex-shrink-0"/>
                                <input value={opt}
                                  onChange={e => setModuleForm(f => ({ ...f, quiz: { ...f.quiz, questions: f.quiz.questions.map((qq,i) => i===qi ? {...qq, options: qq.options.map((o,j) => j===oi ? e.target.value : o)} : qq) } }))}
                                  placeholder={`Option ${oi+1}`}
                                  className="flex-1 border border-slate-200 rounded-lg px-2 py-1 text-[11px] bg-white focus:outline-none"/>
                              </div>
                            ))}
                          </div>
                          <p className="text-[9px] text-slate-400 pl-7">Select radio = correct answer</p>
                        </div>
                      ))}
                      <button type="button"
                        onClick={() => setModuleForm(f => ({ ...f, quiz: { ...f.quiz, questions: [...f.quiz.questions, { text: '', options: ['','','',''], correct_index: 0, marks: 1 }] } }))}
                        className="flex items-center gap-1 text-violet-600 font-bold text-xs hover:text-violet-700">
                        <Plus size={12}/> Add Question
                      </button>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button type="button" onClick={() => { setShowModuleForm(false); setEditModuleId(null); }} className="flex-1 py-2.5 border border-slate-200 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
                      <button type="submit" className="flex-1 py-2.5 bg-violet-600 text-white rounded-xl font-bold text-sm hover:bg-violet-700 shadow-md transition-colors flex items-center justify-center gap-2">
                        <Save size={14}/> {editModuleId ? 'Save Changes' : 'Add Module'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* Course Analytics section */}
            {panelExams.length > 0 && (() => {
              const examsWithResults = panelExams.filter(e => e.result_count > 0);
              const trendData = examsWithResults
                .sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date))
                .map(e => {
                  const a = panelAnalyticsMap[e._id];
                  return {
                    name: e.title.length > 14 ? e.title.slice(0, 14) + '…' : e.title,
                    avg: a ? Math.round((a.average / e.total_marks) * 100) : null,
                    pass: a?.passRate ?? null,
                  };
                })
                .filter(d => d.avg !== null);

              const combinedGrades = { 'A+': 0, A: 0, B: 0, C: 0, D: 0, F: 0 };
              Object.values(panelAnalyticsMap).forEach(a => {
                if (a?.gradeBreakdown) {
                  Object.keys(combinedGrades).forEach(g => { combinedGrades[g] += a.gradeBreakdown[g] || 0; });
                }
              });
              const gradeData = Object.entries(combinedGrades).map(([grade, count]) => ({ grade, count }));
              const hasGrades = gradeData.some(d => d.count > 0);

              return (
                <div className="border-t border-slate-100">
                  <button
                    onClick={() => panelAnalyticsOpen ? setPanelAnalyticsOpen(false) : loadPanelAnalytics()}
                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors">
                    <span className="font-bold text-slate-700 flex items-center gap-2 text-sm">
                      <BarChart2 size={16} className="text-violet-500"/> Exam Analytics
                      <span className="text-xs text-slate-400 font-normal">· {panelExams.length} exam{panelExams.length !== 1 ? 's' : ''}, {examsWithResults.length} with results</span>
                    </span>
                    {panelAnalyticsOpen ? <ChevronUp size={15} className="text-slate-400"/> : <ChevronDown size={15} className="text-slate-400"/>}
                  </button>

                  {panelAnalyticsOpen && (
                    <div className="px-6 pb-5 space-y-5">
                      {panelAnalyticsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="w-7 h-7 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"/>
                        </div>
                      ) : examsWithResults.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-4">No results recorded for any exam in this course yet.</p>
                      ) : (
                        <>
                          {trendData.length >= 2 && (
                            <div>
                              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                <TrendingUp size={12}/> Class Average Trend
                              </p>
                              <ResponsiveContainer width="100%" height={170}>
                                <LineChart data={trendData} margin={{ top: 5, right: 15, left: -15, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false}/>
                                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} unit="%"/>
                                  <Tooltip content={<AvgTooltip/>}/>
                                  <ReferenceLine y={50} stroke="#fca5a5" strokeDasharray="4 2"/>
                                  <Line type="monotone" dataKey="avg" stroke="#7c3aed" strokeWidth={2.5}
                                    dot={{ fill: '#7c3aed', r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }}/>
                                  <Line type="monotone" dataKey="pass" stroke="#3b82f6" strokeWidth={1.5}
                                    strokeDasharray="4 2" dot={false}/>
                                </LineChart>
                              </ResponsiveContainer>
                              <div className="flex gap-4 justify-center mt-1">
                                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                                  <span className="w-3 h-0.5 bg-violet-600 inline-block rounded"/>Avg Score
                                </span>
                                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                                  <span className="w-3 h-0.5 bg-blue-400 inline-block rounded"/>Pass Rate
                                </span>
                              </div>
                            </div>
                          )}

                          {hasGrades && (
                            <div>
                              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                <BarChart2 size={12}/> Overall Grade Distribution
                              </p>
                              <ResponsiveContainer width="100%" height={150}>
                                <BarChart data={gradeData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                                  <XAxis dataKey="grade" tick={{ fontSize: 12, fontWeight: 700 }} tickLine={false} axisLine={false}/>
                                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false}/>
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

            {/* Panel Footer */}
            <div className="p-5 border-t border-slate-100 bg-slate-50 shrink-0 flex gap-3">
              {!showModuleForm ? (
                <button onClick={openAddModule} className="flex-1 bg-violet-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-violet-700 shadow-lg transition-all flex items-center justify-center gap-2">
                  <Plus size={16}/> Add Module
                </button>
              ) : null}
              <button onClick={() => { setModulePanel(null); setShowModuleForm(false); }} className="px-6 py-3 border border-slate-200 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-100 transition-colors">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== COMPLETE MODULE DIALOG ===== */}
      {completeTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-emerald-50 flex justify-between items-center">
              <h3 className="text-xl font-extrabold text-slate-800 flex items-center gap-2"><CheckCircle2 className="text-emerald-500"/> Mark Module Complete</h3>
              <button onClick={() => setCompleteTarget(null)} className="p-2 rounded-full hover:bg-rose-100 hover:text-rose-600 transition-colors"><X size={18}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Teacher Notes (optional)</label>
                <textarea
                  rows={4}
                  className="form-input font-medium text-slate-700 w-full resize-none"
                  placeholder="What was covered? Key takeaways, student performance notes..."
                  value={completeNotes}
                  onChange={e => setCompleteNotes(e.target.value)}
                />
              </div>
              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
                <input type="checkbox" checked={completeNotesVisible} onChange={e => setCompleteNotesVisible(e.target.checked)} className="w-4 h-4 accent-emerald-600"/>
                <div>
                  <p className="text-sm font-bold text-slate-700">Visible to students</p>
                  <p className="text-xs text-slate-400">Students will see these notes in their portal</p>
                </div>
              </label>
              <div className="flex gap-3">
                <button onClick={() => setCompleteTarget(null)} className="flex-1 py-3 rounded-xl font-bold text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all">Cancel</button>
                <button onClick={handleCompleteModule} className="flex-1 py-3 rounded-xl font-bold text-sm bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg transition-all flex items-center justify-center gap-2">
                  <CheckCircle2 size={15}/> Mark Complete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== COURSE ADD/EDIT MODAL ===== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                <BookOpen className="text-violet-600" size={22}/> {editId ? 'Edit Course' : 'New Course'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-full hover:bg-rose-100 hover:text-rose-600 transition-colors"><X size={20}/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Course Name</label>
                <input required className="form-input font-bold text-slate-700" placeholder="e.g. Web Development" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Duration</label>
                <select className="form-select font-bold text-slate-700" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })}>
                  {DURATIONS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Total Fee (Rs.)</label>
                  <input required type="number" min="0" className="form-input font-bold text-slate-700" placeholder="30000" value={form.total_fee} onChange={e => setForm({ ...form, total_fee: e.target.value })}/>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Monthly Fee (Rs.)</label>
                  <input required type="number" min="0" className="form-input font-bold text-slate-700" placeholder="5000" value={form.monthly_fee} onChange={e => setForm({ ...form, monthly_fee: e.target.value })}/>
                </div>
              </div>
              <button type="submit" className="w-full bg-violet-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-violet-200 hover:bg-violet-700 transition-all flex items-center justify-center gap-2">
                <RupeeIcon size={18}/> {editId ? 'Save Changes' : 'Create Course'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Courses;
