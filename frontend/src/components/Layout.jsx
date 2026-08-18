import { useContext, useEffect, useRef, useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import AIAssistant from './AIAssistant';
import api from '../services/api';
import logo from '../assets/logo2.jpeg';
import {
  LayoutDashboard, Users, UserPlus, Banknote,
  QrCode, LogOut, Briefcase, BookOpen,
  ClipboardList, CalendarDays, AlertTriangle, FileSpreadsheet, Zap, Inbox, Building2,
  School, BookMarked, CalendarRange, FileText, ArrowUpCircle, UserCheck, Clock, LayoutGrid,
  Megaphone, CalendarOff, DollarSign, BookCopy, ShieldCheck, Truck, CreditCard,
  ScrollText, ClipboardCheck, CalendarClock, Receipt, PiggyBank, Grid3X3, GraduationCap, BarChart2,
  FolderOpen, Tag, BookOpenCheck, Shield, MessageCircle, Settings, Menu, X,
  UtensilsCrossed,
} from 'lucide-react';

const Layout = () => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const [pendingAdmissions, setPendingAdmissions] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navRef = useRef(null);
  const activeRef = useRef(null);

  useEffect(() => {
    api.get('/visitors/admission-requests')
      .then(r => setPendingAdmissions(r.data.filter(x => x.admission_status === 'pending').length))
      .catch(() => {});
  }, [location.pathname]);

  useEffect(() => {
    const nav = navRef.current;
    const item = activeRef.current;
    if (!nav || !item) return;
    // getBoundingClientRect gives viewport-relative positions that correctly
    // account for the nav's current scroll — offsetTop would be relative to
    // offsetParent (the aside), not the nav, causing wrong calculations.
    const navRect  = nav.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    const topInNav    = itemRect.top    - navRect.top;
    const bottomInNav = itemRect.bottom - navRect.top;
    if (topInNav < 0) {
      nav.scrollTop += topInNav - 8;
    } else if (bottomInNav > nav.clientHeight) {
      nav.scrollTop += bottomInNav - nav.clientHeight + 8;
    }
    // item fully visible → don't touch scroll at all
  }, [location.pathname]);

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  // Menu Items Config (Added Staff Module)
  const menuItems = [
    { path: '/dashboard', name: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/admission-requests', name: 'Admission Requests', icon: <Inbox size={20} /> },
    { path: '/reception', name: 'Inquiries (CRM)', icon: <Users size={20} /> },
    { path: '/admissions', name: 'Students', icon: <UserPlus size={20} /> },
    { path: '/courses', name: 'Courses', icon: <BookOpen size={20} /> },
    { path: '/staff', name: 'HR & Staff', icon: <Briefcase size={20} /> },
    { path: '/finance', name: 'Accounts & Fees', icon: <Banknote size={20} /> },
    { path: '/attendance', name: 'Attendance', icon: <QrCode size={20} /> },
    { path: '/exams', name: 'Exams & Results', icon: <ClipboardList size={20} /> },
    { path: '/live-exams', name: 'Live Exams', icon: <Zap size={20} /> },
    { path: '/timetable', name: 'Batches & Schedule', icon: <CalendarDays size={20} /> },
    { path: '/fines', name: 'Fines', icon: <AlertTriangle size={20} /> },
    { path: '/date-sheets', name: 'Date Sheets', icon: <FileSpreadsheet size={20} /> },
    { path: '/clients', name: 'Clients', icon: <Building2 size={20} /> },
    { isDivider: true, label: 'School' },
    { path: '/academic-years',  name: 'Academic Years', icon: <CalendarRange size={20} /> },
    { path: '/school-classes',  name: 'Classes',         icon: <School size={20} /> },
    { path: '/subjects',              name: 'Subjects',         icon: <BookMarked size={20} /> },
    { path: '/school-periods',           name: 'Periods',          icon: <Clock size={20} /> },
    { path: '/school-timetable-builder', name: 'Timetable Builder',icon: <LayoutGrid size={20} /> },
    { path: '/marks-entry',              name: 'Marks Entry',      icon: <ClipboardCheck size={20} /> },
    { path: '/report-cards',             name: 'Report Cards',     icon: <FileText size={20} /> },
    { path: '/promotions',               name: 'Promotions',       icon: <ArrowUpCircle size={20} /> },
    { path: '/parents',                  name: 'Parents',          icon: <UserCheck size={20} /> },
    { path: '/fee-structure',            name: 'Fee Structure',    icon: <Receipt size={20} /> },
    { path: '/fee-invoices',             name: 'Fee Invoices',     icon: <Banknote size={20} /> },
    { path: '/announcements',            name: 'Announcements',    icon: <Megaphone size={20} /> },
    { path: '/leave-management',         name: 'Leave',            icon: <CalendarOff size={20} /> },
    { path: '/payroll',                  name: 'Payroll',          icon: <DollarSign size={20} /> },
    { path: '/staff-advances',           name: 'Staff Advances',   icon: <PiggyBank size={20} /> },
    { path: '/school-calendar',          name: 'School Calendar',  icon: <CalendarRange size={20} /> },
    { path: '/library',                  name: 'Library',          icon: <BookCopy size={20} /> },
    { path: '/canteen',                  name: 'Canteen',          icon: <UtensilsCrossed size={20} /> },
    { path: '/conduct',                  name: 'Conduct',          icon: <ShieldCheck size={20} /> },
    { path: '/transport',                name: 'Transport',        icon: <Truck size={20} /> },
    { path: '/exam-seating',             name: 'Exam Seating',     icon: <Grid3X3 size={20} /> },
    { path: '/ptm-schedule',             name: 'PTM Schedule',     icon: <CalendarClock size={20} /> },
    { path: '/certificates',             name: 'Certificates',     icon: <ScrollText size={20} /> },
    { path: '/id-cards',                 name: 'ID Cards',         icon: <CreditCard size={20} /> },
    { path: '/roll-no-slips',            name: 'Roll No. Slips',   icon: <FileText size={20} /> },
    { isDivider: true, label: 'Curriculum' },
    { path: '/syllabus',                 name: 'Syllabus',          icon: <BookMarked size={20} /> },
    { path: '/exam-papers',              name: 'Exam Papers',       icon: <GraduationCap size={20} /> },
    { isDivider: true, label: 'Analytics' },
    { path: '/analytics',                name: 'Analytics',         icon: <BarChart2 size={20} /> },
    { path: '/financial-dashboard',      name: 'Financial Dashboard', icon: <DollarSign size={20} /> },
    { path: '/reports',                  name: 'Reports',           icon: <BarChart2 size={20} /> },
    { isDivider: true, label: 'Tools' },
    { path: '/documents',                name: 'Documents',         icon: <FolderOpen size={20} /> },
    { path: '/fee-concessions',          name: 'Fee Concessions',   icon: <Tag size={20} /> },
    { path: '/homework-diary',           name: 'Homework Diary',    icon: <BookOpenCheck size={20} /> },
    { path: '/diary',                    name: 'Class Diary',       icon: <BookOpen size={20} /> },
    { path: '/complaints',               name: 'Complaints',        icon: <MessageCircle size={20} /> },
    { path: '/audit-log',                name: 'Audit Log',         icon: <Shield size={20} /> },
    { path: '/settings',                 name: 'Settings',          icon: <Settings size={20} /> },
  ];

  const SidebarContent = () => (
    <>
      <div className="p-4 border-b border-slate-700 flex items-center gap-3 shrink-0">
        <img src={logo} alt="The Best Way"
          style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, boxShadow: '0 0 0 2px rgba(255,255,255,0.12)' }}/>
        <div>
          <div className="text-white font-bold text-sm leading-tight">The Best Way</div>
          <div style={{ color: '#818cf8', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Public School</div>
        </div>
      </div>
      <nav ref={navRef} className="flex-1 p-4 space-y-1 overflow-y-auto"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}>
        {menuItems.map((item, idx) => {
          if (item.isDivider) {
            return (
              <div key={`divider-${idx}`} className="pt-3 pb-1 px-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3">{item.label}</p>
              </div>
            );
          }
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path} ref={isActive ? activeRef : null}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                isActive ? 'bg-primary text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}>
              {item.icon}
              <span className="font-medium flex-1 text-sm">{item.name}</span>
              {item.path === '/admission-requests' && pendingAdmissions > 0 && (
                <span className="bg-amber-400 text-amber-900 text-xs font-extrabold px-1.5 py-0.5 rounded-full leading-none">
                  {pendingAdmissions}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-800 shrink-0">
        <button onClick={logout}
          className="w-full flex items-center justify-center gap-2 bg-red-600/10 text-red-400 py-2 rounded-lg hover:bg-red-600 hover:text-white transition-colors">
          <LogOut size={18}/><span>Logout</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-slate-100">

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex w-64 bg-slate-900 text-white flex-col shadow-lg shrink-0">
        <SidebarContent/>
      </aside>

      {/* ── Mobile Drawer Overlay ── */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}/>
          {/* Drawer panel */}
          <aside className="relative z-50 w-72 max-w-[85vw] bg-slate-900 text-white flex flex-col shadow-2xl h-full"
            style={{ animation: 'slideInLeft 0.25s ease' }}>
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-700 shrink-0">
              <div className="flex items-center gap-3">
                <img src={logo} alt="logo"
                  style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', boxShadow: '0 0 0 2px rgba(255,255,255,0.12)' }}/>
                <div>
                  <div className="text-white font-bold text-sm leading-tight">The Best Way</div>
                  <div style={{ color: '#818cf8', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Public School</div>
                </div>
              </div>
              <button onClick={() => setDrawerOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors">
                <X size={20}/>
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto"
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}>
              {menuItems.map((item, idx) => {
                if (item.isDivider) {
                  return (
                    <div key={`divider-${idx}`} className="pt-3 pb-1 px-1">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3">{item.label}</p>
                    </div>
                  );
                }
                const isActive = location.pathname === item.path;
                return (
                  <Link key={item.path} to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive ? 'bg-primary text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}>
                    {item.icon}
                    <span className="font-medium flex-1 text-sm">{item.name}</span>
                    {item.path === '/admission-requests' && pendingAdmissions > 0 && (
                      <span className="bg-amber-400 text-amber-900 text-xs font-extrabold px-1.5 py-0.5 rounded-full leading-none">
                        {pendingAdmissions}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-800 shrink-0">
              <button onClick={logout}
                className="w-full flex items-center justify-center gap-2 bg-red-600/10 text-red-400 py-3 rounded-lg hover:bg-red-600 hover:text-white transition-colors font-semibold">
                <LogOut size={18}/><span>Logout</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-slate-100 px-4 md:px-8 py-3 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors -ml-1"
              onClick={() => setDrawerOpen(true)}>
              <Menu size={22}/>
            </button>
            <p className="text-sm font-semibold text-slate-500 capitalize truncate">
              {menuItems.find(m => !m.isDivider && m.path === location.pathname)?.name || 'Dashboard'}
            </p>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <NotificationBell theme="light"/>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-sm font-bold text-white shrink-0">
              {user?.name?.charAt(0)}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-slate-700 leading-tight">{user?.name}</p>
              <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet/>
          </div>
        </main>
      </div>

      <AIAssistant />

      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default Layout;