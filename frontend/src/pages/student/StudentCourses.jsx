import { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  BookOpen, User, Clock, Calendar, CheckCircle2, Award,
  ChevronDown, ChevronUp, TrendingUp, Layers
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine
} from 'recharts';

const shiftColors = {
  Morning:   { bg: '#fef3c7', color: '#92400e' },
  Afternoon: { bg: '#dbeafe', color: '#1e40af' },
  Evening:   { bg: '#ede9fe', color: '#4c1d95' },
  Weekend:   { bg: '#dcfce7', color: '#14532d' },
};

const MODULE_STATUS = {
  completed:   { bg: '#dcfce7', color: '#15803d', label: 'Done' },
  in_progress: { bg: '#dbeafe', color: '#1d4ed8', label: 'In Progress' },
  upcoming:    { bg: '#f1f5f9', color: '#64748b', label: 'Upcoming' },
};

const LineTooltip = ({ active, payload, label }) => {
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

const StudentCourses = () => {
  const [courses, setCourses] = useState([]);
  const [modulesMap, setModulesMap] = useState({});   // course_name → module data
  const [resultsMap, setResultsMap] = useState({});   // course_name → sorted chart data
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});        // course_name → bool

  useEffect(() => {
    Promise.all([
      api.get('/student-portal/courses'),
      api.get('/student-portal/modules'),
      api.get('/student-portal/results'),
    ]).then(([cRes, mRes, rRes]) => {
      setCourses(cRes.data);

      // Index module data by course_name
      const mMap = {};
      mRes.data.forEach(m => { mMap[m.course_name] = m; });
      setModulesMap(mMap);

      // Index and sort results by course_name → chronological chart data
      const rMap = {};
      rRes.data.forEach(r => {
        if (!r.exam_id) return;
        const cn = r.exam_id.course_name;
        if (!rMap[cn]) rMap[cn] = [];
        rMap[cn].push(r);
      });
      Object.keys(rMap).forEach(cn => {
        rMap[cn] = rMap[cn]
          .filter(r => r.exam_id?.exam_date)
          .sort((a, b) => new Date(a.exam_id.exam_date) - new Date(b.exam_id.exam_date))
          .map(r => ({
            name: r.exam_id.title.length > 14 ? r.exam_id.title.slice(0, 14) + '…' : r.exam_id.title,
            pct: Math.round((r.marks_obtained / r.exam_id.total_marks) * 100),
            marks: `${r.marks_obtained}/${r.exam_id.total_marks}`,
            grade: r.grade,
          }));
      });
      setResultsMap(rMap);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const toggle = (name) => setExpanded(e => ({ ...e, [name]: !e[name] }));

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800">My Courses</h2>
        <p className="text-slate-500 mt-1">Your enrolled programs and course details</p>
      </div>

      {courses.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
          <BookOpen size={40} className="text-slate-300 mx-auto mb-3"/>
          <p className="text-slate-500">No courses found.</p>
        </div>
      ) : courses.map((course, idx) => {
        const sc = shiftColors[course.shift] || shiftColors.Morning;
        const admDate = course.admission_date
          ? new Date(course.admission_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
          : '—';
        const compDate = course.completion_date
          ? new Date(course.completion_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
          : null;
        const netFee = (course.total_fee || 0) - (course.discount_amount || 0);
        const isOpen = !!expanded[course.course_name];
        const modData = modulesMap[course.course_name];
        const chartData = resultsMap[course.course_name] || [];

        return (
          <div key={idx} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white">
                  <BookOpen size={26}/>
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-800">{course.course_name}</h3>
                  <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: sc.bg, color: sc.color }}>
                    {course.shift} Shift
                  </span>
                </div>
              </div>
              {compDate ? (
                <span className="flex items-center gap-1 text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full text-sm font-bold">
                  <CheckCircle2 size={14}/> Completed
                </span>
              ) : (
                <span className="flex items-center gap-1 text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-full text-sm font-bold">
                  Active
                </span>
              )}
            </div>

            {/* Info grid */}
            <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Duration</p>
                <div className="flex items-center gap-2 text-slate-700 font-semibold"><Clock size={16} className="text-indigo-400"/>{course.duration}</div>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Admission Date</p>
                <div className="flex items-center gap-2 text-slate-700 font-semibold"><Calendar size={16} className="text-indigo-400"/>{admDate}</div>
              </div>
              {compDate && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Completion Date</p>
                  <div className="flex items-center gap-2 text-slate-700 font-semibold"><Award size={16} className="text-green-500"/>{compDate}</div>
                </div>
              )}
              {course.trainer_id && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Trainer</p>
                  <div className="flex items-center gap-2 text-slate-700 font-semibold"><User size={16} className="text-indigo-400"/>{course.trainer_id?.name}</div>
                </div>
              )}
              {course.batch_id && (() => {
                const b = course.batch_id;
                const bsc = shiftColors[b.shift] || shiftColors.Morning;
                return (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Batch</p>
                    <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderRadius: '0.875rem', padding: '0.875rem 1.125rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: '#fff' }}>{b.name}</p>
                        {(b.start_date || b.end_date) && (
                          <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>
                            {b.start_date ? new Date(b.start_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '?'}
                            {' → '}
                            {b.end_date ? new Date(b.end_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Ongoing'}
                          </p>
                        )}
                      </div>
                      {b.shift && (
                        <span style={{ background: bsc.bg, color: bsc.color, padding: '4px 14px', borderRadius: 999, fontSize: '0.78rem', fontWeight: 700, flexShrink: 0 }}>
                          {b.shift} Shift
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Fee cards */}
            <div className="px-6 pb-4 grid grid-cols-3 gap-4">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Total Fee</p>
                <p className="text-xl font-extrabold text-slate-800">Rs. {(course.total_fee || 0).toLocaleString()}</p>
              </div>
              {course.discount_amount > 0 && (
                <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                  <p className="text-xs font-bold text-green-600 uppercase mb-1">Discount</p>
                  <p className="text-xl font-extrabold text-green-700">- Rs. {(course.discount_amount).toLocaleString()}</p>
                </div>
              )}
              <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                <p className="text-xs font-bold text-indigo-600 uppercase mb-1">Net Payable</p>
                <p className="text-xl font-extrabold text-indigo-700">Rs. {netFee.toLocaleString()}</p>
              </div>
              {course.monthly_fee > 0 && (
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                  <p className="text-xs font-bold text-amber-600 uppercase mb-1">Monthly Installment</p>
                  <p className="text-xl font-extrabold text-amber-700">Rs. {(course.monthly_fee).toLocaleString()}</p>
                </div>
              )}
            </div>

            {/* Installments */}
            {course.installments?.length > 0 && (
              <div className="px-6 pb-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Installment Plan</p>
                <div className="space-y-2">
                  {course.installments.map((inst, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50">
                      <div>
                        <p className="font-semibold text-slate-700 text-sm">{inst.label || `Installment ${i + 1}`}</p>
                        <p className="text-xs text-slate-400">{inst.due_date ? new Date(inst.due_date).toLocaleDateString() : '—'}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-800">Rs. {(inst.amount || 0).toLocaleString()}</span>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${inst.is_paid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {inst.is_paid ? '✓ Paid' : 'Unpaid'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Module progress summary bar (always visible if data exists) */}
            {modData && modData.total > 0 && (
              <div className="px-6 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Course Progress</p>
                  <span className="text-xs font-extrabold text-indigo-600">{modData.progress_pct}%</span>
                </div>
                <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-100">
                  {modData.completed > 0 && (
                    <div className="bg-emerald-500 transition-all" style={{ width: `${(modData.completed / modData.total) * 100}%` }}/>
                  )}
                  {modData.in_progress > 0 && (
                    <div className="bg-blue-400 transition-all" style={{ width: `${(modData.in_progress / modData.total) * 100}%` }}/>
                  )}
                </div>
                <div className="flex gap-4 mt-2">
                  {[
                    { label: 'Completed', val: modData.completed, color: '#15803d', dot: 'bg-emerald-500' },
                    { label: 'In Progress', val: modData.in_progress, color: '#1d4ed8', dot: 'bg-blue-400' },
                    { label: 'Upcoming', val: modData.upcoming, color: '#64748b', dot: 'bg-slate-300' },
                  ].map(s => (
                    <div key={s.label} className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${s.dot}`}/>
                      <span className="text-xs text-slate-500">{s.label}: <strong style={{ color: s.color }}>{s.val}</strong></span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expand / collapse toggle */}
            {(modData?.modules?.length > 0 || chartData.length >= 2) && (
              <button
                onClick={() => toggle(course.course_name)}
                className="w-full flex items-center justify-center gap-2 py-3 border-t border-slate-100 text-sm font-bold text-indigo-600 hover:bg-indigo-50 transition-colors">
                {isOpen ? <><ChevronUp size={16}/> Hide Details</> : <><ChevronDown size={16}/> View Details</>}
              </button>
            )}

            {/* Expanded analytics panel */}
            {isOpen && (
              <div className="border-t border-slate-100 px-6 py-5 space-y-6 bg-slate-50/50">

                {/* Exam performance chart */}
                {chartData.length >= 2 && (
                  <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                    <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                      <TrendingUp size={16} className="text-indigo-500"/> Exam Performance Trend
                    </h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false}/>
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} unit="%"/>
                        <Tooltip content={<LineTooltip/>}/>
                        <ReferenceLine y={50} stroke="#fca5a5" strokeDasharray="4 2"
                          label={{ value: 'Pass', position: 'insideLeft', fontSize: 10, fill: '#f87171' }}/>
                        <Line type="monotone" dataKey="pct" stroke="#4f46e5" strokeWidth={2.5}
                          dot={{ fill: '#4f46e5', r: 4, strokeWidth: 0 }}
                          activeDot={{ r: 6, fill: '#4f46e5' }}/>
                      </LineChart>
                    </ResponsiveContainer>

                    {/* Exam score summary pills */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {chartData.map((d, i) => (
                        <span key={i} className="text-xs font-bold px-3 py-1 rounded-full border"
                          style={{
                            background: d.pct >= 80 ? '#dcfce7' : d.pct >= 50 ? '#dbeafe' : '#fee2e2',
                            color:      d.pct >= 80 ? '#15803d' : d.pct >= 50 ? '#1d4ed8' : '#b91c1c',
                            borderColor: d.pct >= 80 ? '#bbf7d0' : d.pct >= 50 ? '#bfdbfe' : '#fecaca',
                          }}>
                          {d.name}: {d.pct}% ({d.grade})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Module list */}
                {modData?.modules?.length > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                    <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                      <Layers size={16} className="text-indigo-500"/> Course Modules
                    </h4>
                    <div className="space-y-2">
                      {modData.modules.map((mod, i) => {
                        const st = MODULE_STATUS[mod.status] || MODULE_STATUS.upcoming;
                        return (
                          <div key={mod._id || i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100">
                            <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold flex-shrink-0"
                              style={{ background: st.bg, color: st.color }}>
                              {i + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-700 text-sm truncate">{mod.title}</p>
                              {mod.description && <p className="text-xs text-slate-400 truncate mt-0.5">{mod.description}</p>}
                            </div>
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                              style={{ background: st.bg, color: st.color }}>
                              {st.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StudentCourses;
