import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import logo from '../assets/logo2.jpeg';
import {
  Eye, EyeOff, ArrowRight,
  GraduationCap, BookOpen, Users, Shield,
  Award, BarChart2, ClipboardList, Star,
  Clock, CheckCircle, Layers, FileText,
  Briefcase, MessageCircle, UserCheck,
  CalendarCheck, Wallet, BookOpenCheck,
} from 'lucide-react';

/* ─── Portal Configurations ─────────────────────────────────── */
const PORTALS = {
  admin: {
    title:      'Admin Portal',
    subtitle:   'The Best Way Public School',
    tagline:    'Full control over admissions, finance, staff and operations.',
    welcome:    'Welcome back, Admin',
    desc:       'Sign in to manage your school.',
    allowedRoles: ['admin', 'clerk', 'office_boy'],
    redirect:   '/dashboard',
    gradient:   'linear-gradient(145deg, #0a0f1e 0%, #0f1f3d 45%, #150d3a 100%)',
    accent:     '#6366f1',
    accentGlow: 'rgba(99,102,241,0.22)',
    accentSoft: 'rgba(99,102,241,0.12)',
    Icon:       Shield,
    taglineColor: '#818cf8',
    btnGradient:'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    btnShadow:  'rgba(79,70,229,0.4)',
    focusBg:    '#f0f4ff',
    focusBorder:'#4f46e5',
    rolePill:   { color: '#4f46e5', bg: '#eef2ff' },
    stats: [
      { icon: Users,        label: 'Students',  value: '500+' },
      { icon: BarChart2,    label: 'Revenue',   value: 'Tracked' },
      { icon: ClipboardList,label: 'Staff',     value: '15+'  },
      { icon: Award,        label: 'Courses',   value: '20+'  },
    ],
    orb1: 'rgba(99,102,241,0.2)',
    orb2: 'rgba(139,92,246,0.14)',
    orb3: 'rgba(16,185,129,0.1)',
  },

  student: {
    title:      'Student Portal',
    subtitle:   'The Best Way Public School',
    tagline:    'Track your classes, homework, fees, results and attendance — all in one place.',
    welcome:    'Welcome, Student',
    desc:       'Username: your phone number  |  Password: your full name (first letter capital, no spaces)',
    allowedRoles: ['student'],
    redirect:   '/student-portal/dashboard',
    gradient:   'linear-gradient(145deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
    accent:     '#818cf8',
    accentGlow: 'rgba(129,140,248,0.22)',
    accentSoft: 'rgba(129,140,248,0.12)',
    Icon:       GraduationCap,
    taglineColor: '#a5b4fc',
    btnGradient:'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    btnShadow:  'rgba(79,70,229,0.4)',
    focusBg:    '#f0f4ff',
    focusBorder:'#6366f1',
    rolePill:   { color: '#6366f1', bg: '#eef2ff' },
    stats: [
      { icon: BookOpen,      label: 'Timetable',  value: 'Daily'   },
      { icon: FileText,      label: 'Results',    value: 'Online'  },
      { icon: CalendarCheck, label: 'Attendance', value: 'Live'    },
      { icon: Wallet,        label: 'Fees',       value: 'History' },
    ],
    orb1: 'rgba(99,102,241,0.2)',
    orb2: 'rgba(139,92,246,0.14)',
    orb3: 'rgba(165,180,252,0.1)',
  },

  teacher: {
    title:      'Teacher Portal',
    subtitle:   'The Best Way Public School',
    tagline:    'Manage your classes, mark attendance and publish exam results effortlessly.',
    welcome:    'Welcome back, Teacher',
    desc:       'Sign in with the credentials sent to your email.',
    allowedRoles: ['teacher'],
    redirect:   '/teacher-portal/dashboard',
    gradient:   'linear-gradient(145deg, #022c22 0%, #064e3b 50%, #065f46 100%)',
    accent:     '#34d399',
    accentGlow: 'rgba(52,211,153,0.22)',
    accentSoft: 'rgba(52,211,153,0.1)',
    Icon:       Users,
    taglineColor: '#6ee7b7',
    btnGradient:'linear-gradient(135deg, #059669 0%, #047857 100%)',
    btnShadow:  'rgba(5,150,105,0.4)',
    focusBg:    '#f0fdf8',
    focusBorder:'#059669',
    rolePill:   { color: '#059669', bg: '#ecfdf5' },
    stats: [
      { icon: Users,      label: 'My Students', value: 'Live'   },
      { icon: Layers,     label: 'Classes',     value: 'Manage' },
      { icon: Star,       label: 'Exams',       value: 'Create' },
      { icon: Clock,      label: 'Attendance',  value: 'Mark'   },
    ],
    orb1: 'rgba(52,211,153,0.2)',
    orb2: 'rgba(5,150,105,0.14)',
    orb3: 'rgba(110,231,183,0.1)',
  },

  client: {
    title:      'Client Portal',
    subtitle:   'The Best Way Public School',
    tagline:    'Track your projects, review invoices, and communicate with our team — all in one place.',
    welcome:    'Welcome, Client',
    desc:       'Sign in with the credentials provided by our team.',
    allowedRoles: ['client'],
    redirect:   '/client-portal/dashboard',
    gradient:   'linear-gradient(145deg, #1c0800 0%, #3d1800 45%, #4a2200 100%)',
    accent:     '#f59e0b',
    accentGlow: 'rgba(245,158,11,0.22)',
    accentSoft: 'rgba(245,158,11,0.12)',
    Icon:       Briefcase,
    taglineColor: '#fcd34d',
    btnGradient:'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
    btnShadow:  'rgba(217,119,6,0.4)',
    focusBg:    '#fffbeb',
    focusBorder:'#d97706',
    rolePill:   { color: '#d97706', bg: '#fef3c7' },
    stats: [
      { icon: Briefcase,     label: 'My Projects', value: 'Live'      },
      { icon: FileText,      label: 'Invoices',    value: 'View'      },
      { icon: MessageCircle, label: 'Messages',    value: 'Direct'    },
      { icon: CheckCircle,   label: 'Progress',    value: 'Real-time' },
    ],
    orb1: 'rgba(245,158,11,0.2)',
    orb2: 'rgba(217,119,6,0.14)',
    orb3: 'rgba(251,191,36,0.1)',
  },

  parent: {
    title:      'Parent Portal',
    subtitle:   'The Best Way Public School',
    tagline:    "Track your child's attendance, homework, results and fees — all in one place.",
    welcome:    'Welcome, Parent',
    desc:       'Sign in with the credentials provided by the school.',
    allowedRoles: ['parent'],
    redirect:   '/parent-portal/dashboard',
    gradient:   'linear-gradient(145deg, #042f2e 0%, #0f766e 50%, #0d9488 100%)',
    accent:     '#2dd4bf',
    accentGlow: 'rgba(45,212,191,0.22)',
    accentSoft: 'rgba(45,212,191,0.1)',
    Icon:       UserCheck,
    taglineColor: '#99f6e4',
    btnGradient:'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)',
    btnShadow:  'rgba(15,118,110,0.4)',
    focusBg:    '#f0fdfa',
    focusBorder:'#0f766e',
    rolePill:   { color: '#0f766e', bg: '#ccfbf1' },
    stats: [
      { icon: CalendarCheck, label: 'Attendance',   value: 'Live'  },
      { icon: FileText,      label: 'Report Cards', value: 'View'  },
      { icon: BookOpenCheck, label: 'Homework',     value: 'Track' },
      { icon: Wallet,        label: 'Fees',         value: 'Pay'   },
    ],
    orb1: 'rgba(45,212,191,0.2)',
    orb2: 'rgba(15,118,110,0.14)',
    orb3: 'rgba(153,246,228,0.1)',
  },
};

/* ─── Component ─────────────────────────────────────────────── */
const PortalLogin = ({ portal = 'admin' }) => {
  const cfg = PORTALS[portal] || PORTALS.admin;
  const { Icon } = cfg;

  const [identifier,  setIdentifier]  = useState('');
  const [password,    setPassword]    = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [focused,     setFocused]     = useState(null);
  const [portalError, setPortalError] = useState('');

  const { login, studentLogin } = useContext(AuthContext);
  const navigate  = useNavigate();

  const isStudent = portal === 'student';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setPortalError('');
    setLoading(true);
    let result;
    if (isStudent) {
      result = await studentLogin(identifier.trim(), password);
    } else {
      result = await login(identifier.trim().toLowerCase(), password);
    }
    setLoading(false);
    if (!result) return;
    if (!cfg.allowedRoles.includes(result.role)) {
      setPortalError('These credentials belong to a different portal. Please use the correct login page.');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return;
    }
    navigate(cfg.redirect);
  };

  const otherPortals = [
    { key: 'admin',   label: 'Admin',   href: '/login',          bg: '#eef2ff', color: '#4f46e5' },
    { key: 'student', label: 'Student', href: '/student-login',  bg: '#eef2ff', color: '#6366f1' },
    { key: 'teacher', label: 'Teacher', href: '/teacher-login',  bg: '#ecfdf5', color: '#059669' },
    { key: 'parent',  label: 'Parent',  href: '/parent-login',   bg: '#ccfbf1', color: '#0f766e' },
    { key: 'client',  label: 'Client',  href: '/client-login',   bg: '#fef3c7', color: '#d97706' },
  ].filter(p => p.key !== portal);

  return (
    <div className="portal-root">

      {/* ── LEFT PANEL (desktop only) ──────────────────────────── */}
      <div className="portal-left" style={{ background: cfg.gradient }}>
        {/* Animated orbs */}
        {[
          { size: 520, top: -180, left: -150, color: cfg.orb1, dur: '8s' },
          { size: 380, bottom: -120, right: -90,  color: cfg.orb2, dur: '11s', rev: true },
          { size: 280, top: '48%',  right: '8%',  color: cfg.orb3, dur: '14s' },
        ].map((o, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: o.size, height: o.size, borderRadius: '50%',
            top: o.top, left: o.left, bottom: o.bottom, right: o.right,
            background: `radial-gradient(circle, ${o.color} 0%, transparent 70%)`,
            animation: `floatOrb ${o.dur} ease-in-out infinite ${o.rev ? 'reverse' : ''}`,
          }}/>
        ))}
        {/* Grid lines */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.035,
          backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}/>

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Logo */}
          <div style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.2rem' }}>
              <img src={logo} alt="logo" style={{
                width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', flexShrink: 0,
                boxShadow: `0 0 0 3px rgba(255,255,255,0.15), 0 0 32px ${cfg.accentGlow}`,
                border: '2px solid rgba(255,255,255,0.1)',
              }}/>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                  The Best Way
                </h1>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
                  {cfg.subtitle}
                </p>
              </div>
            </div>
            <span style={{
              display: 'inline-block', fontSize: '0.65rem', fontWeight: 700, color: cfg.accent,
              background: cfg.accentSoft, border: `1px solid ${cfg.accent}44`,
              padding: '3px 10px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.1em',
            }}>
              {cfg.title}
            </span>
          </div>

          {/* Headline */}
          <div style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 700, lineHeight: 1.35, color: '#fff', maxWidth: 360 }}>
              {portal === 'admin'   && <><span style={{ color: cfg.taglineColor }}>Manage</span> Everything,<br/>From One Dashboard.</>}
              {portal === 'student' && <>Your School<br/><span style={{ color: cfg.taglineColor }}>Journey</span> Starts Here.</>}
              {portal === 'teacher' && <>Inspire Students,<br/><span style={{ color: cfg.taglineColor }}>Shape</span> Futures.</>}
              {portal === 'client'  && <><span style={{ color: cfg.taglineColor }}>Track</span> Your Projects<br/>In Real Time.</>}
              {portal === 'parent'  && <>Stay Connected<br/>To Your <span style={{ color: cfg.taglineColor }}>Child's</span> Journey.</>}
            </h2>
            <p style={{ margin: '0.9rem 0 0', fontSize: '0.875rem', color: 'rgba(255,255,255,0.38)', maxWidth: 330, lineHeight: 1.65 }}>
              {cfg.tagline}
            </p>
          </div>

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', maxWidth: 370 }}>
            {cfg.stats.map(({ icon: StatIcon, label, value }) => (
              <div key={label} style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
                borderRadius: '0.9rem', padding: '0.9rem 1.1rem', backdropFilter: 'blur(10px)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.45rem' }}>
                  <StatIcon size={13} color={cfg.accent}/>
                  <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.38)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em' }}>
                    {label}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          position: 'absolute', bottom: '1.75rem', left: '4rem', zIndex: 1,
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.accent, boxShadow: `0 0 8px ${cfg.accent}` }}/>
          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.28)', fontWeight: 500 }}>
            Secure Portal — SSL Encrypted
          </span>
        </div>
      </div>

      {/* ── RIGHT PANEL ─────────────────────────────────────────── */}
      <div className="portal-right" style={{ background: cfg.gradient }}>

        {/* Desktop: dot pattern bg */}
        <div className="portal-dots" style={{
          position: 'absolute', inset: 0, opacity: 0.4,
          backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}/>
        {/* Desktop: accent blob */}
        <div className="portal-blob" style={{
          position: 'absolute', width: 400, height: 400, borderRadius: '50%',
          bottom: -150, right: -100,
          background: `radial-gradient(circle, ${cfg.accentSoft} 0%, transparent 70%)`,
          filter: 'blur(40px)',
        }}/>

        {/* Mobile orbs (inside right panel on mobile) */}
        <div className="portal-mobile-orb portal-mobile-orb-1" style={{
          background: `radial-gradient(circle, ${cfg.orb1} 0%, transparent 70%)`,
        }}/>
        <div className="portal-mobile-orb portal-mobile-orb-2" style={{
          background: `radial-gradient(circle, ${cfg.orb2} 0%, transparent 70%)`,
        }}/>

        <div className="portal-form-wrapper">

          {/* ── Mobile-only header ── */}
          <div className="portal-mobile-header">
            <img src={logo} alt="logo" style={{
              width: 56, height: 56, borderRadius: '50%', objectFit: 'cover',
              boxShadow: `0 0 0 3px rgba(255,255,255,0.2), 0 0 20px ${cfg.accentGlow}`,
              border: '2px solid rgba(255,255,255,0.15)',
            }}/>
            <div style={{ textAlign: 'center' }}>
              <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>
                The Best Way
              </h1>
              <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>
                {cfg.subtitle}
              </p>
            </div>
            <span style={{
              fontSize: '0.6rem', fontWeight: 700, color: cfg.accent,
              background: cfg.accentSoft, border: `1px solid ${cfg.accent}44`,
              padding: '3px 10px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.1em',
            }}>
              {cfg.title}
            </span>
          </div>

          {/* ── Form card ── */}
          <div className="portal-card">

            {/* Header */}
            <div style={{ marginBottom: '1.75rem' }}>
              <p style={{
                margin: '0 0 0.3rem', fontSize: '0.7rem', fontWeight: 700,
                color: cfg.accent, textTransform: 'uppercase', letterSpacing: '0.12em',
              }}>
                {cfg.welcome}
              </p>
              <h2 style={{ margin: 0, fontSize: '1.7rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.025em' }}>
                Sign in to continue
              </h2>
              <p style={{ margin: '0.4rem 0 0', fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>
                {cfg.desc}
              </p>
            </div>

            {/* Error */}
            {portalError && (
              <div style={{
                marginBottom: '1.25rem', padding: '0.85rem 1rem',
                background: '#fef2f2', border: '1.5px solid #fca5a5',
                borderRadius: '0.875rem', fontSize: '0.8rem', color: '#b91c1c', fontWeight: 600, lineHeight: 1.5,
              }}>
                ⚠️ {portalError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Email / Phone */}
              <div style={{ marginBottom: '1.1rem' }}>
                <label style={{
                  display: 'block', fontSize: '0.7rem', fontWeight: 700,
                  color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem',
                }}>
                  {isStudent ? 'Phone Number' : 'Email Address'}
                </label>
                <input
                  type={isStudent ? 'tel' : 'email'} required
                  autoComplete={isStudent ? 'tel' : 'email'}
                  value={identifier}
                  placeholder={isStudent ? '03001234567' : 'you@email.com'}
                  onChange={e => { setIdentifier(e.target.value); setPortalError(''); }}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '0.875rem 1rem', fontSize: '1rem', fontWeight: 500, color: '#0f172a',
                    background: focused === 'email' ? cfg.focusBg : '#f8fafc',
                    border: `2px solid ${focused === 'email' ? cfg.focusBorder : '#e2e8f0'}`,
                    borderRadius: '0.875rem', outline: 'none', transition: 'all 0.2s ease',
                  }}
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block', fontSize: '0.7rem', fontWeight: 700,
                  color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem',
                }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPass ? 'text' : 'password'} required autoComplete="current-password"
                    value={password} placeholder="••••••••••••"
                    onChange={e => { setPassword(e.target.value); setPortalError(''); }}
                    onFocus={() => setFocused('pass')}
                    onBlur={() => setFocused(null)}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '0.875rem 3rem 0.875rem 1rem',
                      fontSize: '1rem', fontWeight: 500, color: '#0f172a',
                      background: focused === 'pass' ? cfg.focusBg : '#f8fafc',
                      border: `2px solid ${focused === 'pass' ? cfg.focusBorder : '#e2e8f0'}`,
                      borderRadius: '0.875rem', outline: 'none', transition: 'all 0.2s ease',
                      letterSpacing: showPass ? 'normal' : '0.15em',
                    }}
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    style={{
                      position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, display: 'flex',
                    }}>
                    {showPass ? <EyeOff size={18}/> : <Eye size={18}/>}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit" disabled={loading}
                style={{
                  width: '100%', padding: '1rem',
                  background: loading ? cfg.focusBorder : cfg.btnGradient,
                  color: '#fff', border: 'none', borderRadius: '0.875rem',
                  fontSize: '1rem', fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                  boxShadow: loading ? 'none' : `0 8px 24px ${cfg.btnShadow}`,
                  transition: 'all 0.2s ease', opacity: loading ? 0.85 : 1,
                }}>
                {loading
                  ? <><span className="portal-spinner"/>Signing in...</>
                  : <>Sign In <ArrowRight size={17}/></>
                }
              </button>
            </form>

            {/* Other portals */}
            <div style={{ marginTop: '1.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
              <p style={{ margin: '0 0 0.75rem', fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>
                Other Portals
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
                {otherPortals.map(p => (
                  <a key={p.key} href={p.href} style={{
                    padding: '0.4rem 0.9rem', background: p.bg, color: p.color,
                    borderRadius: '0.6rem', fontSize: '0.75rem', fontWeight: 700,
                    textDecoration: 'none', transition: 'opacity 0.15s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  >
                    {p.label} →
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Secure note */}
          <p className="portal-secure-note">
            <span style={{
              display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
              background: cfg.accent, boxShadow: `0 0 6px ${cfg.accent}`, marginRight: 6, verticalAlign: 'middle',
            }}/>
            Secure Portal — SSL Encrypted
          </p>
        </div>
      </div>

      {/* ── Global styles ─────────────────────────────────────── */}
      <style>{`
        * { box-sizing: border-box; }

        .portal-root {
          min-height: 100vh;
          display: flex;
          font-family: 'Inter', -apple-system, sans-serif;
        }

        /* ── LEFT PANEL ── */
        .portal-left {
          flex: 0 0 48%;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 3rem 4rem;
        }

        /* ── RIGHT PANEL ── */
        .portal-right {
          flex: 1;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1.5rem;
        }

        /* Desktop right panel background */
        @media (min-width: 769px) {
          .portal-right { background: #f8fafc !important; }
          .portal-dots  { display: block; }
          .portal-blob  { display: block; }
          .portal-mobile-orb { display: none !important; }
          .portal-mobile-header { display: none !important; }
          .portal-secure-note { display: none; }
        }

        .portal-form-wrapper {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 420px;
          animation: slideUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .portal-card {
          background: #fff;
          border-radius: 1.75rem;
          padding: 2rem;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.04), 0 20px 60px -10px rgba(0,0,0,0.1);
          border: 1px solid rgba(226,232,240,0.9);
        }

        /* ── MOBILE ── */
        @media (max-width: 768px) {
          .portal-root {
            flex-direction: column;
          }

          /* Hide desktop left panel entirely */
          .portal-left {
            display: none;
          }

          /* Right panel fills screen with gradient */
          .portal-right {
            min-height: 100vh;
            padding: 0;
            align-items: flex-start;
            overflow-y: auto;
          }

          /* Hide desktop backgrounds */
          .portal-dots { display: none !important; }
          .portal-blob { display: none !important; }

          /* Mobile ambient orbs */
          .portal-mobile-orb {
            position: absolute;
            border-radius: 50%;
            pointer-events: none;
          }
          .portal-mobile-orb-1 {
            width: 320px; height: 320px;
            top: -100px; right: -80px;
          }
          .portal-mobile-orb-2 {
            width: 260px; height: 260px;
            bottom: 80px; left: -100px;
          }

          .portal-form-wrapper {
            max-width: 100%;
            padding: 2rem 1.25rem 2.5rem;
          }

          /* Mobile header shown */
          .portal-mobile-header {
            display: flex !important;
            flex-direction: column;
            align-items: center;
            gap: 0.6rem;
            margin-bottom: 1.75rem;
            padding-top: 0.5rem;
          }

          /* Card adjustments on mobile */
          .portal-card {
            border-radius: 1.5rem;
            padding: 1.75rem 1.5rem;
            box-shadow: 0 20px 60px rgba(0,0,0,0.25);
          }

          /* Show secure note at bottom */
          .portal-secure-note {
            display: block !important;
            text-align: center;
            margin-top: 1.25rem;
            font-size: 0.7rem;
            color: rgba(255,255,255,0.35);
            font-weight: 500;
          }
        }

        /* ── SMALL MOBILE ── */
        @media (max-width: 380px) {
          .portal-form-wrapper {
            padding: 1.5rem 1rem 2rem;
          }
          .portal-card {
            padding: 1.5rem 1.25rem;
          }
        }

        .portal-mobile-header {
          display: none;
        }
        .portal-secure-note {
          display: none;
        }

        .portal-spinner {
          width: 18px; height: 18px; flex-shrink: 0;
          border: 2.5px solid rgba(255,255,255,0.35);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          display: inline-block;
        }

        @keyframes floatOrb {
          0%,100% { transform: scale(1) translate(0,0); opacity:1; }
          50%      { transform: scale(1.18) translate(18px,-22px); opacity:0.65; }
        }
        @keyframes slideUp {
          from { opacity:0; transform:translateY(22px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default PortalLogin;
