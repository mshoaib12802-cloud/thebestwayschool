import { useContext, useRef, useEffect, useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import NotificationBell from '../../components/NotificationBell';
import FloatingChat from '../../components/FloatingChat';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import logo from '../../assets/logo2.jpeg';
import {
  LayoutDashboard, BookOpen, Wallet, Award,
  CalendarCheck, LogOut, AlertTriangle, Layers, UserCircle,
  FileSpreadsheet, CalendarDays, Zap, ChevronRight, PlayCircle,
  ClipboardCheck, Bell, CalendarOff, BookMarked, Receipt, BookOpenCheck, MessageCircle,
  UtensilsCrossed,
} from 'lucide-react';

const StudentPortalLayout = () => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const navRef = useRef(null);
  usePushNotifications(user);
  const [showRightFade, setShowRightFade] = useState(true);
  const [showHint, setShowHint] = useState(false);

  const menuItems = [
    { path: '/student-portal/dashboard',    name: 'Dashboard',    icon: <LayoutDashboard size={20} /> },
    { path: '/student-portal/lms',          name: 'My Learning',  icon: <PlayCircle size={20} /> },
    { path: '/student-portal/school-lms',  name: 'Video Lessons',icon: <PlayCircle size={20} /> },
    { path: '/student-portal/courses',      name: 'My Courses',   icon: <BookOpen size={20} /> },
    { path: '/student-portal/modules',      name: 'My Modules',   icon: <Layers size={20} /> },
    { path: '/student-portal/assignments',  name: 'Assignments',  icon: <ClipboardCheck size={20} /> },
    { path: '/student-portal/announcements',name: 'Notices',      icon: <Bell size={20} /> },
    { path: '/student-portal/fee-invoices', name: 'Fee Invoices', icon: <Receipt size={20} /> },
    { path: '/student-portal/fees',         name: 'Fee Ledger',   icon: <Wallet size={20} /> },
    { path: '/student-portal/canteen',      name: 'Canteen',      icon: <UtensilsCrossed size={20} /> },
    { path: '/student-portal/results',      name: 'Exam Results', icon: <Award size={20} /> },
    { path: '/student-portal/live-exams',   name: 'Live Exams',   icon: <Zap size={20} /> },
    { path: '/student-portal/attendance',   name: 'Attendance',   icon: <CalendarCheck size={20} /> },
    { path: '/student-portal/fines',        name: 'My Fines',     icon: <AlertTriangle size={20} /> },
    { path: '/student-portal/library',      name: 'Library',      icon: <BookMarked size={20} /> },
    { path: '/student-portal/leave',        name: 'My Leave',     icon: <CalendarOff size={20} /> },
    { path: '/student-portal/date-sheets',  name: 'Date Sheets',  icon: <FileSpreadsheet size={20} /> },
    { path: '/student-portal/timetable',    name: 'Timetable',    icon: <CalendarDays size={20} /> },
    { path: '/student-portal/homework',     name: 'Homework',     icon: <BookOpenCheck size={20} /> },
    { path: '/student-portal/diary',        name: 'Class Diary',  icon: <BookOpen size={20} /> },
    { path: '/student-portal/complaints',   name: 'Complaints',   icon: <MessageCircle size={20} /> },
    { path: '/student-portal/profile',      name: 'My Profile',   icon: <UserCircle size={20} /> },
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
      <aside className="hidden md:flex w-64 flex-col shadow-lg" style={{ background: 'linear-gradient(160deg, #1e1b4b 0%, #312e81 100%)' }}>
        <div className="p-4 border-b border-indigo-700/50 flex items-center gap-3">
          <img
            src={logo}
            alt="The Best Way"
            style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, boxShadow: '0 0 0 2px rgba(255,255,255,0.12)' }}
          />
          <div>
            <div className="text-white font-bold text-sm leading-tight">The Best Way</div>
            <div style={{ color: '#a5b4fc', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Student Portal</div>
          </div>
        </div>

        <nav
          className="flex-1 p-3 space-y-0.5 overflow-y-auto"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(165,180,252,0.3) transparent' }}
        >
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                location.pathname === item.path
                  ? 'bg-white/20 text-white shadow-md'
                  : 'text-indigo-200 hover:bg-white/10 hover:text-white'
              }`}
            >
              {item.icon}
              <span className="font-medium text-sm">{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-indigo-700/50">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 bg-red-500/10 text-red-300 py-2 rounded-xl hover:bg-red-500 hover:text-white transition-colors"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-100 px-4 md:px-8 py-3 flex items-center justify-between shrink-0 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            {menuItems.find(m => m.path === location.pathname)?.name || 'Student Portal'}
          </p>
          <div className="flex items-center gap-3">
            <NotificationBell theme="light"/>
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-sm font-bold text-white">
              {user?.name?.charAt(0)}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-slate-700 leading-tight">{user?.name}</p>
              <p className="text-xs text-slate-400">Student</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-8 pb-28 md:pb-8">
          <div className="max-w-5xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      <FloatingChat />

      {/* Mobile Bottom Nav — hidden on desktop */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">

        {/* "Swipe for more" hint pill — fades in then out */}
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

        {/* Right-side gradient fade — shows when more items exist to the right */}
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
              background: 'linear-gradient(to left, #1e1b4b 10%, transparent 100%)',
            }}
          />
        )}

        {/* Scrollable nav */}
        <nav
          ref={navRef}
          style={{
            background: 'linear-gradient(160deg, #1e1b4b 0%, #312e81 100%)',
            borderTop: '1px solid rgba(99,102,241,0.25)',
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
                className="flex flex-col items-center justify-center gap-0.5 py-2 flex-shrink-0 transition-all relative"
                style={{ color: active ? '#fff' : '#c7d2fe', minWidth: '68px' }}
              >
                {active && (
                  <span style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 28, height: 2.5, borderRadius: 2, background: '#a5b4fc' }} />
                )}
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
              <LogOut size={20} />
            </span>
            <span className="text-[9px] font-semibold whitespace-nowrap leading-tight">Logout</span>
          </button>
        </nav>
      </div>
    </div>
  );
};

export default StudentPortalLayout;
