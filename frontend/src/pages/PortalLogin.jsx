import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import logo from '../assets/logo.jpeg';
import {
  Eye, EyeOff, ArrowRight,
  GraduationCap, BookOpen, Users, Shield,
  Award, BarChart2, ClipboardList, Star,
  Clock, CheckCircle, Layers, FileText,
  Briefcase, MessageCircle,
} from 'lucide-react';

/* ─── Portal Configurations ─────────────────────────────────── */
const PORTALS = {
  admin: {
    title:      'Admin Portal',
    subtitle:   'Institute Management System',
    tagline:    'Full control over admissions, finance, staff and operations.',
    welcome:    'Welcome back, Admin',
    desc:       'Sign in to manage your institute.',
    allowedRoles: ['admin', 'clerk', 'office_boy'],
    redirect:   '/dashboard',
    // Left panel
    gradient:   'linear-gradient(145deg, #0a0f1e 0%, #0f1f3d 45%, #150d3a 100%)',
    accent:     '#6366f1',
    accentGlow: 'rgba(99,102,241,0.22)',
    accentSoft: 'rgba(99,102,241,0.12)',
    Icon:       Shield,
    taglineColor: '#818cf8',
    // Right panel
    btnGradient:'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    btnShadow:  'rgba(79,70,229,0.4)',
    focusBg:    '#f0f4ff',
    focusBorder:'#4f46e5',
    rolePill:   { color: '#4f46e5', bg: '#eef2ff' },
    stats: [
      { icon: Users,        label: 'Students',    value: '500+' },
      { icon: BarChart2,    label: 'Revenue',     value: 'Tracked' },
      { icon: ClipboardList,label: 'Staff',       value: '15+'  },
      { icon: Award,        label: 'Courses',     value: '20+'  },
    ],
    orb1: 'rgba(99,102,241,0.2)',
    orb2: 'rgba(139,92,246,0.14)',
    orb3: 'rgba(16,185,129,0.1)',
  },

  student: {
    title:      'Student Portal',
    subtitle:   'Inflorescence Advance Skills',
    tagline:    'Track your courses, fees, results and attendance — all in one place.',
    welcome:    'Welcome, Student',
    desc:       'Sign in with the credentials sent to your Gmail.',
    allowedRoles: ['student'],
    redirect:   '/student-portal/dashboard',
    gradient:   'linear-gradient(145deg, #021a12 0%, #052e1a 45%, #063d22 100%)',
    accent:     '#10b981',
    accentGlow: 'rgba(16,185,129,0.22)',
    accentSoft: 'rgba(16,185,129,0.1)',
    Icon:       GraduationCap,
    taglineColor: '#6ee7b7',
    btnGradient:'linear-gradient(135deg, #059669 0%, #047857 100%)',
    btnShadow:  'rgba(5,150,105,0.4)',
    focusBg:    '#f0fdf8',
    focusBorder:'#059669',
    rolePill:   { color: '#059669', bg: '#ecfdf5' },
    stats: [
      { icon: BookOpen,   label: 'My Courses',   value: 'View'    },
      { icon: FileText,   label: 'Results',       value: 'Online'  },
      { icon: Clock,      label: 'Attendance',    value: 'Live'    },
      { icon: CheckCircle,label: 'Fees',          value: 'History' },
    ],
    orb1: 'rgba(16,185,129,0.2)',
    orb2: 'rgba(5,150,105,0.14)',
    orb3: 'rgba(52,211,153,0.1)',
  },

  client: {
    title:      'Client Portal',
    subtitle:   'Inflorescence Advance Skills',
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
      { icon: Briefcase,     label: 'My Projects', value: 'Live'     },
      { icon: FileText,      label: 'Invoices',    value: 'View'     },
      { icon: MessageCircle, label: 'Messages',    value: 'Direct'   },
      { icon: CheckCircle,   label: 'Progress',    value: 'Real-time'},
    ],
    orb1: 'rgba(245,158,11,0.2)',
    orb2: 'rgba(217,119,6,0.14)',
    orb3: 'rgba(251,191,36,0.1)',
  },

  teacher: {
    title:      'Teacher Portal',
    subtitle:   'Inflorescence Advance Skills',
    tagline:    'Manage your classes, mark attendance and publish exam results effortlessly.',
    welcome:    'Welcome back, Teacher',
    desc:       'Sign in with the credentials sent to your Gmail.',
    allowedRoles: ['teacher'],
    redirect:   '/teacher-portal/dashboard',
    gradient:   'linear-gradient(145deg, #050f1f 0%, #0a1f3d 45%, #0c2a52 100%)',
    accent:     '#0ea5e9',
    accentGlow: 'rgba(14,165,233,0.22)',
    accentSoft: 'rgba(14,165,233,0.1)',
    Icon:       Users,
    taglineColor: '#7dd3fc',
    btnGradient:'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
    btnShadow:  'rgba(2,132,199,0.4)',
    focusBg:    '#f0f9ff',
    focusBorder:'#0284c7',
    rolePill:   { color: '#0284c7', bg: '#e0f2fe' },
    stats: [
      { icon: Users,      label: 'My Students',  value: 'Live'   },
      { icon: Layers,     label: 'Modules',       value: 'Manage' },
      { icon: Star,       label: 'Exams',         value: 'Create' },
      { icon: Clock,      label: 'Attendance',    value: 'Mark'   },
    ],
    orb1: 'rgba(14,165,233,0.2)',
    orb2: 'rgba(2,132,199,0.14)',
    orb3: 'rgba(56,189,248,0.1)',
  },
};

/* ─── Component ─────────────────────────────────────────────── */
const PortalLogin = ({ portal = 'admin' }) => {
  const cfg = PORTALS[portal];
  const { Icon } = cfg;

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [focused, setFocused]   = useState(null);
  const [portalError, setPortalError] = useState('');

  const { login } = useContext(AuthContext);
  const navigate  = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setPortalError('');
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (!result) return; // toast already shown by AuthContext

    // Role guard — wrong portal
    if (!cfg.allowedRoles.includes(result.role)) {
      setPortalError(`These credentials belong to a different portal. Please use the correct login page.`);
      // Remove the stored token since it's the wrong portal
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return;
    }

    navigate(cfg.redirect);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'Inter', -apple-system, sans-serif" }}>

      {/* ── LEFT PANEL ──────────────────────────────────────── */}
      <div style={{
        flex: '0 0 52%', position: 'relative', overflow: 'hidden',
        background: cfg.gradient,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '3rem 4rem',
      }}>

        {/* Animated orbs */}
        {[
          { size: 520, top: -180, left: -150, color: cfg.orb1, dur: '8s' },
          { size: 380, bottom: -120, right: -90,  color: cfg.orb2, dur: '11s', rev: true },
          { size: 280, top: '48%',  right: '8%',  color: cfg.orb3, dur: '14s' },
        ].map((o, i) => (
          <div key={i} style={{
            position: 'absolute', width: o.size, height: o.size, borderRadius: '50%',
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

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 1 }}>

          {/* Logo */}
          <div style={{ marginBottom: '2.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.4rem' }}>
              <img
                src={logo}
                alt="Inflorescence Advance Skills"
                style={{
                  width: 64, height: 64, borderRadius: '50%',
                  objectFit: 'cover', flexShrink: 0,
                  boxShadow: `0 0 0 3px rgba(255,255,255,0.15), 0 0 32px ${cfg.accentGlow}`,
                  border: '2px solid rgba(255,255,255,0.1)',
                }}
              />
              <div>
                <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                  Inflorescence
                </h1>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500, lineHeight: 1.3 }}>
                  Institute of Advance Skills
                </p>
              </div>
            </div>
            <span style={{
              display: 'inline-block',
              fontSize: '0.65rem', fontWeight: 700, color: cfg.accent,
              background: cfg.accentSoft, border: `1px solid ${cfg.accent}44`,
              padding: '3px 10px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.1em',
            }}>
              {cfg.title}
            </span>
          </div>

          {/* Tagline */}
          <div style={{ marginBottom: '2.75rem' }}>
            <h2 style={{
              margin: 0, fontSize: '1.65rem', fontWeight: 700, lineHeight: 1.35, color: '#fff', maxWidth: 360,
            }}>
              {portal === 'admin'   && <><span style={{ color: cfg.taglineColor }}>Manage</span> Everything,<br/>From One Dashboard.</>}
              {portal === 'student' && <>Your Learning<br/><span style={{ color: cfg.taglineColor }}>Journey</span> Starts Here.</>}
              {portal === 'teacher' && <>Inspire Students,<br/><span style={{ color: cfg.taglineColor }}>Shape</span> Futures.</>}
              {portal === 'client'  && <><span style={{ color: cfg.taglineColor }}>Track</span> Your Projects<br/>In Real Time.</>}
            </h2>
            <p style={{ margin: '0.9rem 0 0', fontSize: '0.875rem', color: 'rgba(255,255,255,0.38)', maxWidth: 330, lineHeight: 1.65 }}>
              {cfg.tagline}
            </p>
          </div>

          {/* Feature / stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', maxWidth: 370 }}>
            {cfg.stats.map(({ icon: StatIcon, label, value }) => (
              <div key={label} style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.09)',
                borderRadius: '0.9rem', padding: '0.9rem 1.1rem',
                backdropFilter: 'blur(10px)',
                transition: 'border-color 0.2s',
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

        {/* Bottom bar */}
        <div style={{
          position: 'absolute', bottom: '1.75rem', left: '4rem', zIndex: 1,
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }}/>
          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.28)', fontWeight: 500 }}>
            Secure Portal — SSL Encrypted
          </span>
        </div>
      </div>

      {/* ── RIGHT PANEL ─────────────────────────────────────── */}
      <div style={{
        flex: 1, background: '#f8fafc',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2rem', position: 'relative', overflow: 'hidden',
      }}>

        {/* Dot pattern bg */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.4,
          backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}/>

        {/* Accent blob */}
        <div style={{
          position: 'absolute', width: 400, height: 400, borderRadius: '50%',
          bottom: -150, right: -100,
          background: `radial-gradient(circle, ${cfg.accentSoft} 0%, transparent 70%)`,
          filter: 'blur(40px)',
        }}/>

        <div style={{
          position: 'relative', zIndex: 1,
          width: '100%', maxWidth: 420,
          animation: 'slideUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) both',
        }}>

          {/* Header */}
          <div style={{ marginBottom: '2.25rem' }}>
            <p style={{
              margin: '0 0 0.35rem', fontSize: '0.72rem', fontWeight: 700,
              color: cfg.accent, textTransform: 'uppercase', letterSpacing: '0.12em',
            }}>
              {cfg.welcome}
            </p>
            <h2 style={{ margin: 0, fontSize: '1.9rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.025em' }}>
              Sign in to continue
            </h2>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>
              {cfg.desc}
            </p>
          </div>

          {/* Card */}
          <div style={{
            background: '#fff', borderRadius: '1.75rem', padding: '2.25rem',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.04), 0 20px 60px -10px rgba(0,0,0,0.1)',
            border: '1px solid rgba(226,232,240,0.9)',
          }}>

            {/* Portal error */}
            {portalError && (
              <div style={{
                marginBottom: '1.25rem', padding: '0.85rem 1rem',
                background: '#fef2f2', border: '1.5px solid #fca5a5',
                borderRadius: '0.875rem', fontSize: '0.8rem',
                color: '#b91c1c', fontWeight: 600, lineHeight: 1.5,
              }}>
                ⚠️ {portalError}
              </div>
            )}

            <form onSubmit={handleSubmit}>

              {/* Email */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{
                  display: 'block', fontSize: '0.7rem', fontWeight: 700,
                  color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.55rem',
                }}>
                  Email Address
                </label>
                <input
                  type="email" required autoComplete="email"
                  value={email} placeholder="you@gmail.com"
                  onChange={e => { setEmail(e.target.value); setPortalError(''); }}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '0.875rem 1rem',
                    fontSize: '0.925rem', fontWeight: 500, color: '#0f172a',
                    background: focused === 'email' ? cfg.focusBg : '#f8fafc',
                    border: `2px solid ${focused === 'email' ? cfg.focusBorder : '#e2e8f0'}`,
                    borderRadius: '0.875rem', outline: 'none',
                    transition: 'all 0.2s ease',
                  }}
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: '1.75rem' }}>
                <label style={{
                  display: 'block', fontSize: '0.7rem', fontWeight: 700,
                  color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.55rem',
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
                      fontSize: '0.925rem', fontWeight: 500, color: '#0f172a',
                      background: focused === 'pass' ? cfg.focusBg : '#f8fafc',
                      border: `2px solid ${focused === 'pass' ? cfg.focusBorder : '#e2e8f0'}`,
                      borderRadius: '0.875rem', outline: 'none',
                      transition: 'all 0.2s ease',
                      letterSpacing: showPass ? 'normal' : '0.15em',
                    }}
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    style={{
                      position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8',
                      padding: 0, display: 'flex', transition: 'color 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = cfg.focusBorder}
                    onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                  >
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
                  fontSize: '0.95rem', fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                  boxShadow: loading ? 'none' : `0 8px 24px ${cfg.btnShadow}`,
                  transition: 'all 0.2s ease',
                  opacity: loading ? 0.85 : 1,
                }}
                onMouseEnter={e => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = `0 14px 32px ${cfg.btnShadow}`;
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = loading ? 'none' : `0 8px 24px ${cfg.btnShadow}`;
                }}
              >
                {loading ? (
                  <>
                    <span style={{
                      width: 18, height: 18, flexShrink: 0,
                      border: '2.5px solid rgba(255,255,255,0.35)',
                      borderTopColor: '#fff', borderRadius: '50%',
                      animation: 'spin 0.7s linear infinite',
                    }}/>
                    Signing in...
                  </>
                ) : (
                  <>Sign In <ArrowRight size={17}/></>
                )}
              </button>
            </form>
          </div>

          {/* Other portals */}
          <div style={{ marginTop: '1.75rem', textAlign: 'center' }}>
            <p style={{ margin: '0 0 0.85rem', fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Other Portals
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              {portal !== 'admin' && (
                <a href="/login" style={{
                  padding: '0.5rem 1.1rem', background: '#eef2ff', color: '#4f46e5',
                  borderRadius: '0.65rem', fontSize: '0.75rem', fontWeight: 700,
                  textDecoration: 'none', transition: 'all 0.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = '#e0e7ff'}
                  onMouseLeave={e => e.currentTarget.style.background = '#eef2ff'}
                >
                  Admin Portal →
                </a>
              )}
              {portal !== 'student' && (
                <a href="/student-login" style={{
                  padding: '0.5rem 1.1rem', background: '#ecfdf5', color: '#059669',
                  borderRadius: '0.65rem', fontSize: '0.75rem', fontWeight: 700,
                  textDecoration: 'none', transition: 'all 0.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = '#d1fae5'}
                  onMouseLeave={e => e.currentTarget.style.background = '#ecfdf5'}
                >
                  Student Portal →
                </a>
              )}
              {portal !== 'teacher' && (
                <a href="/teacher-login" style={{
                  padding: '0.5rem 1.1rem', background: '#e0f2fe', color: '#0284c7',
                  borderRadius: '0.65rem', fontSize: '0.75rem', fontWeight: 700,
                  textDecoration: 'none', transition: 'all 0.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = '#bae6fd'}
                  onMouseLeave={e => e.currentTarget.style.background = '#e0f2fe'}
                >
                  Teacher Portal →
                </a>
              )}
              {portal !== 'client' && (
                <a href="/client-login" style={{
                  padding: '0.5rem 1.1rem', background: '#fef3c7', color: '#d97706',
                  borderRadius: '0.65rem', fontSize: '0.75rem', fontWeight: 700,
                  textDecoration: 'none', transition: 'all 0.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fde68a'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fef3c7'}
                >
                  Client Portal →
                </a>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Keyframes */}
      <style>{`
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
