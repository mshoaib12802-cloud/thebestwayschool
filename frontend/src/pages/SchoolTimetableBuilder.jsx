import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { LayoutGrid, X, Coffee, ChevronDown, Download, RefreshCw } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat' };

const PALETTE = [
  { bg: '#ede9fe', text: '#5b21b6', border: '#ddd6fe' },
  { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe' },
  { bg: '#dcfce7', text: '#14532d', border: '#bbf7d0' },
  { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
  { bg: '#fee2e2', text: '#7f1d1d', border: '#fecaca' },
  { bg: '#fce7f3', text: '#831843', border: '#fbcfe8' },
  { bg: '#ccfbf1', text: '#134e4a', border: '#99f6e4' },
  { bg: '#e0f2fe', text: '#0c4a6e', border: '#bae6fd' },
  { bg: '#fdf4ff', text: '#581c87', border: '#e9d5ff' },
];

const subjectColor = (id) => {
  if (!id) return null;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return PALETTE[Math.abs(h) % PALETTE.length];
};

const fmt12 = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

export default function SchoolTimetableBuilder() {
  const [classes, setClasses]       = useState([]);
  const [years, setYears]           = useState([]);
  const [periods, setPeriods]       = useState([]);
  const [subjects, setSubjects]     = useState([]);
  const [teachers, setTeachers]     = useState([]);
  const [entries, setEntries]       = useState([]);
  const [selClass, setSelClass]     = useState('');
  const [selYear, setSelYear]       = useState('');
  const [activeDays, setActiveDays] = useState(['Monday','Tuesday','Wednesday','Thursday','Friday']);
  const [loading, setLoading]       = useState(false);
  const [modal, setModal]           = useState(null); // { day, period }
  const [cellForm, setCellForm]     = useState({ subject_id: '', teacher_id: '', room: '' });

  useEffect(() => {
    Promise.all([api.get('/school-classes'), api.get('/academic-years'), api.get('/periods'), api.get('/staff')])
      .then(([c, y, p, s]) => {
        setClasses(c.data);
        setYears(y.data);
        setPeriods(p.data);
        setTeachers((s.data || []).filter(u => u.role === 'teacher'));
        const cur = y.data.find(yr => yr.is_current);
        if (cur) setSelYear(cur._id);
      })
      .catch(() => toast.error('Failed to load'));
  }, []);

  const loadEntries = useCallback(async () => {
    if (!selClass || !selYear) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/class-timetable?class_id=${selClass}&academic_year_id=${selYear}`);
      setEntries(data);
      const { data: subs } = await api.get(`/subjects?class_id=${selClass}`);
      setSubjects(subs);
    } catch { toast.error('Failed to load timetable'); }
    finally { setLoading(false); }
  }, [selClass, selYear]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  // Build lookup: day+periodId → entry
  const entryMap = {};
  entries.forEach(e => {
    entryMap[`${e.day_of_week}__${e.period_id?._id || e.period_id}`] = e;
  });

  const getEntry = (day, periodId) => entryMap[`${day}__${periodId}`] || null;

  const openCell = (day, period) => {
    if (period.is_break) return;
    const existing = getEntry(day, period._id);
    setCellForm({
      subject_id: existing?.subject_id?._id || '',
      teacher_id: existing?.teacher_id?._id || '',
      room: existing?.room || '',
    });
    setModal({ day, period });
  };

  const handleSubjectChange = (subjectId) => {
    const sub = subjects.find(s => s._id === subjectId);
    setCellForm(f => ({
      ...f,
      subject_id: subjectId,
      teacher_id: sub?.teacher_id?._id || f.teacher_id,
    }));
  };

  const saveCell = async () => {
    try {
      const { data } = await api.put('/class-timetable/entry', {
        class_id: selClass,
        academic_year_id: selYear,
        day_of_week: modal.day,
        period_id: modal.period._id,
        subject_id: cellForm.subject_id || null,
        teacher_id: cellForm.teacher_id || null,
        room: cellForm.room,
      });
      setEntries(prev => {
        const key = `${modal.day}__${modal.period._id}`;
        const filtered = prev.filter(e => `${e.day_of_week}__${e.period_id?._id || e.period_id}` !== key);
        return [...filtered, data];
      });
      toast.success('Saved');
      setModal(null);
    } catch { toast.error('Failed to save'); }
  };

  const clearCell = async () => {
    try {
      await api.delete('/class-timetable/entry', {
        data: {
          class_id: selClass,
          academic_year_id: selYear,
          day_of_week: modal.day,
          period_id: modal.period._id,
        },
      });
      const key = `${modal.day}__${modal.period._id}`;
      setEntries(prev => prev.filter(e => `${e.day_of_week}__${e.period_id?._id || e.period_id}` !== key));
      toast.success('Cleared');
      setModal(null);
    } catch { toast.error('Failed to clear'); }
  };

  const exportPDF = () => {
    const cls = classes.find(c => c._id === selClass);
    const yr = years.find(y => y._id === selYear);
    const doc = new jsPDF('landscape');
    doc.setFontSize(16);
    doc.text(`Timetable — ${cls?.name || ''} ${cls?.section || ''}`, 14, 16);
    doc.setFontSize(10);
    doc.text(`Academic Year: ${yr?.label || ''}`, 14, 23);
    const head = [['Period / Time', ...activeDays]];
    const body = periods.map(p => {
      if (p.is_break) return [`${p.name}\n${fmt12(p.start_time)}–${fmt12(p.end_time)}`, ...activeDays.map(() => '— BREAK —')];
      return [
        `${p.name}\n${fmt12(p.start_time)}–${fmt12(p.end_time)}`,
        ...activeDays.map(day => {
          const e = getEntry(day, p._id);
          if (!e?.subject_id) return '—';
          return `${e.subject_id.name}\n${e.teacher_id?.name || ''}`;
        }),
      ];
    });
    autoTable(doc, { startY: 28, head, body, styles: { fontSize: 8 }, headStyles: { fillColor: [14, 165, 233] } });
    doc.save(`timetable-${cls?.name || 'class'}.pdf`);
  };

  const toggleDay = (day) => {
    setActiveDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...DAYS.filter(d => [...prev, day].includes(d))]);
  };

  const className = classes.find(c => c._id === selClass);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><LayoutGrid size={24} className="text-indigo-600" /> School Timetable</h1>
          <p className="text-slate-500 text-sm mt-0.5">Build and manage weekly timetables for each class</p>
        </div>
        {selClass && selYear && (
          <button onClick={exportPDF} className="flex items-center gap-2 border border-slate-200 text-slate-600 px-4 py-2 rounded-xl font-semibold hover:bg-slate-50 text-sm">
            <Download size={16} /> Export PDF
          </button>
        )}
      </div>

      {/* Selectors */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select value={selClass} onChange={e => setSelClass(e.target.value)} className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm">
          <option value="">Select Class</option>
          {classes.map(c => <option key={c._id} value={c._id}>{c.name} — Section {c.section}</option>)}
        </select>
        <select value={selYear} onChange={e => setSelYear(e.target.value)} className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm">
          <option value="">Select Academic Year</option>
          {years.map(y => <option key={y._id} value={y._id}>{y.label}{y.is_current ? ' (Current)' : ''}</option>)}
        </select>
        {/* Day toggles */}
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
          {DAYS.map(day => (
            <button key={day} onClick={() => toggleDay(day)} className={`text-xs font-bold px-2 py-1 rounded-lg transition-colors ${activeDays.includes(day) ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-100'}`}>
              {DAY_SHORT[day]}
            </button>
          ))}
        </div>
        {selClass && selYear && (
          <button onClick={loadEntries} className="flex items-center gap-1.5 text-slate-500 hover:text-indigo-600 text-sm font-semibold"><RefreshCw size={14} /> Refresh</button>
        )}
      </div>

      {!selClass || !selYear ? (
        <div className="text-center py-20 text-slate-400">
          <LayoutGrid size={56} className="mx-auto mb-3 opacity-20" />
          <p className="font-medium">Select a class and academic year to view the timetable.</p>
          <p className="text-sm mt-1">Make sure you've added periods first via <strong>School → Periods</strong>.</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" /></div>
      ) : periods.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p>No periods found. Go to <strong>School → Periods</strong> to add them first.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
          <table className="w-full border-collapse" style={{ minWidth: `${activeDays.length * 160 + 160}px` }}>
            <thead>
              <tr>
                <th className="bg-slate-800 text-white text-left px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ minWidth: 160 }}>
                  Period / Time
                </th>
                {activeDays.map(day => (
                  <th key={day} className="bg-slate-800 text-white text-center px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ minWidth: 150 }}>
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periods.map((period, pIdx) => (
                <tr key={period._id} className={pIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                  {/* Period label */}
                  <td className="px-4 py-3 border-r border-slate-100">
                    <div className="flex items-center gap-2">
                      {period.is_break
                        ? <Coffee size={14} className="text-amber-500 flex-shrink-0" />
                        : <div className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">{pIdx + 1}</div>
                      }
                      <div>
                        <p className="text-sm font-semibold text-slate-700">{period.name}</p>
                        <p className="text-xs text-slate-400">{fmt12(period.start_time)} – {fmt12(period.end_time)}</p>
                      </div>
                    </div>
                  </td>
                  {/* Day cells */}
                  {activeDays.map(day => {
                    if (period.is_break) {
                      return (
                        <td key={day} className="px-3 py-3 border-r border-slate-100 text-center">
                          <div className="bg-amber-50 border border-amber-100 rounded-xl py-2 px-3 text-xs font-semibold text-amber-700 flex items-center justify-center gap-1.5">
                            <Coffee size={11} /> {period.name}
                          </div>
                        </td>
                      );
                    }
                    const entry = getEntry(day, period._id);
                    const subId = entry?.subject_id?._id || entry?.subject_id;
                    const color = entry?.subject_id ? subjectColor(typeof entry.subject_id === 'object' ? entry.subject_id._id : entry.subject_id) : null;
                    return (
                      <td key={day} className="px-3 py-3 border-r border-slate-100" onClick={() => openCell(day, period)}>
                        {entry?.subject_id ? (
                          <div
                            className="rounded-xl px-3 py-2.5 cursor-pointer hover:opacity-80 transition-opacity border"
                            style={{ background: color?.bg, borderColor: color?.border, color: color?.text }}
                          >
                            <p className="text-xs font-bold leading-tight">{entry.subject_id.name || entry.subject_id.code}</p>
                            {entry.teacher_id && <p className="text-[10px] mt-0.5 opacity-75">{entry.teacher_id.name}</p>}
                            {entry.room && <p className="text-[10px] opacity-60">Room {entry.room}</p>}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-slate-200 px-3 py-2.5 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/50 transition-all group">
                            <p className="text-xs text-slate-300 group-hover:text-indigo-400 font-medium">+ Assign</p>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      {selClass && selYear && subjects.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {subjects.map(s => {
            const color = subjectColor(s._id);
            return (
              <span key={s._id} className="text-xs font-semibold px-3 py-1 rounded-full border" style={{ background: color?.bg, borderColor: color?.border, color: color?.text }}>
                {s.name}
              </span>
            );
          })}
        </div>
      )}

      {/* Cell Edit Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h2 className="font-bold text-slate-800">{modal.day} · {modal.period.name}</h2>
                <p className="text-xs text-slate-400">{fmt12(modal.period.start_time)} – {fmt12(modal.period.end_time)}</p>
              </div>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Subject</label>
                <select value={cellForm.subject_id} onChange={e => handleSubjectChange(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">— Free Period —</option>
                  {subjects.map(s => <option key={s._id} value={s._id}>{s.name}{s.code ? ` (${s.code})` : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Teacher</label>
                <select value={cellForm.teacher_id} onChange={e => setCellForm(f => ({ ...f, teacher_id: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">— Select Teacher —</option>
                  {teachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Room (optional)</label>
                <input value={cellForm.room} onChange={e => setCellForm(f => ({ ...f, room: e.target.value }))} placeholder="e.g. Lab 2, Room 101" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="flex gap-2 pt-1">
                {getEntry(modal.day, modal.period._id) && (
                  <button onClick={clearCell} className="px-4 py-2 text-red-500 border border-red-200 rounded-xl text-sm font-semibold hover:bg-red-50">Clear</button>
                )}
                <button onClick={() => setModal(null)} className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50">Cancel</button>
                <button onClick={saveCell} className="flex-1 bg-indigo-600 text-white py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
