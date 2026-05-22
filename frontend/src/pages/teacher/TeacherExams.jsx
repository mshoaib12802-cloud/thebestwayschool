import { useState, useEffect } from 'react';
import api from '../../services/api';
import { confirm } from '../../utils/confirm';
import {
  Award, Plus, X, Save, Trash2, ChevronDown, ChevronUp,
  CheckCircle2, BarChart2, TrendingUp, Users, Eye, EyeOff, Edit3
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, LineChart, Line, ReferenceLine, Cell
} from 'recharts';

const GRADE_COLORS = {
  'A+': 'bg-emerald-100 text-emerald-700',
  'A':  'bg-emerald-100 text-emerald-600',
  'B':  'bg-blue-100 text-blue-700',
  'C':  'bg-amber-100 text-amber-700',
  'D':  'bg-orange-100 text-orange-700',
  'F':  'bg-red-100 text-red-700',
};

const GRADE_BAR_COLORS = {
  'A+': '#059669', A: '#10b981', B: '#3b82f6',
  C: '#f59e0b', D: '#f97316', F: '#ef4444',
};

const EMPTY_FORM = { title: '', course_name: '', exam_date: '', total_marks: 100, pass_marks: 50, description: '' };

const calcGradeLocal = (obtained, total) => {
  const pct = (obtained / total) * 100;
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';
  return 'F';
};

const StatCard = ({ label, value, color }) => (
  <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center shadow-sm">
    <p className="text-2xl font-extrabold" style={{ color }}>{value}</p>
    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">{label}</p>
  </div>
);

const CustomBarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-sm">
      <p className="font-bold text-slate-700">Grade {label}</p>
      <p className="text-slate-500">{payload[0].value} student{payload[0].value !== 1 ? 's' : ''}</p>
    </div>
  );
};

const CustomLineTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-bold text-slate-800 mb-1">{label}</p>
      <p className="text-violet-600 font-bold">{d.pct}%</p>
      <p className="text-slate-500">{d.marks} — Grade: <span className="font-bold">{d.grade}</span></p>
    </div>
  );
};

const TeacherExams = () => {
  const [exams, setExams] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [editExam, setEditExam] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [updating, setUpdating] = useState(false);
  const [activeExam, setActiveExam] = useState(null);
  const [examData, setExamData] = useState(null);
  const [marks, setMarks] = useState({});
  const [remarks, setRemarks] = useState({});
  const [savingResults, setSavingResults] = useState(false);
  const [tab, setTab] = useState('marks'); // 'marks' | 'analytics'
  const [studentTrend, setStudentTrend] = useState(null); // student_id for trend view

  const loadExams = () => {
    setLoading(true);
    api.get('/teacher-portal/exams')
      .then(r => setExams(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadExams();
    api.get('/teacher-portal/courses')
      .then(r => setCourses(r.data))
      .catch(() => {});
  }, []);

  const openResults = async (exam) => {
    if (activeExam === exam._id) { setActiveExam(null); setExamData(null); setTab('marks'); setStudentTrend(null); return; }
    setActiveExam(exam._id);
    setTab('marks');
    setStudentTrend(null);
    const { data } = await api.get(`/teacher-portal/exams/${exam._id}/results`);
    setExamData(data);
    const m = {}, rem = {};
    data.results.forEach(r => {
      m[r.student_id._id] = r.marks_obtained;
      rem[r.student_id._id] = r.remarks || '';
    });
    setMarks(m);
    setRemarks(rem);
  };

  const handleSaveResults = async () => {
    if (!examData) return;
    setSavingResults(true);
    const students = examData.students;
    await Promise.all(
      students
        .filter(s => marks[s._id] !== undefined && marks[s._id] !== '')
        .map(s => api.post('/teacher-portal/exams/results', {
          exam_id: activeExam,
          student_id: s._id,
          marks_obtained: Number(marks[s._id]),
          remarks: remarks[s._id] || ''
        }))
    );
    setSavingResults(false);
    const { data } = await api.get(`/teacher-portal/exams/${activeExam}/results`);
    setExamData(data);
    const m = {}, rem = {};
    data.results.forEach(r => {
      m[r.student_id._id] = r.marks_obtained;
      rem[r.student_id._id] = r.remarks || '';
    });
    setMarks(m);
    setRemarks(rem);
    loadExams();
  };

  const handleCreate = async () => {
    if (!form.title || !form.course_name || !form.exam_date) return alert('Fill all required fields');
    setSaving(true);
    try {
      await api.post('/teacher-portal/exams', form);
      setShowForm(false);
      setForm(EMPTY_FORM);
      loadExams();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!await confirm('Delete this exam and all its results?', { title: 'Delete Exam' })) return;
    await api.delete(`/teacher-portal/exams/${id}`);
    if (activeExam === id) { setActiveExam(null); setExamData(null); }
    if (editExam?._id === id) setEditExam(null);
    loadExams();
  };

  const openEditExam = (exam, e) => {
    e.stopPropagation();
    setEditExam(exam);
    setEditForm({
      title: exam.title,
      course_name: exam.course_name,
      exam_date: new Date(exam.exam_date).toISOString().split('T')[0],
      total_marks: exam.total_marks,
      pass_marks: exam.pass_marks || 0,
      description: exam.description || '',
    });
  };

  const handleUpdate = async () => {
    if (!editForm.title || !editForm.exam_date) return alert('Fill required fields');
    setUpdating(true);
    try {
      await api.put(`/exams/${editExam._id}`, editForm);
      setEditExam(null);
      loadExams();
      if (activeExam === editExam._id) {
        const { data } = await api.get(`/teacher-portal/exams/${editExam._id}/results`);
        setExamData(data);
      }
    } catch (err) { alert(err.response?.data?.message || 'Update failed'); }
    finally { setUpdating(false); }
  };

  // Build analytics from examData.results
  const buildAnalytics = (data) => {
    const results = data?.results || [];
    if (results.length === 0) return null;
    const total = data.exam.total_marks;
    const marks_list = results.map(r => r.marks_obtained);
    const average = Math.round(marks_list.reduce((a, b) => a + b, 0) / marks_list.length * 10) / 10;
    const highest = Math.max(...marks_list);
    const lowest = Math.min(...marks_list);
    const passCount = results.filter(r => r.grade && r.grade !== 'F').length;
    const passRate = Math.round((passCount / results.length) * 100);

    const gradeOrder = ['A+', 'A', 'B', 'C', 'D', 'F'];
    const gradeCounts = { 'A+': 0, A: 0, B: 0, C: 0, D: 0, F: 0 };
    results.forEach(r => {
      const g = r.grade || calcGradeLocal(r.marks_obtained, total);
      if (gradeCounts[g] !== undefined) gradeCounts[g]++;
    });
    const gradeData = gradeOrder.map(g => ({ grade: g, count: gradeCounts[g] }));

    const ranked = [...results]
      .sort((a, b) => b.marks_obtained - a.marks_obtained)
      .map((r, i) => ({
        rank: i + 1,
        name: r.student_id?.full_name || '—',
        roll: r.student_id?.roll_number || '—',
        id: r.student_id?._id,
        marks: r.marks_obtained,
        pct: Math.round((r.marks_obtained / total) * 100),
        grade: r.grade || calcGradeLocal(r.marks_obtained, total),
      }));

    return { average, highest, lowest, passCount, passRate, total, gradeData, ranked, count: results.length };
  };

  // Build per-student trend across all exams for this course
  const buildStudentTrendData = (studentId) => {
    if (!examData) return [];
    const courseName = examData.exam.course_name;
    const courseExams = exams
      .filter(e => e.course_name === courseName)
      .sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date));

    // We only have results loaded for the current exam; build from all exams data
    // Use exams list + marks from current exam only (for the selected student in current exam)
    // For a richer view, we'd need per-student results across exams — use what's available
    return null; // handled via dedicated fetch below
  };

  const [trendData, setTrendData] = useState([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const handlePublishToggle = async (exam) => {
    setPublishing(true);
    try {
      await api.patch(`/exams/${exam._id}/publish`);
      // Update local exams list to reflect new published state
      setExams(prev => prev.map(e => e._id === exam._id ? { ...e, is_published: !e.is_published } : e));
      // Refresh exam data if this exam is currently open
      if (activeExam === exam._id) {
        const { data } = await api.get(`/teacher-portal/exams/${exam._id}/results`);
        setExamData(data);
      }
    } catch {}
    setPublishing(false);
  };

  const openStudentTrend = async (studentId) => {
    if (studentTrend === studentId) { setStudentTrend(null); setTrendData([]); return; }
    setStudentTrend(studentId);
    setTrendLoading(true);
    try {
      const { data } = await api.get(`/exams/student/${studentId}/results`);
      const courseName = examData?.exam?.course_name;
      const filtered = data
        .filter(r => r.exam_id && (!courseName || r.exam_id.course_name === courseName))
        .sort((a, b) => new Date(a.exam_id.exam_date) - new Date(b.exam_id.exam_date))
        .map(r => ({
          name: r.exam_id.title.length > 14 ? r.exam_id.title.slice(0, 14) + '…' : r.exam_id.title,
          pct: Math.round((r.marks_obtained / r.exam_id.total_marks) * 100),
          marks: `${r.marks_obtained}/${r.exam_id.total_marks}`,
          grade: r.grade,
        }));
      setTrendData(filtered);
    } catch { setTrendData([]); }
    setTrendLoading(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
            <Award size={24} className="text-violet-500"/> Exams & Results
          </h2>
          <p className="text-slate-500 mt-1">Create exams and enter student marks</p>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-sm">
          {showForm ? <X size={18}/> : <Plus size={18}/>}
          {showForm ? 'Cancel' : 'New Exam'}
        </button>
      </div>

      {/* Create exam form */}
      {showForm && (
        <div className="bg-violet-50 border border-violet-200 rounded-2xl p-6 space-y-4">
          <h3 className="font-extrabold text-slate-800">New Exam</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Exam Title *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"
                placeholder="e.g. Mid-Term Exam"/>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Course *</label>
              <select value={form.course_name} onChange={e => setForm(f => ({ ...f, course_name: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-300">
                <option value="">Select course...</option>
                {courses.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Exam Date *</label>
              <input type="date" value={form.exam_date} onChange={e => setForm(f => ({ ...f, exam_date: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Total Marks</label>
                <input type="number" value={form.total_marks} onChange={e => setForm(f => ({ ...f, total_marks: Number(e.target.value) }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"/>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Pass Marks</label>
                <input type="number" value={form.pass_marks} onChange={e => setForm(f => ({ ...f, pass_marks: Number(e.target.value) }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"/>
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none"
              placeholder="Optional notes..."/>
          </div>
          <button onClick={handleCreate} disabled={saving}
            className="flex items-center gap-2 bg-violet-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-violet-700 transition-colors disabled:opacity-60">
            <Save size={16}/> {saving ? 'Creating...' : 'Create Exam'}
          </button>
        </div>
      )}

      {/* Edit exam panel */}
      {editExam && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-800">Edit: {editExam.title}</h3>
            <button onClick={() => setEditExam(null)} className="p-1.5 rounded-lg hover:bg-white text-slate-500"><X size={16}/></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Exam Title *</label>
              <input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"/>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Course</label>
              <select value={editForm.course_name} onChange={e => setEditForm(f => ({ ...f, course_name: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-300">
                <option value="">Select course...</option>
                {courses.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Exam Date *</label>
              <input type="date" value={editForm.exam_date} onChange={e => setEditForm(f => ({ ...f, exam_date: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Total Marks</label>
                <input type="number" value={editForm.total_marks} onChange={e => setEditForm(f => ({ ...f, total_marks: Number(e.target.value) }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"/>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Pass Marks</label>
                <input type="number" value={editForm.pass_marks} onChange={e => setEditForm(f => ({ ...f, pass_marks: Number(e.target.value) }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"/>
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Description</label>
            <textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
              rows={2} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"/>
          </div>
          <button onClick={handleUpdate} disabled={updating}
            className="flex items-center gap-2 bg-amber-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-amber-700 transition-colors disabled:opacity-60">
            <Save size={16}/> {updating ? 'Updating...' : 'Update Exam'}
          </button>
        </div>
      )}

      {/* Exams list */}
      {exams.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-slate-100">
          <Award size={48} className="text-slate-200 mx-auto mb-4"/>
          <h3 className="text-xl font-extrabold text-slate-400 mb-2">No Exams Yet</h3>
          <p className="text-slate-400">Create your first exam to start entering results.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {exams.map(exam => {
            const isOpen = activeExam === exam._id;
            const analytics = isOpen && examData ? buildAnalytics(examData) : null;

            return (
              <div key={exam._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Exam header row */}
                <div className="flex items-center gap-4 p-5 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => openResults(exam)}>
                  <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                    <Award size={20} className="text-violet-600"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-slate-800">{exam.title}</h3>
                      {exam.is_published
                        ? <span className="flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full"><Eye size={9}/> Published</span>
                        : <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full"><EyeOff size={9}/> Unpublished</span>
                      }
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {exam.course_name} · {new Date(exam.exam_date).toLocaleDateString()} · {exam.total_marks} marks
                      {exam.result_count > 0 && <span className="ml-2 text-emerald-600 font-bold">{exam.result_count} results entered</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); handlePublishToggle(exam); }}
                      disabled={publishing || exam.result_count === 0}
                      title={exam.result_count === 0 ? 'Enter results before publishing' : (exam.is_published ? 'Unpublish' : 'Publish results to students')}
                      className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                        exam.is_published
                          ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                          : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                      }`}>
                      {exam.is_published ? <><EyeOff size={12}/> Unpublish</> : <><Eye size={12}/> Publish</>}
                    </button>
                    <button onClick={(e) => openEditExam(exam, e)}
                      className={`p-1.5 rounded-lg transition-colors ${editExam?._id === exam._id ? 'bg-amber-100 text-amber-600' : 'text-slate-300 hover:text-blue-500 hover:bg-blue-50'}`}>
                      <Edit3 size={15}/>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(exam._id); }}
                      className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                      <Trash2 size={16}/>
                    </button>
                    {isOpen ? <ChevronUp size={18} className="text-slate-400"/> : <ChevronDown size={18} className="text-slate-400"/>}
                  </div>
                </div>

                {isOpen && examData && (
                  <div className="border-t border-slate-100">
                    {/* Tabs */}
                    <div className="flex border-b border-slate-100 px-5">
                      {[
                        { id: 'marks', label: 'Enter Marks', icon: <CheckCircle2 size={14}/> },
                        { id: 'analytics', label: 'Analytics', icon: <BarChart2 size={14}/> },
                      ].map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)}
                          className={`flex items-center gap-1.5 px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
                            tab === t.id
                              ? 'border-violet-500 text-violet-700'
                              : 'border-transparent text-slate-400 hover:text-slate-600'
                          }`}>
                          {t.icon}{t.label}
                        </button>
                      ))}
                    </div>

                    {/* Enter Marks tab */}
                    {tab === 'marks' && (
                      <div className="p-5">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-extrabold text-slate-700 text-sm">
                            {examData.exam.course_name} — {examData.exam.total_marks} marks
                          </h4>
                          <button onClick={handleSaveResults} disabled={savingResults}
                            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors disabled:opacity-60">
                            <CheckCircle2 size={15}/> {savingResults ? 'Saving...' : 'Save All Results'}
                          </button>
                        </div>

                        {examData.students.length === 0 ? (
                          <p className="text-sm text-slate-400 text-center py-6">No students found for this course.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-slate-100">
                                  <th className="text-left py-2 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Student</th>
                                  <th className="text-left py-2 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Roll No</th>
                                  <th className="text-left py-2 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Marks / {examData.exam.total_marks}</th>
                                  <th className="text-left py-2 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Grade</th>
                                  <th className="text-left py-2 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Remarks</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                {examData.students.map(s => {
                                  const obtained = marks[s._id];
                                  const grade = obtained !== undefined && obtained !== ''
                                    ? calcGradeLocal(Number(obtained), examData.exam.total_marks) : null;
                                  const passed = grade && grade !== 'F';
                                  return (
                                    <tr key={s._id} className="hover:bg-slate-50 transition-colors">
                                      <td className="py-3 px-3 font-semibold text-slate-700">{s.full_name}</td>
                                      <td className="py-3 px-3 text-slate-400 font-mono text-xs">{s.roll_number}</td>
                                      <td className="py-3 px-3">
                                        <input type="number" min="0" max={examData.exam.total_marks}
                                          value={obtained ?? ''}
                                          onChange={e => setMarks(m => ({ ...m, [s._id]: e.target.value }))}
                                          className="w-20 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-300"
                                          placeholder="—"/>
                                      </td>
                                      <td className="py-3 px-3">
                                        {grade && (
                                          <span className={`text-xs font-extrabold px-2.5 py-1 rounded-lg ${GRADE_COLORS[grade] || 'bg-slate-100 text-slate-600'}`}>
                                            {grade} {!passed && '✗'}
                                          </span>
                                        )}
                                      </td>
                                      <td className="py-3 px-3">
                                        <input type="text" value={remarks[s._id] || ''}
                                          onChange={e => setRemarks(r => ({ ...r, [s._id]: e.target.value }))}
                                          className="w-36 border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                                          placeholder="Optional..."/>
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

                    {/* Analytics tab */}
                    {tab === 'analytics' && (
                      <div className="p-5 space-y-6">
                        {!analytics ? (
                          <div className="text-center py-10 text-slate-400">
                            <BarChart2 size={36} className="mx-auto mb-2 text-slate-200"/>
                            <p className="font-medium">No results entered yet.</p>
                            <p className="text-sm mt-1">Enter marks in the "Enter Marks" tab first.</p>
                          </div>
                        ) : (
                          <>
                            {/* Stats row */}
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                              <StatCard label="Students" value={analytics.count} color="#4f46e5"/>
                              <StatCard label="Average" value={`${analytics.average}`} color="#0891b2"/>
                              <StatCard label="Highest" value={analytics.highest} color="#16a34a"/>
                              <StatCard label="Lowest" value={analytics.lowest} color="#dc2626"/>
                              <StatCard label="Pass Rate" value={`${analytics.passRate}%`} color="#d97706"/>
                            </div>

                            {/* Grade distribution chart */}
                            <div className="bg-slate-50 rounded-2xl p-4">
                              <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                                <BarChart2 size={16} className="text-violet-500"/> Grade Distribution
                              </h4>
                              <ResponsiveContainer width="100%" height={180}>
                                <BarChart data={analytics.gradeData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false}/>
                                  <XAxis dataKey="grade" tick={{ fontSize: 12, fontWeight: 700 }} tickLine={false} axisLine={false}/>
                                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false}/>
                                  <Tooltip content={<CustomBarTooltip/>}/>
                                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                                    {analytics.gradeData.map(entry => (
                                      <Cell key={entry.grade} fill={GRADE_BAR_COLORS[entry.grade] || '#94a3b8'}/>
                                    ))}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>

                            {/* Ranked table with per-student trend toggle */}
                            <div>
                              <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                                <Users size={16} className="text-violet-500"/> Class Ranking
                              </h4>
                              <div className="overflow-x-auto rounded-xl border border-slate-100">
                                <table className="w-full text-sm">
                                  <thead className="bg-slate-50">
                                    <tr>
                                      <th className="text-left py-2 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider w-10">#</th>
                                      <th className="text-left py-2 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Student</th>
                                      <th className="text-left py-2 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Marks</th>
                                      <th className="text-left py-2 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider">%</th>
                                      <th className="text-left py-2 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Grade</th>
                                      <th className="text-left py-2 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Trend</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-50">
                                    {analytics.ranked.map(r => (
                                      <>
                                        <tr key={r.id} className={`transition-colors ${studentTrend === r.id ? 'bg-violet-50' : 'hover:bg-slate-50'}`}>
                                          <td className="py-2.5 px-3">
                                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-extrabold ${
                                              r.rank === 1 ? 'bg-amber-100 text-amber-700' :
                                              r.rank === 2 ? 'bg-slate-200 text-slate-600' :
                                              r.rank === 3 ? 'bg-orange-100 text-orange-700' : 'text-slate-400'
                                            }`}>{r.rank}</span>
                                          </td>
                                          <td className="py-2.5 px-3">
                                            <p className="font-semibold text-slate-700">{r.name}</p>
                                            <p className="text-xs text-slate-400 font-mono">{r.roll}</p>
                                          </td>
                                          <td className="py-2.5 px-3 font-bold text-slate-700">{r.marks}<span className="text-slate-400 font-normal">/{analytics.total}</span></td>
                                          <td className="py-2.5 px-3">
                                            <span className="text-sm font-bold" style={{ color: r.pct >= 80 ? '#16a34a' : r.pct >= 50 ? '#4f46e5' : '#dc2626' }}>
                                              {r.pct}%
                                            </span>
                                          </td>
                                          <td className="py-2.5 px-3">
                                            <span className={`text-xs font-extrabold px-2.5 py-1 rounded-lg ${GRADE_COLORS[r.grade] || 'bg-slate-100 text-slate-600'}`}>
                                              {r.grade}
                                            </span>
                                          </td>
                                          <td className="py-2.5 px-3">
                                            {r.id && (
                                              <button onClick={() => openStudentTrend(r.id)}
                                                className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg transition-colors ${
                                                  studentTrend === r.id
                                                    ? 'bg-violet-600 text-white'
                                                    : 'bg-violet-100 text-violet-700 hover:bg-violet-200'
                                                }`}>
                                                <TrendingUp size={11}/> Trend
                                              </button>
                                            )}
                                          </td>
                                        </tr>

                                        {/* Inline trend chart for this student */}
                                        {studentTrend === r.id && (
                                          <tr key={`trend-${r.id}`}>
                                            <td colSpan={6} className="px-4 pb-4 bg-violet-50">
                                              {trendLoading ? (
                                                <div className="flex items-center justify-center py-8">
                                                  <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"/>
                                                </div>
                                              ) : trendData.length < 2 ? (
                                                <p className="text-sm text-slate-400 text-center py-4">Not enough exam history to show a trend.</p>
                                              ) : (
                                                <div className="pt-2">
                                                  <p className="text-xs font-bold text-violet-600 mb-2 uppercase tracking-wider">{r.name} — Performance Trend</p>
                                                  <ResponsiveContainer width="100%" height={160}>
                                                    <LineChart data={trendData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                                      <CartesianGrid strokeDasharray="3 3" stroke="#ede9fe"/>
                                                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#7c3aed' }} tickLine={false} axisLine={false}/>
                                                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} unit="%"/>
                                                      <Tooltip content={<CustomLineTooltip/>}/>
                                                      <ReferenceLine y={50} stroke="#fca5a5" strokeDasharray="4 2"/>
                                                      <Line type="monotone" dataKey="pct" stroke="#7c3aed" strokeWidth={2.5}
                                                        dot={{ fill: '#7c3aed', r: 4, strokeWidth: 0 }}
                                                        activeDot={{ r: 6, fill: '#7c3aed' }}/>
                                                    </LineChart>
                                                  </ResponsiveContainer>
                                                </div>
                                              )}
                                            </td>
                                          </tr>
                                        )}
                                      </>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
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
    </div>
  );
};

export default TeacherExams;
