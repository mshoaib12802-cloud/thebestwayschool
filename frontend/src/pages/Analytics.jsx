import { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Users, GraduationCap, TrendingUp, Banknote, AlertTriangle,
  CheckCircle2, BarChart3, RefreshCw, BookOpen, Calendar,
  ArrowUpRight, ArrowDownRight, Target,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceLine,
} from 'recharts';

const GRADE_COLORS = {
  'A+': '#10b981', 'A': '#22c55e', 'B': '#3b82f6',
  'C': '#f59e0b', 'D': '#f97316', 'F': '#ef4444',
};

const fmt = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
const fmtPKR = (n) => n >= 1000000 ? `Rs.${(n/1000000).toFixed(1)}M` : n >= 1000 ? `Rs.${(n/1000).toFixed(0)}k` : `Rs.${n}`;

const ChartTooltipStyle = {
  background: '#fff', border: '1px solid #e2e8f0',
  borderRadius: 12, padding: '8px 14px', fontSize: 12,
  boxShadow: '0 4px 12px rgba(0,0,0,.08)',
};

export default function Analytics() {
  const [overview,   setOverview]   = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [fees,       setFees]       = useState([]);
  const [academic,   setAcademic]   = useState(null);
  const [atRisk,     setAtRisk]     = useState([]);
  const [enrollment, setEnrollment] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAll = async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const [ov, att, fee, acad, risk, enr] = await Promise.all([
        api.get('/analytics/overview'),
        api.get('/analytics/attendance?months=6'),
        api.get('/analytics/fees?months=6'),
        api.get('/analytics/academic'),
        api.get('/analytics/at-risk'),
        api.get('/analytics/enrollment'),
      ]);
      setOverview(ov.data);
      setAttendance(att.data);
      setFees(fee.data);
      setAcademic(acad.data);
      setAtRisk(risk.data);
      setEnrollment(enr.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { loadAll(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"/>
    </div>
  );

  const highRisk   = atRisk.filter(s => s.risk === 'high').length;
  const mediumRisk = atRisk.filter(s => s.risk === 'medium').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 size={26} className="text-primary"/> Analytics Dashboard
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Real-time school performance overview</p>
        </div>
        <button onClick={() => loadAll(true)} disabled={refreshing}
          className="flex items-center gap-2 border border-slate-200 text-slate-600 px-3 py-2 rounded-xl text-sm hover:bg-slate-50 transition-colors">
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''}/> Refresh
        </button>
      </div>

      {/* ── KPI Cards ── */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              icon: Users,         label: 'Total Students',
              value: overview.totalStudents,
              sub: `${overview.totalClasses} classes`,
              color: 'text-blue-600', bg: 'bg-blue-50',
            },
            {
              icon: CheckCircle2,  label: "Today's Attendance",
              value: overview.todayAttendance !== null ? `${overview.todayAttendance}%` : 'Not marked',
              sub: `${overview.todayPresent}/${overview.todayMarked} students`,
              color: overview.todayAttendance >= 80 ? 'text-emerald-600' : 'text-amber-600',
              bg:    overview.todayAttendance >= 80 ? 'bg-emerald-50'    : 'bg-amber-50',
            },
            {
              icon: Banknote,      label: 'Fee Collection (Month)',
              value: fmtPKR(overview.feeCollected),
              sub: `${overview.feeRate}% of ${fmtPKR(overview.feeInvoiced)} invoiced`,
              color: overview.feeRate >= 70 ? 'text-emerald-600' : 'text-red-600',
              bg:    overview.feeRate >= 70 ? 'bg-emerald-50'    : 'bg-red-50',
            },
            {
              icon: GraduationCap, label: 'Avg Academic Score',
              value: overview.avgAcademic !== null ? `${overview.avgAcademic}%` : '—',
              sub: `${overview.totalReportCards} report cards`,
              color: 'text-violet-600', bg: 'bg-violet-50',
            },
          ].map(({ icon: Icon, label, value, sub, color, bg }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`${bg} p-2.5 rounded-xl`}><Icon size={20} className={color}/></div>
                {overview.unpaidInvoices > 0 && label.includes('Fee') && (
                  <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                    {overview.unpaidInvoices} unpaid
                  </span>
                )}
              </div>
              <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
              <p className="text-xs text-slate-400 mt-1">{label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Row 1: Attendance Trend + Fee Collection ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Attendance Trend */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800">Attendance Trend</h3>
              <p className="text-xs text-slate-400">Last 6 months · student attendance rate</p>
            </div>
            <div className="bg-blue-50 text-blue-600 text-xs font-bold px-2 py-1 rounded-lg">
              {attendance.length > 0 ? `${attendance[attendance.length-1].rate}% this month` : ''}
            </div>
          </div>
          {attendance.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No attendance data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={attendance} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false}/>
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} unit="%"/>
                <Tooltip contentStyle={ChartTooltipStyle} formatter={(v) => [`${v}%`, 'Attendance']}/>
                <ReferenceLine y={75} stroke="#fca5a5" strokeDasharray="4 2"
                  label={{ value: '75%', position: 'insideLeft', fontSize: 10, fill: '#f87171' }}/>
                <Line type="monotone" dataKey="rate" stroke="#3b82f6" strokeWidth={2.5}
                  dot={{ fill: '#3b82f6', r: 4 }} activeDot={{ r: 6 }}/>
              </LineChart>
            </ResponsiveContainer>
          )}
          {/* Mini stats row */}
          {attendance.length > 0 && (
            <div className="flex gap-4 mt-3 pt-3 border-t border-slate-50">
              {attendance.slice(-3).map(m => (
                <div key={m.label} className="flex-1 text-center">
                  <p className={`text-sm font-bold ${m.rate >= 75 ? 'text-emerald-600' : 'text-red-500'}`}>{m.rate}%</p>
                  <p className="text-xs text-slate-400">{m.month}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fee Collection */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800">Fee Collection</h3>
              <p className="text-xs text-slate-400">Last 6 months · invoiced vs collected</p>
            </div>
          </div>
          {fees.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No fee data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={fees} margin={{ top: 5, right: 10, left: -20, bottom: 0 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false}/>
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                  tickFormatter={v => v >= 1000 ? `${v/1000}k` : v}/>
                <Tooltip contentStyle={ChartTooltipStyle}
                  formatter={(v, n) => [fmtPKR(v), n === 'collected' ? 'Collected' : 'Pending']}/>
                <Legend wrapperStyle={{ fontSize: 11 }}/>
                <Bar dataKey="collected" fill="#10b981" radius={[4,4,0,0]} name="Collected"/>
                <Bar dataKey="pending"   fill="#fca5a5" radius={[4,4,0,0]} name="Pending"/>
              </BarChart>
            </ResponsiveContainer>
          )}
          {fees.length > 0 && (
            <div className="flex gap-2 mt-3 pt-3 border-t border-slate-50 flex-wrap">
              {fees.slice(-3).map(m => (
                <div key={m.label} className="flex-1 text-center min-w-[60px]">
                  <p className={`text-sm font-bold ${m.rate >= 70 ? 'text-emerald-600' : 'text-amber-600'}`}>{m.rate}%</p>
                  <p className="text-xs text-slate-400">{m.month}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Row 2: Grade Distribution + Class Performance ── */}
      {academic && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Grade Distribution */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-bold text-slate-800 mb-1">Grade Distribution</h3>
            <p className="text-xs text-slate-400 mb-4">All report cards · overall grade breakdown</p>
            {academic.gradeDistribution.every(g => g.count === 0) ? (
              <div className="h-52 flex items-center justify-center text-slate-400 text-sm">No report card data yet</div>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="55%" height={200}>
                  <PieChart>
                    <Pie data={academic.gradeDistribution.filter(g => g.count > 0)}
                      dataKey="count" nameKey="grade"
                      cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                      paddingAngle={3}>
                      {academic.gradeDistribution.filter(g => g.count > 0).map(g => (
                        <Cell key={g.grade} fill={GRADE_COLORS[g.grade] || '#94a3b8'}/>
                      ))}
                    </Pie>
                    <Tooltip contentStyle={ChartTooltipStyle} formatter={(v, n) => [v, `Grade ${n}`]}/>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {academic.gradeDistribution.filter(g => g.count > 0).map(g => {
                    const total = academic.gradeDistribution.reduce((s, x) => s + x.count, 0);
                    const pct   = total > 0 ? Math.round(g.count / total * 100) : 0;
                    return (
                      <div key={g.grade} className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white"
                          style={{ background: GRADE_COLORS[g.grade] || '#94a3b8' }}>{g.grade}</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: GRADE_COLORS[g.grade] || '#94a3b8' }}/>
                        </div>
                        <span className="text-xs font-semibold text-slate-600 w-10 text-right">{g.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Class Performance */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-bold text-slate-800 mb-1">Class Performance</h3>
            <p className="text-xs text-slate-400 mb-4">Average score per class</p>
            {academic.classPerformance.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-slate-400 text-sm">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(200, academic.classPerformance.length * 36)}>
                <BarChart data={academic.classPerformance.slice(0, 8)} layout="vertical"
                  margin={{ top: 0, right: 30, left: 60, bottom: 0 }} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false}/>
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} unit="%"/>
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} tickLine={false} axisLine={false} width={55}/>
                  <Tooltip contentStyle={ChartTooltipStyle} formatter={(v) => [`${v}%`, 'Avg Score']}/>
                  <ReferenceLine x={50} stroke="#fca5a5" strokeDasharray="4 2"/>
                  <Bar dataKey="avg" radius={[0,4,4,0]}>
                    {academic.classPerformance.slice(0, 8).map((c, i) => (
                      <Cell key={i} fill={c.avg >= 75 ? '#10b981' : c.avg >= 50 ? '#3b82f6' : '#f87171'}/>
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* ── Row 3: Enrollment + At-Risk ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Enrollment */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-bold text-slate-800 mb-1">Enrollment by Class</h3>
          <p className="text-xs text-slate-400 mb-4">Active students per class</p>
          {enrollment.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No classes yet</div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {enrollment.map((cls, i) => {
                const maxTotal = enrollment[0].total;
                const malePct  = cls.total > 0 ? Math.round(cls.male / cls.total * 100) : 0;
                const femPct   = 100 - malePct;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-600 w-24 shrink-0 truncate">{cls.name}</span>
                    <div className="flex-1 flex h-4 rounded-full overflow-hidden bg-slate-100">
                      <div className="h-full bg-blue-400 transition-all" style={{ width: `${Math.round(malePct * cls.total / maxTotal)}%` }} title={`${cls.male} male`}/>
                      <div className="h-full bg-pink-400 transition-all" style={{ width: `${Math.round(femPct * cls.total / maxTotal)}%` }} title={`${cls.female} female`}/>
                    </div>
                    <span className="text-xs font-bold text-slate-700 w-8 text-right">{cls.total}</span>
                  </div>
                );
              })}
              <div className="flex items-center gap-3 pt-1 text-xs text-slate-400">
                <span className="w-24"/>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block"/> Male</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-pink-400 inline-block"/> Female</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* At-Risk Students */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500"/> At-Risk Students
              </h3>
              <p className="text-xs text-slate-400">Attendance &lt;75% or failing grade</p>
            </div>
            <div className="flex gap-2 text-xs">
              {highRisk > 0   && <span className="bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">{highRisk} high</span>}
              {mediumRisk > 0 && <span className="bg-amber-100 text-amber-600 font-bold px-2 py-0.5 rounded-full">{mediumRisk} medium</span>}
            </div>
          </div>
          {atRisk.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center gap-2 text-slate-400">
              <CheckCircle2 size={32} className="text-emerald-400"/>
              <p className="text-sm font-medium text-emerald-600">No at-risk students!</p>
              <p className="text-xs">All students are on track.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {atRisk.map(s => (
                <div key={s._id} className={`flex items-start gap-3 p-2.5 rounded-xl border ${
                  s.risk === 'high' ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'
                }`}>
                  <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${s.risk === 'high' ? 'bg-red-500' : 'bg-amber-500'}`}/>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-800 truncate">{s.full_name}</p>
                      <span className="text-xs text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">{s.roll_number}</span>
                      <span className="text-xs text-slate-400">{s.class}</span>
                    </div>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {s.flags.map((f, i) => (
                        <span key={i} className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          s.risk === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                        }`}>{f}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Term Performance ── */}
      {academic?.termData?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-bold text-slate-800 mb-1">Term-wise Performance</h3>
          <p className="text-xs text-slate-400 mb-4">Average score and report cards per term</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={academic.termData} margin={{ top: 5, right: 20, left: -10, bottom: 0 }} barCategoryGap="40%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
              <XAxis dataKey="term" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false}/>
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} unit="%"/>
              <Tooltip contentStyle={ChartTooltipStyle} formatter={(v) => [`${v}%`, 'Avg Score']}/>
              <Bar dataKey="avg" fill="#8b5cf6" radius={[6,6,0,0]} name="Avg Score">
                {academic.termData.map((_, i) => (
                  <Cell key={i} fill={['#8b5cf6','#3b82f6','#10b981','#f59e0b','#ef4444'][i % 5]}/>
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
