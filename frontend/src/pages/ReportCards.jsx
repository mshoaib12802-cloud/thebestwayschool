import { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import {
  FileText, Plus, Trash2, X, Printer, Search,
  TrendingUp, Users, Award, BarChart3, Eye,
  Zap, RefreshCw, GraduationCap, CheckCircle2,
  XCircle, Star, ChevronRight, Download, BookOpen,
  Edit2, Save,
} from 'lucide-react';

const TERMS = ['Term 1', 'Term 2', 'Term 3', 'Mid-Term', 'Annual'];

const GRADE_CFG = {
  'A+': { text: 'text-emerald-700', bg: 'bg-emerald-100',  bar: 'bg-emerald-500', label: 'Distinction',  ring: 'ring-emerald-400' },
  'A':  { text: 'text-green-700',   bg: 'bg-green-100',    bar: 'bg-green-500',   label: 'Excellent',    ring: 'ring-green-400'   },
  'B':  { text: 'text-blue-700',    bg: 'bg-blue-100',     bar: 'bg-blue-500',    label: 'Very Good',    ring: 'ring-blue-400'    },
  'C':  { text: 'text-amber-700',   bg: 'bg-amber-100',    bar: 'bg-amber-500',   label: 'Good',         ring: 'ring-amber-400'   },
  'D':  { text: 'text-orange-700',  bg: 'bg-orange-100',   bar: 'bg-orange-500',  label: 'Pass',         ring: 'ring-orange-400'  },
  'F':  { text: 'text-red-700',     bg: 'bg-red-100',      bar: 'bg-red-500',     label: 'Fail',         ring: 'ring-red-400'     },
};

const getGrade = (pct) => {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';
  return 'F';
};

const ordinal = (n) => {
  if (!n) return '—';
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const pctColor = (pct) => {
  if (pct >= 80) return 'text-emerald-600';
  if (pct >= 60) return 'text-blue-600';
  if (pct >= 50) return 'text-amber-600';
  return 'text-red-600';
};

const pctBar = (pct) => {
  if (pct >= 80) return 'bg-emerald-500';
  if (pct >= 60) return 'bg-blue-500';
  if (pct >= 50) return 'bg-amber-500';
  return 'bg-red-500';
};

// ── Print in new window ───────────────────────────────────────────────────────
const printCard = (card) => {
  const win = window.open('', '_blank', 'width=850,height=1100');
  const allPass = (card.subject_marks || []).every(sm => sm.is_pass);
  const rows = (card.subject_marks || []).map((sm, i) => {
    const pct = sm.total_marks > 0 ? ((sm.obtained_marks / sm.total_marks) * 100).toFixed(1) : '0.0';
    return `<tr>
      <td style="padding:7px 10px;border-bottom:1px solid #e8ecf5;">${i + 1}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #e8ecf5;font-weight:600;">${sm.subject_name}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #e8ecf5;text-align:center;">${sm.total_marks}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #e8ecf5;text-align:center;font-weight:700;font-size:11pt;">${sm.obtained_marks}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #e8ecf5;text-align:center;">${pct}%</td>
      <td style="padding:7px 10px;border-bottom:1px solid #e8ecf5;text-align:center;font-weight:700;">${sm.grade}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #e8ecf5;text-align:center;font-weight:700;color:${sm.is_pass ? '#166534' : '#991b1b'};">${sm.is_pass ? 'PASS' : 'FAIL'}</td>
    </tr>`;
  }).join('');

  win.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>Report Card — ${card.student_id?.full_name || 'Student'}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Inter',sans-serif;background:#e8ecf2;display:flex;justify-content:center;padding:24px;}
  .page{width:210mm;background:white;box-shadow:0 8px 40px rgba(0,0,0,.18);position:relative;overflow:hidden;}

  /* ── Premium Header ── */
  .hdr{background:linear-gradient(135deg,#0b1528 0%,#162444 55%,#0b1528 100%);padding:20px 22px 16px;position:relative;}
  .hdr::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,#c9a84c,#c9a84c,transparent);}
  .hdr::after{content:'';position:absolute;bottom:0;left:0;right:0;height:1px;background:rgba(201,168,76,0.4);}
  .hdr-inner{display:flex;align-items:center;gap:18px;}
  .logo-circle{width:62px;height:62px;border-radius:50%;border:2.5px solid #c9a84c;overflow:hidden;background:#fff;flex-shrink:0;box-shadow:0 0 16px rgba(201,168,76,0.4);}
  .logo-circle img{width:100%;height:100%;object-fit:cover;}
  .school-info{flex:1;}
  .school{font-size:18pt;font-weight:900;color:#fff;letter-spacing:-0.01em;line-height:1.1;}
  .tagline{font-size:8pt;color:#c9a84c;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;margin-top:3px;}
  .doc-badge{background:linear-gradient(135deg,#c9a84c,#e8cc7a);border-radius:6px;padding:4px 14px;align-self:flex-start;margin-top:4px;}
  .doc-badge span{font-size:7.5pt;font-weight:900;color:#0b1528;letter-spacing:0.12em;text-transform:uppercase;}
  .doc-sub{font-size:8pt;color:rgba(255,255,255,0.5);margin-top:6px;}

  /* ── Body ── */
  .body{padding:14px 18px;}

  /* Watermark */
  .watermark{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-size:72pt;font-weight:900;color:rgba(11,21,40,0.04);pointer-events:none;letter-spacing:8px;white-space:nowrap;}

  /* Info grid */
  .info{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0;padding:12px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;border-left:3px solid #c9a84c;}
  .info-row{display:flex;align-items:baseline;gap:8px;}
  .lbl{font-size:8pt;color:#94a3b8;font-weight:700;min-width:90px;text-transform:uppercase;letter-spacing:0.05em;}
  .val{font-size:10pt;font-weight:700;color:#0b1528;flex:1;padding-left:4px;border-bottom:1px dotted #cbd5e1;}

  /* Section heading */
  .section-heading{display:flex;align-items:center;gap:8px;margin:14px 0 8px;}
  .section-heading::before{content:'';display:block;width:3px;height:16px;background:#c9a84c;border-radius:2px;flex-shrink:0;}
  .section-heading span{font-size:8pt;font-weight:800;color:#0b1528;text-transform:uppercase;letter-spacing:0.12em;}
  .section-heading::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,rgba(201,168,76,0.4),transparent);}

  /* Marks table */
  table{width:100%;border-collapse:collapse;font-size:9.5pt;}
  thead tr{background:#0b1528;}
  thead th{padding:7px 9px;text-align:left;color:#fff;font-weight:700;font-size:8pt;text-transform:uppercase;letter-spacing:0.05em;}
  thead th:not(:first-child):not(:nth-child(2)){text-align:center;}
  tbody tr:nth-child(even){background:#f8fafc;}
  tbody td{padding:7px 9px;border-bottom:1px solid #e8ecf5;font-size:9.5pt;}
  tfoot tr{background:linear-gradient(90deg,#0b1528,#162444);}
  tfoot td{padding:8px 9px;font-size:10pt;color:#fff;font-weight:700;}

  /* Summary band */
  .summ{display:flex;border:1.5px solid #0b1528;border-radius:8px;overflow:hidden;margin:14px 0;background:#0b1528;}
  .s{flex:1;text-align:center;padding:12px 6px;border-right:1px solid rgba(255,255,255,0.1);}
  .s:last-child{border-right:none;}
  .slbl{font-size:7pt;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.08em;font-weight:700;}
  .sval{font-size:18pt;font-weight:900;color:#fff;margin-top:4px;line-height:1;}
  .sval.grade{color:#c9a84c;}
  .sval.result{font-size:11pt;color:${allPass ? '#4ade80' : '#f87171'};}

  /* Remarks */
  .rmk{margin:12px 0;padding:10px 14px;border:1px solid #e2e8f0;border-radius:6px;border-left:3px solid #c9a84c;background:#fefce8;min-height:38px;font-size:10pt;}
  .rmk-lbl{font-size:7.5pt;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;}

  /* Signatures */
  .sigs{display:flex;gap:20px;margin-top:32px;}
  .sig{flex:1;text-align:center;}
  .sig-line{border-top:1.5px solid #0b1528;padding-top:5px;margin-top:44px;font-size:8.5pt;color:#64748b;font-weight:600;}

  /* Footer */
  .foot{margin-top:14px;text-align:center;font-size:7.5pt;color:#94a3b8;padding:8px;background:#f8fafc;border-top:1px solid #e2e8f0;}
  .foot strong{color:#c9a84c;}

  @media print{
    body{background:white;padding:0;}
    .page{box-shadow:none;}
    @page{size:A4;margin:6mm;}
  }
</style>
</head>
<body>
<div class="page">
  <div class="watermark">OFFICIAL</div>
  <div class="hdr">
    <div class="hdr-inner">
      <div class="logo-circle"><img src="/icons/icon-512.png" onerror="this.style.display='none'"/></div>
      <div class="school-info">
        <div class="school">The Best Way Public School</div>
        <div class="tagline">Excellence in Education</div>
        <div class="doc-sub">${card.term} &nbsp;·&nbsp; Academic Year: <strong style="color:#c9a84c;">${card.academic_year_id?.label || '—'}</strong></div>
      </div>
      <div class="doc-badge"><span>Report Card</span></div>
    </div>
  </div>
  <div class="body">
  <div class="section-heading"><span>Student Information</span></div>
  <div class="info">
    <div class="info-row"><span class="lbl">Student Name</span><span class="val">${card.student_id?.full_name || '—'}</span></div>
    <div class="info-row"><span class="lbl">Roll Number</span><span class="val">${card.student_id?.roll_number || '—'}</span></div>
    <div class="info-row"><span class="lbl">Class / Section</span><span class="val">${card.class_id?.name || '—'} ${card.class_id?.section ? '— ' + card.class_id.section : ''}</span></div>
    <div class="info-row"><span class="lbl">Date Issued</span><span class="val">${new Date().toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
  </div>
  <div class="section-heading"><span>Subject-wise Performance</span></div>
  <table>
    <thead>
      <tr>
        <th style="width:34px">#</th>
        <th>Subject</th>
        <th style="text-align:center">Total</th>
        <th style="text-align:center">Obtained</th>
        <th style="text-align:center">%</th>
        <th style="text-align:center">Grade</th>
        <th style="text-align:center">Result</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr>
        <td colspan="2">GRAND TOTAL</td>
        <td style="text-align:center">${card.total_marks}</td>
        <td style="text-align:center;font-size:12pt;">${card.total_obtained}</td>
        <td colspan="3"></td>
      </tr>
    </tfoot>
  </table>
  <div class="summ">
    <div class="s"><div class="slbl">Percentage</div><div class="sval">${card.percentage}%</div></div>
    <div class="s"><div class="slbl">Overall Grade</div><div class="sval grade">${card.grade}</div></div>
    <div class="s"><div class="slbl">Class Position</div><div class="sval">${ordinal(card.position)}</div></div>
    <div class="s"><div class="slbl">Final Result</div><div class="sval result">${allPass ? 'PROMOTED' : 'DETAINED'}</div></div>
  </div>
  <div class="rmk">
    <div class="rmk-lbl">Teacher's Remarks:</div>
    ${card.remarks || '<em style="color:#94a3b8;">No remarks provided.</em>'}
  </div>
  <div class="sigs">
    <div class="sig"><div class="sig-line">Class Teacher</div></div>
    <div class="sig"><div class="sig-line">Head of Department</div></div>
    <div class="sig"><div class="sig-line">Principal</div></div>
  </div>
  </div><!-- end .body -->
  <div class="foot">
    <strong>The Best Way Public School</strong> &nbsp;·&nbsp;
    Computer-generated document &nbsp;·&nbsp; For discrepancies contact school within 7 days of issuance.
  </div>
</div>
<script>window.onload=function(){window.print();}</script>
</body>
</html>`);
  win.document.close();
};

// ─────────────────────────────────────────────────────────────────────────────
export default function ReportCards() {
  const [cards,       setCards]       = useState([]);
  const [classes,     setClasses]     = useState([]);
  const [years,       setYears]       = useState([]);
  const [students,    setStudents]    = useState([]);
  const [subjects,    setSubjects]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');

  // filters
  const [fClass, setFClass] = useState('');
  const [fYear,  setFYear]  = useState('');
  const [fTerm,  setFTerm]  = useState('');

  // modals
  const [showForm, setShowForm] = useState(false);
  const [viewCard, setViewCard] = useState(null);
  const [showBulk, setShowBulk] = useState(false);
  const [editCard, setEditCard] = useState(null); // editing an existing card

  // create form
  const blankForm = { student_id: '', class_id: '', academic_year_id: '', term: 'Term 1', subject_marks: [], remarks: '' };
  const [form,     setForm]     = useState(blankForm);
  const [formLoad, setFormLoad] = useState(false);

  // bulk modal
  const [bulk,      setBulk]      = useState({ class_id: '', academic_year_id: '', term: 'Term 1' });
  const [bulkLoad,  setBulkLoad]  = useState(false);
  const [bulkCount, setBulkCount] = useState(null);

  // ── Load list ──────────────────────────────────────────────────────────────
  const load = async () => {
    try {
      const params = new URLSearchParams();
      if (fClass) params.set('class_id', fClass);
      if (fYear)  params.set('academic_year_id', fYear);
      if (fTerm)  params.set('term', fTerm);
      const [rc, c, y] = await Promise.all([
        api.get(`/report-cards?${params}`),
        api.get('/school-classes'),
        api.get('/academic-years'),
      ]);
      setCards(rc.data);
      setClasses(c.data);
      setYears(y.data);
    } catch { toast.error('Failed to load report cards'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [fClass, fYear, fTerm]);

  // ── When class selected in form ────────────────────────────────────────────
  const handleFormClass = async (classId) => {
    setForm(f => ({ ...f, class_id: classId, student_id: '', subject_marks: [] }));
    if (!classId) { setStudents([]); setSubjects([]); return; }
    setFormLoad(true);
    try {
      const [st, sub] = await Promise.all([
        api.get(`/school-classes/${classId}/students`),
        api.get(`/subjects?class_id=${classId}`),
      ]);
      setStudents(st.data);
      setSubjects(sub.data);
      setForm(f => ({
        ...f, class_id: classId,
        subject_marks: sub.data.map(s => ({
          subject_id: s._id, subject_name: s.name,
          obtained_marks: 0, total_marks: s.total_marks || 100, passing_marks: s.passing_marks || 40,
        })),
      }));
    } catch { toast.error('Failed to load class data'); }
    finally { setFormLoad(false); }
  };

  // ── Open edit modal ────────────────────────────────────────────────────────
  const openEdit = (card) => {
    setEditCard(card);
    setForm({
      student_id:       card.student_id?._id || '',
      class_id:         card.class_id?._id   || '',
      academic_year_id: card.academic_year_id?._id || '',
      term:             card.term,
      subject_marks:    card.subject_marks.map(sm => ({ ...sm })),
      remarks:          card.remarks || '',
    });
    setStudents([card.student_id]);
    setShowForm(true);
  };

  // ── Submit (create or update) ──────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let data;
      if (editCard) {
        const r = await api.patch(`/report-cards/${editCard._id}`, {
          subject_marks: form.subject_marks, remarks: form.remarks,
        });
        data = r.data;
        setCards(prev => prev.map(c => c._id === data._id ? data : c));
        toast.success('Report card updated');
      } else {
        const r = await api.post('/report-cards', form);
        data = r.data;
        setCards(prev => {
          const idx = prev.findIndex(c => c._id === data._id);
          return idx >= 0 ? prev.map(c => c._id === data._id ? data : c) : [data, ...prev];
        });
        toast.success('Report card saved');
      }
      closeForm();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditCard(null);
    setForm(blankForm);
    setStudents([]);
    setSubjects([]);
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this report card?')) return;
    try {
      await api.delete(`/report-cards/${id}`);
      setCards(prev => prev.filter(c => c._id !== id));
      toast.success('Deleted');
    } catch { toast.error('Failed to delete'); }
  };

  // ── Bulk generate ──────────────────────────────────────────────────────────
  const handleBulk = async (e) => {
    e.preventDefault();
    setBulkLoad(true);
    try {
      const r = await api.post('/report-cards/bulk-generate', bulk);
      setBulkCount(r.data.count);
      toast.success(r.data.message);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Bulk generation failed'); }
    finally { setBulkLoad(false); }
  };

  // ── Live stats ─────────────────────────────────────────────────────────────
  const stats = (() => {
    if (!cards.length) return null;
    const avgPct   = cards.reduce((s, c) => s + (c.percentage || 0), 0) / cards.length;
    const passRate = cards.filter(c => c.grade !== 'F').length / cards.length * 100;
    const classes  = new Set(cards.map(c => c.class_id?._id)).size;
    return { total: cards.length, avgPct: avgPct.toFixed(1), passRate: passRate.toFixed(0), classes };
  })();

  // ── Form live totals ───────────────────────────────────────────────────────
  const liveTotals = (() => {
    const marks = form.subject_marks;
    if (!marks.length) return null;
    const obtained = marks.reduce((s, m) => s + (Number(m.obtained_marks) || 0), 0);
    const total    = marks.reduce((s, m) => s + (Number(m.total_marks)    || 0), 0);
    const pct      = total > 0 ? (obtained / total * 100).toFixed(1) : '0.0';
    return { obtained, total, pct, grade: getGrade(Number(pct)) };
  })();

  // ── Filtered cards ─────────────────────────────────────────────────────────
  const visible = search.trim()
    ? cards.filter(c =>
        c.student_id?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.student_id?.roll_number?.toLowerCase().includes(search.toLowerCase()))
    : cards;

  // ── Bulk class preview ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!bulk.class_id) { setBulkCount(null); return; }
    api.get(`/school-classes/${bulk.class_id}/students`)
      .then(r => setBulkCount(r.data.length))
      .catch(() => {});
  }, [bulk.class_id]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
    </div>
  );

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <GraduationCap size={26} className="text-primary" /> Report Cards
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{cards.length} card{cards.length !== 1 ? 's' : ''} on record</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setBulkCount(null); setBulk({ class_id: '', academic_year_id: '', term: 'Term 1' }); setShowBulk(true); }}
            className="flex items-center gap-2 border border-primary text-primary px-4 py-2 rounded-xl font-semibold hover:bg-primary/5 transition-colors text-sm">
            <Zap size={16} /> Bulk Generate
          </button>
          <button onClick={() => { setEditCard(null); setForm(blankForm); setStudents([]); setSubjects([]); setShowForm(true); }}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-semibold hover:bg-primary/90 transition-colors text-sm shadow-sm">
            <Plus size={16} /> Create Card
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { icon: FileText,    label: 'Total Cards',    value: stats.total,        sub: 'records',    color: 'text-primary',      bg: 'bg-primary/10'      },
            { icon: TrendingUp,  label: 'Class Average',  value: `${stats.avgPct}%`, sub: 'percentage', color: 'text-blue-600',     bg: 'bg-blue-50'         },
            { icon: CheckCircle2,label: 'Pass Rate',      value: `${stats.passRate}%`,sub:'passing',    color: 'text-emerald-600',  bg: 'bg-emerald-50'      },
            { icon: BookOpen,    label: 'Classes',        value: stats.classes,      sub: 'covered',    color: 'text-amber-600',    bg: 'bg-amber-50'        },
          ].map(({ icon: Icon, label, value, sub, color, bg }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm flex items-center gap-3">
              <div className={`${bg} p-2.5 rounded-xl`}>
                <Icon size={20} className={color} />
              </div>
              <div>
                <p className="text-xs text-slate-500">{label}</p>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-slate-400">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Filters ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 mb-5 shadow-sm flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 flex-1 min-w-[180px] border border-slate-200 rounded-lg px-3 py-2">
          <Search size={14} className="text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search student…"
            className="text-sm flex-1 outline-none bg-transparent" />
        </div>
        <select value={fClass} onChange={e => setFClass(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
          <option value="">All Classes</option>
          {classes.map(c => <option key={c._id} value={c._id}>{c.name} — {c.section}</option>)}
        </select>
        <select value={fYear} onChange={e => setFYear(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
          <option value="">All Years</option>
          {years.map(y => <option key={y._id} value={y._id}>{y.label}</option>)}
        </select>
        <select value={fTerm} onChange={e => setFTerm(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
          <option value="">All Terms</option>
          {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        {(fClass || fYear || fTerm || search) && (
          <button onClick={() => { setFClass(''); setFYear(''); setFTerm(''); setSearch(''); }}
            className="text-xs text-slate-400 hover:text-rose-500 flex items-center gap-1">
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {/* ── Table ── */}
      {visible.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <GraduationCap size={52} className="mx-auto mb-3 opacity-25" />
          <p className="font-medium">No report cards found</p>
          <p className="text-sm mt-1">Create individual cards or use Bulk Generate for a whole class</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Student</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Class</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600 hidden md:table-cell">Term / Year</th>
                <th className="px-5 py-3 font-semibold text-slate-600">Score</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600">Grade</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Position</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {visible.map(c => {
                const gc = GRADE_CFG[c.grade] || GRADE_CFG['F'];
                return (
                  <tr key={c._id} className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                    onClick={() => setViewCard(c)}>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-800">{c.student_id?.full_name}</p>
                      <p className="text-xs text-slate-400">{c.student_id?.roll_number}</p>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 text-sm">
                      {c.class_id?.name}{c.class_id?.section ? ` — ${c.class_id.section}` : ''}
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <span className="text-slate-700 font-medium text-xs">{c.term}</span>
                      <p className="text-xs text-slate-400">{c.academic_year_id?.label}</p>
                    </td>
                    <td className="px-5 py-3.5 min-w-[130px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div className={`h-1.5 rounded-full ${pctBar(c.percentage)}`}
                            style={{ width: `${Math.min(c.percentage, 100)}%` }} />
                        </div>
                        <span className={`text-xs font-bold w-10 text-right ${pctColor(c.percentage)}`}>{c.percentage}%</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{c.total_obtained}/{c.total_marks} marks</p>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold ${gc.bg} ${gc.text}`}>
                        {c.grade}
                      </span>
                      <p className="text-xs text-slate-400 mt-0.5">{gc.label}</p>
                    </td>
                    <td className="px-4 py-3.5 text-center hidden md:table-cell">
                      <span className="text-sm font-bold text-slate-600">{ordinal(c.position)}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setViewCard(c)}
                          className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                          <Eye size={15} />
                        </button>
                        <button onClick={() => openEdit(c)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                          <Edit2 size={15} />
                        </button>
                        <button onClick={() => printCard(c)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Printer size={15} />
                        </button>
                        <button onClick={() => handleDelete(c._id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={15} />
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

      {/* ═══════════════════════════════════════════════════════════════════════
          VIEW MODAL — report card preview
      ═══════════════════════════════════════════════════════════════════════ */}
      {viewCard && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-xl">
                  <GraduationCap size={18} className="text-primary" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Report Card</p>
                  <p className="text-xs text-slate-500">{viewCard.term} · {viewCard.academic_year_id?.label}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => printCard(viewCard)}
                  className="flex items-center gap-1.5 text-sm border border-slate-200 text-slate-600 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors">
                  <Printer size={14} /> Print
                </button>
                <button onClick={() => setViewCard(null)} className="text-slate-400 hover:text-slate-700 p-1">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Card body */}
            <div className="p-6">
              {/* School header strip */}
              <div className="text-center bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-xl py-4 mb-5 border border-primary/20">
                <p className="text-base font-bold text-primary tracking-wide">INFLORESCENCE INSTITUTE</p>
                <p className="text-xs text-slate-500 mt-0.5">Cultivating Minds · Nurturing Futures</p>
                <p className="text-sm font-bold text-slate-700 mt-1.5 tracking-widest uppercase">
                  {viewCard.term} Report Card
                </p>
              </div>

              {/* Student info */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                {[
                  { label: 'Student Name', value: viewCard.student_id?.full_name },
                  { label: 'Roll Number',  value: viewCard.student_id?.roll_number },
                  { label: 'Class',        value: `${viewCard.class_id?.name || '—'}${viewCard.class_id?.section ? ' — ' + viewCard.class_id.section : ''}` },
                  { label: 'Academic Year',value: viewCard.academic_year_id?.label },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-50 rounded-xl px-4 py-3">
                    <p className="text-xs text-slate-400">{label}</p>
                    <p className="font-semibold text-slate-800 text-sm mt-0.5">{value || '—'}</p>
                  </div>
                ))}
              </div>

              {/* Subject marks */}
              <div className="rounded-xl overflow-hidden border border-slate-200 mb-5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-800 text-white">
                      <th className="text-left px-4 py-2.5 font-semibold">Subject</th>
                      <th className="text-center px-3 py-2.5 font-semibold">Marks</th>
                      <th className="text-center px-3 py-2.5 font-semibold hidden sm:table-cell">Score</th>
                      <th className="text-center px-3 py-2.5 font-semibold">Grade</th>
                      <th className="text-center px-3 py-2.5 font-semibold">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(viewCard.subject_marks || []).map((sm, i) => {
                      const subPct = sm.total_marks > 0 ? (sm.obtained_marks / sm.total_marks * 100) : 0;
                      const sgc    = GRADE_CFG[sm.grade] || GRADE_CFG['F'];
                      return (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                          <td className="px-4 py-2.5 font-medium text-slate-700">{sm.subject_name}</td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="font-bold text-slate-800">{sm.obtained_marks}</span>
                            <span className="text-slate-400 text-xs">/{sm.total_marks}</span>
                          </td>
                          <td className="px-3 py-2.5 hidden sm:table-cell">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                                <div className={`h-1.5 rounded-full ${sgc.bar}`}
                                  style={{ width: `${Math.min(subPct, 100)}%` }} />
                              </div>
                              <span className="text-xs text-slate-500 w-8 text-right">{subPct.toFixed(0)}%</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${sgc.bg} ${sgc.text}`}>{sm.grade}</span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {sm.is_pass
                              ? <span className="flex items-center justify-center gap-0.5 text-emerald-600 text-xs font-bold"><CheckCircle2 size={12}/> Pass</span>
                              : <span className="flex items-center justify-center gap-0.5 text-red-500 text-xs font-bold"><XCircle size={12}/> Fail</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Summary row */}
              {(() => {
                const gc  = GRADE_CFG[viewCard.grade] || GRADE_CFG['F'];
                const allPass = (viewCard.subject_marks || []).every(sm => sm.is_pass);
                return (
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-200">
                      <p className="text-xs text-slate-400">Percentage</p>
                      <p className={`text-2xl font-bold mt-1 ${pctColor(viewCard.percentage)}`}>{viewCard.percentage}%</p>
                    </div>
                    <div className={`rounded-xl p-3 text-center border ${gc.bg} border-opacity-50`}>
                      <p className="text-xs text-slate-500">Grade</p>
                      <p className={`text-3xl font-black mt-1 ${gc.text}`}>{viewCard.grade}</p>
                      <p className={`text-xs font-medium ${gc.text}`}>{gc.label}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-200">
                      <p className="text-xs text-slate-400">Position</p>
                      <p className="text-2xl font-bold mt-1 text-slate-700">{ordinal(viewCard.position)}</p>
                    </div>
                    <div className={`rounded-xl p-3 text-center border ${allPass ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                      <p className="text-xs text-slate-500">Result</p>
                      <p className={`text-sm font-black mt-1 ${allPass ? 'text-emerald-600' : 'text-red-600'}`}>
                        {allPass ? 'PROMOTED' : 'DETAINED'}
                      </p>
                      <p className="text-xs mt-0.5 text-slate-500">{viewCard.total_obtained}/{viewCard.total_marks}</p>
                    </div>
                  </div>
                );
              })()}

              {viewCard.remarks && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-slate-700">
                  <p className="text-xs font-semibold text-amber-700 mb-1">Teacher's Remarks</p>
                  {viewCard.remarks}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          CREATE / EDIT MODAL
      ═══════════════════════════════════════════════════════════════════════ */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                {editCard ? <><Edit2 size={16}/> Edit Report Card</> : <><Plus size={16}/> Create Report Card</>}
              </h2>
              <button onClick={closeForm} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Year + Term */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Academic Year *</label>
                  <select value={form.academic_year_id}
                    onChange={e => setForm(f => ({ ...f, academic_year_id: e.target.value }))}
                    disabled={!!editCard} required
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:bg-slate-50">
                    <option value="">Select year</option>
                    {years.map(y => <option key={y._id} value={y._id}>{y.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Term *</label>
                  <select value={form.term}
                    onChange={e => setForm(f => ({ ...f, term: e.target.value }))}
                    disabled={!!editCard}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:bg-slate-50">
                    {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Class */}
              {!editCard && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Class *</label>
                  <select value={form.class_id} onChange={e => handleFormClass(e.target.value)}
                    required disabled={formLoad}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                    <option value="">Select class</option>
                    {classes.map(c => <option key={c._id} value={c._id}>{c.name} — {c.section}</option>)}
                  </select>
                </div>
              )}

              {/* Student */}
              {!editCard && students.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Student *</label>
                  <select value={form.student_id}
                    onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))}
                    required
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                    <option value="">Select student</option>
                    {students.map(s => <option key={s._id} value={s._id}>{s.full_name} ({s.roll_number})</option>)}
                  </select>
                </div>
              )}

              {/* Subject marks */}
              {form.subject_marks.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-slate-600">Subject Marks</p>
                    {liveTotals && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-500">{liveTotals.obtained}/{liveTotals.total}</span>
                        <span className={`font-bold ${pctColor(Number(liveTotals.pct))}`}>{liveTotals.pct}%</span>
                        <span className={`px-2 py-0.5 rounded-full font-bold text-xs ${GRADE_CFG[liveTotals.grade]?.bg} ${GRADE_CFG[liveTotals.grade]?.text}`}>
                          {liveTotals.grade}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                    {form.subject_marks.map((sm, i) => {
                      const subPct = sm.total_marks > 0 ? (sm.obtained_marks / sm.total_marks * 100) : 0;
                      const sgc   = GRADE_CFG[getGrade(subPct)];
                      return (
                        <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
                          <span className="flex-1 text-sm font-medium text-slate-700 min-w-0 truncate">{sm.subject_name}</span>
                          <input type="number" min="0" max={sm.total_marks}
                            value={sm.obtained_marks}
                            onChange={e => {
                              const marks = [...form.subject_marks];
                              marks[i] = { ...marks[i], obtained_marks: Number(e.target.value) };
                              setForm(f => ({ ...f, subject_marks: marks }));
                            }}
                            className="w-20 border border-slate-200 bg-white rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/40" />
                          <span className="text-slate-400 text-xs w-10">/ {sm.total_marks}</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full min-w-[32px] text-center ${sgc?.bg} ${sgc?.text}`}>
                            {getGrade(subPct)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Remarks */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Teacher's Remarks</label>
                <textarea value={form.remarks}
                  onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
                  rows={2} placeholder="Optional remarks for the student…"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" />
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeForm}
                  className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl font-semibold hover:bg-slate-50 text-sm">
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 bg-primary text-white py-2.5 rounded-xl font-semibold hover:bg-primary/90 text-sm flex items-center justify-center gap-2 shadow-sm">
                  <Save size={15} /> {editCard ? 'Update Card' : 'Save Report Card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          BULK GENERATE MODAL
      ═══════════════════════════════════════════════════════════════════════ */}
      {showBulk && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="bg-amber-100 p-2 rounded-xl"><Zap size={18} className="text-amber-600" /></div>
                <div>
                  <h2 className="font-bold text-slate-800">Bulk Generate</h2>
                  <p className="text-xs text-slate-500">Create report cards for an entire class</p>
                </div>
              </div>
              <button onClick={() => setShowBulk(false)} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
            </div>

            <form onSubmit={handleBulk} className="p-6 space-y-4">
              {/* Info banner */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
                <p className="font-semibold mb-1">How it works</p>
                <ul className="space-y-0.5 text-xs text-blue-600 list-disc list-inside">
                  <li>Fetches all active students in the selected class</li>
                  <li>Auto-imports marks from Marks Entry for this class + term</li>
                  <li>Creates or updates each student's report card</li>
                  <li>Recalculates class positions automatically</li>
                </ul>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Academic Year *</label>
                <select value={bulk.academic_year_id}
                  onChange={e => setBulk(b => ({ ...b, academic_year_id: e.target.value }))}
                  required className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                  <option value="">Select year</option>
                  {years.map(y => <option key={y._id} value={y._id}>{y.label}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Class *</label>
                  <select value={bulk.class_id}
                    onChange={e => setBulk(b => ({ ...b, class_id: e.target.value }))}
                    required className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                    <option value="">Select class</option>
                    {classes.map(c => <option key={c._id} value={c._id}>{c.name} — {c.section}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Term *</label>
                  <select value={bulk.term}
                    onChange={e => setBulk(b => ({ ...b, term: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                    {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {bulkCount !== null && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-3">
                  <Users size={18} className="text-emerald-600" />
                  <p className="text-sm text-emerald-700">
                    <span className="font-bold">{bulkCount} student{bulkCount !== 1 ? 's' : ''}</span> found in this class
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowBulk(false)}
                  className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl font-semibold hover:bg-slate-50 text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={bulkLoad}
                  className="flex-1 bg-amber-500 text-white py-2.5 rounded-xl font-semibold hover:bg-amber-600 text-sm flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm">
                  {bulkLoad
                    ? <><RefreshCw size={15} className="animate-spin" /> Generating…</>
                    : <><Zap size={15} /> Generate All Cards</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
