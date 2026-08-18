import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import {
  Grid3X3, Plus, Eye, Trash2, X, Printer, RefreshCw, Shuffle,
  Users, BookOpen, Calendar, ChevronRight, LayoutGrid, Search,
  CheckCircle2, AlertCircle, Hash, GraduationCap, Filter,
  Download, Layers,
} from 'lucide-react';

const inputCls  = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-indigo-400 focus:bg-white transition-colors';
const labelCls  = 'block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1';

const ARRANGEMENTS = [
  {
    id: 'sequential',
    label: 'Roll Number Order',
    icon: Hash,
    desc: 'Students assigned seat by seat in roll number order, row by row.',
    color: 'indigo',
  },
  {
    id: 'random',
    label: 'Randomised',
    icon: Shuffle,
    desc: 'Students shuffled randomly. Best for anti-copying.',
    color: 'violet',
  },
  {
    id: 'serpentine',
    label: 'Serpentine (Snake)',
    icon: LayoutGrid,
    desc: 'Row 1 left→right, Row 2 right→left, alternating. Separates adjacent roll numbers.',
    color: 'sky',
  },
  {
    id: 'column_wise',
    label: 'Column-wise',
    icon: Layers,
    desc: 'Fills top-to-bottom per column then moves to next column.',
    color: 'emerald',
  },
];

const CLASS_COLORS = [
  'bg-indigo-100 text-indigo-700 border-indigo-200',
  'bg-violet-100 text-violet-700 border-violet-200',
  'bg-sky-100 text-sky-700 border-sky-200',
  'bg-emerald-100 text-emerald-700 border-emerald-200',
  'bg-amber-100 text-amber-700 border-amber-200',
  'bg-rose-100 text-rose-700 border-rose-200',
];

const initForm = {
  exam_label: '', class_ids: [], academic_year_id: '',
  room_name: '', date: '', rows: 5, columns: 6,
  arrangement: 'sequential',
};

export default function ExamSeating() {
  const [plans, setPlans]         = useState([]);
  const [loading, setLoading]     = useState(false);
  const [classes, setClasses]     = useState([]);
  const [years, setYears]         = useState([]);
  const [students, setStudents]   = useState([]);   // preview list
  const [stuLoading, setStuLoading] = useState(false);

  const [showCreate, setShowCreate]   = useState(false);
  const [showView, setShowView]       = useState(false);
  const [form, setForm]               = useState(initForm);
  const [creating, setCreating]       = useState(false);
  const [viewPlan, setViewPlan]       = useState(null);
  const [reshuffling, setReshuffling] = useState(false);

  // filters for list
  const [filterClass, setFilterClass] = useState('');
  const [filterYear, setFilterYear]   = useState('');
  const [search, setSearch]           = useState('');

  const printRef = useRef();

  useEffect(() => { fetchPlans(); fetchClasses(); fetchYears(); }, []);

  useEffect(() => {
    document.body.style.overflow = (showCreate || showView) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showCreate, showView]);

  // Preview student count when class selection changes
  useEffect(() => {
    if (!form.class_ids.length) { setStudents([]); return; }
    fetchPreviewStudents();
  }, [form.class_ids, form.academic_year_id]);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterClass) params.class_id = filterClass;
      if (filterYear) params.academic_year_id = filterYear;
      const { data } = await api.get('/seating-plans', { params });
      setPlans(data);
    } catch { toast.error('Failed to load seating plans'); }
    finally { setLoading(false); }
  };

  const fetchClasses = async () => {
    try { const { data } = await api.get('/school-classes'); setClasses(data); } catch { /* */ }
  };
  const fetchYears = async () => {
    try { const { data } = await api.get('/academic-years'); setYears(data); } catch { /* */ }
  };

  const fetchPreviewStudents = async () => {
    setStuLoading(true);
    try {
      const params = {};
      if (form.academic_year_id) params.academic_year_id = form.academic_year_id;
      // fetch students for each selected class
      const results = await Promise.all(
        form.class_ids.map(cid => api.get('/students', { params: { class_id: cid, ...params } }))
      );
      const all = results.flatMap(r => r.data || []);
      setStudents(all);
    } catch { setStudents([]); }
    finally { setStuLoading(false); }
  };

  const toggleClass = (id) => {
    setForm(f => ({
      ...f,
      class_ids: f.class_ids.includes(id)
        ? f.class_ids.filter(c => c !== id)
        : [...f.class_ids, id],
    }));
  };

  const create = async (e) => {
    e.preventDefault();
    if (!form.class_ids.length) { toast.warn('Select at least one class'); return; }
    setCreating(true);
    try {
      await api.post('/seating-plans', {
        ...form,
        class_ids: form.class_ids,
        class_id: form.class_ids[0],
        rows: parseInt(form.rows),
        columns: parseInt(form.columns),
      });
      toast.success('Seating plan generated');
      setShowCreate(false);
      setForm(initForm);
      fetchPlans();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to generate'); }
    finally { setCreating(false); }
  };

  const deletePlan = async (id) => {
    if (!window.confirm('Delete this seating plan?')) return;
    try { await api.delete(`/seating-plans/${id}`); toast.success('Deleted'); fetchPlans(); }
    catch { toast.error('Failed to delete'); }
  };

  const openView = async (plan) => {
    try {
      const { data } = await api.get(`/seating-plans/${plan._id}`);
      setViewPlan(data);
      setShowView(true);
    } catch { toast.error('Failed to load seating details'); }
  };

  const reshuffle = async () => {
    if (!viewPlan) return;
    setReshuffling(true);
    try {
      const { data } = await api.post(`/seating-plans/${viewPlan._id}/reshuffle`);
      setViewPlan(data);
      toast.success('Seats reshuffled');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to reshuffle'); }
    finally { setReshuffling(false); }
  };

  const handlePrint = () => {
    if (!viewPlan) return;
    const rows = viewPlan.rows;
    const cols = viewPlan.columns;
    const seats = viewPlan.seats || [];
    const getSeat = (r, c) => seats.find(s => s.row_no === r && s.column_no === c);

    // Build a clean HTML table for print
    let tableHtml = `<table style="width:100%;border-collapse:collapse;font-size:11px;">`;
    for (let r = 1; r <= rows; r++) {
      tableHtml += `<tr>`;
      for (let c = 1; c <= cols; c++) {
        const s = getSeat(r, c);
        tableHtml += `
          <td style="border:1px solid #999;padding:6px;text-align:center;min-width:80px;min-height:60px;vertical-align:middle;">
            <div style="font-size:9px;color:#666;margin-bottom:2px;">Seat ${r}-${c}</div>
            ${s?.student_id
              ? `<div style="font-weight:bold;font-size:11px;">${s.student_name}</div>
                 <div style="font-size:9px;color:#555;">${s.roll_number}</div>
                 ${s.class_name ? `<div style="font-size:8px;color:#888;">${s.class_name}</div>` : ''}`
              : `<div style="color:#ccc;font-size:9px;">Empty</div>`}
          </td>`;
      }
      tableHtml += `</tr>`;
    }
    tableHtml += `</table>`;

    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><title>${viewPlan.exam_label} — ${viewPlan.room_name}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 16px; }
        h2 { text-align:center; margin-bottom:4px; font-size:16px; }
        .sub { text-align:center; font-size:11px; color:#555; margin-bottom:12px; }
        .stats { display:flex; gap:20px; justify-content:center; margin-bottom:12px; font-size:11px; color:#333; }
        @media print { body { padding:8px; } }
      </style></head><body>
      <h2>${viewPlan.exam_label}</h2>
      <div class="sub">Room: ${viewPlan.room_name} &nbsp;|&nbsp; ${viewPlan.rows} Rows × ${viewPlan.columns} Columns &nbsp;|&nbsp; ${viewPlan.date ? new Date(viewPlan.date).toLocaleDateString() : ''}</div>
      <div class="stats">
        <span>Total Seats: <b>${viewPlan.rows * viewPlan.columns}</b></span>
        <span>Occupied: <b>${viewPlan.students_count || seats.filter(s => s.student_id).length}</b></span>
        <span>Empty: <b>${viewPlan.rows * viewPlan.columns - (viewPlan.students_count || seats.filter(s => s.student_id).length)}</b></span>
      </div>
      <div style="text-align:center;font-size:10px;color:#888;margin-bottom:8px;">⬆ BLACKBOARD / FRONT</div>
      ${tableHtml}
      <script>window.print();</script>
    </body></html>`);
    win.document.close();
  };

  // derived for view modal
  const seats    = viewPlan?.seats || [];
  const vRows    = viewPlan?.rows    || 1;
  const vCols    = viewPlan?.columns || 1;
  const getSeat  = (r, c) => seats.find(s => s.row_no === r && s.column_no === c);
  const occupied = seats.filter(s => s.student_id).length;
  const empty    = vRows * vCols - occupied;
  const fillPct  = vRows * vCols > 0 ? Math.round((occupied / (vRows * vCols)) * 100) : 0;

  // unique class names in this plan (for color coding)
  const planClasses = [...new Set(seats.map(s => s.class_name).filter(Boolean))];
  const classColorMap = Object.fromEntries(planClasses.map((c, i) => [c, CLASS_COLORS[i % CLASS_COLORS.length]]));

  // filtered plans
  const filteredPlans = plans.filter(p => {
    if (!search) return true;
    return (p.exam_label || '').toLowerCase().includes(search.toLowerCase()) ||
           (p.room_name  || '').toLowerCase().includes(search.toLowerCase());
  });

  const capacity = (parseInt(form.rows) || 0) * (parseInt(form.columns) || 0);
  const overflow = students.length > capacity;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow">
            <Grid3X3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Exam Seating</h1>
            <p className="text-sm text-slate-500">Generate, view, and print seating arrangements</p>
          </div>
        </div>
        <button onClick={() => { setForm(initForm); setStudents([]); setShowCreate(true); }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 text-sm shadow transition-colors">
          <Plus className="w-4 h-4" /> New Seating Plan
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Plans',        value: plans.length,                                               color: 'indigo' },
          { label: 'Total Students Seated', value: plans.reduce((s, p) => s + (p.students_count || 0), 0), color: 'emerald' },
          { label: 'Rooms Used',         value: [...new Set(plans.map(p => p.room_name))].length,           color: 'sky' },
          { label: 'Exams Covered',      value: [...new Set(plans.map(p => p.exam_label))].length,          color: 'violet' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className={`text-2xl font-bold text-${s.color}-600`}>{s.value}</div>
            <div className="text-xs text-slate-500 font-semibold mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Filters + Search ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 flex-1 min-w-[180px] border border-slate-200">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search exam or room…" className="bg-transparent outline-none text-sm text-slate-700 flex-1" />
        </div>
        <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-indigo-400">
          <option value="">All Classes</option>
          {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-indigo-400">
          <option value="">All Years</option>
          {years.map(y => <option key={y._id} value={y._id}>{y.label || y.name}</option>)}
        </select>
        <button onClick={fetchPlans} disabled={loading}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-indigo-700 text-sm transition-colors disabled:opacity-60">
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Filter className="w-4 h-4" />} Load
        </button>
      </div>

      {/* ── Plans Table ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-bold text-slate-700">Seating Plans</h2>
          <span className="text-xs text-slate-400">{filteredPlans.length} plan{filteredPlans.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" /></div>
        ) : filteredPlans.length === 0 ? (
          <div className="text-center py-16">
            <Grid3X3 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <div className="text-slate-400 font-semibold">No seating plans yet</div>
            <div className="text-slate-400 text-sm mt-1">Create a plan to assign seats for an exam.</div>
            <button onClick={() => { setForm(initForm); setStudents([]); setShowCreate(true); }}
              className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-indigo-700 text-sm transition-colors">
              Create First Plan
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Exam</th>
                  <th className="text-left px-5 py-3">Class(es)</th>
                  <th className="text-left px-5 py-3">Room</th>
                  <th className="text-left px-5 py-3">Date</th>
                  <th className="text-center px-5 py-3">Grid</th>
                  <th className="text-center px-5 py-3">Students</th>
                  <th className="text-left px-5 py-3">Arrangement</th>
                  <th className="text-right px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredPlans.map(p => {
                  const classNames = p.class_ids?.length
                    ? p.class_ids.map(c => c?.name || '—').join(', ')
                    : p.class_id?.name || '—';
                  const arr = ARRANGEMENTS.find(a => a.id === p.arrangement);
                  return (
                    <tr key={p._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-slate-800">{p.exam_label}</td>
                      <td className="px-5 py-3.5 text-slate-600 max-w-[160px] truncate">{classNames}</td>
                      <td className="px-5 py-3.5 text-slate-600">{p.room_name}</td>
                      <td className="px-5 py-3.5 text-slate-500">
                        {p.date ? new Date(p.date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg font-mono font-semibold">
                          {p.rows}×{p.columns}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="text-sm font-bold text-indigo-600">{p.students_count ?? 0}</span>
                        <span className="text-xs text-slate-400 ml-1">/ {p.rows * p.columns}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        {arr && (
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full bg-${arr.color}-50 text-${arr.color}-700`}>
                            {arr.label}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openView(p)}
                            className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors">
                            <Eye className="w-3.5 h-3.5" /> View
                          </button>
                          <button onClick={() => deletePlan(p._id)}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── CREATE MODAL ── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-slate-800">New Seating Plan</h2>
                <p className="text-xs text-slate-400 mt-0.5">Auto-assigns students to seats based on your settings</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={create} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 space-y-5">

                {/* Exam details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Exam Label *</label>
                    <input required value={form.exam_label}
                      onChange={e => setForm(f => ({ ...f, exam_label: e.target.value }))}
                      className={inputCls} placeholder="e.g. Mid-Term 2026, Final Exam" />
                  </div>
                  <div>
                    <label className={labelCls}>Academic Year</label>
                    <select value={form.academic_year_id}
                      onChange={e => setForm(f => ({ ...f, academic_year_id: e.target.value }))}
                      className={inputCls}>
                      <option value="">Select Year</option>
                      {years.map(y => <option key={y._id} value={y._id}>{y.label || y.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Room / Hall Name *</label>
                    <input required value={form.room_name}
                      onChange={e => setForm(f => ({ ...f, room_name: e.target.value }))}
                      className={inputCls} placeholder="e.g. Hall A, Room 101" />
                  </div>
                  <div>
                    <label className={labelCls}>Exam Date</label>
                    <input type="date" value={form.date}
                      onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                      className={inputCls} />
                  </div>
                </div>

                {/* Class Selection */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={labelCls}>Select Class(es) *</label>
                    {form.class_ids.length > 0 && (
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                        {form.class_ids.length} selected
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {classes.map(c => {
                      const sel = form.class_ids.includes(c._id);
                      return (
                        <button key={c._id} type="button" onClick={() => toggleClass(c._id)}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all text-left ${
                            sel
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                              : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                          }`}>
                          <GraduationCap className={`w-4 h-4 shrink-0 ${sel ? 'text-indigo-500' : 'text-slate-400'}`} />
                          <span className="flex-1 truncate">{c.name}</span>
                          {sel && <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />}
                        </button>
                      );
                    })}
                    {classes.length === 0 && (
                      <div className="col-span-3 text-sm text-slate-400 text-center py-4">No classes found. Create classes first.</div>
                    )}
                  </div>
                  {/* Student preview */}
                  {form.class_ids.length > 0 && (
                    <div className={`mt-3 flex items-center gap-2 p-3 rounded-xl text-sm font-semibold ${
                      stuLoading ? 'bg-slate-50 text-slate-500' :
                      overflow ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {stuLoading ? (
                        <><RefreshCw className="w-4 h-4 animate-spin" /> Loading students…</>
                      ) : (
                        <>
                          {overflow ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                          <span>
                            {students.length} students selected.
                            {overflow
                              ? ` Grid capacity (${capacity}) is too small — increase rows/columns.`
                              : ` ${capacity - students.length} seats will remain empty.`}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Grid size */}
                <div>
                  <label className={labelCls}>Room Grid Size</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Rows (front → back)</label>
                      <input required type="number" min="1" max="20" value={form.rows}
                        onChange={e => setForm(f => ({ ...f, rows: e.target.value }))}
                        className={inputCls} />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Columns (left → right)</label>
                      <input required type="number" min="1" max="20" value={form.columns}
                        onChange={e => setForm(f => ({ ...f, columns: e.target.value }))}
                        className={inputCls} />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 bg-slate-50 rounded-xl p-3 text-xs text-slate-600">
                    <LayoutGrid className="w-4 h-4 text-slate-400" />
                    <span>Grid: <strong>{form.rows} × {form.columns}</strong> = <strong>{capacity} total seats</strong></span>
                  </div>
                </div>

                {/* Arrangement */}
                <div>
                  <label className={labelCls}>Seating Arrangement</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {ARRANGEMENTS.map(a => (
                      <button key={a.id} type="button"
                        onClick={() => setForm(f => ({ ...f, arrangement: a.id }))}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                          form.arrangement === a.id
                            ? `border-${a.color}-500 bg-${a.color}-50`
                            : 'border-slate-200 hover:border-slate-300'
                        }`}>
                        <div className={`flex items-center gap-2 font-semibold text-sm mb-1 ${form.arrangement === a.id ? `text-${a.color}-700` : 'text-slate-700'}`}>
                          <a.icon className="w-4 h-4" /> {a.label}
                        </div>
                        <div className="text-xs text-slate-500">{a.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-5 border-t border-slate-100 flex gap-3 shrink-0">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 text-sm transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={creating || overflow || !form.class_ids.length}
                  className="flex-1 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 text-sm disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                  {creating
                    ? <><RefreshCw className="w-4 h-4 animate-spin" /> Generating…</>
                    : <><Grid3X3 className="w-4 h-4" /> Generate Seating Plan</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── VIEW / PRINT MODAL ── */}
      {showView && viewPlan && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col">
            {/* View Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-slate-800">{viewPlan.exam_label} — {viewPlan.room_name}</h2>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                  <span>{vRows} rows × {vCols} columns</span>
                  {viewPlan.date && <span>· {new Date(viewPlan.date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}</span>}
                  {viewPlan.arrangement && <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-semibold capitalize">{viewPlan.arrangement}</span>}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={reshuffle} disabled={reshuffling}
                  className="flex items-center gap-2 bg-violet-100 text-violet-700 hover:bg-violet-200 px-3 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60">
                  {reshuffling ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shuffle className="w-4 h-4" />}
                  Reshuffle
                </button>
                <button onClick={handlePrint}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">
                  <Printer className="w-4 h-4" /> Print
                </button>
                <button onClick={() => setShowView(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            </div>

            {/* Stats bar */}
            <div className="flex items-center gap-4 px-5 py-3 bg-slate-50 border-b border-slate-100 shrink-0 flex-wrap">
              <div className="flex items-center gap-1.5 text-sm">
                <div className="w-3 h-3 rounded bg-indigo-500" />
                <span className="font-semibold text-indigo-600">{occupied}</span>
                <span className="text-slate-500">Occupied</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <div className="w-3 h-3 rounded bg-slate-200" />
                <span className="font-semibold text-slate-500">{empty}</span>
                <span className="text-slate-500">Empty</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <span className="font-semibold text-emerald-600">{fillPct}%</span>
                <span className="text-slate-500">Fill Rate</span>
              </div>
              {/* Class color legend */}
              {planClasses.length > 1 && (
                <div className="ml-auto flex flex-wrap gap-2">
                  {planClasses.map(cn => (
                    <span key={cn} className={`text-xs font-bold px-2 py-0.5 rounded-full border ${classColorMap[cn]}`}>{cn}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Blackboard label */}
            <div className="text-center py-2 bg-slate-800 text-white text-xs font-bold tracking-widest shrink-0">
              ⬛ BLACKBOARD / FRONT OF ROOM
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-auto p-5" ref={printRef}>
              <div
                className="grid gap-1.5"
                style={{ gridTemplateColumns: `repeat(${vCols}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: vRows }).map((_, ri) =>
                  Array.from({ length: vCols }).map((_, ci) => {
                    const seat = getSeat(ri + 1, ci + 1);
                    const occupied = !!seat?.student_id;
                    const colorCls = occupied && seat.class_name && planClasses.length > 1
                      ? classColorMap[seat.class_name]
                      : occupied ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-300 border-slate-100';

                    return (
                      <div key={`${ri}-${ci}`}
                        className={`border rounded-xl p-2 text-center min-h-[72px] flex flex-col items-center justify-center transition-all ${colorCls}`}>
                        <div className="text-[9px] font-bold opacity-60 mb-1">
                          {ri + 1}-{ci + 1}
                        </div>
                        {occupied ? (
                          <>
                            <div className="text-[11px] font-bold leading-tight line-clamp-2">
                              {seat.student_name}
                            </div>
                            <div className="text-[9px] font-mono mt-0.5 opacity-70">
                              {seat.roll_number}
                            </div>
                            {seat.class_name && planClasses.length > 1 && (
                              <div className="text-[8px] mt-0.5 opacity-60 font-semibold">
                                {seat.class_name}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-[10px] opacity-40 font-medium">Empty</div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
