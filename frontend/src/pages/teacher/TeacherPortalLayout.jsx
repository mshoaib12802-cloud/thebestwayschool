import { useContext, useRef, useEffect, useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import NotificationBell from '../../components/NotificationBell';
import FloatingChat from '../../components/FloatingChat';
import logo from '../../assets/logo.jpeg';
import {
  LayoutDashboard, BookOpen, Award,
  CalendarCheck, LogOut, UserCircle, Users, CalendarDays, Zap, ChevronRight, PlayCircle
} from 'lucide-react';

const TeacherPortalLayout = () => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const navRef = useRef(null);
  const [showRightFade, setShowRightFade] = useState(true);
  const [showHint, setShowHint] = useState(false);

  const menuItems = [
    { path: '/teacher-portal/dashboard',  name: 'Dashboard',      icon: <LayoutDashboard size={20}/> },
    { path: '/teacher-portal/courses',    name: 'My Courses',     icon: <BookOpen size={20}/> },
    { path: '/teacher-portal/lms',        name: 'LMS Progress',   icon: <PlayCircle size={20}/> },
    { path: '/teacher-portal/students',   name: 'My Students',    icon: <Users size={20}/> },
    { path: '/teacher-portal/exams',      name: 'Exams & Results',icon: <Award size={20}/> },
    { path: '/teacher-portal/live-exams', name: 'Live Exams',     icon: <Zap size={20}/> },
    { path: '/teacher-portal/attendance', name: 'Attendance',     icon: <CalendarCheck size={20}/> },
    { path: '/teacher-portal/timetable',  name: 'Timetable',      icon: <CalendarDays size={20}/> },
    { path: '/teacher-portal/profile',    name: 'My Profile',     icon: <UserCircle size={20}/> },
  ];

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const updateFade = () => {
      setShowRightFade(nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 4);
    };

    nav.addEventListener('scroll', updateFade, { passive: true });
    updateFade();

    // Show the "swipe" hint label briefly, then trigger scroll nudge
    setShowHint(true);
    const nudge = setTimeout(() => {
      nav.scrollTo({ left: 100, behavior: 'smooth' });
      setTimeout(() => nav.scrollTo({ left: 0, behavior: 'smooth' }), 600);
    }, 400);
    const hideHint = setTimeout(() => setShowHint(false), 2200);

    return () => {
      nav.removeEventListener('scroll', updateFade);
      clearTimeout(nudge);
      clearTimeout(hideHint);
    };
  }, []);

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Desktop Sidebar — hidden on mobile */}
      <aside className="hidden md:flex w-64 flex-col shadow-lg" style={{ background: 'linear-gradient(160deg, #064e3b 0%, #065f46 100%)' }}>
        <div className="p-4 border-b border-emerald-700/50 flex items-center gap-3">
          <img
            src={logo}
            alt="Inflorescence"
            style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, boxShadow: '0 0 0 2px rgba(255,255,255,0.12)' }}
          />
          <div>
            <div className="text-white font-bold text-sm leading-tight">Inflorescence</div>
            <div style={{ color: '#6ee7b7', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Teacher Portal</div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                location.pathname === item.path
                  ? 'bg-white/20 text-white shadow-md'
                  : 'text-emerald-200 hover:bg-white/10 hover:text-white'
              }`}
            >
              {item.icon}
              <span className="font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-emerald-700/50">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 bg-red-500/10 text-red-300 py-2 rounded-xl hover:bg-red-500 hover:text-white transition-colors"
          >
            <LogOut size={18}/>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-100 px-4 md:px-8 py-3 flex items-center justify-between shrink-0 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            {menuItems.find(m => m.path === location.pathname)?.name || 'Teacher Portal'}
          </p>
          <div className="flex items-center gap-3">
            <NotificationBell theme="light"/>
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-sm font-bold text-white">
              {user?.name?.charAt(0)}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-slate-700 leading-tight">{user?.name}</p>
              <p className="text-xs text-slate-400">Teacher</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-8 pb-28 md:pb-8">
          <div className="max-w-5xl mx-auto">
            <Outlet/>
          </div>
        </main>
      </div>

      <FloatingChat />

      {/* Mobile Bottom Nav — hidden on desktop */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">

        {/* "Swipe for more" hint pill */}
        <div
          style={{
            position: 'absolute',
            top: '-32px',
            right: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(6px)',
            color: '#fff',
            fontSize: '11px',
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: '20px',
            pointerEvents: 'none',
            opacity: showHint ? 1 : 0,
            transform: showHint ? 'translateY(0)' : 'translateY(4px)',
            transition: 'opacity 0.35s ease, transform 0.35s ease',
          }}
        >
          <ChevronRight size={12} />
          swipe for more
        </div>

        {/* Right-side gradient fade */}
        {showRightFade && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              width: '56px',
              pointerEvents: 'none',
              zIndex: 10,
              background: 'linear-gradient(to left, #064e3b 10%, transparent 100%)',
            }}
          />
        )}

        {/* Scrollable nav */}
        <nav
          ref={navRef}
          style={{
            background: 'linear-gradient(160deg, #064e3b 0%, #065f46 100%)',
            borderTop: '1px solid rgba(16,185,129,0.2)',
            paddingBottom: 'env(safe-area-inset-bottom)',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            display: 'flex',
            alignItems: 'stretch',
            overflowX: 'auto',
          }}
        >
          {menuItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex flex-col items-center justify-center gap-0.5 py-2 flex-shrink-0 transition-all"
                style={{ color: active ? '#fff' : '#6ee7b7', minWidth: '68px' }}
              >
                <span
                  className="rounded-xl p-1.5 transition-all"
                  style={{ background: active ? 'rgba(255,255,255,0.18)' : 'transparent' }}
                >
                  {item.icon}
                </span>
                <span className="text-[9px] font-semibold whitespace-nowrap leading-tight px-1 text-center">
                  {item.name}
                </span>
              </Link>
            );
          })}
          <button
            onClick={logout}
            className="flex flex-col items-center justify-center gap-0.5 py-2 flex-shrink-0"
            style={{ color: '#fca5a5', minWidth: '68px' }}
          >
            <span className="rounded-xl p-1.5">
              <LogOut size={20}/>
            </span>
            <span className="text-[9px] font-semibold whitespace-nowrap leading-tight">Logout</span>
          </button>
        </nav>
      </div>
    </div>
  );
};

export default TeacherPortalLayout;
