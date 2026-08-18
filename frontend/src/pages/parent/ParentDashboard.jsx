import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  Users, CalendarCheck, FileText, Wallet, AlertTriangle,
  ChevronRight, Bell, BookOpenCheck, CalendarDays,
  ArrowRight, Zap, CalendarClock, MessageCircle, Shield,
  School, TrendingUp, Clock,
} from 'lucide-react';

const GRADE_COLORS = {
  'A+': 'text-emerald-600', A: 'text-green-600', B: 'text-blue-600',
  C: 'text-amber-600', D: 'text-orange-500', F: 'text-red-500',
};
const fmt = (n) => Number(n || 0).toLocaleString();
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PALETTE = [
  { bg: '#ede9fe', text: '#5b21b6', border: '#ddd6fe' },
  { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe' },
  { bg: '#dcfce7', text: '#14532d', border: '#bbf7d0' },
  { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
  { bg: '#fce7f3', text: '#831843', border: '#fbcfe8' },
  { bg: '#ccfbf1', text: '#134e4a', border: '#99f6e4' },
  { bg: '#e0f2fe', text: '#0c4a6e', border: '#bae6fd' },
];
const subjectColor = (id) => {
  if (!id) return PALETTE[0];
  let h = 0; const s = String(id);
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return PALETTE[Math.abs(h) % PALETTE.length];
};
const fmt12 = (t) => {
  if (!t) return ''; const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

const AttBar = ({ pct }) => (
  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
    <div className="h-full rounded-full transition-all duration-700"
      style={{ width: `${pct}%`, background: pct >= 75 ? 'linear-gradient(90deg,#10b981,#0d9488)' : 'linear-gradient(90deg,#f59e0b,#ef4444)' }}/>
  </div>
);

export default function ParentDashboard() {
  const [children,      setChildren]      = useState([]);
  const [selected,      setSelected]      = useState(null);
  const [childData,     setChildData]     = useState({});
  const [timetable,     setTimetable]     = useState([]);
  const [homework,      setHomework]      = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [childLoading,  setChildLoading]  = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/parent-portal/children'),
      api.get('/parent-portal/homework').catch(() => ({ data: [] })),
      api.get('/announcements/parent?limit=4').catch(() => ({ data: [] })),
    ]).then(([c, hw, ann]) => {
      setChildren(c.data || []);
      if (c.data?.length) setSelected(c.data[0]._id);
      setHomework(Array.isArray(hw.data) ? hw.data : []);
      setAnnouncements(Array.isArray(ann.data) ? ann.data : []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setChildLoading(true);
    Promise.all([
      api.get(`/parent-portal/children/${selected}/attendance`),
      api.get(`/parent-portal/children/${selected}/report-cards`),
      api.get(`/parent-portal/children/${selected}/fees`),
      api.get(`/parent-portal/children/${selected}/fines`),
      api.get(`/parent-portal/children/${selected}/timetable`).catch(() => ({ data: [] })),
    ]).then(([att, rc, fees, fines, tt]) => {
      const total   = att.data?.length || 0;
      const present = (att.data || []).filter(a => a.status === 'present' || a.status === 'late').length;
      const feeSummary = fees.data?.summary || {};
      const unpaidFines = (fines.data || []).filter(f => !f.is_paid);
      const latestCard  = rc.data?.[0];
      setTimetable(Array.isArray(tt.data) ? tt.data : []);
      setChildData(prev => ({
        ...prev,
        [selected]: {
          attTotal: total, attPresent: present, attPct: total ? Math.round((present / total) * 100) : 0,
          latestCard, totalCards: rc.data?.length || 0,
          feeSummary, unpaidFines,
          recentCards: (rc.data || []).slice(0, 3),
          recentAtt:   (att.data || []).slice(-7).reverse(),
        },
      }));
    }).catch(() => {}).finally(() => setChildLoading(false));
  }, [selected]);

  const child = children.find(c => c._id === selected);
  const cd    = childData[selected];

  const todayName    = DAYS[new Date().getDay()];
  const todayClasses = timetable
    .filter(e => e.day_of_week === todayName && e.subject_id)
    .sort((a, b) => (a.period_id?.order || 0) - (b.period_id?.order || 0));

  const pendingHw  = homework.filter(h => h.class_id?._id === child?.school_class_id?._id || h.class_id === child?.school_class_id);
  const overdueHw  = pendingHw.filter(h => h.due_date && new Date(h.due_date) < new Date());

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  if (!children.length) return (
    <div className="text-center py-20 text-slate-400">
      <Users size={56} className="mx-auto mb-4 opacity-20"/>
      <p className="text-lg font-semibold text-slate-500 mb-1">No children linked</p>
      <p className="text-sm">Please contact the school administration to link your children.</p>
    </div>
  );

  return (
    <div className="space-y-6">

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <div className="relative rounded-3xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #042f2e 0%, #0f766e 50%, #0d9488 100%)' }}>
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #2dd4bf, transparent 70%)', transform: 'translate(30%,-30%)' }}/>
        <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #99f6e4, transparent 70%)', transform: 'translate(-30%,30%)' }}/>

        <div className="relative z-10 px-6 py-7 md:px-10 md:py-10">
          <p className="text-teal-300 text-sm font-semibold mb-3">Parent Dashboard</p>

          {/* Child selector chips */}
          {children.length > 1 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {children.map(c => (
                <button key={c._id} onClick={() => setSelected(c._id)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all"
                  style={selected === c._id
                    ? { background: 'rgba(255,255,255,0.25)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }
                    : { background: 'rgba(255,255,255,0.08)', color: '#99f6e4', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-extrabold">
                    {c.full_name?.charAt(0)}
                  </div>
                  {c.full_name}
                </button>
              ))}
            </div>
          )}

          {/* Selected child info */}
          {child && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-extrabold text-teal-700 shrink-0"
                style={{ background: 'rgba(255,255,255,0.15)' }}>
                {child.full_name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-2 leading-tight">
                  {child.full_name}
                </h1>
                <div className="flex flex-wrap items-center gap-2">
                  {child.school_class_id?.name && (
                    <span className="bg-white/10 border border-white/10 text-teal-200 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5">
                      <School size={11}/> {child.school_class_id.name}{child.school_class_id.section ? ` · ${child.school_class_id.section}` : ''}
                    </span>
                  )}
                  {child.roll_number && (
                    <span className="bg-white/10 border border-white/10 text-slate-300 px-3 py-1 rounded-full text-xs font-mono">
                      Roll #{child.roll_number}
                    </span>
                  )}
                  {child.academic_year_id?.label && (
                    <span className="bg-white/10 border border-white/10 text-slate-300 px-3 py-1 rounded-full text-xs">
                      {child.academic_year_id.label}
                    </span>
                  )}
                </div>
              </div>

              {/* Attendance ring */}
              {cd && (
                <div className="hidden md:flex flex-shrink-0 items-center justify-center relative" style={{ width: 110, height: 110 }}>
                  <svg width={110} height={110} style={{ transform: 'rotate(-90deg)', position: 'absolute', top: 0, left: 0 }}>
                    <circle cx={55} cy={55} r={46} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={9}/>
                    <circle cx={55} cy={55} r={46} fill="none"
                      stroke={cd.attPct >= 75 ? '#2dd4bf' : '#fb923c'} strokeWidth={9}
                      strokeDasharray={2 * Math.PI * 46}
                      strokeDashoffset={2 * Math.PI * 46 * (1 - cd.attPct / 100)}
                      strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }}/>
                  </svg>
                  <div className="flex flex-col items-center z-10">
                    <p className="text-xl font-extrabold text-white">{cd.attPct}%</p>
                    <p className="text-teal-300 text-[9px] font-bold tracking-wider">ATTENDANCE</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── ALERTS ────────────────────────────────────────────────────── */}
      {cd && (cd.unpaidFines?.length > 0 || cd.feeSummary?.balance > 0 || overdueHw.length > 0) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {overdueHw.length > 0 && (
            <Link to="/parent-portal/homework"
              className="flex-1 flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 hover:shadow-md transition-all group">
              <div className="w-9 h-9 rounded-xl bg-rose-500 flex items-center justify-center shrink-0">
                <BookOpenCheck size={16} className="text-white"/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-rose-800 text-sm">{overdueHw.length} Overdue Homework</p>
                <p className="text-rose-600 text-xs">Please follow up with your child</p>
              </div>
              <ChevronRight size={16} className="text-rose-400 group-hover:translate-x-0.5 transition-transform shrink-0"/>
            </Link>
          )}
          {cd.feeSummary?.balance > 0 && (
            <Link to="/parent-portal/fees"
              className="flex-1 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 hover:shadow-md transition-all group">
              <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
                <Wallet size={16} className="text-white"/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-amber-800 text-sm">Fee Balance Due</p>
                <p className="text-amber-600 text-xs">Rs. {fmt(cd.feeSummary.balance)} outstanding</p>
              </div>
              <ChevronRight size={16} className="text-amber-400 group-hover:translate-x-0.5 transition-transform shrink-0"/>
            </Link>
          )}
          {cd.unpaidFines?.length > 0 && (
            <Link to="/parent-portal/fines"
              className="flex-1 flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 hover:shadow-md transition-all group">
              <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center shrink-0">
                <AlertTriangle size={16} className="text-white"/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-orange-800 text-sm">{cd.unpaidFines.length} Unpaid Fine{cd.unpaidFines.length !== 1 ? 's' : ''}</p>
                <p className="text-orange-600 text-xs">Please clear at your earliest</p>
              </div>
              <ChevronRight size={16} className="text-orange-400 group-hover:translate-x-0.5 transition-transform shrink-0"/>
            </Link>
          )}
        </div>
      )}

      {/* ── STATS ─────────────────────────────────────────────────────── */}
      {childLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 animate-pulse h-24"/>
          ))}
        </div>
      ) : cd && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: 'Attendance',
              value: `${cd.attPct}%`,
              sub: `${cd.attPresent}/${cd.attTotal} days present`,
              icon: <CalendarCheck size={20}/>,
              color: cd.attPct < 75 ? '#dc2626' : '#0d9488',
              bg:    cd.attPct < 75 ? '#fee2e2' : '#ccfbf1',
              to: '/parent-portal/attendance',
            },
            {
              label: 'Latest Grade',
              value: cd.latestCard?.grade || '—',
              sub: cd.latestCard ? `${cd.latestCard.percentage}% · ${cd.latestCard.term || ''}` : 'No results yet',
              icon: <FileText size={20}/>,
              color: '#8b5cf6', bg: '#ede9fe',
              to: '/parent-portal/results',
              valueClass: cd.latestCard ? GRADE_COLORS[cd.latestCard.grade] || 'text-slate-800' : 'text-slate-400',
            },
            {
              label: "Today's Classes",
              value: todayClasses.length || '—',
              sub: todayClasses.length > 0 ? todayName : 'No timetable set',
              icon: <CalendarDays size={20}/>,
              color: '#6366f1', bg: '#e0e7ff',
              to: '/parent-portal/timetable',
            },
            {
              label: 'Fee Status',
              value: cd.feeSummary?.balance > 0 ? `Rs. ${fmt(cd.feeSummary.balance)}` : 'Clear',
              sub: cd.feeSummary?.balance > 0 ? 'Balance due' : 'All paid up',
              icon: <Wallet size={20}/>,
              color: cd.feeSummary?.balance > 0 ? '#dc2626' : '#0d9488',
              bg:    cd.feeSummary?.balance > 0 ? '#fee2e2' : '#ccfbf1',
              to: '/parent-portal/fees',
            },
          ].map(s => (
            <Link key={s.label} to={s.to}
              className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-0.5 transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: s.bg, color: s.color }}>
                  {s.icon}
                </div>
                <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all mt-1"/>
              </div>
              <p className={`text-xl font-extrabold leading-tight ${s.valueClass || 'text-slate-800'}`}>{s.value}</p>
              <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{s.label}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{s.sub}</p>
            </Link>
          ))}
        </div>
      )}

      {/* ── TODAY'S TIMETABLE ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
            <CalendarDays size={18} className="text-teal-500"/>
            Today's Classes
            <span className="text-xs font-semibold text-slate-400">{todayName}</span>
          </h2>
          <Link to="/parent-portal/timetable" className="text-xs font-bold text-teal-600 hover:text-teal-800 flex items-center gap-1">
            Full Timetable <ArrowRight size={12}/>
          </Link>
        </div>
        {childLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse"/>)}
          </div>
        ) : todayClasses.length === 0 ? (
          <div className="py-10 text-center">
            <Clock size={40} className="text-slate-200 mx-auto mb-2"/>
            <p className="text-slate-400 text-sm">No classes scheduled for {todayName}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {todayClasses.map((entry, i) => {
              const pal = subjectColor(entry.subject_id?._id);
              return (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl border"
                  style={{ background: pal?.bg, borderColor: pal?.border }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-white font-extrabold text-sm"
                    style={{ background: pal?.text }}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate" style={{ color: pal?.text }}>
                      {entry.subject_id?.name}
                    </p>
                    <p className="text-xs truncate" style={{ color: pal?.text, opacity: 0.7 }}>
                      {fmt12(entry.period_id?.start_time)}{entry.period_id?.end_time ? ` – ${fmt12(entry.period_id.end_time)}` : ''}
                      {entry.teacher_id?.name ? ` · ${entry.teacher_id.name}` : ''}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── HOMEWORK + ATTENDANCE ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <BookOpenCheck size={16} className="text-teal-500"/> Homework
            </h3>
            <Link to="/parent-portal/homework" className="text-xs font-bold text-teal-600 hover:underline flex items-center gap-1">
              All <ArrowRight size={11}/>
            </Link>
          </div>
          {homework.length === 0 ? (
            <div className="py-10 text-center">
              <BookOpenCheck size={36} className="text-slate-200 mx-auto mb-2"/>
              <p className="text-sm text-slate-400">No homework assigned yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {homework.slice(0, 5).map(hw => {
                const isOverdue = hw.due_date && new Date(hw.due_date) < new Date();
                const daysLeft  = hw.due_date ? Math.ceil((new Date(hw.due_date) - new Date()) / 86400000) : null;
                return (
                  <div key={hw._id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isOverdue ? 'bg-rose-100' : 'bg-teal-100'}`}>
                      <BookOpenCheck size={14} className={isOverdue ? 'text-rose-500' : 'text-teal-600'}/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-700 truncate">{hw.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {hw.class_id?.name || ''}{hw.subject_id?.name ? ` · ${hw.subject_id.name}` : ''}
                      </p>
                    </div>
                    {daysLeft !== null && (
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                        isOverdue ? 'bg-rose-100 text-rose-700' :
                        daysLeft === 0 ? 'bg-amber-100 text-amber-700' :
                        'bg-teal-50 text-teal-700'
                      }`}>
                        {isOverdue ? `${Math.abs(daysLeft)}d late` : daysLeft === 0 ? 'Today' : `${daysLeft}d`}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Attendance summary */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <CalendarCheck size={16} className="text-teal-500"/> Attendance
            </h3>
            <Link to="/parent-portal/attendance" className="text-xs font-bold text-teal-600 hover:underline flex items-center gap-1">
              Details <ArrowRight size={11}/>
            </Link>
          </div>
          {childLoading || !cd ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-8 bg-slate-100 rounded-xl animate-pulse"/>)}</div>
          ) : (
            <>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                    <span>Present</span>
                    <span className="font-bold text-slate-700">{cd.attPct}%</span>
                  </div>
                  <AttBar pct={cd.attPct}/>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xl font-extrabold" style={{ color: cd.attPct >= 75 ? '#0d9488' : '#dc2626' }}>{cd.attPct}%</p>
                  <p className="text-xs text-slate-400">{cd.attPresent}/{cd.attTotal} days</p>
                </div>
              </div>
              {cd.recentAtt?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 mb-2">Last 7 days</p>
                  <div className="flex gap-1.5">
                    {cd.recentAtt.slice(0, 7).map((a, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className={`w-full h-6 rounded-md ${
                          a.status === 'present' ? 'bg-teal-400' :
                          a.status === 'late'    ? 'bg-amber-400' :
                          a.status === 'leave'   ? 'bg-blue-400'  : 'bg-rose-400'
                        }`}/>
                        <span className="text-[9px] text-slate-400 font-semibold">
                          {new Date(a.date).toLocaleDateString('en-US', { weekday: 'narrow' })}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3 mt-2 flex-wrap">
                    {[
                      { label: 'Present', color: 'bg-teal-400' },
                      { label: 'Late', color: 'bg-amber-400' },
                      { label: 'Leave', color: 'bg-blue-400' },
                      { label: 'Absent', color: 'bg-rose-400' },
                    ].map(l => (
                      <span key={l.label} className="flex items-center gap-1 text-[10px] text-slate-400">
                        <span className={`w-2 h-2 rounded-sm ${l.color}`}/>{l.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── RESULTS + ANNOUNCEMENTS ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <FileText size={16} className="text-violet-500"/> Report Cards
            </h3>
            <Link to="/parent-portal/results" className="text-xs font-bold text-teal-600 hover:underline flex items-center gap-1">
              All <ArrowRight size={11}/>
            </Link>
          </div>
          {childLoading || !cd ? (
            <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse"/>)}</div>
          ) : cd.recentCards?.length === 0 ? (
            <div className="py-10 text-center">
              <FileText size={36} className="text-slate-200 mx-auto mb-2"/>
              <p className="text-sm text-slate-400">No report cards yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cd.recentCards.map(rc => (
                <div key={rc._id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-sm shrink-0 bg-violet-100 ${GRADE_COLORS[rc.grade] || 'text-slate-700'}`}>
                    {rc.grade}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700">{rc.term || 'Term'}</p>
                    <p className="text-xs text-slate-400">
                      {rc.percentage}% · {rc.total_marks ? `${rc.marks_obtained}/${rc.total_marks}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-slate-500">
                      {rc.exam_date ? new Date(rc.exam_date).toLocaleDateString('en-PK', { month: 'short', year: 'numeric' }) : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <Bell size={16} className="text-rose-500"/> School Notices
            </h3>
            <Link to="/parent-portal/announcements" className="text-xs font-bold text-teal-600 hover:underline flex items-center gap-1">
              All <ArrowRight size={11}/>
            </Link>
          </div>
          {announcements.length === 0 ? (
            <div className="py-10 text-center">
              <Bell size={36} className="text-slate-200 mx-auto mb-2"/>
              <p className="text-sm text-slate-400">No announcements</p>
            </div>
          ) : (
            <div className="space-y-2">
              {announcements.map(a => (
                <div key={a._id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Bell size={14} className="text-rose-500"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700 line-clamp-2">{a.title}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(a.createdAt || a.date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── QUICK LINKS ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2 mb-4">
          <Zap size={16} className="text-amber-500"/> Quick Links
        </h3>
        <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 gap-3">
          {[
            { to: '/parent-portal/timetable',     label: 'Timetable',   icon: <CalendarDays size={22}/>,   color: '#6366f1', bg: '#ede9fe' },
            { to: '/parent-portal/homework',       label: 'Homework',    icon: <BookOpenCheck size={22}/>,  color: '#0891b2', bg: '#e0f2fe' },
            { to: '/parent-portal/attendance',     label: 'Attendance',  icon: <CalendarCheck size={22}/>,  color: '#0d9488', bg: '#ccfbf1' },
            { to: '/parent-portal/results',        label: 'Results',     icon: <FileText size={22}/>,       color: '#8b5cf6', bg: '#ede9fe' },
            { to: '/parent-portal/fees',           label: 'Fees',        icon: <Wallet size={22}/>,         color: '#16a34a', bg: '#dcfce7' },
            { to: '/parent-portal/fines',          label: 'Fines',       icon: <AlertTriangle size={22}/>,  color: '#d97706', bg: '#fef3c7' },
            { to: '/parent-portal/ptm',            label: 'PTM',         icon: <CalendarClock size={22}/>,  color: '#0369a1', bg: '#e0f2fe' },
            { to: '/parent-portal/complaints',     label: 'Complaints',  icon: <MessageCircle size={22}/>,  color: '#be185d', bg: '#fce7f3' },
          ].map(q => (
            <Link key={q.to} to={q.to}
              className="flex flex-col items-center gap-1.5 p-3 rounded-2xl hover:bg-slate-50 hover:-translate-y-0.5 transition-all text-center group">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-110"
                style={{ background: q.bg, color: q.color }}>
                {q.icon}
              </div>
              <span className="text-[11px] font-bold text-slate-600">{q.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── FEE SUMMARY ───────────────────────────────────────────────── */}
      {cd?.feeSummary?.total > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <Wallet size={16} className="text-teal-500"/> Fee Summary
            </h3>
            <Link to="/parent-portal/fees" className="text-xs font-bold text-teal-600 hover:underline flex items-center gap-1">
              Details <ArrowRight size={11}/>
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Total Payable', value: `Rs. ${fmt(cd.feeSummary.total)}`,   color: 'text-slate-800' },
              { label: 'Paid',          value: `Rs. ${fmt(cd.feeSummary.paid)}`,    color: 'text-emerald-600' },
              { label: 'Balance',       value: `Rs. ${fmt(cd.feeSummary.balance)}`, color: cd.feeSummary.balance > 0 ? 'text-rose-600' : 'text-emerald-600' },
            ].map(s => (
              <div key={s.label} className="bg-slate-50 rounded-xl p-3 text-center">
                <p className={`text-base font-extrabold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Payment progress</span>
              <span className="font-bold text-slate-700">
                {Math.min(100, Math.round(((cd.feeSummary.paid || 0) / Math.max(cd.feeSummary.total || 1, 1)) * 100))}%
              </span>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-700"
                style={{ width: `${Math.min(100, Math.round(((cd.feeSummary.paid || 0) / Math.max(cd.feeSummary.total || 1, 1)) * 100))}%` }}/>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
