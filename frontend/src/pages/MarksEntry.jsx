import { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import {
  ClipboardList, RefreshCw, Save, Lock, ChevronRight, CheckCircle2, X
} from 'lucide-react';

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-sky-400 focus:bg-white transition-colors';
const labelCls = 'block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1';

const TERMS = ['Term 1', 'Term 2', 'Final', 'Unit Test 1', 'Unit Test 2', 'Pre-Board'];

export default function MarksEntry() {
  const [step, setStep] = useState(1);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  // Step 1 form
  const [config, setConfig] = useState({
    class_id: '', subject_id: '', academic_year_id: '',
    term: 'Term 1', exam_label: '', total_marks: 100, passing_marks: 35,
  });

  // Step 2 sheet
  const [sheetId, setSheetId] = useState(null);
  const [rows, setRows] = useState([]);
  const [isFinalized, setIsFinalized] = useState(false);

  useEffect(() => { fetchClasses(); fetchAcademicYears(); }, []);
  useEffect(() => { if (config.class_id) fetchSubjects(); }, [config.class_id]);

  const fetchClasses = async () => {
    try { const { data } = await api.get('/school-classes'); setClasses(data); } catch { /* optional */ }
  };
  const fetchSubjects = async () => {
    try {
      const { data } = await api.get('/subjects', { params: { class_id: config.class_id } });
      setSubjects(data);
    } catch { /* optional */ }
  };
  const fetchAcademicYears = async () => {
    try { const { data } = await api.get('/academic-years'); setAcademicYears(data); } catch { /* optional */ }
  };

  const loadSheet = async (e) => {
    e.preventDefault();
    if (!config.class_id || !config.subject_id || !config.academic_year_id) {
      toast.warn('Please fill all required fields'); return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/marks-entry', {
        ...config,
        total_marks: parseInt(config.total_marks),
        passing_marks: parseInt(config.passing_marks),
      });
      setSheetId(data._id);
      setIsFinalized(data.is_finalized || false);
      // Build rows from students
      const rowData = (data.students || []).map(s => ({
        student_id: s.student_id || s._id,
        student_name: s.student_name || s.name,
        roll_number: s.roll_number,
        marks: s.marks !== undefined && s.marks !== null ? String(s.marks) : '',
        is_absent: s.is_absent || false,
      }));
      setRows(rowData);
      setStep(2);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to load sheet'); }
    finally { setLoading(false); }
  };

  const updateRow = (idx, field, value) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const saveSheet = async () => {
    setSaving(true);
    try {
      const payload = {
        students: rows.map(r => ({
          student_id: r.student_id,
          marks: r.is_absent ? null : (r.marks === '' ? null : parseFloat(r.marks)),
          is_absent: r.is_absent,
        }))
      };
      await api.put(`/marks-entry/${sheetId}`, payload);
      toast.success('Marks saved successfully');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const finalizeSheet = async () => {
    if (!window.confirm('Finalize this sheet? No further edits will be allowed.')) return;
    setFinalizing(true);
    try {
      await api.put(`/marks-entry/${sheetId}`, { is_finalized: true });
      toast.success('Sheet finalized');
      setIsFinalized(true);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to finalize'); }
    finally { setFinalizing(false); }
  };

  // Summary stats
  const appeared = rows.filter(r => !r.is_absent).length;
  const marksEntered = rows.filter(r => !r.is_absent && r.marks !== '');
  const passed = marksEntered.filter(r => parseFloat(r.marks) >= config.passing_marks).length;
  const failed = marksEntered.filter(r => parseFloat(r.marks) < config.passing_marks).length;
  const avgMarks = marksEntered.length ? (marksEntered.reduce((s, r) => s + parseFloat(r.marks), 0) / marksEntered.length).toFixed(1) : '—';
  const highest = marksEntered.length ? Math.max(...marksEntered.map(r => parseFloat(r.marks))) : '—';
  const lowest = marksEntered.length ? Math.min(...marksEntered.map(r => parseFloat(r.marks))) : '—';

  const getGradeColor = (marks) => {
    if (!marks || marks === '') return '';
    const pct = parseFloat(marks) / parseInt(config.total_marks) * 100;
    if (pct >= 90) return 'text-emerald-600';
    if (pct >= 75) return 'text-sky-600';
    if (pct >= 50) return 'text-amber-600';
    return 'text-red-500';
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-sky-600 flex items-center justify-center shadow">
          <ClipboardList className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Marks Entry</h1>
          <p className="text-sm text-slate-500">Bulk marks entry for exams and assessments</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[
          { n: 1, label: 'Configure' },
          { n: 2, label: 'Enter Marks' },
        ].map((s, i) => (
          <div key={s.n} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold ${step >= s.n ? 'bg-sky-600 text-white' : 'bg-white border border-slate-200 text-slate-400'}`}>
              <span>{s.n}</span> {s.label}
            </div>
            {i < 1 && <ChevronRight className="w-4 h-4 text-slate-300" />}
          </div>
        ))}
      </div>

      {/* Step 1: Configure */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 max-w-2xl">
          <h2 className="font-bold text-slate-700 mb-5">Exam Configuration</h2>
          <form onSubmit={loadSheet} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Class *</label>
                <select required value={config.class_id} onChange={e => setConfig(p => ({ ...p, class_id: e.target.value, subject_id: '' }))} className={inputCls}>
                  <option value="">Select Class</option>
                  {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Subject *</label>
                <select required value={config.subject_id} onChange={e => setConfig(p => ({ ...p, subject_id: e.target.value }))} className={inputCls}>
                  <option value="">Select Subject</option>
                  {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Academic Year *</label>
                <select required value={config.academic_year_id} onChange={e => setConfig(p => ({ ...p, academic_year_id: e.target.value }))} className={inputCls}>
                  <option value="">Select Year</option>
                  {academicYears.map(y => <option key={y._id} value={y._id}>{y.label || y.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Term *</label>
                <select required value={config.term} onChange={e => setConfig(p => ({ ...p, term: e.target.value }))} className={inputCls}>
                  {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Exam Label *</label>
                <input required value={config.exam_label} onChange={e => setConfig(p => ({ ...p, exam_label: e.target.value }))} className={inputCls} placeholder="e.g. Mathematics Mid-Term" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Total Marks *</label>
                  <input required type="number" min="1" value={config.total_marks} onChange={e => setConfig(p => ({ ...p, total_marks: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Passing Marks *</label>
                  <input required type="number" min="1" value={config.passing_marks} onChange={e => setConfig(p => ({ ...p, passing_marks: e.target.value }))} className={inputCls} />
                </div>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="flex items-center gap-2 bg-sky-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-sky-700 text-sm disabled:opacity-60 mt-2">
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" />}
              {loading ? 'Loading…' : 'Load / Create Sheet'}
            </button>
          </form>
        </div>
      )}

      {/* Step 2: Enter Marks */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Config summary */}
          <div className="bg-sky-50 rounded-2xl border border-sky-200 p-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex flex-wrap gap-4 text-sm">
              <span><span className="text-slate-400 text-xs">Class:</span> <strong className="text-slate-700">{classes.find(c => c._id === config.class_id)?.name}</strong></span>
              <span><span className="text-slate-400 text-xs">Subject:</span> <strong className="text-slate-700">{subjects.find(s => s._id === config.subject_id)?.name}</strong></span>
              <span><span className="text-slate-400 text-xs">Term:</span> <strong className="text-slate-700">{config.term}</strong></span>
              <span><span className="text-slate-400 text-xs">Max Marks:</span> <strong className="text-slate-700">{config.total_marks}</strong></span>
              <span><span className="text-slate-400 text-xs">Pass:</span> <strong className="text-slate-700">{config.passing_marks}</strong></span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 text-xs">Back</button>
              {isFinalized ? (
                <span className="flex items-center gap-1 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-xl text-xs font-bold"><Lock className="w-3 h-3" /> Finalized</span>
              ) : (
                <>
                  <button onClick={saveSheet} disabled={saving}
                    className="flex items-center gap-1.5 bg-sky-600 text-white px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-sky-700 disabled:opacity-60">
                    {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
                  </button>
                  <button onClick={finalizeSheet} disabled={finalizing}
                    className="flex items-center gap-1.5 bg-slate-700 text-white px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-slate-800 disabled:opacity-60">
                    {finalizing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Lock className="w-3 h-3" />} Finalize
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Students', value: rows.length },
              { label: 'Appeared', value: appeared },
              { label: 'Passed', value: passed },
              { label: 'Failed', value: failed },
              { label: 'Average', value: avgMarks },
              { label: 'Highest', value: highest },
              { label: 'Lowest', value: lowest },
              { label: 'Absent', value: rows.length - appeared },
            ].map(stat => (
              <div key={stat.label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 text-center">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</div>
                <div className="text-xl font-bold text-slate-800 mt-0.5">{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Marks Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3 w-16">Roll No</th>
                  <th className="text-left px-4 py-3">Student Name</th>
                  <th className="text-center px-4 py-3 w-28">Marks / {config.total_marks}</th>
                  <th className="text-center px-4 py-3 w-24">Absent</th>
                  <th className="text-center px-4 py-3 w-24">Result</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {rows.map((row, idx) => {
                    const marksNum = parseFloat(row.marks);
                    const isPassing = !isNaN(marksNum) && row.marks !== '' && marksNum >= config.passing_marks;
                    const isFailing = !isNaN(marksNum) && row.marks !== '' && marksNum < config.passing_marks;
                    return (
                      <tr key={row.student_id} className={`hover:bg-slate-50 ${row.is_absent ? 'opacity-60 bg-slate-50' : ''}`}>
                        <td className="px-4 py-2 text-slate-500 font-medium">{row.roll_number || idx + 1}</td>
                        <td className="px-4 py-2 font-semibold text-slate-800">{row.student_name}</td>
                        <td className="px-4 py-2">
                          <input
                            type="number" min="0" max={config.total_marks} step="0.5"
                            value={row.marks}
                            disabled={isFinalized || row.is_absent}
                            onChange={e => updateRow(idx, 'marks', e.target.value)}
                            className={`w-full text-center bg-slate-50 border rounded-lg px-2 py-1.5 text-sm font-bold outline-none transition-colors disabled:bg-slate-50 disabled:cursor-not-allowed ${getGradeColor(row.marks)} focus:border-sky-400 ${row.marks === '' ? 'border-slate-200' : isFailing ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}
                            placeholder="—"
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <input type="checkbox" checked={row.is_absent} disabled={isFinalized}
                            onChange={e => { updateRow(idx, 'is_absent', e.target.checked); if (e.target.checked) updateRow(idx, 'marks', ''); }}
                            className="w-4 h-4 rounded cursor-pointer disabled:cursor-not-allowed" />
                        </td>
                        <td className="px-4 py-2 text-center">
                          {row.is_absent ? (
                            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Absent</span>
                          ) : row.marks === '' ? (
                            <span className="text-xs text-slate-300">—</span>
                          ) : isPassing ? (
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Pass</span>
                          ) : (
                            <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Fail</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!isFinalized && (
              <div className="p-4 border-t border-slate-100 flex gap-3">
                <button onClick={saveSheet} disabled={saving}
                  className="flex items-center gap-2 bg-sky-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-sky-700 text-sm disabled:opacity-60">
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Saving…' : 'Save Marks'}
                </button>
                <button onClick={finalizeSheet} disabled={finalizing}
                  className="flex items-center gap-2 bg-slate-700 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-slate-800 text-sm disabled:opacity-60">
                  {finalizing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  {finalizing ? 'Finalizing…' : 'Finalize Sheet'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
