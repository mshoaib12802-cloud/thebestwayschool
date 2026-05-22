import { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import {
  Users, DollarSign, TrendingUp, TrendingDown,
  Briefcase, AlertCircle, UserPlus, ArrowRight,
  Award, XCircle, CheckCircle2, GraduationCap,
  AlertTriangle, Zap, ShieldAlert, Activity,
  Search, Clock, CheckCircle, MinusCircle, Layers, Play, Lock, X
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, Cell,
  PieChart, Pie, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { useNavigate } from 'react-router-dom';

/* ── Animated number hook ─────────────────────────────── */
function useCountUp(target, duration = 1200) {
  const [val, setVal] = useState(0);
  const rafRef = useRef(null);
  useEffect(() => {
    if (!target) return;
    const start = performance.now();
    const animate = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);
  return val;
}

/* ── Custom tooltip ───────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0f172a', borderRadius: 14, padding: '10px 16px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
      {label && <p style={{ color: '#64748b', fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.stroke || '#e2e8f0', fontWeight: 700, fontSize: 13, margin: '2px 0' }}>
          {p.name}: Rs. {Number(p.value)?.toLocaleString()}
        </p>
      ))}
    </div>
  );
};

const FinePieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0f172a', borderRadius: 12, padding: '8px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
      <p style={{ color: '#f8fafc', fontWeight: 700, fontSize: 13 }}>{payload[0].name}</p>
      <p style={{ color: payload[0].payload.fill, fontWeight: 800, fontSize: 14 }}>
        Rs. {Number(payload[0].value).toLocaleString()}
      </p>
    </div>
  );
};

/* ── Stat card ────────────────────────────────────────── */
const StatCard = ({ label, value, sub, icon, gradient, onClick, delay }) => {
  const animated = useCountUp(Number(value));
  return (
    <div
      onClick={onClick}
      className="cursor-pointer bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group relative overflow-hidden"
      style={{ animation: `dashFadeUp 0.6s ease both`, animationDelay: delay }}
    >
      <div className={`absolute -top-8 -right-8 w-28 h-28 rounded-full opacity-[0.07] bg-gradient-to-br ${gradient}`}/>
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className={`p-3 bg-gradient-to-br ${gradient} text-white rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
        <ArrowRight size={16} className="text-slate-200 group-hover:text-slate-500 group-hover:translate-x-1 transition-all mt-1"/>
      </div>
      <h3 className="text-4xl font-extrabold text-slate-800 mb-1 relative z-10 tabular-nums">
        {typeof value === 'number' ? animated.toLocaleString() : value}
      </h3>
      <p className="text-slate-500 font-bold text-sm relative z-10">{label}</p>
      <p className="text-xs text-slate-400 mt-1 relative z-10">{sub}</p>
    </div>
  );
};

/* ── Fine category display names ──────────────────────── */
const FINE_LABELS = {
  late_arrival: 'Late Arrival',
  absence: 'Absence',
  misconduct: 'Misconduct',
  library: 'Library',
  damage: 'Damage',
  uniform: 'Uniform',
  other: 'Other',
};

const FINE_COLORS = ['#6366f1', '#f43f5e', '#f59e0b', '#10b981', '#8b5cf6', '#0ea5e9', '#64748b'];

/* ── Main Dashboard ───────────────────────────────────── */
const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [atRisk, setAtRisk] = useState([]);
  const [showAllRisk, setShowAllRisk] = useState(false);
  const [dailyStatus, setDailyStatus] = useState([]);
  const [attSearch, setAttSearch]   = useState('');
  const [attType, setAttType]       = useState('all'); // all | student | staff

  // Global search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchDrop, setShowSearchDrop] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    api.get('/dashboard/stats')
      .then(({ data }) => setStats(data))
      .catch(err => console.error('Dashboard Error:', err))
      .finally(() => setLoading(false));

    api.get('/attendance/status')
      .then(({ data }) => setDailyStatus(Array.isArray(data) ? data : []))
      .catch(() => {});

    api.get('/dashboard/at-risk')
      .then(({ data }) => setAtRisk(data))
      .catch(() => {});
  }, []);

  // Debounced student search
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); setShowSearchDrop(false); return; }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const { data } = await api.get('/students');
        const q = searchQuery.toLowerCase();
        const filtered = data.filter(s =>
          s.full_name.toLowerCase().includes(q) ||
          s.roll_number.toLowerCase().includes(q) ||
          (s.phone || '').includes(q)
        ).slice(0, 8);
        setSearchResults(filtered);
        setShowSearchDrop(true);
      } catch { /* silent */ }
      finally { setSearchLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearchDrop(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
          <p className="font-bold text-slate-400 animate-pulse">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const c = stats?.counts || {};
  const f = stats?.finance || {};
  const m = stats?.thisMonth || {};
  const fines = stats?.fines || {};
  const mods = stats?.modules || {};
  const courseProgress = stats?.courseProgress || [];

  const hasPendingFines = (fines.total_pending || 0) > 0;

  /* today's attendance computed values */
  const attStats = {
    present:    dailyStatus.filter(p => p.status === 'present').length,
    absent:     dailyStatus.filter(p => p.status === 'absent').length,
    leave:      dailyStatus.filter(p => p.status === 'leave').length,
    not_marked: dailyStatus.filter(p => p.status === null).length,
  };
  const filteredAtt = dailyStatus.filter(p => {
    if (attType !== 'all' && p.person_type !== attType) return false;
    if (attSearch && !p.name.toLowerCase().includes(attSearch.toLowerCase()) &&
        !(p.id_no || '').toLowerCase().includes(attSearch.toLowerCase())) return false;
    return true;
  });
  const STATUS_META_DB = {
    present: { label: 'Present', cls: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
    absent:  { label: 'Absent',  cls: 'bg-red-100 text-red-700',         dot: 'bg-red-500' },
    leave:   { label: 'Leave',   cls: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-400' },
    late:    { label: 'Late',    cls: 'bg-orange-100 text-orange-700',   dot: 'bg-orange-400' },
  };

  const statCards = [
    { label: 'Total Students', value: c.students || 0, sub: `+${c.new_this_month || 0} this month`, icon: <Users size={22}/>, gradient: 'from-blue-500 to-blue-600', onClick: () => navigate('/admissions'), delay: '0ms' },
    { label: 'Total Staff', value: c.staff || 0, sub: 'Teachers & Admin', icon: <Briefcase size={22}/>, gradient: 'from-purple-500 to-purple-600', onClick: () => navigate('/staff'), delay: '80ms' },
    { label: 'Today Present', value: c.today_present || 0, sub: 'Students & Staff', icon: <CheckCircle2 size={22}/>, gradient: 'from-emerald-500 to-emerald-600', onClick: () => navigate('/attendance'), delay: '160ms' },
    { label: 'Pending Inquiries', value: c.leads || 0, sub: c.pending_followups > 0 ? `${c.pending_followups} need follow-up` : 'All up to date', icon: <AlertCircle size={22}/>, gradient: 'from-orange-400 to-orange-500', onClick: () => navigate('/reception'), delay: '240ms' },
  ];

  /* Pie chart data for fine categories */
  const fineChartData = (fines.category_breakdown || []).map((c, i) => ({
    name: FINE_LABELS[c.category] || c.category,
    value: c.amount,
    fill: FINE_COLORS[i % FINE_COLORS.length],
  }));

  return (
    <>
      {/* ── Injected keyframes ─────────────────────────── */}
      <style>{`
        @keyframes dashFadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes dashFadeIn {
          from { opacity: 0; } to { opacity: 1; }
        }
        @keyframes fineGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(251,191,36,0.0); }
          50%       { box-shadow: 0 0 0 8px rgba(251,191,36,0.12); }
        }
        .dash-section { animation: dashFadeUp 0.55s ease both; }
      `}</style>

      <div className="space-y-8 pb-14" style={{ animation: 'dashFadeIn 0.3s ease' }}>

        {/* ── HEADER ─────────────────────────────────────── */}
        <div
          className="flex flex-col md:flex-row justify-between items-center p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #312e81 100%)', animation: 'dashFadeUp 0.5s ease both' }}
        >
          {/* decorative blobs */}
          <div className="absolute top-0 right-0 w-72 h-72 rounded-full blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }}/>
          <div className="absolute bottom-0 left-1/3 w-56 h-56 rounded-full blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)' }}/>
          <div className="absolute top-1/2 right-1/4 w-32 h-32 rounded-full blur-2xl pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)' }}/>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>
              <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest">Live</span>
            </div>
            <h1 className="text-3xl font-extrabold mb-1 tracking-tight">Inflorescence Dashboard</h1>
            <p className="text-slate-300 font-medium">Here's your institute at a glance.</p>
          </div>
          <div className="relative z-10 mt-4 md:mt-0 flex items-center gap-3 flex-wrap justify-end">
            {/* Global Search */}
            <div ref={searchRef} className="relative">
              <div className="flex items-center gap-2 bg-white/10 border border-white/20 backdrop-blur-sm rounded-2xl px-4 py-2.5 w-64">
                <Search size={16} className="text-slate-300 flex-shrink-0"/>
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery && setShowSearchDrop(true)}
                  placeholder="Search students..."
                  className="bg-transparent text-white placeholder-slate-400 text-sm font-medium outline-none flex-1 min-w-0"
                />
                {searchLoading && <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin flex-shrink-0"/>}
                {searchQuery && !searchLoading && (
                  <button onClick={() => { setSearchQuery(''); setShowSearchDrop(false); }} className="text-slate-400 hover:text-white transition-colors flex-shrink-0">
                    <X size={14}/>
                  </button>
                )}
              </div>

              {/* Results dropdown */}
              {showSearchDrop && (
                <div className="absolute top-full mt-2 right-0 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50">
                  {searchResults.length === 0 ? (
                    <div className="px-5 py-4 text-sm text-slate-400 font-medium text-center">No students found</div>
                  ) : (
                    <>
                      <div className="px-4 pt-3 pb-1">
                        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{searchResults.length} result{searchResults.length !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                        {searchResults.map(s => (
                          <button
                            key={s._id}
                            onClick={() => { navigate('/admissions'); setShowSearchDrop(false); setSearchQuery(''); }}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-50 transition-colors text-left"
                          >
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                              {s.full_name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-slate-800 text-sm truncate">{s.full_name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-mono text-slate-400">{s.roll_number}</span>
                                {s.courses[0]?.course_name && (
                                  <span className="text-[10px] font-bold text-indigo-500 truncate">{s.courses[0].course_name}</span>
                                )}
                              </div>
                            </div>
                            {s.isActive === false && (
                              <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full flex-shrink-0">Alumni</span>
                            )}
                          </button>
                        ))}
                      </div>
                      <div className="px-4 py-2.5 border-t border-slate-100">
                        <button
                          onClick={() => { navigate('/admissions'); setShowSearchDrop(false); setSearchQuery(''); }}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
                        >
                          View all in Admissions <ArrowRight size={12}/>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Date chip */}
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 backdrop-blur-sm rounded-2xl px-5 py-3">
              <Activity size={16} className="text-indigo-300"/>
              <div>
                <p className="text-[10px] font-bold opacity-60 uppercase tracking-wider">Today</p>
                <p className="text-sm font-bold font-mono text-slate-200">
                  {new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── STAT CARDS ──────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map(card => <StatCard key={card.label} {...card} />)}
        </div>

        {/* ── FINES ALERT BANNER ──────────────────────────── */}
        {hasPendingFines && (
          <div
            className="flex items-center justify-between gap-4 rounded-[1.5rem] px-6 py-4 border cursor-pointer hover:shadow-lg transition-all duration-300 dash-section"
            style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', borderColor: '#fcd34d', animationDelay: '300ms', animation: 'fineGlow 3s ease-in-out infinite, dashFadeUp 0.6s ease both' }}
            onClick={() => navigate('/fines')}
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-amber-400 flex items-center justify-center shadow-md shrink-0">
                <AlertTriangle size={22} className="text-white"/>
              </div>
              <div>
                <p className="font-extrabold text-amber-900 text-sm">Pending Fines Alert</p>
                <p className="text-amber-700 text-xs font-medium mt-0.5">
                  <span className="font-bold">Rs. {(fines.total_pending || 0).toLocaleString()}</span> total pending —
                  <span className="mx-1">{fines.student_pending_count || 0} student fine{fines.student_pending_count !== 1 ? 's' : ''}</span>&amp;
                  <span className="mx-1">{fines.staff_pending_count || 0} staff fine{fines.staff_pending_count !== 1 ? 's' : ''}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-amber-500 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-amber-600 transition-colors shrink-0">
              Manage Fines <ArrowRight size={14}/>
            </div>
          </div>
        )}

        {/* ── FINANCE + FINES STRIP ───────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 dash-section" style={{ animationDelay: '120ms' }}>
          {[
            { label: "Month Income", value: m.income || 0, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100', icon: <TrendingUp size={15} className="text-emerald-500"/> },
            { label: "Month Expense", value: m.expense || 0, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-100', icon: <TrendingDown size={15} className="text-rose-500"/> },
            { label: "Month Profit", value: m.profit || 0, color: (m.profit || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600', bg: (m.profit || 0) >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100', icon: <DollarSign size={15} className={(m.profit || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}/> },
            { label: "Trainer Commission", value: m.commissions || 0, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100', icon: <Award size={15} className="text-amber-500"/> },
            { label: "Unpaid Fees", value: m.unpaid_amount || 0, color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200', icon: <XCircle size={15} className="text-slate-400"/>, sub: `${m.unpaid_count || 0} students` },
            { label: "Student Fines Due", value: fines.student_pending_amount || 0, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100', icon: <ShieldAlert size={15} className="text-orange-400"/>, sub: `${fines.student_pending_count || 0} pending` },
            { label: "Fines Collected", value: fines.collected_this_month || 0, color: 'text-teal-600', bg: 'bg-teal-50 border-teal-100', icon: <Zap size={15} className="text-teal-500"/>, sub: 'this month' },
          ].map(card => (
            <div key={card.label} className={`${card.bg} border rounded-2xl p-4`}>
              <div className="flex items-center gap-1.5 mb-2">
                {card.icon}
                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider leading-tight">{card.label}</p>
              </div>
              <p className={`text-lg font-extrabold ${card.color} tabular-nums`}>Rs. {(card.value).toLocaleString()}</p>
              {card.sub && <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">{card.sub}</p>}
            </div>
          ))}
        </div>

        {/* ── CHARTS ROW 1 ────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Revenue Trend */}
          <div
            className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dash-section"
            style={{ animationDelay: '200ms' }}
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-extrabold text-xl text-slate-800">Revenue Trend</h3>
                <p className="text-sm text-slate-400 mt-0.5 font-medium">Last 6 months income vs expenses</p>
              </div>
              <div className="flex gap-4 text-xs font-bold">
                <span className="flex items-center gap-1.5 text-slate-500"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block"/> Income</span>
                <span className="flex items-center gap-1.5 text-slate-500"><span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block"/> Expense</span>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.monthlyTrend || []} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.18}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }}/>
                  <YAxis hide/>
                  <Tooltip content={<ChartTooltip/>}/>
                  <Area isAnimationActive type="monotone" dataKey="expense" name="Expense" stroke="#f43f5e" strokeWidth={2.5} fill="url(#colorExpense)" dot={{ fill: '#f43f5e', r: 4, strokeWidth: 2, stroke: '#fff' }}/>
                  <Area isAnimationActive type="monotone" dataKey="income" name="Income" stroke="#6366f1" strokeWidth={2.5} fill="url(#colorIncome)" dot={{ fill: '#6366f1', r: 4, strokeWidth: 2, stroke: '#fff' }}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Fines Breakdown Donut */}
          <div
            className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col dash-section"
            style={{ animationDelay: '280ms' }}
          >
            <div className="mb-4">
              <h3 className="font-extrabold text-xl text-slate-800">Fines Breakdown</h3>
              <p className="text-sm text-slate-400 mt-0.5 font-medium">By category</p>
            </div>

            {fineChartData.length > 0 ? (
              <>
                <div className="flex-1 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={fineChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={82}
                        paddingAngle={4}
                        dataKey="value"
                        animationBegin={0}
                        animationDuration={1200}
                      >
                        {fineChartData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} stroke="none"/>
                        ))}
                      </Pie>
                      <Tooltip content={<FinePieTooltip/>}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 mt-2">
                  {fineChartData.slice(0, 4).map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.fill }}/>
                        <span className="text-slate-600 font-medium truncate max-w-[90px]">{item.name}</span>
                      </div>
                      <span className="font-bold text-slate-700 tabular-nums">Rs. {item.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => navigate('/fines')} className="mt-4 w-full text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl py-2 transition-colors">
                  View All Fines →
                </button>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
                <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center">
                  <AlertTriangle size={32} className="text-slate-200"/>
                </div>
                <p className="text-slate-400 text-sm font-medium">No fines issued yet</p>
                <button
                  onClick={() => navigate('/fines')}
                  className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl px-4 py-2 transition-colors"
                >
                  Issue First Fine →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── CHARTS ROW 2 ────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Recent Admissions */}
          <div
            className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col dash-section"
            style={{ animationDelay: '320ms' }}
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-extrabold text-xl text-slate-800">New Admissions</h3>
                <p className="text-sm text-slate-400 mt-0.5 font-medium">Most recent students</p>
              </div>
              <button onClick={() => navigate('/admissions')} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl hover:bg-indigo-100 transition-colors">View All</button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto">
              {stats?.recentStudents?.length > 0 ? (
                stats.recentStudents.map((std, idx) => (
                  <div
                    key={std._id}
                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/40 transition-all duration-200"
                    style={{ animation: 'dashFadeUp 0.4s ease both', animationDelay: `${idx * 60}ms` }}
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-extrabold text-sm shadow-sm flex-shrink-0">
                      {std.full_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-700 text-sm truncate">{std.full_name}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono text-slate-400">{std.roll_number}</span>
                        {std.courses[0]?.course_name && (
                          <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-100 truncate max-w-[100px]">{std.courses[0].course_name}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-[10px] font-bold text-slate-300 text-right flex-shrink-0">
                      {new Date(std.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10">
                  <GraduationCap size={40} className="text-slate-200 mx-auto mb-3"/>
                  <p className="text-slate-400 text-sm font-medium">No students yet.</p>
                </div>
              )}
            </div>
            <button onClick={() => navigate('/admissions')} className="w-full mt-4 bg-slate-900 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-800 transition-all">
              <UserPlus size={16}/> New Admission
            </button>
          </div>

          {/* Quick Actions */}
          <div
            className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dash-section"
            style={{ animationDelay: '380ms' }}
          >
            <h3 className="font-extrabold text-xl text-slate-800 mb-1">Quick Actions</h3>
            <p className="text-sm text-slate-400 mb-6 font-medium">Common tasks, one click</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Collect Fee', icon: <DollarSign size={20}/>, gradient: 'from-emerald-500 to-emerald-600', path: '/finance' },
                { label: 'New Admission', icon: <UserPlus size={20}/>, gradient: 'from-indigo-500 to-indigo-600', path: '/admissions' },
                { label: 'Attendance', icon: <CheckCircle2 size={20}/>, gradient: 'from-blue-500 to-blue-600', path: '/attendance' },
                { label: 'Add Inquiry', icon: <AlertCircle size={20}/>, gradient: 'from-amber-400 to-orange-500', path: '/reception' },
                { label: 'Issue Fine', icon: <AlertTriangle size={20}/>, gradient: 'from-red-500 to-rose-600', path: '/fines' },
                { label: 'Exams', icon: <Award size={20}/>, gradient: 'from-purple-500 to-purple-600', path: '/exams' },
              ].map((a, i) => (
                <button
                  key={a.label}
                  onClick={() => navigate(a.path)}
                  className="flex flex-col items-center gap-2.5 p-4 rounded-2xl border border-slate-100 hover:border-transparent hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group"
                  style={{ animation: 'dashFadeUp 0.4s ease both', animationDelay: `${380 + i * 50}ms` }}
                >
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${a.gradient} text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-200`}>
                    {a.icon}
                  </div>
                  <span className="text-xs font-bold text-slate-600 text-center leading-tight">{a.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── FINANCIAL HEALTH ────────────────────────────── */}
        <div
          className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dash-section"
          style={{ animationDelay: '420ms' }}
        >
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-extrabold text-xl text-slate-800">Financial Health</h3>
              <p className="text-sm text-slate-400 mt-0.5 font-medium">All-time income vs expenses vs fines collected</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Net Balance</p>
              <p className={`text-2xl font-extrabold ${f.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                Rs. {(f.profit || 0).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: 'Total Income', amount: f.income || 0 },
                  { name: 'Total Expense', amount: f.expense || 0 },
                  { name: 'Fines Pending', amount: fines.total_pending || 0 },
                ]}
                barSize={72}
                margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
              >
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }}/>
                <YAxis hide/>
                <Tooltip content={<ChartTooltip/>}/>
                <Bar dataKey="amount" name="Amount" radius={[14, 14, 0, 0]} isAnimationActive animationDuration={1000}>
                  <Cell fill="#10b981"/>
                  <Cell fill="#f43f5e"/>
                  <Cell fill="#f59e0b"/>
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── COURSE MODULE PROGRESS ──────────────────── */}
        {(mods.total || 0) > 0 && (
          <div
            className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dash-section"
            style={{ animationDelay: '460ms' }}
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-extrabold text-xl text-slate-800 flex items-center gap-2">
                  <Layers size={20} className="text-indigo-500"/> Course Module Progress
                </h3>
                <p className="text-sm text-slate-400 mt-0.5 font-medium">Across all active courses</p>
              </div>
              <button onClick={() => navigate('/courses')}
                className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl hover:bg-indigo-100 transition-colors">
                Manage Modules
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Total Modules', value: mods.total || 0, color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200', icon: <Layers size={14} className="text-slate-400"/> },
                { label: 'Completed', value: mods.completed || 0, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100', icon: <CheckCircle2 size={14} className="text-emerald-500"/> },
                { label: 'In Progress', value: mods.in_progress || 0, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100', icon: <Play size={14} className="text-blue-500"/> },
                { label: 'Upcoming', value: mods.upcoming || 0, color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200', icon: <Lock size={14} className="text-slate-400"/> },
              ].map(card => (
                <div key={card.label} className={`${card.bg} border rounded-2xl p-4`}>
                  <div className="flex items-center gap-1.5 mb-2">{card.icon}<p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">{card.label}</p></div>
                  <p className={`text-2xl font-extrabold ${card.color} tabular-nums`}>{card.value}</p>
                </div>
              ))}
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold text-slate-600">Overall Progress</span>
                <span className="text-sm font-extrabold text-indigo-600">{mods.progress_pct || 0}%</span>
              </div>
              <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 relative overflow-hidden"
                  style={{ width: `${mods.progress_pct || 0}%`, background: mods.progress_pct === 100 ? 'linear-gradient(90deg,#10b981,#059669)' : 'linear-gradient(90deg,#6366f1,#8b5cf6)' }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse" style={{ animationDuration: '2s' }}/>
                </div>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-400 mt-2">
                <span className="text-emerald-500">{mods.completed || 0} completed</span>
                {(mods.in_progress || 0) > 0 && <span className="text-blue-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse inline-block"/>{mods.in_progress} active</span>}
                <span>{mods.upcoming || 0} upcoming</span>
              </div>
            </div>

            {courseProgress.length > 0 && (
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {courseProgress.map(cp => (
                  <div key={cp.course_id} className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="font-bold text-slate-700 text-sm leading-tight truncate flex-1">{cp.course_name}</p>
                      <span className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full flex-shrink-0">
                        <Users size={11}/> {cp.student_count}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-1.5">
                      <div className="h-full rounded-full" style={{ width: `${cp.progress_pct}%`, background: cp.progress_pct === 100 ? 'linear-gradient(90deg,#10b981,#059669)' : 'linear-gradient(90deg,#6366f1,#8b5cf6)' }}/>
                    </div>
                    <div className="flex justify-between text-[10px] font-semibold text-slate-400">
                      <span>{cp.progress_pct}% complete</span>
                      <span>{cp.completed}/{cp.total} modules</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── AT-RISK STUDENTS ────────────────────────── */}
        {atRisk.length > 0 && (() => {
          const visible = showAllRisk ? atRisk : atRisk.slice(0, 6);
          const highCount = atRisk.filter(s => s.risk_level === 'high').length;

          const REASON_META = {
            attendance: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-400' },
            fee:        { bg: 'bg-rose-100',   text: 'text-rose-700',   dot: 'bg-rose-500' },
            result:     { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
          };

          return (
            <div
              className="bg-white rounded-[2.5rem] shadow-sm border border-rose-100 overflow-hidden dash-section"
              style={{ animationDelay: '470ms' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-8 pt-8 pb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-rose-100 rounded-2xl">
                    <ShieldAlert size={22} className="text-rose-600"/>
                  </div>
                  <div>
                    <h3 className="font-extrabold text-xl text-slate-800 flex items-center gap-2">
                      Students Needing Attention
                      <span className="text-xs font-bold bg-rose-500 text-white px-2 py-0.5 rounded-full">{atRisk.length}</span>
                      {highCount > 0 && (
                        <span className="text-xs font-bold bg-orange-400 text-white px-2 py-0.5 rounded-full">{highCount} critical</span>
                      )}
                    </h3>
                    <p className="text-sm text-slate-400 font-medium mt-0.5">Low attendance · Unpaid fees · Failed exams</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/admissions')}
                  className="text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl transition-colors"
                >
                  View Students
                </button>
              </div>

              {/* Student rows */}
              <div className="px-6 pb-4 space-y-2">
                {visible.map((s, idx) => (
                  <div
                    key={s._id}
                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${s.risk_level === 'high' ? 'border-rose-200 bg-rose-50/50' : 'border-orange-100 bg-orange-50/30'}`}
                    style={{ animation: 'dashFadeUp 0.4s ease both', animationDelay: `${idx * 50}ms` }}
                  >
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-sm flex-shrink-0 text-white ${s.risk_level === 'high' ? 'bg-rose-500' : 'bg-orange-400'}`}>
                      {s.full_name.charAt(0)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-slate-800 text-sm">{s.full_name}</p>
                        <span className="text-[10px] font-mono text-slate-400">{s.roll_number}</span>
                        {s.risk_level === 'high' && (
                          <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full">Critical</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{s.course_name}</p>
                    </div>

                    {/* Risk badges */}
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {s.reasons.map((r, i) => {
                        const m = REASON_META[r.type] || REASON_META.result;
                        return (
                          <span key={i} className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg ${m.bg} ${m.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${m.dot}`}/>
                            {r.label}
                          </span>
                        );
                      })}
                    </div>

                    {/* Phone */}
                    {s.phone && (
                      <a
                        href={`tel:${s.phone}`}
                        onClick={e => e.stopPropagation()}
                        className="text-xs font-bold text-slate-400 hover:text-indigo-600 flex-shrink-0 hidden md:block"
                      >
                        {s.phone}
                      </a>
                    )}
                  </div>
                ))}
              </div>

              {/* Show more / less */}
              {atRisk.length > 6 && (
                <div className="px-8 pb-6">
                  <button
                    onClick={() => setShowAllRisk(v => !v)}
                    className="w-full py-2.5 text-sm font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-2xl transition-colors"
                  >
                    {showAllRisk ? `Show less ↑` : `Show all ${atRisk.length} students ↓`}
                  </button>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── TODAY'S ATTENDANCE STATUS ────────────────── */}
        <div
          className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden dash-section"
          style={{ animationDelay: '500ms' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-8 pt-8 pb-5">
            <div>
              <h3 className="font-extrabold text-xl text-slate-800">Today's Attendance</h3>
              <p className="text-sm text-slate-400 mt-0.5 font-medium">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <button
              onClick={() => navigate('/attendance')}
              className="flex items-center gap-2 text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl transition-colors"
            >
              Mark Attendance <ArrowRight size={15}/>
            </button>
          </div>

          {/* Stat chips */}
          <div className="grid grid-cols-4 gap-4 px-8 pb-6">
            {[
              { label: 'Present',    value: attStats.present,    icon: <CheckCircle size={18}/>,  color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
              { label: 'Absent',     value: attStats.absent,     icon: <XCircle size={18}/>,      color: 'text-red-600',     bg: 'bg-red-50 border-red-100' },
              { label: 'On Leave',   value: attStats.leave,      icon: <MinusCircle size={18}/>,  color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-100' },
              { label: 'Not Marked', value: attStats.not_marked, icon: <Clock size={18}/>,        color: 'text-slate-500',   bg: 'bg-slate-50 border-slate-200' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} border rounded-2xl p-4 flex items-center gap-3`}>
                <div className={s.color}>{s.icon}</div>
                <div>
                  <p className={`text-2xl font-extrabold tabular-nums ${s.color}`}>{s.value}</p>
                  <p className="text-[11px] text-slate-500 font-medium">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Search + type filter */}
          <div className="flex items-center gap-3 px-8 pb-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={15}/>
              <input
                value={attSearch}
                onChange={e => setAttSearch(e.target.value)}
                placeholder="Search by name or ID..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
              {[['all', 'All'], ['student', 'Students'], ['staff', 'Staff']].map(([k, l]) => (
                <button key={k} onClick={() => setAttType(k)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${attType === k ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>
                  {l}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 font-medium ml-auto">
              {filteredAtt.length} of {dailyStatus.length} people
            </p>
          </div>

          {/* People list */}
          <div className="max-h-[360px] overflow-y-auto border-t border-slate-100">
            {dailyStatus.length === 0 ? (
              <div className="py-14 text-center text-slate-400">
                <Activity size={36} className="mx-auto mb-3 text-slate-200"/>
                <p className="font-medium text-sm">No attendance records yet today.</p>
                <button onClick={() => navigate('/attendance')} className="mt-3 text-xs font-bold text-indigo-600 hover:underline">
                  Go to Attendance →
                </button>
              </div>
            ) : filteredAtt.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">No results match your search.</div>
            ) : (
              <div className="divide-y divide-slate-50">
                {filteredAtt.map((person, idx) => {
                  const meta = STATUS_META_DB[person.status];
                  return (
                    <div key={person._id}
                      className="flex items-center gap-4 px-8 py-3.5 hover:bg-slate-50 transition-colors"
                      style={{ animation: 'dashFadeUp 0.3s ease both', animationDelay: `${idx * 15}ms` }}
                    >
                      {/* Avatar */}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                        person.status === 'present' ? 'bg-emerald-100 text-emerald-700' :
                        person.status === 'absent'  ? 'bg-red-100 text-red-600' :
                        person.status === 'leave'   ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {person.name.charAt(0).toUpperCase()}
                      </div>

                      {/* Name + role/roll */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 text-sm truncate">{person.name}</p>
                        <p className="text-xs text-slate-400">
                          {person.person_type === 'student'
                            ? `Roll: ${person.id_no}`
                            : (person.role || '').replace('_', ' ')}
                        </p>
                      </div>

                      {/* Check-in time */}
                      {person.check_in && (
                        <span className="text-xs text-emerald-600 font-semibold shrink-0">
                          {new Date(person.check_in).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}

                      {/* Status badge */}
                      {meta ? (
                        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${meta.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`}/>
                          {meta.label}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 bg-slate-100 text-slate-400">
                          <Clock size={10}/> Not Marked
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <div className="flex gap-5 text-xs text-slate-400 flex-wrap">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"/> Present</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 inline-block"/> Absent</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"/> Leave</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-300 inline-block"/> Not Marked</span>
            </div>
            <button onClick={() => navigate('/attendance')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1 shrink-0">
              Full Attendance Page <ArrowRight size={13}/>
            </button>
          </div>
        </div>

      </div>
    </>
  );
};

export default Dashboard;
