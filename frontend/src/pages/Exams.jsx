import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api';
import { toast } from 'react-toastify';
import { confirm } from '../utils/confirm';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import {
  ClipboardList, Plus, Trash2, Eye, X, Save, Users, CheckCircle2,
  Globe, Lock, Upload, Download, BarChart2, Edit3, RefreshCw,
  Calendar, Clock, Award, TrendingUp, FileText, ChevronDown, ChevronUp,
  Search, GitCompare,
} from 'lucide-react';

/* ── Constants ─────────────────────────────────────────── */
const TYPE_META = {
  quiz:       { label: 'Quiz',       color: 'bg-blue-100 text-blue-700' },
  midterm:    { label: 'Midterm',    color: 'bg-amber-100 text-amber-700' },
  final:      { label: 'Final',      color: 'bg-rose-100 text-rose-700' },
  assignment: { label: 'Assignment', color: 'bg-indigo-100 text-indigo-700' },
  practical:  { label: 'Practical',  color: 'bg-emerald-100 text-emerald-700' },
};

const GRADE_COLORS = { 'A+': '#10b981', A: '#22c55e', B: '#3b82f6', C: '#f59e0b', D: '#f97316', F: '#ef4444' };

const getStatus = (exam) => {
  const now = new Date();
  const date = new Date(exam.exam_date);
  if (exam.is_published) return 'published';
  if (date > now) return 'upcoming';
  return 'pending';
};

const STATUS_META = {
  upcoming:  { label: 'Upcoming',        color: 'bg-sky-100 text-sky-700' },
  pending:   { label: 'Results Pending', color: 'bg-amber-100 text-amber-700' },
  published: { label: 'Published',       color: 'bg-emerald-100 text-emerald-700' },
};

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-indigo-400 focus:bg-white transition-colors';
const labelCls = 'block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1';

const initialForm = {
  title: '', course_name: '', type: 'quiz',
  exam_date: new Date().toISOString().split('T')[0],
  duration_minutes: '60', total_marks: '', pass_marks: '',
  weightage_percent: 100, description: '',
  grade_boundaries: { a_plus: 90, a: 80, b: 70, c: 60, d: 50 }
};

/* ── Grade badge ────────────────────────────────────────── */
const GradeBadge = ({ grade }) => {
  const c = GRADE_COLORS[grade] || '#94a3b8';
  return (
    <span style={{ background: c + '22', color: c, fontWeight: 700, padding: '2px 10px', borderRadius: 20, fontSize: '0.8rem' }}>
      {grade || '—'}
    </span>
  );
};

/* ── Main Component ─────────────────────────────────────── */
const Exams = () => {
  const [exams, setExams]               = useState([]);
  const [courses, setCourses]           = useState([]);
  const [loading, setLoading]           = useState(false);
  const [tab, setTab]                   = useState('all');       // all | upcoming | pending | published | schedule
  const [showForm, setShowForm]         = useState(false);
  const [editExam, setEditExam]         = useState(null);
  const [form, setForm]                 = useState(initialForm);
  const [showResults, setShowResults]   = useState(false);
  const [selExam, setSelExam]           = useState(null);
  const [resultsData, setResultsData]   = useState({ exam: null, results: [], students: [] });
  const [analytics, setAnalytics]       = useState(null);
  const [marksMap, setMarksMap]         = useState({});
  const [remarksMap, setRemarksMap]     = useState({});
  const [retakeMap, setRetakeMap]       = useState({});
  const [absentMap, setAbsentMap]       = useState({});
  const [marksSearch, setMarksSearch]   = useState('');
  const [batchData, setBatchData]       = useState(null);
  const [savingId, setSavingId]         = useState(null);
  const [savingAll, setSavingAll]       = useState(false);
  const [publishing, setPublishing]     = useState(false);
  const [resultTab, setResultTab]       = useState('marks');     // marks | analytics | bulk | batch
  const [showBoundaries, setShowBoundaries] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    fetchExams();
    api.get('/courses').then(r => setCourses(r.data)).catch(() => {});
  }, []);

  const fetchExams = async () => {
    setLoading(true);
    try { const { data } = await api.get('/exams'); setExams(data); }
    catch { toast.error('Failed to load exams'); }
    finally { setLoading(false); }
  };

  /* ── Form submit (create / edit) ─── */
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        total_marks: Number(form.total_marks),
        pass_marks: Number(form.pass_marks) || 0,
        duration_minutes: Number(form.duration_minutes) || 60,
      };
      if (editExam) {
        await api.put(`/exams/${editExam._id}`, payload);
        toast.success('Exam updated!');
      } else {
        await api.post('/exams', payload);
        toast.success('Exam created!');
      }
      setShowForm(false); setEditExam(null); setForm(initialForm);
      fetchExams();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const openEdit = (exam, e) => {
    e.stopPropagation();
    setEditExam(exam);
    setForm({
      title: exam.title, course_name: exam.course_name, type: exam.type || 'quiz',
      exam_date: new Date(exam.exam_date).toISOString().split('T')[0],
      duration_minutes: exam.duration_minutes || 60,
      total_marks: exam.total_marks, pass_marks: exam.pass_marks || '',
      weightage_percent: exam.weightage_percent ?? 100,
      description: exam.description || '',
      grade_boundaries: exam.grade_boundaries || { a_plus: 90, a: 80, b: 70, c: 60, d: 50 }
    });
    setShowForm(true);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!await confirm('Delete this exam and all its results?', { title: 'Delete Exam' })) return;
    try { await api.delete(`/exams/${id}`); toast.success('Deleted'); fetchExams(); }
    catch { toast.error('Failed'); }
  };

  /* ── Open results modal ─── */
  const openResults = async (exam) => {
    setSelExam(exam); setShowResults(true); setResultTab('marks');
    setAnalytics(null); setBatchData(null); setMarksSearch('');
    try {
      const [rd, ad] = await Promise.all([
        api.get(`/exams/${exam._id}/results`),
        api.get(`/exams/${exam._id}/analytics`),
      ]);
      setResultsData(rd.data);
      setAnalytics(ad.data);
      const mm = {}, rm = {}, ret = {}, abs = {};
      rd.data.results.forEach(r => {
        const sid = r.student_id?._id?.toString();
        if (sid) { mm[sid] = r.is_absent ? 0 : r.marks_obtained; rm[sid] = r.remarks || ''; ret[sid] = r.is_retake || false; abs[sid] = r.is_absent || false; }
      });
      setMarksMap(mm); setRemarksMap(rm); setRetakeMap(ret); setAbsentMap(abs);
    } catch { toast.error('Failed to load results'); }
  };

  const loadBatchComparison = async () => {
    if (!selExam || batchData) return;
    try { const { data } = await api.get(`/exams/${selExam._id}/batch-comparison`); setBatchData(data); }
    catch { toast.error('Failed to load batch comparison'); }
  };

  /* ── Save single result ─── */
  const saveSingle = async (student_id) => {
    const marks  = marksMap[student_id];
    const absent = absentMap[student_id] || false;
    if (!absent && (marks === undefined || marks === '')) { toast.error('Enter marks first'); return; }
    setSavingId(student_id);
    try {
      await api.post('/exams/results', {
        exam_id: selExam._id, student_id,
        marks_obtained: absent ? 0 : Number(marks),
        remarks: remarksMap[student_id] || '',
        is_retake: retakeMap[student_id] || false,
        is_absent: absent,
      });
      toast.success('Saved');
      const { data } = await api.get(`/exams/${selExam._id}/results`);
      setResultsData(data);
      const ad = await api.get(`/exams/${selExam._id}/analytics`);
      setAnalytics(ad.data);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSavingId(null); }
  };

  /* ── Save all at once ─── */
  const saveAll = async () => {
    const payload = resultsData.students
      .filter(s => absentMap[s._id] || (marksMap[s._id] !== undefined && marksMap[s._id] !== ''))
      .map(s => ({
        student_id: s._id,
        marks_obtained: absentMap[s._id] ? 0 : Number(marksMap[s._id]),
        remarks: remarksMap[s._id] || '',
        is_absent: absentMap[s._id] || false,
        is_retake: retakeMap[s._id] || false,
      }));
    if (!payload.length) { toast.error('No marks entered'); return; }
    setSavingAll(true);
    try {
      await api.post(`/exams/${selExam._id}/bulk-results`, { results: payload });
      toast.success(`${payload.length} results saved`);
      const [rd, ad] = await Promise.all([
        api.get(`/exams/${selExam._id}/results`),
        api.get(`/exams/${selExam._id}/analytics`),
      ]);
      setResultsData(rd.data); setAnalytics(ad.data);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSavingAll(false); }
  };

  /* ── Publish toggle ─── */
  const handlePublish = async () => {
    setPublishing(true);
    try {
      const { data } = await api.patch(`/exams/${selExam._id}/publish`);
      setSelExam(data);
      setExams(prev => prev.map(e => e._id === data._id ? { ...e, is_published: data.is_published } : e));
      toast.success(data.is_published ? 'Results published! Students notified.' : 'Results unpublished.');
    } catch { toast.error('Failed'); }
    finally { setPublishing(false); }
  };

  /* ── Excel template download ─── */
  const downloadTemplate = () => {
    const rows = [['Roll Number', 'Student Name', 'Marks Obtained', 'Remarks']];
    resultsData.students.forEach(s => rows.push([s.roll_number, s.full_name, '', '']));
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 30 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Marks');
    XLSX.writeFile(wb, `${selExam.title}_template.xlsx`);
  };

  /* ── Excel upload ─── */
  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const mm = { ...marksMap }, rm = { ...remarksMap };
        rows.slice(1).forEach(([rollNo, , marks, remarks]) => {
          if (!rollNo || marks === undefined || marks === '') return;
          const student = resultsData.students.find(s => s.roll_number === String(rollNo).trim());
          if (student) {
            mm[student._id] = marks;
            rm[student._id] = remarks || '';
          }
        });
        setMarksMap(mm); setRemarksMap(rm);
        toast.success('Template parsed! Review marks and save.');
      } catch { toast.error('Failed to parse file. Use the downloaded template.'); }
      finally { e.target.value = ''; }
    };
    reader.readAsArrayBuffer(file);
  };

  /* ── Class result sheet PDF ─── */
  const downloadClassPDF = () => {
    if (!analytics) return;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const W = 297;
    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, W, 22, 'F');
    doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
    doc.text('INFLORESCENCE ADVANCE SKILLS — RESULT SHEET', W / 2, 10, { align: 'center' });
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(148, 163, 184);
    doc.text(`${selExam.title} | ${selExam.course_name} | ${new Date(selExam.exam_date).toLocaleDateString()} | Total: ${selExam.total_marks} marks`, W / 2, 18, { align: 'center' });

    // Table
    doc.autoTable({
      startY: 26,
      head: [['Rank', 'Student Name', 'Roll No', 'Marks', 'Grade', 'Remarks']],
      body: analytics.ranked.map(r => [
        r.rank, r.student_name, r.roll_number,
        `${r.marks_obtained}/${selExam.total_marks}`,
        r.grade, r.is_retake ? `${r.remarks || ''} (Retake)` : (r.remarks || ''),
      ]),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 0: { cellWidth: 12, halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' } },
    });

    // Stats footer
    const finalY = doc.lastAutoTable.finalY + 6;
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(100, 116, 139);
    doc.text(`Class Average: ${analytics.average}  |  Highest: ${analytics.highest}  |  Lowest: ${analytics.lowest}  |  Pass Rate: ${analytics.passRate}%  |  Students: ${analytics.resultCount}/${analytics.studentCount}`, W / 2, finalY, { align: 'center' });

    doc.save(`${selExam.title}_Results.pdf`);
    toast.success('PDF downloaded!');
  };

  /* ── Filtered exams ─── */
  const filtered = tab === 'all' ? exams
    : tab === 'schedule' ? [...exams].sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date))
    : exams.filter(e => getStatus(e) === tab);

  /* ── Grade dist chart data ─── */
  const gradeChartData = analytics ? Object.entries(analytics.gradeBreakdown).map(([g, c]) => ({
    grade: g, count: c, fill: GRADE_COLORS[g]
  })) : [];

  /* ─────────────────── Create/Edit Modal ─────────────────── */
  const formModal = showForm ? createPortal(
    <div onClick={e => { if (e.target === e.currentTarget) { setShowForm(false); setEditExam(null); setForm(initialForm); } }}
      style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backgroundColor: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(6px)' }}>
      <div style={{ width: '100%', maxWidth: '600px', maxHeight: 'calc(100vh - 2rem)', background: '#fff', borderRadius: '1.75rem', boxShadow: '0 32px 80px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.75rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>{editExam ? 'Edit Exam' : 'Create New Exam'}</h3>
          <button onClick={() => { setShowForm(false); setEditExam(null); setForm(initialForm); }} style={{ padding: '0.4rem', background: '#f1f5f9', border: 'none', borderRadius: '50%', cursor: 'pointer', color: '#64748b' }}><X size={18}/></button>
        </div>
        <form onSubmit={handleSubmitForm} style={{ overflowY: 'auto', padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelCls}>Exam Title</label>
              <input required className={inputCls} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Mid-Term Exam"/>
            </div>
            <div>
              <label className={labelCls}>Course</label>
              <select required className={inputCls} value={form.course_name} onChange={e => setForm({ ...form, course_name: e.target.value })}>
                <option value="">Select course...</option>
                {courses.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Exam Type</label>
              <select className={inputCls} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Exam Date</label>
              <input required type="date" className={inputCls} value={form.exam_date} onChange={e => setForm({ ...form, exam_date: e.target.value })}/>
            </div>
            <div>
              <label className={labelCls}>Duration (minutes)</label>
              <input type="number" min="10" className={inputCls} value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: e.target.value })} placeholder="60"/>
            </div>
            <div>
              <label className={labelCls}>Total Marks</label>
              <input required type="number" min="1" className={inputCls} value={form.total_marks} onChange={e => setForm({ ...form, total_marks: e.target.value })} placeholder="100"/>
            </div>
            <div>
              <label className={labelCls}>Pass Marks</label>
              <input type="number" min="0" className={inputCls} value={form.pass_marks} onChange={e => setForm({ ...form, pass_marks: e.target.value })} placeholder="50"/>
            </div>
            <div>
              <label className={labelCls}>Weightage % (report card)</label>
              <input type="number" min="0" max="100" className={inputCls} value={form.weightage_percent} onChange={e => setForm({ ...form, weightage_percent: Number(e.target.value) })} placeholder="100"/>
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Description (optional)</label>
              <textarea rows={2} className={inputCls} style={{ resize: 'none' }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Any notes about this exam..."/>
            </div>
          </div>

          {/* Grade Boundaries */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '0.875rem', overflow: 'hidden' }}>
            <button type="button" onClick={() => setShowBoundaries(v => !v)}
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: '#f8fafc', border: 'none', cursor: 'pointer', fontWeight: 700, color: '#475569', fontSize: '0.8rem' }}>
              <span>Grade Boundaries (% thresholds)</span>
              {showBoundaries ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
            </button>
            {showBoundaries && (
              <div style={{ padding: '0.875rem 1rem', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
                {[['a_plus', 'A+'], ['a', 'A'], ['b', 'B'], ['c', 'C'], ['d', 'D']].map(([key, label]) => (
                  <div key={key}>
                    <label className={labelCls}>{label} ≥</label>
                    <input type="number" min="0" max="100" className={inputCls} style={{ textAlign: 'center' }}
                      value={form.grade_boundaries[key]}
                      onChange={e => setForm({ ...form, grade_boundaries: { ...form.grade_boundaries, [key]: Number(e.target.value) } })}/>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button type="submit" style={{ background: '#0f172a', color: '#fff', padding: '0.875rem', borderRadius: '0.875rem', fontSize: '0.95rem', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <CheckCircle2 size={18} color="#34d399"/>{editExam ? 'Update Exam' : 'Create Exam'}
          </button>
        </form>
      </div>
    </div>, document.body
  ) : null;

  /* ─────────────────── Results Modal ─────────────────── */
  const resultsModal = showResults && selExam ? createPortal(
    <div onClick={e => { if (e.target === e.currentTarget) setShowResults(false); }}
      style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backgroundColor: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(6px)' }}>
      <div style={{ width: '100%', maxWidth: '820px', maxHeight: 'calc(100vh - 2rem)', background: '#fff', borderRadius: '1.75rem', boxShadow: '0 32px 80px rgba(0,0,0,0.35)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Modal header */}
        <div style={{ padding: '1.25rem 1.75rem', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#1e293b' }}>{selExam.title}</h3>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${TYPE_META[selExam.type]?.color || 'bg-slate-100 text-slate-600'}`}>
                  {TYPE_META[selExam.type]?.label || selExam.type}
                </span>
              </div>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.82rem' }}>
                {selExam.course_name} · {new Date(selExam.exam_date).toLocaleDateString()} · {selExam.total_marks} marks
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {/* Publish button */}
              <button onClick={handlePublish} disabled={publishing}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.5rem 1rem', borderRadius: '0.75rem', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', background: selExam.is_published ? '#fef3c7' : '#dcfce7', color: selExam.is_published ? '#92400e' : '#166534' }}>
                {selExam.is_published ? <><Lock size={14}/> Unpublish</> : <><Globe size={14}/> Publish Results</>}
              </button>
              {/* Class PDF */}
              <button onClick={downloadClassPDF}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.5rem 1rem', borderRadius: '0.75rem', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', background: '#ede9fe', color: '#5b21b6' }}>
                <FileText size={14}/> PDF
              </button>
              <button onClick={() => setShowResults(false)} style={{ padding: '0.4rem', background: '#f1f5f9', border: 'none', borderRadius: '50%', cursor: 'pointer', color: '#64748b' }}><X size={18}/></button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginTop: '0.875rem', flexWrap: 'wrap' }}>
            {[
              ['marks',     <Save size={13}/>,       'Enter Marks'],
              ['analytics', <BarChart2 size={13}/>,  'Analytics'],
              ['bulk',      <Upload size={13}/>,      'Bulk Upload'],
              ['batch',     <GitCompare size={13}/>,  'Batch Compare'],
            ].map(([key, icon, label]) => (
              <button key={key} onClick={() => { setResultTab(key); if (key === 'batch') loadBatchComparison(); }}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0.4rem 0.875rem', borderRadius: '0.625rem', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem', background: resultTab === key ? '#0f172a' : '#f1f5f9', color: resultTab === key ? '#fff' : '#64748b' }}>
                {icon}{label}
              </button>
            ))}
          </div>
        </div>

        {/* Modal body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.75rem' }}>

          {/* ── TAB: Enter Marks ── */}
          {resultTab === 'marks' && (
            <>
              {resultsData.students.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                  <Users size={40} style={{ margin: '0 auto 1rem' }}/>
                  <p>No students found for course: {selExam.course_name}</p>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem', gap: 8 }}>
                    <div style={{ position: 'relative', flex: 1, maxWidth: 240 }}>
                      <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}/>
                      <input
                        value={marksSearch}
                        onChange={e => setMarksSearch(e.target.value)}
                        placeholder="Search student..."
                        style={{ width: '100%', paddingLeft: 30, paddingRight: 10, paddingTop: 6, paddingBottom: 6, border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.82rem', outline: 'none' }}
                      />
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0, flexShrink: 0 }}>{resultsData.students.length} students</p>
                    <button onClick={saveAll} disabled={savingAll}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.5rem 1.125rem', borderRadius: '0.75rem', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', background: '#4f46e5', color: '#fff', opacity: savingAll ? 0.7 : 1, flexShrink: 0 }}>
                      {savingAll ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }}/> Saving...</> : <><Save size={14}/> Save All</>}
                    </button>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        {['Student', `Marks /${selExam.total_marks}`, 'Absent', 'Remarks', 'Retake', 'Grade', ''].map((h, i) => (
                          <th key={i} style={{ textAlign: i === 0 ? 'left' : 'center', padding: '8px 10px', fontWeight: 700, color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {resultsData.students
                        .filter(s => !marksSearch || s.full_name.toLowerCase().includes(marksSearch.toLowerCase()) || s.roll_number.toLowerCase().includes(marksSearch.toLowerCase()))
                        .map(student => {
                        const sid = student._id.toString();
                        const existing = resultsData.results.find(r => r.student_id?._id?.toString() === sid);
                        const isAbsent = absentMap[sid] || false;
                        return (
                          <tr key={sid} style={{ borderTop: '1px solid #f1f5f9', background: isAbsent ? '#f8fafc' : 'transparent' }}>
                            <td style={{ padding: '8px 10px' }}>
                              <p style={{ fontWeight: 700, color: '#1e293b', margin: 0, fontSize: '0.85rem' }}>{student.full_name}</p>
                              <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '1px 0 0' }}>{student.roll_number}</p>
                              {student.batch && (
                                <span style={{ display: 'inline-block', marginTop: 3, background: '#0f172a', color: '#2dd4bf', fontSize: '0.62rem', fontWeight: 700, padding: '1px 7px', borderRadius: 999 }}>
                                  {student.batch.name}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                              <input type="number" min="0" max={selExam.total_marks}
                                value={isAbsent ? '' : (marksMap[sid] ?? '')}
                                onChange={e => setMarksMap(p => ({ ...p, [sid]: e.target.value }))}
                                disabled={isAbsent}
                                placeholder={isAbsent ? 'AB' : '—'}
                                style={{ width: 64, border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '4px 8px', textAlign: 'center', fontWeight: 700, outline: 'none', fontSize: '0.9rem', opacity: isAbsent ? 0.4 : 1 }}
                              />
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                              <input type="checkbox" checked={isAbsent}
                                onChange={e => setAbsentMap(p => ({ ...p, [sid]: e.target.checked }))}
                                style={{ accentColor: '#dc2626', width: 16, height: 16, cursor: 'pointer' }}
                              />
                            </td>
                            <td style={{ padding: '8px 10px' }}>
                              <input type="text"
                                value={remarksMap[sid] ?? ''}
                                onChange={e => setRemarksMap(p => ({ ...p, [sid]: e.target.value }))}
                                placeholder="optional..."
                                style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '4px 8px', fontSize: '0.82rem', outline: 'none' }}
                              />
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                              <input type="checkbox" checked={retakeMap[sid] || false}
                                onChange={e => setRetakeMap(p => ({ ...p, [sid]: e.target.checked }))}
                                style={{ accentColor: '#f59e0b', width: 16, height: 16, cursor: 'pointer' }}
                              />
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                              {existing ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                  <GradeBadge grade={existing.is_absent ? 'AB' : existing.grade}/>
                                  {existing.is_retake && <span style={{ fontSize: '0.6rem', color: '#f59e0b', fontWeight: 700 }}>RETAKE</span>}
                                  {existing.is_absent && <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 700 }}>ABSENT</span>}
                                </div>
                              ) : <span style={{ color: '#cbd5e1' }}>—</span>}
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                              <button onClick={() => saveSingle(sid)} disabled={savingId === sid}
                                style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8, padding: '4px 12px', fontWeight: 700, cursor: 'pointer', fontSize: '0.75rem', opacity: savingId === sid ? 0.6 : 1 }}>
                                {savingId === sid ? '...' : 'Save'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>
              )}
            </>
          )}

          {/* ── TAB: Analytics ── */}
          {resultTab === 'analytics' && (
            analytics && analytics.resultCount > 0 ? (
              <div className="space-y-5">
                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem' }}>
                  {[
                    { label: 'Students', value: `${analytics.resultCount}/${analytics.studentCount}`, color: '#4f46e5' },
                    { label: 'Average', value: `${analytics.average}`, color: '#0ea5e9' },
                    { label: 'Highest', value: analytics.highest, color: '#10b981' },
                    { label: 'Lowest', value: analytics.lowest, color: '#f43f5e' },
                    { label: 'Pass Rate', value: `${analytics.passRate}%`, color: '#f59e0b' },
                  ].map(s => (
                    <div key={s.label} style={{ background: '#f8fafc', borderRadius: '0.875rem', padding: '0.875rem', textAlign: 'center' }}>
                      <p style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color, margin: 0 }}>{s.value}</p>
                      <p style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '3px 0 0' }}>{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Grade distribution */}
                <div style={{ background: '#f8fafc', borderRadius: '0.875rem', padding: '1rem' }}>
                  <p style={{ fontWeight: 700, color: '#475569', marginBottom: '0.75rem', fontSize: '0.85rem' }}>Grade Distribution</p>
                  <div style={{ height: 160 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={gradeChartData} barSize={36}>
                        <XAxis dataKey="grade" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700 }}/>
                        <YAxis hide allowDecimals={false}/>
                        <Tooltip formatter={(v) => [`${v} students`, 'Count']}/>
                        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                          {gradeChartData.map((entry, i) => <Cell key={i} fill={entry.fill}/>)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Topper */}
                {analytics.ranked[0] && (
                  <div style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', border: '1px solid #fde68a', borderRadius: '0.875rem', padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                    <div style={{ fontSize: '1.75rem' }}>🏆</div>
                    <div>
                      <p style={{ fontWeight: 800, color: '#92400e', margin: 0 }}>Class Topper: {analytics.ranked[0].student_name}</p>
                      <p style={{ fontSize: '0.8rem', color: '#b45309', margin: '2px 0 0' }}>
                        {analytics.ranked[0].marks_obtained}/{selExam.total_marks} marks · Grade {analytics.ranked[0].grade}
                      </p>
                    </div>
                  </div>
                )}

                {/* Ranked table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      {['#', 'Student', 'Batch', 'Roll No', 'Marks', 'Grade'].map((h, i) => (
                        <th key={i} style={{ padding: '7px 10px', textAlign: i < 3 ? 'left' : 'center', fontWeight: 700, color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.ranked.map(r => (
                      <tr key={r.rank} style={{ borderTop: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '7px 10px', fontWeight: 700, color: r.rank <= 3 ? '#f59e0b' : '#94a3b8' }}>{r.rank}</td>
                        <td style={{ padding: '7px 10px', fontWeight: 600, color: '#334155' }}>
                          {r.student_name}
                          {r.is_retake && <span style={{ fontSize: '0.6rem', color: '#f59e0b', fontWeight: 700, marginLeft: 4 }}>RETAKE</span>}
                        </td>
                        <td style={{ padding: '7px 10px' }}>
                          {r.batch_name
                            ? <span style={{ background: '#0f172a', color: '#2dd4bf', fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap' }}>{r.batch_name}</span>
                            : <span style={{ color: '#cbd5e1', fontSize: '0.72rem' }}>—</span>}
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'center', color: '#94a3b8', fontFamily: 'monospace' }}>{r.roll_number}</td>
                        <td style={{ padding: '7px 10px', textAlign: 'center', fontWeight: 700, color: '#334155' }}>{r.marks_obtained}/{selExam.total_marks}</td>
                        <td style={{ padding: '7px 10px', textAlign: 'center' }}><GradeBadge grade={r.grade}/></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                <BarChart2 size={40} style={{ margin: '0 auto 1rem' }}/>
                <p>No results entered yet. Go to "Enter Marks" tab to add marks.</p>
              </div>
            )
          )}

          {/* ── TAB: Bulk Upload ── */}
          {resultTab === 'bulk' && (
            <div className="space-y-4">
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.875rem', padding: '1rem 1.25rem' }}>
                <p style={{ fontWeight: 700, color: '#1d4ed8', margin: '0 0 4px', fontSize: '0.85rem' }}>How to bulk upload marks:</p>
                <ol style={{ color: '#2563eb', fontSize: '0.8rem', margin: 0, paddingLeft: '1.25rem', lineHeight: 1.8 }}>
                  <li>Download the Excel template (pre-filled with student names)</li>
                  <li>Fill in the "Marks Obtained" column for each student</li>
                  <li>Optionally add remarks in the "Remarks" column</li>
                  <li>Upload the filled file — marks will auto-populate in the table</li>
                  <li>Click "Save All" in the Enter Marks tab to save</li>
                </ol>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={downloadTemplate}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.75rem 1.25rem', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '0.75rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
                  <Download size={16}/> Download Template (.xlsx)
                </button>
                <button onClick={() => fileRef.current?.click()}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.75rem 1.25rem', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '0.75rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
                  <Upload size={16}/> Upload Filled Template
                </button>
                <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleUpload}/>
              </div>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.875rem', padding: '0.875rem 1rem' }}>
                <p style={{ color: '#15803d', fontWeight: 600, fontSize: '0.82rem', margin: 0 }}>
                  ✓ After uploading, switch to the "Enter Marks" tab to review and click "Save All".
                </p>
              </div>
            </div>
          )}

          {/* ── TAB: Batch Compare ── */}
          {resultTab === 'batch' && (
            !batchData ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
                <p>Loading batch comparison...</p>
              </div>
            ) : !batchData.batches?.length ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                <Users size={40} style={{ margin: '0 auto 1rem' }}/>
                <p>No batch data available for this exam.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {(() => {
                  const chartData = batchData.batches.map(b => ({
                    batch_name: b.batch_name,
                    avg_pct: selExam?.total_marks > 0 ? Math.round(b.avg / selExam.total_marks * 100) : 0,
                  }));
                  return (
                    <div style={{ height: 200 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} barSize={40}>
                          <XAxis dataKey="batch_name" tick={{ fontSize: 11, fontWeight: 700 }} tickLine={false} axisLine={false}/>
                          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} unit="%"/>
                          <Tooltip formatter={(v) => [`${v}%`, 'Avg Score']}/>
                          <Bar dataKey="avg_pct" radius={[6, 6, 0, 0]} fill="#4f46e5"/>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })()}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['Batch', 'Appeared', 'Avg Marks', 'Highest', 'Lowest', 'Pass Rate'].map((h, i) => (
                        <th key={i} style={{ padding: '8px 10px', textAlign: i === 0 ? 'left' : 'center', fontWeight: 700, color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {batchData.batches.map(b => (
                      <tr key={b.batch_name} style={{ borderTop: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 700, color: '#334155' }}>
                          <span style={{ background: '#0f172a', color: '#2dd4bf', fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999 }}>{b.batch_name}</span>
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: '#64748b' }}>{b.appeared}/{b.count}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: '#4f46e5' }}>{b.avg}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: '#16a34a', fontWeight: 700 }}>{b.highest}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: '#dc2626', fontWeight: 700 }}>{b.lowest}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <span style={{ background: b.passRate >= 70 ? '#dcfce7' : b.passRate >= 50 ? '#fef3c7' : '#fef2f2', color: b.passRate >= 70 ? '#16a34a' : b.passRate >= 50 ? '#d97706' : '#dc2626', fontWeight: 700, padding: '2px 8px', borderRadius: 10, fontSize: '0.8rem' }}>{b.passRate}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>
    </div>, document.body
  ) : null;

  /* ─────────────────── Schedule View ─────────────────── */
  const scheduleView = (
    <div className="space-y-3">
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-100">
          <Calendar size={36} className="text-slate-300 mx-auto mb-3"/>
          <p className="text-slate-400">No exams scheduled</p>
        </div>
      ) : filtered.map(exam => {
        const status = getStatus(exam);
        const sm = STATUS_META[status];
        const tm = TYPE_META[exam.type];
        const isPast = new Date(exam.exam_date) < new Date();
        return (
          <div key={exam._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div style={{ width: 56, height: 56, borderRadius: '0.875rem', background: isPast ? '#f1f5f9' : '#eff6ff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <p style={{ fontWeight: 800, fontSize: '1.1rem', color: isPast ? '#94a3b8' : '#3b82f6', lineHeight: 1 }}>{new Date(exam.exam_date).getDate()}</p>
              <p style={{ fontSize: '0.6rem', fontWeight: 700, color: isPast ? '#94a3b8' : '#60a5fa', textTransform: 'uppercase' }}>
                {new Date(exam.exam_date).toLocaleString('default', { month: 'short' })}
              </p>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-slate-800">{exam.title}</p>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tm?.color}`}>{tm?.label}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${sm?.color}`}>{sm?.label}</span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">{exam.course_name} · {exam.total_marks} marks · {exam.duration_minutes} min</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => openResults(exam)} className="flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-indigo-700 transition-colors">
                <Eye size={13}/> Results
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  /* ─────────────────── Cards View ─────────────────── */
  const cardsView = (
    filtered.length === 0 ? (
      <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
        <ClipboardList size={44} className="text-slate-300 mx-auto mb-3"/>
        <p className="text-slate-500">No exams in this category.</p>
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map(exam => {
          const status = getStatus(exam);
          const sm = STATUS_META[status];
          const tm = TYPE_META[exam.type];
          return (
            <div key={exam._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow flex flex-col">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tm?.color}`}>{tm?.label}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${sm?.color}`}>{sm?.label}</span>
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-base leading-tight truncate">{exam.title}</h3>
                  <p className="text-sm text-indigo-600 font-semibold mt-0.5 truncate">{exam.course_name}</p>
                </div>
                <div className="flex gap-1 ml-2 flex-shrink-0">
                  <button onClick={(e) => openEdit(exam, e)} className="p-1.5 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Edit3 size={14}/></button>
                  <button onClick={(e) => handleDelete(exam._id, e)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14}/></button>
                </div>
              </div>

              <div className="flex gap-2 text-xs font-bold text-slate-400 mb-3 flex-wrap">
                <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg"><Calendar size={11}/>{new Date(exam.exam_date).toLocaleDateString()}</span>
                <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg"><Award size={11}/>{exam.total_marks} marks</span>
                {exam.duration_minutes && <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg"><Clock size={11}/>{exam.duration_minutes} min</span>}
              </div>

              {exam.description && <p className="text-xs text-slate-400 mb-3 italic line-clamp-2">{exam.description}</p>}

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-auto">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1"><Users size={12}/>{exam.result_count || 0} results</span>
                <div className="flex gap-2">
                  <button onClick={() => { openResults(exam); setResultTab('analytics'); }} className="flex items-center gap-1 text-slate-400 hover:text-indigo-600 text-xs font-bold px-2 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors">
                    <TrendingUp size={13}/>
                  </button>
                  <button onClick={() => openResults(exam)} className="flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-indigo-700 transition-colors">
                    <Eye size={13}/> Manage
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    )
  );

  /* ─────────────────── Page ─────────────────── */
  const tabs = [
    { key: 'all',       label: `All (${exams.length})` },
    { key: 'upcoming',  label: `Upcoming (${exams.filter(e => getStatus(e) === 'upcoming').length})` },
    { key: 'pending',   label: `Results Pending (${exams.filter(e => getStatus(e) === 'pending').length})` },
    { key: 'published', label: `Published (${exams.filter(e => getStatus(e) === 'published').length})` },
    { key: 'schedule',  label: '📅 Schedule' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 flex items-center gap-3">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl"><ClipboardList size={28}/></div>
            Exams & Results
          </h2>
          <p className="text-slate-500 mt-1 ml-1">{exams.length} exam{exams.length !== 1 ? 's' : ''} total</p>
        </div>
        <button onClick={() => { setForm(initialForm); setEditExam(null); setShowForm(true); }}
          className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:bg-slate-800 hover:-translate-y-1 transition-all flex items-center gap-2">
          <Plus size={18}/> New Exam
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${tab === t.key ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : tab === 'schedule' ? scheduleView : cardsView}

      {formModal}
      {resultsModal}
    </div>
  );
};

export default Exams;
