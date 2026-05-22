import { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import {
  Users, BookOpen, Award, CalendarCheck, CheckCircle2,
  Play, Lock, ArrowRight, Layers, Banknote, Clock,
  TrendingUp, ChevronRight, Zap, GraduationCap,
  BarChart2, PlayCircle, FileText, CalendarDays,
} from 'lucide-react';

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const SHIFT_COLORS = {
  Morning:   { bg: 'bg-amber-100',   text: 'text-amber-800' },
  Afternoon: { bg: 'bg-blue-100',    text: 'text-blue-800' },
  Evening:   { bg: 'bg-violet-100',  text: 'text-violet-800' },
  Weekend:   { bg: 'bg-emerald-100', text: 'text-emerald-800' },
};

const Ring = ({ pct = 0, size = 100, stroke = 8, color = '#34d399' }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}/>
    </svg>
  );
};

export default function TeacherDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/teacher-portal/dashboard')
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  const modulesTotal     = data?.modules?.total || 0;
  const modulesCompleted = data?.modules?.completed || 0;
  const modulesInProgress = data?.modules?.in_progress || 0;
  const modulesPct       = modulesTotal > 0 ? Math.round((modulesCompleted / modulesTotal) * 100) : 0;
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="space-y-6">

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <div className="relative rounded-3xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #022c22 0%, #064e3b 50%, #065f46 100%)' }}>
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #34d399, transparent 70%)', transform: 'translate(25%,-25%)' }}/>
        <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #6ee7b7, transparent 70%)', transform: 'translate(-25%,25%)' }}/>

        <div className="relative z-10 px-6 py-7 md:px-10 md:py-10 flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="flex-1 min-w-0">
            <p className="text-emerald-400 text-sm font-semibold mb-1">{greeting()},</p>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-2 leading-tight">
              {user?.name} 👨‍🏫
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-white/10 border border-white/10 text-emerald-200 px-3 py-1 rounded-full text-xs font-semibold">
                {today}
              </span>
              {data?.studentCount > 0 && (
                <span className="bg-white/10 border border-white/10 text-slate-300 px-3 py-1 rounded-full text-xs">
                  {data.studentCount} students
                </span>
              )}
              {data?.courseCount > 0 && (
                <span className="bg-white/10 border border-white/10 text-slate-300 px-3 py-1 rounded-full text-xs">
                  {data.courseCount} course{data.courseCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {modulesTotal > 0 && (
              <div className="mt-5">
                <p className="text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">Module Delivery Progress</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden max-w-xs">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-all duration-700"
                      style={{ width: `${modulesPct}%` }}/>
                  </div>
                  <span className="text-white font-extrabold text-sm">{modulesPct}%</span>
                </div>
                <p className="text-slate-400 text-xs mt-1">
                  {modulesCompleted} completed · {modulesInProgress} in progress · {modulesTotal - modulesCompleted - modulesInProgress} upcoming
                </p>
              </div>
            )}

            <button onClick={() => navigate('/teacher-portal/courses')}
              className="mt-5 inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-emerald-900/40 hover:scale-105">
              <Layers size={16}/> Manage Modules <ArrowRight size={14}/>
            </button>
          </div>

          {modulesTotal > 0 && (
            <div className="hidden md:flex flex-shrink-0 items-center justify-center relative">
              <Ring pct={modulesPct} size={120} stroke={10} color="#34d399"/>
              <div className="absolute text-center">
                <p className="text-2xl font-extrabold text-white">{modulesPct}%</p>
                <p className="text-emerald-400 text-[10px] font-semibold">DONE</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── STATS ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'My Students',
            value: data?.studentCount || 0,
            sub: 'enrolled',
            icon: <Users size={20}/>,
            color: '#3b82f6', bg: '#dbeafe',
            to: '/teacher-portal/attendance',
          },
          {
            label: 'My Courses',
            value: data?.courseCount || 0,
            sub: `${modulesTotal} total modules`,
            icon: <BookOpen size={20}/>,
            color: '#10b981', bg: '#d1fae5',
            to: '/teacher-portal/courses',
          },
          {
            label: 'Present Today',
            value: data?.todayPresent || 0,
            sub: `of ${data?.studentCount || 0} students`,
            icon: <CalendarCheck size={20}/>,
            color: '#f59e0b', bg: '#fef3c7',
            to: '/teacher-portal/attendance',
          },
          {
            label: 'My Earnings',
            value: `Rs. ${(data?.totalEarnings || 0).toLocaleString()}`,
            sub: 'commission total',
            icon: <Banknote size={20}/>,
            color: '#8b5cf6', bg: '#ede9fe',
            to: '/teacher-portal/profile',
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

      {/* ── COURSE PROGRESS ──────────────────────────────────────────── */}
      {data?.courseProgress?.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
              <Layers size={20} className="text-emerald-500"/> Course Progress
            </h2>
            <Link to="/teacher-portal/courses"
              className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1">
              Manage <ArrowRight size={12}/>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.courseProgress.map(cp => {
              const pct = cp.progress_pct || 0;
              return (
                <div key={cp.course_id}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-all">
                  {/* Course header */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
                        <GraduationCap size={18} className="text-white"/>
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-800 text-sm">{cp.course_name}</h3>
                        <p className="text-xs text-slate-400">{cp.total} modules total</p>
                      </div>
                    </div>
                    <span className="text-lg font-extrabold text-emerald-600 shrink-0">{pct}%</span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: pct === 100 ? '#10b981' : 'linear-gradient(90deg,#34d399,#059669)' }}/>
                  </div>

                  {/* Module status pills */}
                  <div className="flex gap-2 flex-wrap mb-3">
                    <span className="flex items-center gap-1 text-[11px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">
                      <CheckCircle2 size={10}/> {cp.completed} done
                    </span>
                    {cp.in_progress > 0 && (
                      <span className="flex items-center gap-1 text-[11px] font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
                        <Play size={10}/> {cp.in_progress} active
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-[11px] font-bold bg-slate-50 text-slate-500 px-2.5 py-1 rounded-full">
                      <Lock size={10}/> {cp.total - cp.completed - cp.in_progress} upcoming
                    </span>
                  </div>

                  {/* Batch tags */}
                  {cp.batches?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-50">
                      {cp.batches.map(b => {
                        const sc = SHIFT_COLORS[b.shift] || SHIFT_COLORS.Morning;
                        return (
                          <span key={b._id}
                            className="flex items-center gap-1.5 bg-slate-800 text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
                            <CalendarDays size={9} className="text-teal-400"/>
                            {b.name}
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>
                              {b.shift}
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── BOTTOM GRID ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Recent Exams */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <BarChart2 size={16} className="text-violet-500"/> Recent Exams
            </h3>
            <Link to="/teacher-portal/exams"
              className="text-xs font-bold text-violet-600 hover:text-violet-800 flex items-center gap-1">
              All <ArrowRight size={11}/>
            </Link>
          </div>
          {data?.recentExams?.length > 0 ? (
            <div className="space-y-2">
              {data.recentExams.slice(0, 5).map(exam => (
                <div key={exam._id}
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                    <Award size={16} className="text-violet-600"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-700 text-sm truncate">{exam.title}</p>
                    <p className="text-xs text-slate-400">{exam.course_name} · {new Date(exam.exam_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}</p>
                  </div>
                  <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-lg shrink-0">
                    {exam.total_marks}m
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <Award size={36} className="text-slate-200 mx-auto mb-2"/>
              <p className="text-slate-400 text-sm mb-2">No exams yet</p>
              <Link to="/teacher-portal/exams"
                className="text-xs font-bold text-violet-600 hover:underline">Create First Exam →</Link>
            </div>
          )}
        </div>

        {/* Quick Access */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2 mb-4">
            <Zap size={16} className="text-amber-500"/> Quick Access
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { to: '/teacher-portal/courses',    label: 'My Courses',  icon: <BookOpen size={22}/>,      color: '#10b981', bg: '#d1fae5' },
              { to: '/teacher-portal/students',   label: 'Students',    icon: <Users size={22}/>,         color: '#3b82f6', bg: '#dbeafe' },
              { to: '/teacher-portal/attendance', label: 'Attendance',  icon: <CalendarCheck size={22}/>, color: '#f59e0b', bg: '#fef3c7' },
              { to: '/teacher-portal/exams',      label: 'Exams',       icon: <Award size={22}/>,         color: '#8b5cf6', bg: '#ede9fe' },
              { to: '/teacher-portal/lms',        label: 'LMS',         icon: <PlayCircle size={22}/>,    color: '#6366f1', bg: '#e0e7ff' },
              { to: '/teacher-portal/timetable',  label: 'Timetable',   icon: <Clock size={22}/>,         color: '#0891b2', bg: '#e0f2fe' },
              { to: '/teacher-portal/live-exams', label: 'Live Exams',  icon: <Zap size={22}/>,           color: '#e11d48', bg: '#ffe4e6' },
              { to: '/teacher-portal/profile',    label: 'Profile',     icon: <TrendingUp size={22}/>,    color: '#0f766e', bg: '#ccfbf1' },
              { to: '/teacher-portal/students',   label: 'Results',     icon: <FileText size={22}/>,      color: '#92400e', bg: '#fef3c7' },
            ].map(q => (
              <Link key={q.to + q.label} to={q.to}
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
      </div>

      {/* ── TODAY'S ATTENDANCE SNAPSHOT ──────────────────────────────── */}
      {data?.studentCount > 0 && (
        <div className="relative rounded-2xl overflow-hidden border border-emerald-100 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600 opacity-5"/>
          <div className="relative px-6 py-5 flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-200 shrink-0">
              <CalendarCheck size={26} className="text-white"/>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-0.5">Today's Attendance</p>
              <h3 className="font-extrabold text-slate-800 text-base">
                {data.todayPresent} / {data.studentCount} students present
              </h3>
              <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-xs">
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700"
                  style={{ width: `${data.studentCount ? Math.round((data.todayPresent / data.studentCount) * 100) : 0}%` }}/>
              </div>
            </div>
            <Link to="/teacher-portal/attendance"
              className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all flex items-center gap-2 shadow-md shadow-emerald-200">
              <CalendarCheck size={15}/> Mark
            </Link>
          </div>
        </div>
      )}

    </div>
  );
}
