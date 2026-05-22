import { useContext, useRef, useEffect, useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import logo from '../../assets/logo.jpeg';
import {
  LayoutDashboard, Briefcase, FileText, MessageCircle,
  UserCircle, LogOut, ChevronRight,
} from 'lucide-react';

const ClientPortalLayout = () => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const navRef = useRef(null);
  const [showRightFade, setShowRightFade] = useState(true);
  const [showHint, setShowHint] = useState(false);
  const [notifs, setNotifs] = useState({ unread_messages: 0, overdue_invoices: 0, upcoming_deadlines: 0 });

  useEffect(() => {
    const load = () => api.get('/client-portal/notifications').then(r => setNotifs(r.data)).catch(() => {});
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const totalBadge = notifs.unread_messages + notifs.overdue_invoices;

  const menuItems = [
    { path: '/client-portal/dashboard', name: 'Dashboard',  icon: <LayoutDashboard size={20} /> },
    { path: '/client-portal/projects',  name: 'Projects',   icon: <Briefcase size={20} />, badge: notifs.upcoming_deadlines },
    { path: '/client-portal/invoices',  name: 'Invoices',   icon: <FileText size={20} />,  badge: notifs.overdue_invoices },
    { path: '/client-portal/messages',  name: 'Messages',   icon: <MessageCircle size={20} />, badge: notifs.unread_messages },
    { path: '/client-portal/profile',   name: 'My Profile', icon: <UserCircle size={20} /> },
  ];

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const updateFade = () => setShowRightFade(nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 4);
    nav.addEventListener('scroll', updateFade, { passive: true });
    updateFade();
    setShowHint(true);
    const nudge    = setTimeout(() => { nav.scrollTo({ left: 80, behavior: 'smooth' }); setTimeout(() => nav.scrollTo({ left: 0, behavior: 'smooth' }), 500); }, 400);
    const hideHint = setTimeout(() => setShowHint(false), 2200);
    return () => { nav.removeEventListener('scroll', updateFade); clearTimeout(nudge); clearTimeout(hideHint); };
  }, []);

  const SIDEBAR_GRADIENT = 'linear-gradient(160deg, #78350f 0%, #92400e 50%, #b45309 100%)';

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col shadow-lg" style={{ background: SIDEBAR_GRADIENT }}>
        <div className="p-4 border-b border-amber-700/50 flex items-center gap-3">
          <img
            src={logo}
            alt="Inflorescence"
            style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, boxShadow: '0 0 0 2px rgba(255,255,255,0.12)' }}
          />
          <div>
            <div className="text-white font-bold text-sm leading-tight">Inflorescence</div>
            <div style={{ color: '#fcd34d', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Client Portal</div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => (
            <Link key={item.path} to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                location.pathname === item.path
                  ? 'bg-white/20 text-white shadow-md'
                  : 'text-amber-200 hover:bg-white/10 hover:text-white'
              }`}>
              <span className="relative">
                {item.icon}
                {item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </span>
              <span className="font-medium">{item.name}</span>
              {item.badge > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-amber-700/50">
          <button onClick={logout}
            className="w-full flex items-center justify-center gap-2 bg-red-500/10 text-red-300 py-2 rounded-xl hover:bg-red-500 hover:text-white transition-colors">
            <LogOut size={18} /><span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-100 px-4 md:px-8 py-3 flex items-center justify-between shrink-0 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            {menuItems.find(m => m.path === location.pathname)?.name || 'Client Portal'}
          </p>
          <div className="flex items-center gap-3">
            {totalBadge > 0 && (
              <span className="flex items-center gap-1 bg-red-50 text-red-600 text-xs font-bold px-2.5 py-1 rounded-full border border-red-200">
                {totalBadge} alert{totalBadge !== 1 ? 's' : ''}
              </span>
            )}
            <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-sm font-bold text-white">
              {user?.name?.charAt(0)}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-slate-700 leading-tight">{user?.name}</p>
              <p className="text-xs text-slate-400">Client</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-8 pb-28 md:pb-8">
          <div className="max-w-5xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
        {showHint && (
          <div style={{
            position: 'absolute', top: '-32px', right: '12px',
            display: 'flex', alignItems: 'center', gap: '4px',
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
            color: '#fff', fontSize: '11px', fontWeight: 700,
            padding: '4px 10px', borderRadius: '20px', pointerEvents: 'none',
            opacity: showHint ? 1 : 0, transition: 'opacity 0.35s ease',
          }}>
            <ChevronRight size={12} /> swipe for more
          </div>
        )}
        {showRightFade && (
          <div style={{
            position: 'absolute', top: 0, right: 0, bottom: 0, width: '56px',
            pointerEvents: 'none', zIndex: 10,
            background: 'linear-gradient(to left, #92400e 10%, transparent 100%)',
          }}/>
        )}
        <nav ref={navRef} style={{
          background: SIDEBAR_GRADIENT,
          borderTop: '1px solid rgba(245,158,11,0.3)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none',
          display: 'flex', alignItems: 'stretch', overflowX: 'auto',
        }}>
          {menuItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}
                className="flex flex-col items-center justify-center gap-0.5 py-2 flex-shrink-0 transition-all"
                style={{ color: active ? '#fff' : '#fcd34d', minWidth: '68px' }}>
                <span className="rounded-xl p-1.5 transition-all relative"
                  style={{ background: active ? 'rgba(255,255,255,0.18)' : 'transparent' }}>
                  {item.icon}
                  {item.badge > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 text-white text-[8px] font-extrabold rounded-full flex items-center justify-center">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </span>
                <span className="text-[9px] font-semibold whitespace-nowrap leading-tight px-1 text-center">
                  {item.name}
                </span>
              </Link>
            );
          })}
          <button onClick={logout}
            className="flex flex-col items-center justify-center gap-0.5 py-2 flex-shrink-0"
            style={{ color: '#fca5a5', minWidth: '68px' }}>
            <span className="rounded-xl p-1.5"><LogOut size={20} /></span>
            <span className="text-[9px] font-semibold whitespace-nowrap">Logout</span>
          </button>
        </nav>
      </div>
    </div>
  );
};

export default ClientPortalLayout;
