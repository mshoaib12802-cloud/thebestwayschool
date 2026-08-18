import { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import {
  GraduationCap, Printer, ChevronDown, ChevronRight,
  CheckCircle2, XCircle, Users, TrendingUp, Award, BookOpen,
} from 'lucide-react';

/* ── helpers ─────────────────────────────────────────────────────────────── */
const GRADE_CFG = {
  'A+': { text: 'text-emerald-700', bg: 'bg-emerald-100',  bar: 'bg-emerald-500', label: 'Distinction' },
  'A':  { text: 'text-green-700',   bg: 'bg-green-100',    bar: 'bg-green-500',   label: 'Excellent'   },
  'B':  { text: 'text-blue-700',    bg: 'bg-blue-100',     bar: 'bg-blue-500',    label: 'Very Good'   },
  'C':  { text: 'text-amber-700',   bg: 'bg-amber-100',    bar: 'bg-amber-500',   label: 'Good'        },
  'D':  { text: 'text-orange-700',  bg: 'bg-orange-100',   bar: 'bg-orange-500',  label: 'Pass'        },
  'F':  { text: 'text-red-700',     bg: 'bg-red-100',      bar: 'bg-red-500',     label: 'Fail'        },
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

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function ParentResults() {
  const [children,  setChildren]  = useState([]);
  const [selected,  setSelected]  = useState('');
  const [cards,     setCards]     = useState([]);
  const [expanded,  setExpanded]  = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [cardsLoad, setCardsLoad] = useState(false);

  /* load children */
  useEffect(() => {
    api.get('/parent-portal/children')
      .then(r => {
        setChildren(r.data);
        if (r.data.length) setSelected(r.data[0]._id);
      })
      .catch(() => toast.error('Failed to load children'))
      .finally(() => setLoading(false));
  }, []);

  /* load cards for selected child */
  useEffect(() => {
    if (!selected) return;
    setCardsLoad(true);
    api.get(`/parent-portal/children/${selected}/report-cards`)
      .then(r => {
        setCards(r.data);
        if (r.data.length) setExpanded(r.data[0]._id);
      })
      .catch(() => toast.error('Failed to load report cards'))
      .finally(() => setCardsLoad(false));
  }, [selected]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-500"/>
    </div>
  );

  const child = children.find(c => c._id === selected);

  /* overall stats across all cards */
  const stats = (() => {
    if (!cards.length) return null;
    const avg = cards.reduce((s, c) => s + (c.percentage || 0), 0) / cards.length;
    const best = Math.max(...cards.map(c => c.percentage || 0));
    const passAll = cards.filter(c => (c.subject_marks || []).every(sm => sm.is_pass)).length;
    return { avg: avg.toFixed(1), best, passAll, total: cards.length };
  })();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-rose-100 p-2.5 rounded-xl">
          <GraduationCap size={22} className="text-rose-600"/>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Report Cards</h1>
          <p className="text-slate-500 text-sm">Academic performance records</p>
        </div>
      </div>

      {/* Child selector (if multiple children) */}
      {children.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {children.map(c => (
            <button key={c._id} onClick={() => setSelected(c._id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                selected === c._id
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}>
              <div className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-xs">
                {c.full_name?.[0]}
              </div>
              {c.full_name}
            </button>
          ))}
        </div>
      )}

      {cardsLoad ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"/>
        </div>
      ) : cards.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 text-center py-16">
          <GraduationCap size={48} className="text-slate-300 mx-auto mb-3"/>
          <p className="text-slate-500 font-semibold">No report cards yet</p>
          <p className="text-slate-400 text-sm mt-1">
            {child ? `${child.full_name}'s` : 'Your child\'s'} report cards will appear here once issued.
          </p>
        </div>
      ) : (
        <>
          {/* Latest result hero */}
          {cards[0] && (() => {
            const latest = cards[0];
            const gc = GRADE_CFG[latest.grade] || GRADE_CFG['F'];
            const allPass = (latest.subject_marks || []).every(sm => sm.is_pass);
            return (
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-5 text-white">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Latest Result</p>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <p className="text-xl font-extrabold">{child?.full_name}</p>
                    <p className="text-slate-400 text-sm">{latest.term} · {latest.academic_year_id?.label}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{latest.class_id?.name} {latest.class_id?.section ? '— ' + latest.class_id.section : ''}</p>
                  </div>
                  <div className="flex items-center gap-5">
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
                    <div className={`px-3 py-1.5 rounded-xl text-sm font-bold ${
                      allPass ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                    }`}>
                      {allPass ? '✓ Promoted' : '✗ Detained'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Stats row */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: BookOpen,    label: 'Cards Issued', value: stats.total,         color: 'text-primary',     bg: 'bg-primary/10'     },
                { icon: TrendingUp,  label: 'Average',      value: `${stats.avg}%`,      color: 'text-blue-600',    bg: 'bg-blue-50'        },
                { icon: Award,       label: 'Best Score',   value: `${stats.best}%`,     color: 'text-amber-600',   bg: 'bg-amber-50'       },
                { icon: CheckCircle2,label: 'Terms Passed', value: `${stats.passAll}/${stats.total}`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              ].map(({ icon: Icon, label, value, color, bg }) => (
                <div key={label} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm flex items-center gap-3">
                  <div className={`${bg} p-2.5 rounded-xl shrink-0`}><Icon size={18} className={color}/></div>
                  <div>
                    <p className="text-xs text-slate-400">{label}</p>
                    <p className={`text-lg font-bold ${color}`}>{value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Cards list */}
          <div className="space-y-3">
            {cards.map(card => {
              const gc      = GRADE_CFG[card.grade] || GRADE_CFG['F'];
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
                        <p className="text-sm text-slate-500">
                          {card.academic_year_id?.label} · {card.class_id?.name} {card.class_id?.section}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-slate-400">Score</p>
                        <p className="text-lg font-extrabold text-slate-800">{card.percentage}%</p>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-slate-400">Rank</p>
                        <p className="text-lg font-extrabold text-slate-700">{ordinal(card.position)}</p>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        allPass ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                      }`}>
                        {allPass ? 'Promoted' : 'Detained'}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={e => { e.stopPropagation(); printCard(card, child?.full_name || '', child?.roll_number || ''); }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                          <Printer size={15}/>
                        </button>
                        {isOpen
                          ? <ChevronDown size={16} className="text-slate-400"/>
                          : <ChevronRight size={16} className="text-slate-400"/>}
                      </div>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div className="border-t border-slate-100">
                      {/* Overall progress bar */}
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

                      {/* Subject table */}
                      <div className="px-5 pb-2">
                        <div className="rounded-xl overflow-hidden border border-slate-100">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-slate-800 text-white">
                                <th className="text-left px-4 py-2.5 text-xs font-semibold">Subject</th>
                                <th className="text-center px-3 py-2.5 text-xs font-semibold">Marks</th>
                                <th className="text-center px-3 py-2.5 text-xs font-semibold hidden sm:table-cell">Score</th>
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
                                          <div className={`h-1.5 rounded-full ${sgc.bar}`}
                                            style={{ width: `${Math.min(sPct, 100)}%` }}/>
                                        </div>
                                        <span className="text-xs text-slate-500 w-8 text-right">{sPct.toFixed(0)}%</span>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2.5 text-center">
                                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${sgc.bg} ${sgc.text}`}>
                                        {sm.grade}
                                      </span>
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

                      {/* Summary stats */}
                      <div className="grid grid-cols-4 gap-3 px-5 pb-5 mt-3">
                        {[
                          { label: 'Total Marks',    value: `${card.total_obtained}/${card.total_marks}` },
                          { label: 'Percentage',     value: `${card.percentage}%` },
                          { label: 'Class Position', value: ordinal(card.position) },
                          { label: 'Subjects',       value: card.subject_marks?.length || 0 },
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
          </div>
        </>
      )}
    </div>
  );
}
