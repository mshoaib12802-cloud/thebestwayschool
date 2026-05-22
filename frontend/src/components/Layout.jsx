import { useContext, useEffect, useRef, useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import api from '../services/api';
import logo from '../assets/logo.jpeg';
import {
  LayoutDashboard, Users, UserPlus, Banknote,
  QrCode, LogOut, Briefcase, BookOpen,
  ClipboardList, CalendarDays, AlertTriangle, FileSpreadsheet, Zap, Inbox, Building2
} from 'lucide-react';

const Layout = () => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const [pendingAdmissions, setPendingAdmissions] = useState(0);
  const navRef = useRef(null);
  const activeRef = useRef(null);

  useEffect(() => {
    api.get('/visitors/admission-requests')
      .then(r => setPendingAdmissions(r.data.filter(x => x.admission_status === 'pending').length))
      .catch(() => {});
  }, [location.pathname]);

  useEffect(() => {
    if (activeRef.current && navRef.current) {
      activeRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [location.pathname]);

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
  ];

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-lg">
        <div className="p-4 border-b border-slate-700 flex items-center gap-3">
          <img
            src={logo}
            alt="Inflorescence"
            style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, boxShadow: '0 0 0 2px rgba(255,255,255,0.12)' }}
          />
          <div>
            <div className="text-white font-bold text-sm leading-tight">Inflorescence</div>
            <div style={{ color: '#818cf8', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Advance Skills</div>
          </div>
        </div>

        <nav
          ref={navRef}
          className="flex-1 p-4 space-y-1 overflow-y-auto"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}
        >
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                ref={isActive ? activeRef : null}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
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

        {/* User Info & Logout */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 bg-red-600/10 text-red-400 py-2 rounded-lg hover:bg-red-600 hover:text-white transition-colors"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header bar */}
        <header className="bg-white border-b border-slate-100 px-8 py-3 flex items-center justify-between shrink-0 shadow-sm">
          <p className="text-sm font-semibold text-slate-500 capitalize">
            {menuItems.find(m => m.path === location.pathname)?.name || 'Dashboard'}
          </p>
          <div className="flex items-center gap-3">
            <NotificationBell theme="light"/>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-sm font-bold text-white border border-white/20">
              {user?.name?.charAt(0)}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-slate-700 leading-tight">{user?.name}</p>
              <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;