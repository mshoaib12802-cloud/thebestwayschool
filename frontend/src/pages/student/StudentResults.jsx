import { useState, useEffect } from 'react';
import api from '../../services/api';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Award, CheckCircle2, XCircle, Calendar, TrendingUp, Zap, FileText, Clock } from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine
} from 'recharts';

const gradeColor = (grade) => {
  if (!grade || grade === 'F') return { bg: '#fef2f2', color: '#dc2626' };
  if (grade === 'AB') return { bg: '#f1f5f9', color: '#64748b' };
  if (grade.startsWith('A')) return { bg: '#f0fdf4', color: '#16a34a' };
  if (grade === 'B') return { bg: '#eff6ff', color: '#2563eb' };
  return { bg: '#fefce8', color: '#ca8a04' };
};

const TABS = [
  { id: 'regular', label: 'Exam Results', icon: <Award size={15}/> },
  { id: 'live',    label: 'Live Exams',   icon: <Zap size={15}/> },
  { id: 'report',  label: 'Report Card',  icon: <FileText size={15}/> },
];

const StudentResults = () => {
  const [tab, setTab]           = useState('regular');
  const [results, setResults]   = useState([]);
  const [liveRes, setLiveRes]   = useState([]);
  const [reportCard, setReport] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [genPdf, setGenPdf]     = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/student-portal/results'),
      api.get('/live-exams/student/results'),
      api.get('/student-portal/report-card'),
    ]).then(([r1, r2, r3]) => {
      setResults(r1.data);
      setLiveRes(Array.isArray(r2.data) ? r2.data : []);
      setReport(r3.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const downloadReportCardPDF = () => {
    if (!reportCard) return;
    setGenPdf(true);
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210;

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, W, 28, 'F');
    doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
    doc.text('INFLORESCENCE ADVANCE SKILLS', W / 2, 10, { align: 'center' });
    doc.setFontSize(10); doc.setTextColor(148, 163, 184);
    doc.text('Student Report Card', W / 2, 17, { align: 'center' });
    doc.setFontSize(8); doc.setTextColor(100, 116, 139);
    doc.text(`${reportCard.student?.full_name || ''} · Roll: ${reportCard.student?.roll_number || ''}`, W / 2, 24, { align: 'center' });

    let y = 34;
    for (const card of (reportCard.cards || [])) {
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(79, 70, 229);
      doc.text(card.course_name, 14, y); y += 6;

      doc.autoTable({
        startY: y,
        head: [['Exam', 'Type', 'Date', 'Marks', '%', 'Grade']],
        body: card.entries.map(e => [
          e.exam.title,
          e.exam.type || '—',
          e.exam.exam_date ? new Date(e.exam.exam_date).toLocaleDateString() : '—',
          e.result ? (e.result.is_absent ? 'Absent' : `${e.result.marks_obtained}/${e.exam.total_marks}`) : 'N/A',
          e.result && !e.result.is_absent ? `${e.result.pct}%` : '—',
          e.result ? (e.result.is_absent ? 'AB' : e.result.grade) : '—',
        ]),
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 14, right: 14 },
        theme: 'striped',
      });
      y = doc.lastAutoTable.finalY + 4;

      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
      doc.text(`Weighted Average: ${card.weightedAverage}%   Overall Grade: ${card.overallGrade}`, 14, y);
      y += 8;
    }

    doc.setFontSize(7); doc.setTextColor(148, 163, 184);
    doc.text(`Generated: ${new Date().toLocaleString()}`, W / 2, 287, { align: 'center' });
    doc.save(`Report_Card_${reportCard.student?.roll_number || 'student'}.pdf`);
    setGenPdf(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  const passed  = results.filter(r => r.grade !== 'F' && r.grade !== 'AB').length;
  const avgPct  = results.length > 0
    ? Math.round(results.filter(r => !r.is_absent).reduce((s, r) => s + (r.marks_obtained / (r.exam_id?.total_marks || 1)) * 100, 0) / (results.filter(r => !r.is_absent).length || 1))
    : 0;

  const chartData = [...results]
    .filter(r => r.exam_id?.exam_date && !r.is_absent)
    .sort((a, b) => new Date(a.exam_id.exam_date) - new Date(b.exam_id.exam_date))
    .map(r => ({
      name: r.exam_id.title.length > 14 ? r.exam_id.title.slice(0, 14) + '…' : r.exam_id.title,
      pct: Math.round((r.marks_obtained / r.exam_id.total_marks) * 100),
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
        <p className="text-slate-500 mt-1">Your academic performance</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${tab === t.id ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── Regular Exam Results ── */}
      {tab === 'regular' && (
        <div className="space-y-4">
          {results.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Exams Taken', value: results.length,   color: '#4f46e5', bg: '#ede9fe' },
                { label: 'Passed',      value: passed,           color: '#16a34a', bg: '#dcfce7' },
                { label: 'Avg Score',   value: `${avgPct}%`,     color: '#d97706', bg: '#fef3c7' },
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
                  <ReferenceLine y={50} stroke="#fca5a5" strokeDasharray="4 2" label={{ value: 'Pass', position: 'insideLeft', fontSize: 10, fill: '#f87171' }}/>
                  <Line type="monotone" dataKey="pct" stroke="#4f46e5" strokeWidth={2.5}
                    dot={{ fill: '#4f46e5', r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: '#4f46e5' }}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {results.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
              <Award size={44} className="text-slate-300 mx-auto mb-3"/>
              <p className="text-slate-500 font-medium">No exam results yet.</p>
              <p className="text-slate-400 text-sm mt-1">Your results will appear here once your teacher records them.</p>
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
                          : <span className="flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full"><XCircle size={12}/> Fail</span>
                      }
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm text-slate-500">{exam?.course_name}</p>
                      {exam?.batch_id?.name && (
                        <span style={{ background: '#0f172a', color: '#2dd4bf', fontSize: '0.65rem', fontWeight: 700, padding: '1px 8px', borderRadius: 999 }}>
                          {exam.batch_id.name}
                        </span>
                      )}
                    </div>
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
                        <div className="h-2 rounded-full transition-all" style={{
                          width: `${pct}%`,
                          background: pct >= 80 ? '#16a34a' : pct >= 50 ? '#4f46e5' : '#dc2626'
                        }}/>
                      </div>
                      <span className="text-xs font-bold text-slate-500">{pct}%</span>
                    </div>
                    {exam?.pass_marks > 0 && <p className="text-xs text-slate-400">Passing marks: {exam.pass_marks}</p>}
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

      {/* ── Live Exam Results ── */}
      {tab === 'live' && (
        <div className="space-y-4">
          {liveRes.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
              <Zap size={44} className="text-slate-300 mx-auto mb-3"/>
              <p className="text-slate-500 font-medium">No live exam attempts yet.</p>
              <p className="text-slate-400 text-sm mt-1">Your live exam results will appear here after you submit.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {(() => {
                  const sub  = liveRes.filter(a => a.status === 'submitted');
                  const avg  = sub.length ? Math.round(sub.reduce((s, a) => s + (a.score / (a.total_marks || 1)) * 100, 0) / sub.length) : 0;
                  const best = sub.length ? Math.max(...sub.map(a => Math.round((a.score / (a.total_marks || 1)) * 100))) : 0;
                  return [
                    { label: 'Attempted', value: liveRes.length, color: '#7c3aed', bg: '#f5f3ff' },
                    { label: 'Avg Score',  value: `${avg}%`,     color: '#0891b2', bg: '#e0f2fe' },
                    { label: 'Best Score', value: `${best}%`,    color: '#16a34a', bg: '#dcfce7' },
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
                        <p className="text-sm text-slate-500 ml-11">{attempt.exam_id?.course_name}</p>
                        {attempt.status !== 'in_progress' && (
                          <div className="flex items-center gap-3 mt-2 ml-11">
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                              <Clock size={11}/> {mins}m {secs}s
                            </span>
                          </div>
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
                        <div className="flex items-center gap-3 mb-1">
                          <div className="flex-1 bg-slate-200 rounded-full h-2">
                            <div className="h-2 rounded-full" style={{
                              width: `${pct}%`,
                              background: pct >= 80 ? '#16a34a' : pct >= 50 ? '#7c3aed' : '#dc2626'
                            }}/>
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

      {/* ── Report Card ── */}
      {tab === 'report' && (
        <div className="space-y-5">
          {!reportCard || reportCard.cards?.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
              <FileText size={44} className="text-slate-300 mx-auto mb-3"/>
              <p className="text-slate-500 font-medium">No report card data available yet.</p>
              <p className="text-slate-400 text-sm mt-1">Your report card will appear here once exam results are published.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-lg">{reportCard.student?.full_name}</h3>
                  <p className="text-sm text-slate-400">Roll No: {reportCard.student?.roll_number}</p>
                </div>
                <button onClick={downloadReportCardPDF} disabled={genPdf}
                  className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors disabled:opacity-60">
                  <FileText size={15}/>
                  {genPdf ? 'Generating...' : 'Download PDF'}
                </button>
              </div>

              {reportCard.cards.map(card => {
                const gc = gradeColor(card.overallGrade);
                return (
                  <div key={card.course_name} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    {/* Course header */}
                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <div>
                        <h4 className="font-extrabold text-slate-800">{card.course_name}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">{card.entries.length} exam{card.entries.length !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Weighted Avg</p>
                          <p className="text-xl font-extrabold" style={{ color: gc.color }}>{card.weightedAverage}%</p>
                        </div>
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-extrabold" style={{ background: gc.bg, color: gc.color }}>
                          {card.overallGrade}
                        </div>
                      </div>
                    </div>

                    {/* Exams table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr style={{ background: '#f8fafc' }}>
                            {['Exam', 'Type', 'Date', 'Marks', 'Score', 'Grade'].map((h, i) => (
                              <th key={i} style={{ padding: '8px 12px', textAlign: i === 0 ? 'left' : 'center', fontWeight: 700, color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {card.entries.map(({ exam, result }) => {
                            const gc2 = result ? gradeColor(result.is_absent ? 'AB' : result.grade) : { bg: '#f8fafc', color: '#94a3b8' };
                            return (
                              <tr key={exam._id} style={{ borderTop: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '8px 12px', fontWeight: 600, color: '#334155' }}>
                                  {exam.title}
                                  {exam.weightage_percent && exam.weightage_percent !== 100 && (
                                    <span style={{ fontSize: '0.6rem', background: '#ede9fe', color: '#7c3aed', fontWeight: 700, padding: '1px 5px', borderRadius: 4, marginLeft: 4 }}>
                                      {exam.weightage_percent}%
                                    </span>
                                  )}
                                </td>
                                <td style={{ padding: '8px 12px', textAlign: 'center', color: '#94a3b8', fontSize: '0.78rem', textTransform: 'capitalize' }}>{exam.type || '—'}</td>
                                <td style={{ padding: '8px 12px', textAlign: 'center', color: '#94a3b8', fontSize: '0.78rem' }}>
                                  {exam.exam_date ? new Date(exam.exam_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                                </td>
                                <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#334155' }}>
                                  {result ? (result.is_absent ? <span style={{ color: '#64748b' }}>Absent</span> : `${result.marks_obtained}/${exam.total_marks}`) : <span style={{ color: '#cbd5e1' }}>—</span>}
                                </td>
                                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                  {result && !result.is_absent ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                                      <div style={{ width: 48, height: 4, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${result.pct}%`, background: result.pct >= 80 ? '#16a34a' : result.pct >= 50 ? '#4f46e5' : '#dc2626', borderRadius: 4 }}/>
                                      </div>
                                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>{result.pct}%</span>
                                    </div>
                                  ) : <span style={{ color: '#cbd5e1' }}>—</span>}
                                </td>
                                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                  <span style={{ background: gc2.bg, color: gc2.color, fontWeight: 700, padding: '2px 10px', borderRadius: 20, fontSize: '0.78rem' }}>
                                    {result ? (result.is_absent ? 'AB' : result.grade) : '—'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
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
