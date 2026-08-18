import { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import {
  CalendarCheck, Wallet, Award, AlertTriangle, ChevronRight,
  BookOpen, CalendarDays, BookOpenCheck, Bell, FileText,
  Zap, ArrowRight, BarChart2, School,
} from 'lucide-react';

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
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

export default function StudentDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [profile,       setProfile]       = useState(null);
  const [fees,          setFees]          = useState(null);
  const [results,       setResults]       = useState([]);
  const [finesData,     setFinesData]     = useState(null);
  const [attendance,    setAttendance]    = useState(null);
  const [timetable,     setTimetable]     = useState([]);
  const [homework,      setHomework]      = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/student-portal/profile'),
      api.get('/student-portal/fees'),
      api.get('/student-portal/results'),
      api.get('/student-portal/fines'),
      api.get('/student-portal/attendance').catch(() => ({ data: null })),
      api.get('/student-portal/school-timetable').catch(() => ({ data: [] })),
      api.get('/homework/student').catch(() => ({ data: [] })),
      api.get('/announcements/student?limit=4').catch(() => ({ data: [] })),
    ]).then(([p, f, r, fn, att, tt, hw, ann]) => {
      setProfile(p.data);
      setFees(f.data);
      setResults(r.data);
      setFinesData(fn.data);
      setAttendance(att.data);
      setTimetable(Array.isArray(tt.data) ? tt.data : []);
      setHomework(Array.isArray(hw.data) ? hw.data : []);
      setAnnouncements(Array.isArray(ann.data) ? ann.data : []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  const todayName    = DAYS[new Date().getDay()];
  const todayClasses = timetable
    .filter(e => e.day_of_week === todayName && e.subject_id)
    .sort((a, b) => (a.period_id?.order || 0) - (b.period_id?.order || 0));

  const balance          = fees?.summary?.balance || 0;
  const passCount        = results.filter(r => r.grade !== 'F').length;
  const pendingFines     = finesData?.summary?.pending || 0;
  const pendingFineCount = finesData?.fines?.filter(f => f.status === 'pending').length || 0;
  const recentResults    = results.slice(0, 4);
  const attPct = attendance
    ? Math.round(((attendance.summary?.present || 0) / Math.max(attendance.summary?.total || 1, 1)) * 100)
    : null;
  const avgScore = results.length
    ? Math.round(results.reduce((s, r) => s + (r.marks_obtained / Math.max(r.exam_id?.total_marks || 1, 1)) * 100, 0) / results.length)
    : null;
  const overdueHw = homework.filter(h => h.due_date && new Date(h.due_date) < new Date());
  const schoolClass = profile?.school_class_id;

  return (
    <div className="space-y-6">

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <div className="relative rounded-3xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}>
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #818cf8, transparent 70%)', transform: 'translate(30%,-30%)' }}/>
        <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #a78bfa, transparent 70%)', transform: 'translate(-30%,30%)' }}/>

        <div className="relative z-10 px-6 py-7 md:px-10 md:py-10 flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="flex-1 min-w-0">
            <p className="text-indigo-300 text-sm font-medium mb-1">{greeting()},</p>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-3 leading-tight">
              {profile?.full_name || user?.name} 👋
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              {schoolClass?.name && (
                <span className="bg-white/10 border border-white/10 text-indigo-200 px-3 py-1 rounded-full font-semibold text-xs flex items-center gap-1.5">
                  <School size={11}/> {schoolClass.name}{schoolClass.section ? ` · ${schoolClass.section}` : ''}
                </span>
              )}
              {schoolClass?.grade && (
                <span className="bg-white/10 border border-white/10 text-slate-300 px-3 py-1 rounded-full text-xs">
                  {schoolClass.grade}
                </span>
              )}
              {profile?.roll_number && (
                <span className="bg-white/10 border border-white/10 text-slate-400 px-3 py-1 rounded-full text-xs font-mono">
                  Roll #{profile.roll_number}
                </span>
              )}
              {profile?.academic_year_id?.label && (
                <span className="bg-white/10 border border-white/10 text-slate-400 px-3 py-1 rounded-full text-xs">
                  {profile.academic_year_id.label}
                </span>
              )}
            </div>
            {todayClasses.length > 0 && (
              <div className="mt-5">
                <p className="text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-2">
                  Today — {todayName} · {todayClasses.length} period{todayClasses.length !== 1 ? 's' : ''}
                </p>
                <div className="flex flex-wrap gap-2">
                  {todayClasses.slice(0, 4).map((e, i) => (
                    <span key={i} className="px-3 py-1 rounded-full text-xs font-bold"
                      style={{ background: 'rgba(255,255,255,0.1)', color: '#c7d2fe', border: '1px solid rgba(165,180,252,0.2)' }}>
                      {e.subject_id?.name}
                    </span>
                  ))}
                  {todayClasses.length > 4 && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(255,255,255,0.08)', color: '#a5b4fc' }}>
                      +{todayClasses.length - 4} more
                    </span>
                  )}
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-3 mt-5">
              <button onClick={() => navigate('/student-portal/timetable')}
                className="inline-flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-indigo-900/40 hover:scale-105">
                <CalendarDays size={16}/> View Timetable
              </button>
              <button onClick={() => navigate('/student-portal/homework')}
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all">
                <BookOpenCheck size={16}/> Homework
                {overdueHw.length > 0 && (
                  <span className="ml-1 bg-rose-500 text-white text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center">{overdueHw.length}</span>
                )}
              </button>
            </div>
          </div>

          {attPct !== null && (
            <div className="hidden md:flex flex-shrink-0 items-center justify-center relative" style={{ width: 120, height: 120 }}>
              <svg width={120} height={120} style={{ transform: 'rotate(-90deg)', position: 'absolute', top: 0, left: 0 }}>
                <circle cx={60} cy={60} r={50} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={10}/>
                <circle cx={60} cy={60} r={50} fill="none"
                  stroke={attPct >= 75 ? '#34d399' : '#f87171'} strokeWidth={10}
                  strokeDasharray={2 * Math.PI * 50}
                  strokeDashoffset={2 * Math.PI * 50 * (1 - attPct / 100)}
                  strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }}/>
              </svg>
              <div className="flex flex-col items-center z-10">
                <p className="text-2xl font-extrabold text-white">{attPct}%</p>
                <p className="text-indigo-300 text-[10px] font-semibold tracking-wider">ATTENDANCE</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── ALERTS ────────────────────────────────────────────────────── */}
      {(overdueHw.length > 0 || balance > 0 || pendingFineCount > 0) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {overdueHw.length > 0 && (
            <Link to="/student-portal/homework"
              className="flex-1 flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 hover:shadow-md transition-all group">
              <div className="w-9 h-9 rounded-xl bg-rose-500 flex items-center justify-center shrink-0">
                <BookOpenCheck size={16} className="text-white"/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-rose-800 text-sm">{overdueHw.length} Overdue Assignment{overdueHw.length !== 1 ? 's' : ''}</p>
                <p className="text-rose-600 text-xs">Please submit as soon as possible</p>
              </div>
              <ChevronRight size={16} className="text-rose-400 group-hover:translate-x-0.5 transition-transform shrink-0"/>
            </Link>
          )}
          {balance > 0 && (
            <Link to="/student-portal/fees"
              className="flex-1 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 hover:shadow-md transition-all group">
              <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
                <Wallet size={16} className="text-white"/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-amber-800 text-sm">Fee Balance Due</p>
                <p className="text-amber-600 text-xs">Rs. {fmt(balance)} outstanding</p>
              </div>
              <ChevronRight size={16} className="text-amber-400 group-hover:translate-x-0.5 transition-transform shrink-0"/>
            </Link>
          )}
          {pendingFineCount > 0 && (
            <Link to="/student-portal/fines"
              className="flex-1 flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 hover:shadow-md transition-all group">
              <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center shrink-0">
                <AlertTriangle size={16} className="text-white"/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-orange-800 text-sm">{pendingFineCount} Unpaid Fine{pendingFineCount !== 1 ? 's' : ''}</p>
                <p className="text-orange-600 text-xs">Rs. {fmt(pendingFines)} pending</p>
              </div>
              <ChevronRight size={16} className="text-orange-400 group-hover:translate-x-0.5 transition-transform shrink-0"/>
            </Link>
          )}
        </div>
      )}

      {/* ── STATS ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Attendance',
            value: attPct !== null ? `${attPct}%` : '—',
            sub: attPct !== null ? (attPct >= 75 ? 'Good standing' : 'Needs improvement') : 'No records',
            icon: <CalendarCheck size={20}/>,
            color: attPct !== null && attPct < 75 ? '#dc2626' : '#16a34a',
            bg:    attPct !== null && attPct < 75 ? '#fee2e2' : '#dcfce7',
            to: '/student-portal/attendance',
          },
          {
            label: "Today's Classes",
            value: todayClasses.length || '—',
            sub: todayClasses.length > 0 ? todayName : 'No timetable set',
            icon: <CalendarDays size={20}/>,
            color: '#6366f1', bg: '#ede9fe',
            to: '/student-portal/timetable',
          },
          {
            label: 'Exams Passed',
            value: `${passCount}/${results.length}`,
            sub: avgScore !== null ? `Avg ${avgScore}%` : 'No exams yet',
            icon: <Award size={20}/>,
            color: '#d97706', bg: '#fef3c7',
            to: '/student-portal/results',
          },
          {
            label: 'Fee Status',
            value: balance > 0 ? `Rs. ${fmt(balance)}` : 'Clear',
            sub: balance > 0 ? 'Balance due' : 'All paid up',
            icon: <Wallet size={20}/>,
            color: balance > 0 ? '#dc2626' : '#16a34a',
            bg:    balance > 0 ? '#fee2e2' : '#dcfce7',
            to: '/student-portal/fees',
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
            <p className="text-xl font-extrabold text-slate-800 leading-tight">{s.value}</p>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{s.label}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{s.sub}</p>
          </Link>
        ))}
      </div>

      {/* ── TODAY'S SCHEDULE ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
            <CalendarDays size={18} className="text-indigo-500"/>
            Today's Schedule
            <span className="text-xs font-semibold text-slate-400">{todayName}</span>
          </h2>
          <Link to="/student-portal/timetable" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
            Full Timetable <ArrowRight size={12}/>
          </Link>
        </div>
        {todayClasses.length === 0 ? (
          <div className="py-10 text-center">
            <CalendarDays size={40} className="text-slate-200 mx-auto mb-2"/>
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
                      {entry.subject_id?.name || 'Free Period'}
                    </p>
                    <p className="text-xs truncate" style={{ color: pal?.text, opacity: 0.7 }}>
                      {fmt12(entry.period_id?.start_time)}{entry.period_id?.end_time ? ` – ${fmt12(entry.period_id.end_time)}` : ''}
                      {entry.teacher_id?.name ? ` · ${entry.teacher_id.name}` : ''}
                    </p>
                  </div>
                  {entry.room && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0"
                      style={{ background: pal?.text + '22', color: pal?.text }}>
                      {entry.room}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── HOMEWORK + RESULTS ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <BookOpenCheck size={16} className="text-indigo-500"/> Homework
            </h3>
            <Link to="/student-portal/homework" className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
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
                    <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${isOverdue ? 'bg-rose-500' : 'bg-indigo-400'}`}/>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-700 truncate">{hw.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {hw.subject_id?.name || 'General'}{hw.type ? ` · ${hw.type}` : ''}
                      </p>
                    </div>
                    {daysLeft !== null && (
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                        isOverdue ? 'bg-rose-100 text-rose-700' :
                        daysLeft === 0 ? 'bg-amber-100 text-amber-700' :
                        'bg-indigo-50 text-indigo-600'
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

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <BarChart2 size={16} className="text-amber-500"/> Recent Results
            </h3>
            <Link to="/student-portal/results" className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
              All <ArrowRight size={11}/>
            </Link>
          </div>
          {recentResults.length === 0 ? (
            <div className="py-10 text-center">
              <FileText size={36} className="text-slate-200 mx-auto mb-2"/>
              <p className="text-sm text-slate-400">No exam results yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentResults.map(r => {
                const pct    = r.exam_id?.total_marks ? Math.round((r.marks_obtained / r.exam_id.total_marks) * 100) : 0;
                const isPass = r.grade !== 'F';
                return (
                  <div key={r._id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-extrabold shrink-0 ${isPass ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {r.grade}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-700 truncate">{r.exam_id?.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden max-w-[100px]">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: isPass ? '#10b981' : '#ef4444' }}/>
                        </div>
                        <span className="text-[10px] text-slate-400">{r.marks_obtained}/{r.exam_id?.total_marks}</span>
                      </div>
                    </div>
                    <span className={`text-xs font-bold shrink-0 ${isPass ? 'text-emerald-600' : 'text-rose-600'}`}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── ANNOUNCEMENTS + QUICK ACCESS ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <Bell size={16} className="text-rose-500"/> Notices
            </h3>
            <Link to="/student-portal/announcements" className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
              All <ArrowRight size={11}/>
            </Link>
          </div>
          {announcements.length === 0 ? (
            <div className="py-10 text-center">
              <Bell size={36} className="text-slate-200 mx-auto mb-2"/>
              <p className="text-sm text-slate-400">No announcements yet</p>
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

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2 mb-4">
            <Zap size={16} className="text-violet-500"/> Quick Access
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { to: '/student-portal/timetable',   label: 'Timetable',   icon: <CalendarDays size={22}/>,   color: '#6366f1', bg: '#ede9fe' },
              { to: '/student-portal/homework',     label: 'Homework',    icon: <BookOpenCheck size={22}/>,  color: '#0891b2', bg: '#e0f2fe' },
              { to: '/student-portal/attendance',   label: 'Attendance',  icon: <CalendarCheck size={22}/>,  color: '#16a34a', bg: '#dcfce7' },
              { to: '/student-portal/results',      label: 'Results',     icon: <Award size={22}/>,          color: '#d97706', bg: '#fef3c7' },
              { to: '/student-portal/date-sheets',  label: 'Date Sheets', icon: <FileText size={22}/>,       color: '#0f766e', bg: '#ccfbf1' },
              { to: '/student-portal/fees',         label: 'Fees',        icon: <Wallet size={22}/>,         color: '#4338ca', bg: '#e0e7ff' },
              { to: '/student-portal/live-exams',   label: 'Live Exams',  icon: <Zap size={22}/>,            color: '#e11d48', bg: '#ffe4e6' },
              { to: '/student-portal/library',      label: 'Library',     icon: <BookOpen size={22}/>,       color: '#7c3aed', bg: '#f5f3ff' },
              {
                to: '/student-portal/fines', label: 'Fines',
                icon: <AlertTriangle size={22}/>,
                color: pendingFineCount > 0 ? '#dc2626' : '#6b7280',
                bg:    pendingFineCount > 0 ? '#fee2e2' : '#f1f5f9',
                badge: pendingFineCount > 0 ? pendingFineCount : null,
              },
            ].map(q => (
              <Link key={q.to + q.label} to={q.to}
                className="flex flex-col items-center gap-1.5 p-3 rounded-2xl hover:bg-slate-50 hover:-translate-y-0.5 transition-all text-center relative group">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-110"
                  style={{ background: q.bg, color: q.color }}>
                  {q.icon}
                </div>
                <span className="text-[11px] font-bold text-slate-600">{q.label}</span>
                {q.badge && (
                  <span className="absolute top-2 right-2 w-5 h-5 bg-red-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center">
                    {q.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── FEE SUMMARY ───────────────────────────────────────────────── */}
      {fees && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <Wallet size={16} className="text-indigo-500"/> Fee Summary
            </h3>
            <Link to="/student-portal/fees" className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
              Ledger <ArrowRight size={11}/>
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Total Payable', value: `Rs. ${fmt(fees.summary?.total)}`, color: 'text-slate-800' },
              { label: 'Paid',          value: `Rs. ${fmt(fees.summary?.paid)}`,  color: 'text-emerald-600' },
              { label: 'Balance',       value: `Rs. ${fmt(balance)}`,             color: balance > 0 ? 'text-rose-600' : 'text-emerald-600' },
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
                {Math.min(100, Math.round(((fees.summary?.paid || 0) / Math.max(fees.summary?.total || 1, 1)) * 100))}%
              </span>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700"
                style={{ width: `${Math.min(100, Math.round(((fees.summary?.paid || 0) / Math.max(fees.summary?.total || 1, 1)) * 100))}%` }}/>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
