import { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { ClipboardList, Lock, CheckCircle, XCircle } from 'lucide-react';

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const TERMS = ['Term 1', 'Term 2', 'Mid Term', 'Final'];

export default function TeacherMarksEntry() {
  const [step, setStep] = useState(1);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [form, setForm] = useState({
    class_id: '', subject_id: '', academic_year_id: '',
    term: '', exam_label: '', total_marks: '', passing_marks: '', exam_date: '',
  });
  const [sheet, setSheet] = useState(null);
  const [marks, setMarks] = useState({});
  const [absent, setAbsent] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/school-classes').then(r => setClasses(r.data)).catch(() => {});
    api.get('/academic-years').then(r => setAcademicYears(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!form.class_id) { setSubjects([]); return; }
    api.get(`/subjects?class_id=${form.class_id}`)
      .then(r => setSubjects(r.data))
      .catch(() => api.get('/subjects').then(r => setSubjects(r.data)).catch(() => {}));
  }, [form.class_id]);

  const openSheet = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await api.post('/teacher-portal/marks-entry', form);
      setSheet(r.data);
      const initMarks = {};
      const initAbsent = {};
      (r.data.student_marks || []).forEach(en => {
        initMarks[en.student_id?._id || en.student_id] = en.obtained_marks ?? '';
        initAbsent[en.student_id?._id || en.student_id] = en.is_absent || false;
      });
      setMarks(initMarks);
      setAbsent(initAbsent);
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to open sheet');
    } finally {
      setLoading(false);
    }
  };

  const saveMarks = async () => {
    setSaving(true);
    const student_marks = (sheet.student_marks || []).map(en => {
      const sid = en.student_id?._id || en.student_id;
      // Carry the denormalized snapshot through — the backend replaces student_marks
      // wholesale, so omitting these would wipe the stored name/roll on every save.
      return {
        student_id: sid,
        student_name: en.student_name || en.student_id?.full_name,
        roll_number: en.roll_number || en.student_id?.roll_number,
        obtained_marks: absent[sid] ? null : Number(marks[sid] || 0),
        is_absent: absent[sid] || false,
      };
    });
    try {
      await api.put(`/teacher-portal/marks-entry/${sheet._id}`, { student_marks });
      toast.success('Marks saved successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save marks');
    } finally {
      setSaving(false);
    }
  };

  const finalize = async () => {
    if (!window.confirm('Finalize this sheet? It will be locked and cannot be edited.')) return;
    try {
      await api.patch(`/teacher-portal/marks-entry/${sheet._id}/finalize`);
      toast.success('Sheet finalized and locked');
      setSheet(prev => ({ ...prev, is_finalized: true }));
    } catch {
      toast.error('Failed to finalize sheet');
    }
  };

  // Summary calculations
  const total = Number(form.total_marks) || 0;
  const passing = Number(form.passing_marks) || 0;
  const entries = sheet?.student_marks || [];
  const appeared = entries.filter(en => !absent[en.student_id?._id || en.student_id]).length;
  const passed = entries.filter(en => {
    const sid = en.student_id?._id || en.student_id;
    return !absent[sid] && Number(marks[sid] || 0) >= passing;
  }).length;
  const failed = appeared - passed;
  const allMarks = entries.filter(en => !absent[en.student_id?._id || en.student_id]).map(en => Number(marks[en.student_id?._id || en.student_id] || 0));
  const avg = allMarks.length ? (allMarks.reduce((a, b) => a + b, 0) / allMarks.length).toFixed(1) : '—';
  const highest = allMarks.length ? Math.max(...allMarks) : '—';

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
          <ClipboardList size={20} className="text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Marks Entry</h1>
          <p className="text-slate-500 text-sm">Enter and manage student exam marks</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-6">
        {[1, 2].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step >= s ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{s}</div>
            <span className={`text-sm font-medium ${step >= s ? 'text-emerald-700' : 'text-slate-400'}`}>{s === 1 ? 'Setup' : 'Enter Marks'}</span>
            {s < 2 && <div className={`h-0.5 w-10 ${step > s ? 'bg-emerald-400' : 'bg-slate-200'}`} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 max-w-2xl">
          <h2 className="font-bold text-slate-700 mb-4">Configure Exam Sheet</h2>
          <form onSubmit={openSheet} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">Class *</label>
                <select required value={form.class_id} onChange={e => setForm(p => ({ ...p, class_id: e.target.value, subject_id: '' }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white">
                  <option value="">Select class</option>
                  {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">Subject *</label>
                <select required value={form.subject_id} onChange={e => setForm(p => ({ ...p, subject_id: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white">
                  <option value="">Select subject</option>
                  {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">Academic Year *</label>
                <select required value={form.academic_year_id} onChange={e => setForm(p => ({ ...p, academic_year_id: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white">
                  <option value="">Select year</option>
                  {academicYears.map(y => <option key={y._id} value={y._id}>{y.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">Term *</label>
                <select required value={form.term} onChange={e => setForm(p => ({ ...p, term: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white">
                  <option value="">Select term</option>
                  {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">Exam Label *</label>
              <input required value={form.exam_label} onChange={e => setForm(p => ({ ...p, exam_label: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" placeholder="e.g. Mid-Term 2024" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">Total Marks *</label>
                <input required type="number" min={1} value={form.total_marks} onChange={e => setForm(p => ({ ...p, total_marks: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" placeholder="100" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">Passing Marks *</label>
                <input required type="number" min={0} value={form.passing_marks} onChange={e => setForm(p => ({ ...p, passing_marks: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" placeholder="40" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">Exam Date *</label>
                <input required type="date" value={form.exam_date} onChange={e => setForm(p => ({ ...p, exam_date: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition disabled:opacity-60">
              {loading ? 'Opening...' : 'Open Sheet'}
            </button>
          </form>
        </div>
      )}

      {step === 2 && sheet && (
        <div>
          {/* Header info */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 mb-4 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-4 text-sm text-emerald-800">
              <span><strong>Exam:</strong> {sheet.exam_label}</span>
              <span><strong>Term:</strong> {sheet.term}</span>
              <span><strong>Total Marks:</strong> {sheet.total_marks}</span>
              <span><strong>Passing:</strong> {sheet.passing_marks}</span>
              <span><strong>Date:</strong> {fmt(sheet.exam_date)}</span>
              {sheet.is_finalized && <span className="flex items-center gap-1 text-slate-600 font-semibold"><Lock size={14} /> Finalized</span>}
            </div>
            {!sheet.is_finalized && (
              <div className="flex gap-2">
                <button onClick={saveMarks} disabled={saving} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition disabled:opacity-60">
                  {saving ? 'Saving...' : 'Save Marks'}
                </button>
                <button onClick={finalize} className="px-4 py-2 rounded-xl bg-slate-700 text-white text-sm font-semibold hover:bg-slate-800 transition flex items-center gap-1">
                  <Lock size={14} /> Finalize
                </button>
              </div>
            )}
          </div>

          {/* Summary strip */}
          <div className="grid grid-cols-5 gap-3 mb-5">
            {[
              { label: 'Appeared', value: appeared, color: 'text-slate-700' },
              { label: 'Passed', value: passed, color: 'text-emerald-600' },
              { label: 'Failed', value: failed, color: 'text-red-500' },
              { label: 'Average', value: avg, color: 'text-indigo-600' },
              { label: 'Highest', value: highest, color: 'text-amber-600' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 text-center">
                <p className="text-xs text-slate-500 mb-0.5">{s.label}</p>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Marks Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">#</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Roll No</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Student Name</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Marks (/{total})</th>
                  <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Absent</th>
                  <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Result</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((en, idx) => {
                  const sid = en.student_id?._id || en.student_id;
                  const m = Number(marks[sid] || 0);
                  const isAbsent = absent[sid] || false;
                  const pass = !isAbsent && m >= passing;
                  return (
                    <tr key={sid} className="border-b border-slate-50 hover:bg-slate-50 transition">
                      <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
                      <td className="px-4 py-3 font-mono text-slate-600">{en.student_id?.roll_number || '—'}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{en.student_id?.full_name || en.student_name || `Student ${idx + 1}`}</td>
                      <td className="px-4 py-3">
                        <input
                          type="number" min={0} max={total}
                          value={isAbsent ? '' : (marks[sid] ?? '')}
                          disabled={isAbsent || sheet.is_finalized}
                          onChange={e => setMarks(prev => ({ ...prev, [sid]: e.target.value }))}
                          className="border border-slate-200 rounded-lg px-3 py-1.5 w-24 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-slate-100 disabled:text-slate-400"
                          placeholder={isAbsent ? 'Absent' : '0'}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isAbsent}
                          disabled={sheet.is_finalized}
                          onChange={e => setAbsent(prev => ({ ...prev, [sid]: e.target.checked }))}
                          className="w-4 h-4 accent-red-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isAbsent ? (
                          <span className="text-xs text-slate-400 font-medium">Absent</span>
                        ) : pass ? (
                          <span className="flex items-center justify-center gap-1 text-xs font-bold text-emerald-600">
                            <CheckCircle size={14} /> PASS
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-1 text-xs font-bold text-red-500">
                            <XCircle size={14} /> FAIL
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {entries.length === 0 && (
              <div className="p-10 text-center text-slate-400">
                <ClipboardList size={40} className="mx-auto mb-2 opacity-30" />
                <p>No students found for this class</p>
              </div>
            )}
          </div>

          <div className="mt-4">
            <button onClick={() => setStep(1)} className="text-sm text-slate-500 hover:text-slate-700 underline">
              ← Back to setup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
