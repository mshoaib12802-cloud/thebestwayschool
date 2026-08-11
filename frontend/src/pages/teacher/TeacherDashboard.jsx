import { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import {
  Users, BookOpen, Award, CalendarCheck, ArrowRight, Zap,
  ChevronRight, BarChart2, CalendarDays, BookOpenCheck,
  Bell, ClipboardList, UserCheck, Clock, FileText, GraduationCap,
} from 'lucide-react';

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

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

export default function TeacherDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [data,          setData]          = useState(null);
  const [timetable,     setTimetable]     = useState([]);
  const [homework,      setHomework]      = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/teacher-portal/dashboard'),
      api.get('/teacher-portal/school-timetable').catch(() => ({ data: [] })),
      api.get('/homework?limit=5').catch(() => ({ data: [] })),
      api.get('/announcements/teacher?limit=4').catch(() => ({ data: [] })),
    ]).then(([d, tt, hw, ann]) => {
      setData(d.data);
      setTimetable(Array.isArray(tt.data) ? tt.data : []);
      setHomework(Array.isArray(hw.data) ? hw.data : []);
      setAnnouncements(Array.isArray(ann.data) ? ann.data : []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  const todayName    = DAYS[new Date().getDay()];
  const todayDate    = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
  const todayClasses = timetable
    .filter(e => e.day_of_week === todayName && e.subject_id)
    .sort((a, b) => (a.period_id?.sort_order || 0) - (b.period_id?.sort_order || 0));

  const myClassIds     = [...new Set(timetable.map(e => e.class_id?._id).filter(Boolean))];
  const myClassCount   = myClassIds.length;
  const recentHw       = homework.slice(0, 5);
  const attPct         = data?.studentCount
    ? Math.round((data.todayPresent / data.studentCount) * 100) : 0;

  return (
    <div className="space-y-6">

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <div className="relative rounded-3xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #022c22 0%, #064e3b 50%, #065f46 100%)' }}>
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #34d399, transparent 70%)', transform: 'translate(25%,-25%)' }}/>
        <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #6ee7b7, transparent 70%)', transform: 'translate(-25%,25%)' }}/>

        <div className="relative z-10 px-6 py-7 md:px-10 md:py-10 flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="flex-1 min-w-0">
            <p className="text-emerald-400 text-sm font-semibold mb-1">{greeting()},</p>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-3 leading-tight">
              {user?.name} 👨‍🏫
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-white/10 border border-white/10 text-emerald-200 px-3 py-1 rounded-full text-xs font-semibold">
                {todayDate}
              </span>
              {myClassCount > 0 && (
                <span className="bg-white/10 border border-white/10 text-slate-300 px-3 py-1 rounded-full text-xs">
                  {myClassCount} class{myClassCount !== 1 ? 'es' : ''}
                </span>
              )}
              {data?.studentCount > 0 && (
                <span className="bg-white/10 border border-white/10 text-slate-300 px-3 py-1 rounded-full text-xs">
                  {data.studentCount} students
                </span>
              )}
            </div>

            {todayClasses.length > 0 && (
              <div className="mt-5">
                <p className="text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  Today's Schedule · {todayClasses.length} period{todayClasses.length !== 1 ? 's' : ''}
                </p>
                <div className="flex flex-wrap gap-2">
                  {todayClasses.slice(0, 4).map((e, i) => (
                    <span key={i} className="px-3 py-1 rounded-full text-xs font-bold"
                      style={{ background: 'rgba(255,255,255,0.1)', color: '#a7f3d0', border: '1px solid rgba(110,231,183,0.2)' }}>
                      {e.class_id?.name}{e.class_id?.section ? ` ${e.class_id.section}` : ''} — {e.subject_id?.name}
                    </span>
                  ))}
                  {todayClasses.length > 4 && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(255,255,255,0.08)', color: '#6ee7b7' }}>
                      +{todayClasses.length - 4} more
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3 mt-5">
              <button onClick={() => navigate('/teacher-portal/class-attendance')}
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-emerald-900/40 hover:scale-105">
                <UserCheck size={16}/> Mark Attendance
              </button>
              <button onClick={() => navigate('/teacher-portal/marks-entry')}
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all">
                <ClipboardList size={16}/> Marks Entry
              </button>
            </div>
          </div>

          {/* Attendance ring */}
          {data?.studentCount > 0 && (
            <div className="hidden md:flex flex-shrink-0 items-center justify-center relative" style={{ width: 120, height: 120 }}>
              <svg width={120} height={120} style={{ transform: 'rotate(-90deg)', position: 'absolute', top: 0, left: 0 }}>
                <circle cx={60} cy={60} r={50} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={10}/>
                <circle cx={60} cy={60} r={50} fill="none"
                  stroke={attPct >= 75 ? '#34d399' : '#fbbf24'} strokeWidth={10}
                  strokeDasharray={2 * Math.PI * 50}
                  strokeDashoffset={2 * Math.PI * 50 * (1 - attPct / 100)}
                  strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }}/>
              </svg>
              <div className="flex flex-col items-center z-10">
                <p className="text-2xl font-extrabold text-white">{attPct}%</p>
                <p className="text-emerald-300 text-[10px] font-semibold tracking-wider">PRESENT</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── STATS ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'My Classes',
            value: myClassCount || data?.courseCount || 0,
            sub: myClassCount > 0 ? 'School classes' : 'Assigned courses',
            icon: <BookOpen size={20}/>,
            color: '#10b981', bg: '#d1fae5',
            to: '/teacher-portal/timetable',
          },
          {
            label: 'My Students',
            value: data?.studentCount || 0,
            sub: 'Total enrolled',
            icon: <Users size={20}/>,
            color: '#3b82f6', bg: '#dbeafe',
            to: '/teacher-portal/students',
          },
          {
            label: 'Present Today',
            value: data?.todayPresent || 0,
            sub: `of ${data?.studentCount || 0} students`,
            icon: <CalendarCheck size={20}/>,
            color: '#f59e0b', bg: '#fef3c7',
            to: '/teacher-portal/class-attendance',
          },
          {
            label: 'Homework Set',
            value: homework.length || 0,
            sub: 'Recent assignments',
            icon: <BookOpenCheck size={20}/>,
            color: '#8b5cf6', bg: '#ede9fe',
            to: '/teacher-portal/homework',
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

      {/* ── TODAY'S TIMETABLE ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
            <CalendarDays size={18} className="text-emerald-500"/>
            Today's Timetable
            <span className="text-xs font-semibold text-slate-400">{todayName}</span>
          </h2>
          <Link to="/teacher-portal/timetable" className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1">
            Full Schedule <ArrowRight size={12}/>
          </Link>
        </div>
        {todayClasses.length === 0 ? (
          <div className="py-10 text-center">
            <CalendarDays size={40} className="text-slate-200 mx-auto mb-2"/>
            <p className="text-slate-400 text-sm">No classes scheduled for {todayName}</p>
            <p className="text-slate-300 text-xs mt-1">Check your full timetable for weekly schedule</p>
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
                    <p className="text-xs truncate" style={{ color: pal?.text, opacity: 0.75 }}>
                      {entry.class_id?.name}{entry.class_id?.section ? ` ${entry.class_id.section}` : ''}
                      {entry.period_id?.start_time ? ` · ${fmt12(entry.period_id.start_time)}` : ''}
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

      {/* ── HOMEWORK + EXAMS ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Recent Homework Assigned */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <BookOpenCheck size={16} className="text-violet-500"/> Homework Diary
            </h3>
            <Link to="/teacher-portal/homework" className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1">
              Manage <ArrowRight size={11}/>
            </Link>
          </div>
          {recentHw.length === 0 ? (
            <div className="py-10 text-center">
              <BookOpenCheck size={36} className="text-slate-200 mx-auto mb-2"/>
              <p className="text-sm text-slate-400 mb-3">No homework assigned yet</p>
              <Link to="/teacher-portal/homework"
                className="text-xs font-bold text-violet-600 hover:underline">Assign Homework →</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentHw.map(hw => {
                const due   = hw.due_date ? new Date(hw.due_date) : null;
                const today = new Date(); today.setHours(0, 0, 0, 0);
                const isOverdue = due && due < today;
                return (
                  <div key={hw._id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${hw.is_important ? 'bg-amber-100' : 'bg-violet-100'}`}>
                      <BookOpenCheck size={14} className={hw.is_important ? 'text-amber-600' : 'text-violet-500'}/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-700 truncate">{hw.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {hw.class_id?.name || '—'}{hw.subject_id?.name ? ` · ${hw.subject_id.name}` : ''}
                      </p>
                    </div>
                    {due && (
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                        isOverdue ? 'bg-rose-100 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {due.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Exams */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <BarChart2 size={16} className="text-amber-500"/> Exams & Results
            </h3>
            <Link to="/teacher-portal/exams" className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1">
              All <ArrowRight size={11}/>
            </Link>
          </div>
          {data?.recentExams?.length > 0 ? (
            <div className="space-y-2">
              {data.recentExams.slice(0, 5).map(exam => (
                <div key={exam._id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                    <GraduationCap size={16} className="text-amber-600"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-700 text-sm truncate">{exam.title}</p>
                    <p className="text-xs text-slate-400">
                      {exam.course_name
                        ? `${exam.course_name} · `
                        : exam.class_id?.name ? `${exam.class_id.name} · ` : ''}
                      {new Date(exam.exam_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-lg shrink-0">
                    {exam.total_marks}m
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center">
              <Award size={36} className="text-slate-200 mx-auto mb-2"/>
              <p className="text-slate-400 text-sm mb-2">No exams yet</p>
              <Link to="/teacher-portal/exams" className="text-xs font-bold text-amber-600 hover:underline">Create Exam →</Link>
            </div>
          )}
        </div>
      </div>

      {/* ── ANNOUNCEMENTS + QUICK ACCESS ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <Bell size={16} className="text-rose-500"/> Announcements
            </h3>
            <Link to="/teacher-portal/announcements" className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1">
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

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2 mb-4">
            <Zap size={16} className="text-amber-500"/> Quick Access
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { to: '/teacher-portal/class-attendance', label: 'Attendance',    icon: <UserCheck size={22}/>,     color: '#10b981', bg: '#d1fae5' },
              { to: '/teacher-portal/marks-entry',      label: 'Marks Entry',   icon: <ClipboardList size={22}/>, color: '#3b82f6', bg: '#dbeafe' },
              { to: '/teacher-portal/homework',         label: 'Homework',      icon: <BookOpenCheck size={22}/>, color: '#8b5cf6', bg: '#ede9fe' },
              { to: '/teacher-portal/timetable',        label: 'Timetable',     icon: <CalendarDays size={22}/>,  color: '#0891b2', bg: '#e0f2fe' },
              { to: '/teacher-portal/exams',            label: 'Exams',         icon: <Award size={22}/>,         color: '#f59e0b', bg: '#fef3c7' },
              { to: '/teacher-portal/students',         label: 'My Students',   icon: <Users size={22}/>,         color: '#6366f1', bg: '#e0e7ff' },
              { to: '/teacher-portal/live-exams',       label: 'Live Exams',    icon: <Zap size={22}/>,           color: '#e11d48', bg: '#ffe4e6' },
              { to: '/teacher-portal/syllabus',         label: 'Syllabus',      icon: <BookOpen size={22}/>,      color: '#0f766e', bg: '#ccfbf1' },
              { to: '/teacher-portal/leave',            label: 'My Leave',      icon: <FileText size={22}/>,      color: '#92400e', bg: '#fef3c7' },
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

      {/* ── ATTENDANCE SNAPSHOT ───────────────────────────────────────── */}
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
                <span className="ml-2 text-sm font-semibold text-slate-400">({attPct}%)</span>
              </h3>
              <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-xs">
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700"
                  style={{ width: `${attPct}%` }}/>
              </div>
            </div>
            <Link to="/teacher-portal/class-attendance"
              className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all flex items-center gap-2 shadow-md shadow-emerald-200">
              <CalendarCheck size={15}/> Mark
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
