import { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  Award, CheckCircle2, XCircle, Calendar, TrendingUp,
  Zap, FileText, Clock, GraduationCap, Printer, ChevronDown,
  ChevronRight, BarChart3, Star, BookOpen,
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts';

/* ── helpers ──────────────────────────────────────────────────────────────── */
const GRADE_CFG = {
  'A+': { text: 'text-emerald-700', bg: 'bg-emerald-100',  bar: 'bg-emerald-500', label: 'Distinction' },
  'A':  { text: 'text-green-700',   bg: 'bg-green-100',    bar: 'bg-green-500',   label: 'Excellent'   },
  'B':  { text: 'text-blue-700',    bg: 'bg-blue-100',     bar: 'bg-blue-500',    label: 'Very Good'   },
  'C':  { text: 'text-amber-700',   bg: 'bg-amber-100',    bar: 'bg-amber-500',   label: 'Good'        },
  'D':  { text: 'text-orange-700',  bg: 'bg-orange-100',   bar: 'bg-orange-500',  label: 'Pass'        },
  'F':  { text: 'text-red-700',     bg: 'bg-red-100',      bar: 'bg-red-500',     label: 'Fail'        },
};

const gradeColor = (g) => {
  if (!g || g === 'F')    return { bg: '#fef2f2', color: '#dc2626' };
  if (g === 'AB')         return { bg: '#f1f5f9', color: '#64748b' };
  if (g.startsWith('A')) return { bg: '#f0fdf4', color: '#16a34a' };
  if (g === 'B')          return { bg: '#eff6ff', color: '#2563eb' };
  return { bg: '#fefce8', color: '#ca8a04' };
};

const ordinal = (n) => {
  if (!n) return '—';
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const pctBarColor = (p) =>
  p >= 80 ? '#16a34a' : p >= 60 ? '#2563eb' : p >= 50 ? '#d97706' : '#dc2626';

/* ── print ───────────────────────────────────────────────────────────────── */
const printCard = (card, studentName, rollNumber) => {
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

  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<title>Report Card — ${studentName}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Times New Roman',serif;background:#f0f0f0;display:flex;justify-content:center;padding:24px;}
.page{width:210mm;background:white;padding:16mm 18mm;box-shadow:0 4px 24px rgba(0,0,0,.12);}
.hdr{text-align:center;border-bottom:3px double #1a365d;padding-bottom:14px;margin-bottom:18px;}
.school{font-size:24pt;font-weight:bold;color:#1a365d;}
.tagline{font-size:10pt;color:#666;margin-top:3px;}
.title{font-size:17pt;font-weight:bold;color:#b91c1c;margin-top:10px;letter-spacing:3px;text-transform:uppercase;}
.subtitle{font-size:10pt;color:#555;margin-top:3px;}
.info{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0;padding:12px 14px;background:#f8faff;border:1px solid #cbd5e1;border-radius:5px;}
.info-row{display:flex;gap:8px;align-items:baseline;}
.lbl{font-size:9pt;color:#64748b;min-width:90px;}
.val{font-size:10.5pt;font-weight:700;color:#1e3a5f;border-bottom:1px dotted #b0b8cc;flex:1;padding-left:4px;}
table{width:100%;border-collapse:collapse;margin:14px 0;font-size:10pt;}
thead tr{background:#1a365d;color:white;}
thead th{padding:8px 10px;text-align:left;}
thead th:not(:first-child):not(:nth-child(2)){text-align:center;}
tbody tr:nth-child(even){background:#f8faff;}
tfoot tr{background:#e8ecf5;font-weight:bold;}
tfoot td{padding:8px 10px;}
.summ{display:flex;border:2px solid #1a365d;border-radius:6px;overflow:hidden;margin:14px 0;}
.s{flex:1;text-align:center;padding:12px 8px;border-right:1px solid #cbd5e1;}
.s:last-child{border-right:none;}
.slbl{font-size:8pt;color:#64748b;text-transform:uppercase;letter-spacing:.5px;}
.sval{font-size:20pt;font-weight:bold;color:#1a365d;margin-top:4px;line-height:1;}
.sval.grade{color:#b91c1c;}
.sval.result{font-size:13pt;color:${allPass ? '#166534' : '#991b1b'};}
.rmk{margin:12px 0;padding:10px 12px;border:1px solid #cbd5e1;border-radius:4px;background:#fefce8;min-height:38px;font-size:10pt;}
.rmk-lbl{font-size:8.5pt;color:#64748b;margin-bottom:3px;}
.sigs{display:flex;gap:24px;margin-top:36px;}
.sig{flex:1;text-align:center;}
.sig-line{border-top:1px solid #334155;padding-top:5px;margin-top:48px;font-size:9pt;color:#555;}
.foot{margin-top:18px;text-align:center;font-size:8pt;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:8px;}
@media print{body{background:white;padding:0;}.page{box-shadow:none;padding:10mm 12mm;}@page{size:A4;margin:8mm;}}
</style></head><body>
<div class="page">
  <div class="hdr">
    <div class="school">INFLORESCENCE INSTITUTE</div>
    <div class="tagline">Cultivating Minds · Nurturing Futures · Building Leaders</div>
    <div class="title">Report Card</div>
    <div class="subtitle">${card.term} &nbsp;|&nbsp; Academic Year: <strong>${card.academic_year_id?.label || '—'}</strong></div>
  </div>
  <div class="info">
    <div class="info-row"><span class="lbl">Student Name:</span><span class="val">${studentName}</span></div>
    <div class="info-row"><span class="lbl">Roll Number:</span><span class="val">${rollNumber}</span></div>
    <div class="info-row"><span class="lbl">Class / Section:</span><span class="val">${card.class_id?.name || '—'} ${card.class_id?.section ? '— ' + card.class_id.section : ''}</span></div>
    <div class="info-row"><span class="lbl">Date Issued:</span><span class="val">${new Date().toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
  </div>
  <table>
    <thead><tr><th style="width:34px">#</th><th>Subject</th><th style="text-align:center">Total</th><th style="text-align:center">Obtained</th><th style="text-align:center">%</th><th style="text-align:center">Grade</th><th style="text-align:center">Result</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr><td colspan="2">GRAND TOTAL</td><td style="text-align:center">${card.total_marks}</td><td style="text-align:center;font-size:12pt;">${card.total_obtained}</td><td colspan="3"></td></tr></tfoot>
  </table>
  <div class="summ">
    <div class="s"><div class="slbl">Percentage</div><div class="sval">${card.percentage}%</div></div>
    <div class="s"><div class="slbl">Overall Grade</div><div class="sval grade">${card.grade}</div></div>
    <div class="s"><div class="slbl">Position</div><div class="sval">${ordinal(card.position)}</div></div>
    <div class="s"><div class="slbl">Result</div><div class="sval result">${allPass ? 'PROMOTED' : 'DETAINED'}</div></div>
  </div>
  <div class="rmk"><div class="rmk-lbl">Teacher's Remarks:</div>${card.remarks || '<em style="color:#94a3b8;">No remarks.</em>'}</div>
  <div class="sigs"><div class="sig"><div class="sig-line">Class Teacher</div></div><div class="sig"><div class="sig-line">Head of Department</div></div><div class="sig"><div class="sig-line">Principal</div></div></div>
  <div class="foot">This is a computer-generated document. For discrepancies contact the school within 7 days.</div>
</div>
<script>window.onload=function(){window.print();}</script>
</body></html>`);
  win.document.close();
};

/* ── Tabs ─────────────────────────────────────────────────────────────────── */
const TABS = [
  { id: 'school',   label: 'Report Card',   icon: <GraduationCap size={15}/> },
  { id: 'regular',  label: 'Exam Results',  icon: <Award size={15}/> },
  { id: 'live',     label: 'Live Exams',    icon: <Zap size={15}/> },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
const StudentResults = () => {
  const [tab,        setTab]        = useState('school');
  const [results,    setResults]    = useState([]);
  const [liveRes,    setLiveRes]    = useState([]);
  const [schoolCards,setSchoolCards]= useState([]);
  const [student,    setStudent]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [expanded,   setExpanded]   = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/student-portal/results'),
      api.get('/live-exams/student/results'),
      api.get('/student-portal/school-report-cards'),
      api.get('/student-portal/profile'),
    ]).then(([r1, r2, r3, r4]) => {
      setResults(r1.data);
      setLiveRes(Array.isArray(r2.data) ? r2.data : []);
      setSchoolCards(r3.data || []);
      setStudent(r4.data);
      if (r3.data?.length) setExpanded(r3.data[0]._id);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  /* ── exam stats ── */
  const passed  = results.filter(r => r.grade !== 'F' && r.grade !== 'AB').length;
  const avgPct  = results.length > 0
    ? Math.round(results.filter(r => !r.is_absent).reduce((s, r) => s + (r.marks_obtained / (r.exam_id?.total_marks || 1)) * 100, 0) / (results.filter(r => !r.is_absent).length || 1))
    : 0;
  const chartData = [...results]
    .filter(r => r.exam_id?.exam_date && !r.is_absent)
    .sort((a, b) => new Date(a.exam_id.exam_date) - new Date(b.exam_id.exam_date))
    .map(r => ({
      name:  r.exam_id.title.length > 14 ? r.exam_id.title.slice(0, 14) + '…' : r.exam_id.title,
      pct:   Math.round((r.marks_obtained / r.exam_id.total_marks) * 100),
      marks: `${r.marks_obtained}/${r.exam_id.total_marks}`,
      grade: r.grade,
    }));

  const ChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-sm">
        <p className="font-bold text-slate-800 mb-1">{label}</p>
        <p className="text-indigo-600 font-bold">{d.pct}%</p>
        <p className="text-slate-500">{d.marks} — Grade: <span className="font-bold">{d.grade}</span></p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800">Results & Report Card</h2>
        <p className="text-slate-500 mt-1">Your academic performance overview</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
              tab === t.id ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
            }`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ══ SCHOOL REPORT CARD TAB ══════════════════════════════════════════ */}
      {tab === 'school' && (
        <div className="space-y-4">
          {schoolCards.length === 0 ? (
            <div className="bg-white rounded-2xl p-14 text-center border border-slate-100">
              <GraduationCap size={48} className="text-slate-300 mx-auto mb-3"/>
              <p className="text-slate-500 font-semibold">No report cards issued yet</p>
              <p className="text-slate-400 text-sm mt-1">Your report card will appear here once your teacher issues it.</p>
            </div>
          ) : (
            <>
              {/* Summary strip */}
              {schoolCards.length > 0 && (() => {
                const latest = schoolCards[0];
                const gc = GRADE_CFG[latest.grade] || GRADE_CFG['F'];
                const allPass = (latest.subject_marks || []).every(sm => sm.is_pass);
                return (
                  <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-5 text-white">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Latest Result</p>
                        <p className="text-xl font-extrabold mt-1">{latest.term} · {latest.academic_year_id?.label}</p>
                        <p className="text-slate-400 text-sm">{latest.class_id?.name} {latest.class_id?.section ? '— ' + latest.class_id.section : ''}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-slate-400 text-xs">Score</p>
                          <p className="text-3xl font-black">{latest.percentage}%</p>
                        </div>
                        <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center ${gc.bg}`}>
                          <p className={`text-2xl font-black ${gc.text}`}>{latest.grade}</p>
                          <p className={`text-xs font-bold ${gc.text}`}>{gc.label}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-slate-400 text-xs">Rank</p>
                          <p className="text-2xl font-black">{ordinal(latest.position)}</p>
                        </div>
                        <div className={`px-3 py-1.5 rounded-xl text-sm font-bold ${allPass ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                          {allPass ? '✓ Promoted' : '✗ Detained'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* All cards */}
              {schoolCards.map(card => {
                const gc = GRADE_CFG[card.grade] || GRADE_CFG['F'];
                const allPass = (card.subject_marks || []).every(sm => sm.is_pass);
                const isOpen  = expanded === card._id;

                return (
                  <div key={card._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    {/* Card header */}
                    <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => setExpanded(isOpen ? null : card._id)}>
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 ${gc.bg}`}>
                          <span className={`text-xl font-black ${gc.text}`}>{card.grade}</span>
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{card.term}</p>
                          <p className="text-sm text-slate-500">{card.academic_year_id?.label} · {card.class_id?.name} {card.class_id?.section}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-slate-400">Score</p>
                          <p className="text-lg font-extrabold text-slate-800">{card.percentage}%</p>
                        </div>
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-slate-400">Position</p>
                          <p className="text-lg font-extrabold text-slate-700">{ordinal(card.position)}</p>
                        </div>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${allPass ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                          {allPass ? 'Promoted' : 'Detained'}
                        </span>
                        <div className="flex items-center gap-1">
                          <button onClick={e => { e.stopPropagation(); printCard(card, student?.full_name || '', student?.roll_number || ''); }}
                            className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                            <Printer size={15}/>
                          </button>
                          {isOpen ? <ChevronDown size={16} className="text-slate-400"/> : <ChevronRight size={16} className="text-slate-400"/>}
                        </div>
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isOpen && (
                      <div className="border-t border-slate-100">
                        {/* Progress bar */}
                        <div className="px-5 pt-4 pb-2">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                              <div className="h-2.5 rounded-full transition-all"
                                style={{ width: `${Math.min(card.percentage, 100)}%`, background: pctBarColor(card.percentage) }}/>
                            </div>
                            <span className="text-sm font-bold text-slate-600 w-12 text-right">{card.percentage}%</span>
                          </div>
                          <div className="flex justify-between text-xs text-slate-400 mt-1">
                            <span>{card.total_obtained} / {card.total_marks} marks</span>
                            <span>Passing: 50%</span>
                          </div>
                        </div>

                        {/* Subjects */}
                        <div className="px-5 pb-2">
                          <div className="rounded-xl overflow-hidden border border-slate-100">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-slate-800 text-white">
                                  <th className="text-left px-4 py-2.5 text-xs font-semibold">Subject</th>
                                  <th className="text-center px-3 py-2.5 text-xs font-semibold">Marks</th>
                                  <th className="text-center px-3 py-2.5 text-xs font-semibold hidden sm:table-cell">Progress</th>
                                  <th className="text-center px-3 py-2.5 text-xs font-semibold">Grade</th>
                                  <th className="text-center px-3 py-2.5 text-xs font-semibold">Result</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                {(card.subject_marks || []).map((sm, i) => {
                                  const sPct = sm.total_marks > 0 ? (sm.obtained_marks / sm.total_marks * 100) : 0;
                                  const sgc  = GRADE_CFG[sm.grade] || GRADE_CFG['F'];
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
                                            <div className={`h-1.5 rounded-full ${sgc.bar}`} style={{ width: `${Math.min(sPct, 100)}%` }}/>
                                          </div>
                                          <span className="text-xs text-slate-500 w-8 text-right">{sPct.toFixed(0)}%</span>
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
                        </div>

                        {/* Stats row */}
                        <div className="grid grid-cols-4 gap-3 px-5 pb-5 mt-3">
                          {[
                            { label: 'Total Marks',   value: `${card.total_obtained}/${card.total_marks}` },
                            { label: 'Percentage',    value: `${card.percentage}%` },
                            { label: 'Class Position',value: ordinal(card.position) },
                            { label: 'Subjects',      value: card.subject_marks?.length || 0 },
                          ].map(({ label, value }) => (
                            <div key={label} className="bg-slate-50 rounded-xl px-3 py-2.5 text-center border border-slate-100">
                              <p className="text-xs text-slate-400">{label}</p>
                              <p className="font-bold text-slate-700 text-sm mt-0.5">{value}</p>
                            </div>
                          ))}
                        </div>

                        {card.remarks && (
                          <div className="mx-5 mb-5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-slate-700">
                            <p className="text-xs font-semibold text-amber-700 mb-1">Teacher's Remarks</p>
                            {card.remarks}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* ══ REGULAR EXAM RESULTS TAB ════════════════════════════════════════ */}
      {tab === 'regular' && (
        <div className="space-y-4">
          {results.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Exams Taken', value: results.length, color: '#4f46e5', bg: '#ede9fe' },
                { label: 'Passed',      value: passed,          color: '#16a34a', bg: '#dcfce7' },
                { label: 'Avg Score',   value: `${avgPct}%`,    color: '#d97706', bg: '#fef3c7' },
              ].map(s => (
                <div key={s.label} className="rounded-2xl p-5 border border-slate-100 bg-white shadow-sm text-center">
                  <p className="text-3xl font-extrabold mb-1" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
                </div>
              ))}
            </div>
          )}
          {chartData.length >= 2 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={18} className="text-indigo-500"/>
                <h3 className="font-bold text-slate-800">Performance Trend</h3>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false}/>
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} unit="%"/>
                  <Tooltip content={<ChartTooltip/>}/>
                  <ReferenceLine y={50} stroke="#fca5a5" strokeDasharray="4 2"
                    label={{ value: 'Pass', position: 'insideLeft', fontSize: 10, fill: '#f87171' }}/>
                  <Line type="monotone" dataKey="pct" stroke="#4f46e5" strokeWidth={2.5}
                    dot={{ fill: '#4f46e5', r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          {results.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
              <Award size={44} className="text-slate-300 mx-auto mb-3"/>
              <p className="text-slate-500 font-medium">No exam results yet.</p>
            </div>
          ) : results.map(r => {
            const exam = r.exam_id;
            const pct  = exam && !r.is_absent ? Math.round((r.marks_obtained / exam.total_marks) * 100) : 0;
            const gc   = gradeColor(r.grade);
            const pass = r.grade !== 'F' && r.grade !== 'AB';
            return (
              <div key={r._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-slate-800 text-lg">{exam?.title}</h3>
                      {r.is_absent
                        ? <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">Absent</span>
                        : pass
                          ? <span className="flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full"><CheckCircle2 size={12}/> Pass</span>
                          : <span className="flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full"><XCircle size={12}/> Fail</span>}
                    </div>
                    <p className="text-sm text-slate-500">{exam?.course_name}</p>
                    {exam?.exam_date && (
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                        <Calendar size={12}/>
                        {new Date(exam.exam_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                  <div className="text-center ml-6">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-extrabold" style={{ background: gc.bg, color: gc.color }}>
                      {r.grade || '—'}
                    </div>
                    <p className="text-xs font-bold text-slate-500 mt-1">
                      {r.is_absent ? 'AB' : `${r.marks_obtained}/${exam?.total_marks}`}
                    </p>
                  </div>
                </div>
                {!r.is_absent && (
                  <div className="px-5 pb-4">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="flex-1 bg-slate-200 rounded-full h-2">
                        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: pctBarColor(pct) }}/>
                      </div>
                      <span className="text-xs font-bold text-slate-500">{pct}%</span>
                    </div>
                    {r.remarks && (
                      <p className="text-sm text-slate-600 mt-2 bg-slate-50 rounded-xl px-3 py-2 italic">"{r.remarks}"</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ══ LIVE EXAM RESULTS TAB ═══════════════════════════════════════════ */}
      {tab === 'live' && (
        <div className="space-y-4">
          {liveRes.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
              <Zap size={44} className="text-slate-300 mx-auto mb-3"/>
              <p className="text-slate-500 font-medium">No live exam attempts yet.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {(() => {
                  const sub  = liveRes.filter(a => a.status === 'submitted');
                  const avg  = sub.length ? Math.round(sub.reduce((s, a) => s + (a.score / (a.total_marks || 1)) * 100, 0) / sub.length) : 0;
                  const best = sub.length ? Math.max(...sub.map(a => Math.round((a.score / (a.total_marks || 1)) * 100))) : 0;
                  return [
                    { label: 'Attempted',  value: liveRes.length, color: '#7c3aed', bg: '#f5f3ff' },
                    { label: 'Avg Score',  value: `${avg}%`,       color: '#0891b2', bg: '#e0f2fe' },
                    { label: 'Best Score', value: `${best}%`,      color: '#16a34a', bg: '#dcfce7' },
                  ].map(s => (
                    <div key={s.label} className="rounded-2xl p-5 border border-slate-100 bg-white shadow-sm text-center">
                      <p className="text-3xl font-extrabold mb-1" style={{ color: s.color }}>{s.value}</p>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
                    </div>
                  ));
                })()}
              </div>
              {liveRes.map(attempt => {
                const pct = attempt.total_marks > 0 ? Math.round((attempt.score / attempt.total_marks) * 100) : 0;
                const gc  = gradeColor(attempt.grade);
                const mins = Math.floor((attempt.time_taken_seconds || 0) / 60);
                const secs = (attempt.time_taken_seconds || 0) % 60;
                return (
                  <div key={attempt._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center">
                            <Zap size={16} className="text-violet-600"/>
                          </div>
                          <h3 className="font-bold text-slate-800">{attempt.exam_id?.title || 'Live Exam'}</h3>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 12,
                            background: attempt.status === 'submitted' ? '#dcfce7' : attempt.status === 'timed_out' ? '#fef2f2' : '#fef3c7',
                            color: attempt.status === 'submitted' ? '#16a34a' : attempt.status === 'timed_out' ? '#dc2626' : '#d97706'
                          }}>{attempt.status === 'timed_out' ? 'Timed Out' : attempt.status}</span>
                        </div>
                        {attempt.status !== 'in_progress' && (
                          <span className="flex items-center gap-1 text-xs text-slate-400 ml-11">
                            <Clock size={11}/> {mins}m {secs}s
                          </span>
                        )}
                      </div>
                      <div className="text-center ml-4">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-extrabold" style={{ background: gc.bg, color: gc.color }}>
                          {attempt.grade || '—'}
                        </div>
                        <p className="text-xs font-bold text-slate-500 mt-1">{attempt.score}/{attempt.total_marks}</p>
                      </div>
                    </div>
                    {attempt.status !== 'in_progress' && (
                      <div className="mt-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-slate-200 rounded-full h-2">
                            <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: pctBarColor(pct) }}/>
                          </div>
                          <span className="text-xs font-bold text-slate-500">{pct}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentResults;
