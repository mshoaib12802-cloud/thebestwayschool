import { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import {
  PlayCircle, BookOpen, Wallet, Award, CalendarCheck,
  CheckCircle2, AlertTriangle, ArrowRight, Layers,
  Clock, TrendingUp, Star, Zap, ChevronRight,
  BarChart2, GraduationCap, FileText, Bell,
} from 'lucide-react';

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const fmt = (n) => Number(n || 0).toLocaleString();

// Circular progress ring
const Ring = ({ pct = 0, size = 80, stroke = 7, color = '#6366f1' }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke}/>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}/>
    </svg>
  );
};

// Course card — Udemy / Coursera style
const CourseCard = ({ course, lms }) => {
  const pct = lms?.progress_pct || 0;
  const PALETTES = [
    { bg: 'from-violet-600 to-indigo-700', light: '#ede9fe', accent: '#7c3aed' },
    { bg: 'from-indigo-600 to-blue-700',   light: '#e0e7ff', accent: '#4338ca' },
    { bg: 'from-emerald-600 to-teal-700',  light: '#d1fae5', accent: '#059669' },
    { bg: 'from-amber-500 to-orange-600',  light: '#fef3c7', accent: '#d97706' },
    { bg: 'from-rose-500 to-pink-600',     light: '#ffe4e6', accent: '#e11d48' },
  ];
  const pal = PALETTES[course.name?.charCodeAt(0) % PALETTES.length] || PALETTES[0];

  return (
    <Link to="/student-portal/lms"
      className="group bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
      {/* Thumbnail */}
      <div className={`h-28 bg-gradient-to-br ${pal.bg} flex items-center justify-center relative`}>
        <GraduationCap size={48} className="text-white/30"/>
        <div className="absolute inset-0 flex items-end p-3">
          <span className="text-white/80 text-[10px] font-bold uppercase tracking-widest bg-black/20 px-2 py-0.5 rounded-full">
            {course.duration || 'Course'}
          </span>
        </div>
        {pct === 100 && (
          <div className="absolute top-3 right-3 bg-emerald-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
            <CheckCircle2 size={9}/> Complete
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1">
        <h4 className="font-extrabold text-slate-800 text-sm leading-tight line-clamp-2 mb-1">{course.name}</h4>
        <p className="text-xs text-slate-400 mb-3">{lms?.total_videos || 0} video lessons · {lms?.completed || 0} completed</p>

        <div className="mt-auto">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-500 font-medium">{pct}% complete</span>
            {pct > 0 && pct < 100 && <span className="text-indigo-600 font-bold">In progress</span>}
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: pct === 100 ? '#10b981' : 'linear-gradient(90deg, #6366f1, #8b5cf6)' }}/>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default function StudentDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [profile,   setProfile]   = useState(null);
  const [fees,      setFees]      = useState(null);
  const [results,   setResults]   = useState([]);
  const [finesData, setFinesData] = useState(null);
  const [lmsCourses, setLmsCourses] = useState([]);
  const [attendance, setAttendance] = useState(null);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/student-portal/profile'),
      api.get('/student-portal/fees'),
      api.get('/student-portal/results'),
      api.get('/student-portal/fines'),
      api.get('/lms/my-courses').catch(() => ({ data: [] })),
      api.get('/student-portal/attendance').catch(() => ({ data: null })),
    ]).then(([p, f, r, fn, lms, att]) => {
      setProfile(p.data);
      setFees(f.data);
      setResults(r.data);
      setFinesData(fn.data);
      setLmsCourses(lms.data || []);
      setAttendance(att.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  const course           = profile?.courses?.[0];
  const balance          = fees?.summary?.balance || 0;
  const passCount        = results.filter(r => r.grade !== 'F').length;
  const pendingFines     = finesData?.summary?.pending || 0;
  const pendingFineCount = finesData?.fines?.filter(f => f.status === 'pending').length || 0;
  const recentResults    = results.slice(0, 4);

  // LMS stats — pick first enrolled course for "continue learning"
  const primaryLms    = lmsCourses[0];
  const lmsPct        = primaryLms?.lms?.progress_pct || 0;
  const totalVideos   = primaryLms?.lms?.total_videos || 0;
  const watchedVideos = primaryLms?.lms?.watched || 0;

  // Attendance %
  const attPct = attendance
    ? Math.round(((attendance.summary?.present || 0) / Math.max(attendance.summary?.total || 1, 1)) * 100)
    : null;

  const avgScore = results.length
    ? Math.round(results.reduce((s, r) => s + (r.marks_obtained / Math.max(r.exam_id?.total_marks || 1, 1)) * 100, 0) / results.length)
    : null;

  return (
    <div className="space-y-6">

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <div className="relative rounded-3xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}>
        {/* decorative blobs */}
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #818cf8, transparent 70%)', transform: 'translate(30%,-30%)' }}/>
        <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #a78bfa, transparent 70%)', transform: 'translate(-30%,30%)' }}/>

        <div className="relative z-10 px-6 py-7 md:px-10 md:py-10 flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Left — text */}
          <div className="flex-1 min-w-0">
            <p className="text-indigo-300 text-sm font-medium mb-1">{greeting()},</p>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-2 leading-tight">
              {profile?.full_name || user?.name} 👋
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {course?.course_name && (
                <span className="bg-white/10 border border-white/10 text-indigo-200 px-3 py-1 rounded-full font-semibold text-xs">
                  {course.course_name}
                </span>
              )}
              {course?.shift && (
                <span className="bg-white/10 border border-white/10 text-slate-300 px-3 py-1 rounded-full text-xs">
                  {course.shift} Shift
                </span>
              )}
              {profile?.roll_number && (
                <span className="bg-white/10 border border-white/10 text-slate-400 px-3 py-1 rounded-full text-xs font-mono">
                  {profile.roll_number}
                </span>
              )}
            </div>

            {primaryLms && (
              <div className="mt-5">
                <p className="text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-2">Your Learning Progress</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden max-w-xs">
                    <div className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-400 transition-all duration-700"
                      style={{ width: `${lmsPct}%` }}/>
                  </div>
                  <span className="text-white font-extrabold text-sm">{lmsPct}%</span>
                </div>
                <p className="text-slate-400 text-xs mt-1">{watchedVideos} of {totalVideos} videos watched</p>
              </div>
            )}

            <button onClick={() => navigate('/student-portal/lms')}
              className="mt-5 inline-flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-indigo-900/40 hover:shadow-indigo-700/50 hover:scale-105">
              <PlayCircle size={16}/> Continue Learning
              <ArrowRight size={14}/>
            </button>
          </div>

          {/* Right — ring */}
          {primaryLms && (
            <div className="flex-shrink-0 relative hidden md:flex items-center justify-center">
              <Ring pct={lmsPct} size={120} stroke={10} color="#818cf8"/>
              <div className="absolute text-center">
                <p className="text-2xl font-extrabold text-white">{lmsPct}%</p>
                <p className="text-indigo-300 text-[10px] font-semibold">DONE</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── ALERTS ───────────────────────────────────────────────────── */}
      {(pendingFineCount > 0 || balance > 0) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {balance > 0 && (
            <Link to="/student-portal/fees"
              className="flex-1 flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 hover:shadow-md transition-all group">
              <div className="w-9 h-9 rounded-xl bg-rose-500 flex items-center justify-center shrink-0">
                <Wallet size={16} className="text-white"/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-rose-800 text-sm">Fee Balance Due</p>
                <p className="text-rose-600 text-xs">Rs. {fmt(balance)} outstanding</p>
              </div>
              <ChevronRight size={16} className="text-rose-400 group-hover:translate-x-0.5 transition-transform shrink-0"/>
            </Link>
          )}
          {pendingFineCount > 0 && (
            <Link to="/student-portal/fines"
              className="flex-1 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 hover:shadow-md transition-all group">
              <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
                <AlertTriangle size={16} className="text-white"/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-amber-800 text-sm">{pendingFineCount} Unpaid Fine{pendingFineCount !== 1 ? 's' : ''}</p>
                <p className="text-amber-600 text-xs">Rs. {fmt(pendingFines)} pending</p>
              </div>
              <ChevronRight size={16} className="text-amber-400 group-hover:translate-x-0.5 transition-transform shrink-0"/>
            </Link>
          )}
        </div>
      )}

      {/* ── STATS ROW ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Videos Watched',
            value: watchedVideos,
            sub: `of ${totalVideos} total`,
            icon: <PlayCircle size={20}/>,
            color: '#6366f1', bg: '#ede9fe',
            to: '/student-portal/lms',
          },
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

      {/* ── CONTINUE LEARNING ────────────────────────────────────────── */}
      {lmsCourses.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
              <PlayCircle size={20} className="text-indigo-500"/> My Courses
            </h2>
            <Link to="/student-portal/lms"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
              Go to Learning <ArrowRight size={12}/>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {lmsCourses.map(c => (
              <CourseCard key={c._id} course={c} lms={c.lms}/>
            ))}
          </div>
        </div>
      )}

      {/* ── JUMP BACK IN (large CTA) ──────────────────────────────────── */}
      {primaryLms && lmsPct < 100 && (
        <div className="relative rounded-2xl overflow-hidden border border-indigo-100 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-600 opacity-5"/>
          <div className="relative px-6 py-5 flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200 shrink-0">
              <PlayCircle size={28} className="text-white"/>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-0.5">Jump back in</p>
              <h3 className="font-extrabold text-slate-800 text-base leading-tight truncate">{primaryLms.name}</h3>
              <p className="text-sm text-slate-500 mt-0.5">
                {watchedVideos} videos watched · {totalVideos - watchedVideos} remaining
              </p>
            </div>
            <Link to="/student-portal/lms"
              className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all flex items-center gap-2 shadow-md shadow-indigo-200">
              <PlayCircle size={15}/> Play
            </Link>
          </div>
        </div>
      )}

      {/* ── BOTTOM GRID: Results + Quick Links ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Recent Exam Results */}
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
            <div className="py-8 text-center text-slate-300">
              <FileText size={32} className="mx-auto mb-2 opacity-50"/>
              <p className="text-sm text-slate-400">No exam results yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentResults.map(r => {
                const pct = r.exam_id?.total_marks
                  ? Math.round((r.marks_obtained / r.exam_id.total_marks) * 100) : 0;
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

        {/* Quick Access */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2 mb-4">
            <Zap size={16} className="text-violet-500"/> Quick Access
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { to: '/student-portal/lms',        label: 'My Learning',  icon: <PlayCircle size={22}/>,    color: '#6366f1', bg: '#ede9fe' },
              { to: '/student-portal/courses',     label: 'Courses',      icon: <BookOpen size={22}/>,      color: '#4338ca', bg: '#e0e7ff' },
              { to: '/student-portal/modules',     label: 'Modules',      icon: <Layers size={22}/>,        color: '#7c3aed', bg: '#f5f3ff' },
              { to: '/student-portal/attendance',  label: 'Attendance',   icon: <CalendarCheck size={22}/>, color: '#0891b2', bg: '#e0f2fe' },
              { to: '/student-portal/results',     label: 'Results',      icon: <Star size={22}/>,          color: '#d97706', bg: '#fef3c7' },
              { to: '/student-portal/fees',        label: 'Fee Ledger',   icon: <TrendingUp size={22}/>,    color: '#16a34a', bg: '#dcfce7' },
              { to: '/student-portal/date-sheets', label: 'Date Sheets',  icon: <FileText size={22}/>,      color: '#0f766e', bg: '#ccfbf1' },
              { to: '/student-portal/timetable',   label: 'Timetable',    icon: <Clock size={22}/>,         color: '#7c3aed', bg: '#f5f3ff' },
              {
                to: '/student-portal/fines',
                label: 'Fines',
                icon: <Bell size={22}/>,
                color: pendingFineCount > 0 ? '#dc2626' : '#6b7280',
                bg:    pendingFineCount > 0 ? '#fee2e2' : '#f1f5f9',
                badge: pendingFineCount > 0 ? pendingFineCount : null,
              },
            ].map(q => (
              <Link key={q.to} to={q.to}
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

      {/* ── FEE SUMMARY ──────────────────────────────────────────────── */}
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
              { label: 'Total Payable', value: `Rs. ${fmt(fees.summary.total)}`, color: 'text-slate-800' },
              { label: 'Paid',          value: `Rs. ${fmt(fees.summary.paid)}`,  color: 'text-emerald-600' },
              { label: 'Balance',       value: `Rs. ${fmt(balance)}`,            color: balance > 0 ? 'text-rose-600' : 'text-emerald-600' },
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
                {Math.min(100, Math.round((fees.summary.paid / Math.max(fees.summary.total, 1)) * 100))}%
              </span>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700"
                style={{ width: `${Math.min(100, Math.round((fees.summary.paid / Math.max(fees.summary.total, 1)) * 100))}%` }}/>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
