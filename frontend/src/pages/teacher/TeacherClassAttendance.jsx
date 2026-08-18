import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { UserCheck, CheckCircle2, XCircle, Clock, FileText } from 'lucide-react';

const today = () => new Date().toISOString().slice(0, 10);

const STATUS_CONFIG = {
  present: { label: 'Present', color: 'bg-green-500 text-white border-green-500', count_color: 'text-green-600' },
  absent:  { label: 'Absent',  color: 'bg-red-500 text-white border-red-500',     count_color: 'text-red-600'   },
  late:    { label: 'Late',    color: 'bg-amber-500 text-white border-amber-500', count_color: 'text-amber-600' },
  leave:   { label: 'Leave',  color: 'bg-blue-500 text-white border-blue-500',   count_color: 'text-blue-600'  },
};

const INACTIVE = 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50';

export default function TeacherClassAttendance() {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [date, setDate] = useState(today());
  const [students, setStudents] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    api.get('/school-classes').then(r => setClasses(r.data)).catch(() => {});
  }, []);

  const loadStudents = useCallback(async () => {
    if (!selectedClass) return;
    setLoadingStudents(true);
    setSubmitted(false);
    try {
      const r = await api.get(`/school-classes/${selectedClass}/students`);
      const list = r.data;
      setStudents(list);

      // Try to load existing attendance for that date
      let existingMap = {};
      try {
        const att = await api.get(`/attendance?class_id=${selectedClass}&date=${date}`);
        (att.data || []).forEach(a => {
          const sid = a.student_id?._id || a.student_id;
          existingMap[sid] = a.status;
        });
      } catch {
        // ignore — no existing attendance
      }

      const initStatuses = {};
      list.forEach(s => {
        const sid = s._id;
        initStatuses[sid] = existingMap[sid] || 'present';
      });
      setStatuses(initStatuses);
    } catch {
      toast.error('Failed to load students');
    } finally {
      setLoadingStudents(false);
    }
  }, [selectedClass, date]);

  useEffect(() => {
    if (selectedClass) loadStudents();
  }, [loadStudents]);

  const setAll = (status) => {
    setStatuses(prev => {
      const next = {};
      students.forEach(s => { next[s._id] = status; });
      return next;
    });
  };

  const submit = async () => {
    if (students.length === 0) return;
    setSubmitting(true);
    let errors = 0;
    for (const s of students) {
      try {
        await api.post('/attendance/mark', {
          qr_code: s.roll_number,
          status: statuses[s._id] || 'present',
          date,
        });
      } catch {
        errors++;
      }
    }
    setSubmitting(false);
    if (errors === 0) {
      toast.success('Attendance submitted successfully');
      setSubmitted(true);
    } else {
      toast.warning(`${errors} records failed to save`);
    }
  };

  const counts = { present: 0, absent: 0, late: 0, leave: 0 };
  students.forEach(s => { const st = statuses[s._id] || 'present'; if (counts[st] !== undefined) counts[st]++; });

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
          <UserCheck size={20} className="text-teal-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Class Attendance</h1>
          <p className="text-slate-500 text-sm">Mark bulk attendance for your class</p>
        </div>
      </div>

      {/* Selector */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">Class *</label>
            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white">
              <option value="">Select a class</option>
              {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">Date *</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
          </div>
        </div>
      </div>

      {/* Loading */}
      {loadingStudents ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
        </div>
      ) : !selectedClass ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">
          <UserCheck size={48} className="mx-auto mb-3 opacity-30" />
          <p>Select a class to start marking attendance</p>
        </div>
      ) : students.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">
          <UserCheck size={48} className="mx-auto mb-3 opacity-30" />
          <p>No students found in this class</p>
        </div>
      ) : (
        <div>
          {/* Summary strip */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            {Object.entries(counts).map(([status, count]) => (
              <div key={status} className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 text-center">
                <p className="text-xs text-slate-500 capitalize mb-0.5">{status}</p>
                <p className={`text-2xl font-bold ${STATUS_CONFIG[status].count_color}`}>{count}</p>
              </div>
            ))}
          </div>

          {/* Quick set all buttons */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-xs text-slate-500 font-medium">Set all:</span>
            {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
              <button key={status} onClick={() => setAll(status)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${cfg.color}`}>
                All {cfg.label}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">#</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Roll No</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Name</th>
                  <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, idx) => {
                  const current = statuses[s._id] || 'present';
                  return (
                    <tr key={s._id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                      <td className="px-4 py-3 text-slate-400 text-xs">{idx + 1}</td>
                      <td className="px-4 py-3 font-mono text-slate-600 text-xs">{s.roll_number || '—'}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{s.full_name}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-1 flex-wrap">
                          {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
                            <button
                              key={status}
                              onClick={() => setStatuses(prev => ({ ...prev, [s._id]: status }))}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${current === status ? cfg.color : INACTIVE}`}
                            >
                              {cfg.label}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Submit */}
          <div className="mt-5 flex items-center gap-4">
            <button
              onClick={submit}
              disabled={submitting}
              className="flex items-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-teal-700 transition disabled:opacity-60 shadow-sm"
            >
              {submitting ? (
                <><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Submitting...</>
              ) : (
                <><UserCheck size={16} /> Submit Attendance</>
              )}
            </button>
            {submitted && (
              <span className="flex items-center gap-1 text-sm text-green-600 font-semibold">
                <CheckCircle2 size={16} /> Attendance saved!
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
