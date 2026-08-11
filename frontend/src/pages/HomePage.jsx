import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen, Users, ChevronDown, ChevronRight,
  ArrowRight, GraduationCap, Shield, Sparkles,
  CheckCircle, Star, Award, Heart, Globe2,
  Phone, Mail, MapPin, Clock, UserCheck,
  BookMarked, FlaskConical, Music, Trophy,
  Briefcase, Baby,
} from 'lucide-react';
import axios from 'axios';
import logo from '../assets/logo2.jpeg';

const API = '/api';

/* ── Social media icons (inline SVG) ──────────────────────── */
const FacebookIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>
  </svg>
);
const InstagramIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <circle cx="12" cy="12" r="4"/>
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
  </svg>
);
const YoutubeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 001.46 6.42 29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.54C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.96A29 29 0 0023 12a29 29 0 00-.46-5.58z"/>
    <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"/>
  </svg>
);
const WhatsAppIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.121 1.532 5.856L.057 23.882l6.196-1.625A11.933 11.933 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.007-1.368l-.36-.213-3.678.964.981-3.595-.234-.369A9.818 9.818 0 1112 21.818z"/>
  </svg>
);
const TwitterIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

/* ── Data ─────────────────────────────────────────────────── */
const STATS = [
  { value: '500+', label: 'Students',         sub: 'Enrolled' },
  { value: '25+',  label: 'Qualified',        sub: 'Teachers' },
  { value: '10+',  label: 'Years',            sub: 'of Excellence' },
  { value: '98%',  label: 'Pass',             sub: 'Rate' },
];

const WHY_US = [
  { icon: UserCheck,    title: 'Qualified Teachers',       desc: 'Experienced and dedicated educators committed to bringing out the best in every student.', color: '#1d4ed8' },
  { icon: BookMarked,   title: 'Modern Curriculum',        desc: 'Up-to-date syllabus aligned with national standards, preparing students for future challenges.', color: '#0891b2' },
  { icon: FlaskConical, title: 'Science & Labs',           desc: 'Well-equipped science labs and computer rooms for hands-on practical learning.', color: '#059669' },
  { icon: Trophy,       title: 'Extra-Curriculars',        desc: 'Sports, debate, arts, and cultural events to develop well-rounded personalities.', color: '#d97706' },
  { icon: Heart,        title: 'Safe Environment',         desc: 'A nurturing, inclusive, and safe campus where every child feels valued and respected.', color: '#dc2626' },
  { icon: Globe2,       title: 'Digital Learning',         desc: 'Student and parent portals for real-time access to results, timetables, fees, and more.', color: '#7c3aed' },
];

const CLASSES = [
  { label: 'Pre-School', sub: 'Nursery & KG',    icon: Baby,          color: '#f59e0b', bg: '#fef3c7' },
  { label: 'Primary',    sub: 'Classes 1 – 5',   icon: BookOpen,      color: '#10b981', bg: '#d1fae5' },
  { label: 'Middle',     sub: 'Classes 6 – 8',   icon: BookMarked,    color: '#3b82f6', bg: '#dbeafe' },
  { label: 'Secondary',  sub: 'Classes 9 – 10',  icon: GraduationCap, color: '#8b5cf6', bg: '#ede9fe' },
  { label: 'Higher Sec', sub: 'Classes 11 – 12', icon: Award,         color: '#ef4444', bg: '#fee2e2' },
  { label: 'Activities', sub: 'Sports & Arts',   icon: Music,         color: '#06b6d4', bg: '#cffafe' },
];

const PORTALS = [
  { title: 'Student Portal',  desc: 'Timetable, results, fee records, attendance & homework.',   href: '/student-login',  color: '#6d28d9', Icon: GraduationCap },
  { title: 'Parent Portal',   desc: 'Track attendance, results, fees and communicate with school.', href: '/parent-login',   color: '#0f766e', Icon: Heart },
  { title: 'Teacher Portal',  desc: 'Manage classes, marks entry, timetable & announcements.',    href: '/teacher-login',  color: '#065f46', Icon: Users },
  { title: 'Admin Panel',     desc: 'Full school management — HR, Finance, Admissions, Reports.', href: '/login',          color: '#1e40af', Icon: Shield },
];

const SOCIAL = [
  { icon: FacebookIcon,  label: 'Facebook',  href: 'https://facebook.com',  color: '#1877f2', bg: '#e7f0fd' },
  { icon: InstagramIcon, label: 'Instagram', href: 'https://instagram.com', color: '#e1306c', bg: '#fce4ec' },
  { icon: YoutubeIcon,   label: 'YouTube',   href: 'https://youtube.com',   color: '#ff0000', bg: '#ffebee' },
  { icon: WhatsAppIcon,  label: 'WhatsApp',  href: 'https://wa.me/92',      color: '#25d366', bg: '#e8f5e9' },
  { icon: TwitterIcon,   label: 'X / Twitter', href: 'https://x.com',       color: '#000000', bg: '#f5f5f5' },
];

const LOGIN_ITEMS = [
  { label: 'Student',       sub: 'Results & Timetable', href: '/student-login',  dot: '#a78bfa' },
  { label: 'Parent',        sub: 'Track Your Child',    href: '/parent-login',   dot: '#2dd4bf' },
  { label: 'Teacher',       sub: 'Classes & Marks',     href: '/teacher-login',  dot: '#34d399' },
  { label: 'Admin / Staff', sub: 'Full ERP Access',     href: '/login',          dot: '#60a5fa' },
  { label: 'Client',        sub: 'Projects & Invoices', href: '/client-login',   dot: '#fbbf24' },
];

/* ────────────────────────────────────────────────────────── */
export default function HomePage() {
  const [courses, setCourses] = useState([]);
  const [loginOpen, setLoginOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const loginRef = useRef(null);

  useEffect(() => {
    axios.get(`${API}/courses/public`).then(r => setCourses(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const h = e => { if (loginRef.current && !loginRef.current.contains(e.target)) setLoginOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", background: '#fff', overflowX: 'hidden' }}>

      {/* ══ NAVBAR ══════════════════════════════════════════════ */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
        background: scrolled ? 'rgba(10,22,50,0.97)' : 'transparent',
        backdropFilter: scrolled ? 'blur(24px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.07)' : 'none',
        boxShadow: scrolled ? '0 4px 30px rgba(0,0,0,0.3)' : 'none',
      }}>
        <div style={{ maxWidth: 1260, margin: '0 auto', padding: '0 2rem', height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
            <img src={logo} alt="The Best Way Public School"
              style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0,
                boxShadow: '0 0 0 2.5px rgba(245,158,11,0.5), 0 4px 16px rgba(0,0,0,0.4)' }} />
            <div>
              <div style={{ color: '#fff', fontWeight: 900, fontSize: '1rem', lineHeight: 1.1, letterSpacing: '-0.01em' }}>The Best Way</div>
              <div style={{ color: '#fbbf24', fontSize: '0.56rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em' }}>Public School</div>
            </div>
          </Link>

          {/* Nav links — hidden on small screens but fine for desktop */}
          <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            {['Home', 'About', 'Academics', 'Admissions', 'Contact'].map(n => (
              <a key={n} href={`#${n.toLowerCase()}`} style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = '#fbbf24'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
              >{n}</a>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div ref={loginRef} style={{ position: 'relative' }}>
              <button onClick={() => setLoginOpen(v => !v)} style={{
                display: 'flex', alignItems: 'center', gap: '0.45rem',
                padding: '0.55rem 1.1rem',
                background: 'transparent', border: '1.5px solid rgba(255,255,255,0.22)',
                borderRadius: '0.65rem', color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#fbbf24'; e.currentTarget.style.color = '#fbbf24'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)'; e.currentTarget.style.color = '#e2e8f0'; }}
              >
                Sign In <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: loginOpen ? 'rotate(180deg)' : 'none' }} />
              </button>
              {loginOpen && (
                <div style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 10px)',
                  width: 240, background: '#0d1b38', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '1rem', overflow: 'hidden',
                  boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
                  animation: 'fadeDown 0.18s ease',
                }}>
                  {LOGIN_ITEMS.map((p, i) => (
                    <Link key={i} to={p.href} onClick={() => setLoginOpen(false)} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.85rem 1.1rem', textDecoration: 'none',
                      borderBottom: i < LOGIN_ITEMS.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', transition: 'background 0.15s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(251,191,36,0.07)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.dot, flexShrink: 0 }} />
                        <div>
                          <div style={{ color: '#f1f5f9', fontSize: '0.83rem', fontWeight: 700 }}>{p.label}</div>
                          <div style={{ color: '#475569', fontSize: '0.67rem', fontWeight: 500 }}>{p.sub}</div>
                        </div>
                      </div>
                      <ChevronRight size={13} color="#334155" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <Link to="/apply" style={{
              padding: '0.55rem 1.3rem', background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#0a1628', fontWeight: 800, fontSize: '0.85rem',
              borderRadius: '0.65rem', textDecoration: 'none',
              boxShadow: '0 4px 18px rgba(245,158,11,0.45)', transition: 'all 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(245,158,11,0.55)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 18px rgba(245,158,11,0.45)'; }}
            >
              Apply Now
            </Link>
          </div>
        </div>
      </nav>

      {/* ══ HERO ═════════════════════════════════════════════════ */}
      <section id="home" style={{
        minHeight: '100vh', paddingTop: 72, position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(150deg, #020818 0%, #0a1628 30%, #0d1f4a 60%, #08122e 100%)',
        display: 'flex', alignItems: 'center',
      }}>
        {/* Decorative blobs */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: '-5%', left: '-8%', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(30,64,175,0.22) 0%, transparent 65%)' }} />
          <div style={{ position: 'absolute', top: '25%', right: '-6%', width: 550, height: 550, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 65%)' }} />
          <div style={{ position: 'absolute', bottom: '-5%', left: '35%', width: 450, height: 450, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,95,70,0.1) 0%, transparent 65%)' }} />
          {/* Grid */}
          <div style={{ position: 'absolute', inset: 0, opacity: 0.028, backgroundImage: 'radial-gradient(rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '36px 36px' }} />
          {/* Gold accent line */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, transparent, #f59e0b, #d97706, transparent)' }} />
        </div>

        <div style={{ maxWidth: 1260, margin: '0 auto', padding: '5rem 2rem 6rem', position: 'relative', zIndex: 1, width: '100%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '3rem', alignItems: 'center' }}>

            {/* Left — text */}
            <div>
              {/* Badge */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.45rem 1.1rem', borderRadius: 99,
                background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                color: '#fbbf24', fontSize: '0.7rem', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.13em', marginBottom: '1.75rem',
              }}>
                <Sparkles size={11} fill="currentColor" />
                Multan Ada Bili Wala — Est. 2010
              </div>

              <h1 style={{
                margin: '0 0 0.6rem',
                fontSize: 'clamp(2.8rem, 5.5vw, 4.8rem)',
                fontWeight: 900, color: '#fff', lineHeight: 1.08,
                letterSpacing: '-0.035em',
              }}>
                The Best Way
              </h1>
              <h1 style={{
                margin: '0 0 1.5rem',
                fontSize: 'clamp(2rem, 4vw, 3.4rem)',
                fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.03em',
                background: 'linear-gradient(90deg, #fbbf24 0%, #f59e0b 40%, #fde68a 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
                Public School
              </h1>

              <p style={{
                margin: '0 0 0.9rem',
                fontSize: 'clamp(1.1rem, 2vw, 1.35rem)',
                color: 'rgba(255,255,255,0.6)', lineHeight: 1.75, maxWidth: 540,
                fontStyle: 'italic', fontWeight: 500,
              }}>
                "Learn, Grow &amp; Succeed"
              </p>
              <p style={{ margin: '0 0 2.75rem', fontSize: '1rem', color: 'rgba(255,255,255,0.42)', lineHeight: 1.8, maxWidth: 500 }}>
                Providing quality education from Nursery to Higher Secondary, nurturing young minds with modern teaching, dedicated faculty, and a safe learning environment.
              </p>

              {/* CTA */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '3.5rem' }}>
                <Link to="/apply" style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.65rem',
                  padding: '0.95rem 2.1rem', borderRadius: '0.85rem',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: '#0a1628', fontWeight: 800, fontSize: '1rem', textDecoration: 'none',
                  boxShadow: '0 8px 32px rgba(245,158,11,0.45)', transition: 'all 0.2s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(245,158,11,0.55)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(245,158,11,0.45)'; }}
                >
                  Apply for Admission <ArrowRight size={18} />
                </Link>
                <Link to="/student-login" style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.65rem',
                  padding: '0.95rem 2.1rem', borderRadius: '0.85rem',
                  background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.18)',
                  color: '#e2e8f0', fontWeight: 700, fontSize: '1rem', textDecoration: 'none', transition: 'all 0.2s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; }}
                >
                  Student Portal
                </Link>
              </div>

              {/* Stats row */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2.5rem' }}>
                {STATS.map(s => (
                  <div key={s.label}>
                    <div style={{ color: '#fbbf24', fontWeight: 900, fontSize: '2rem', lineHeight: 1, letterSpacing: '-0.03em' }}>{s.value}</div>
                    <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.25rem' }}>
                      {s.label} <span style={{ color: 'rgba(255,255,255,0.3)' }}>{s.sub}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — logo emblem */}
            <div className="hero-logo-wrap" style={{ flexShrink: 0 }}>
              <div style={{
                width: 280, height: 280,
                borderRadius: '50%',
                background: 'radial-gradient(circle at 40% 35%, rgba(30,64,175,0.35), rgba(8,18,46,0.8))',
                border: '2px solid rgba(245,158,11,0.25)',
                boxShadow: '0 0 80px rgba(245,158,11,0.15), 0 0 0 18px rgba(245,158,11,0.05), 0 0 0 36px rgba(245,158,11,0.03)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: 'floatLogo 4s ease-in-out infinite',
              }}>
                <img src={logo} alt="School Logo"
                  style={{ width: 220, height: 220, borderRadius: '50%', objectFit: 'cover',
                    boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{ position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', animation: 'bounce 2s infinite' }}>
          <ChevronDown size={22} color="rgba(255,255,255,0.25)" />
        </div>
      </section>

      {/* ══ GOLD STATS BAND ═════════════════════════════════════ */}
      <div style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)', padding: '2.5rem 2rem' }}>
        <div style={{ maxWidth: 1260, margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-around', gap: '2rem' }}>
          {[
            { icon: GraduationCap, label: 'Nursery to Class 12' },
            { icon: UserCheck,     label: 'Experienced Faculty' },
            { icon: BookOpen,      label: 'Updated Curriculum' },
            { icon: Trophy,        label: 'Award Winning School' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={20} color="#0a1628" />
              </div>
              <span style={{ color: '#0a1628', fontWeight: 800, fontSize: '0.95rem' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ══ WHY CHOOSE US ════════════════════════════════════════ */}
      <section id="about" style={{ padding: '6rem 2rem', background: '#f8fafc' }}>
        <div style={{ maxWidth: 1260, margin: '0 auto' }}>

          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              color: '#1d4ed8', fontSize: '0.7rem', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.13em', marginBottom: '0.75rem',
              background: '#dbeafe', padding: '0.35rem 0.9rem', borderRadius: 99,
              border: '1px solid #bfdbfe',
            }}>
              <Star size={10} fill="currentColor" /> Why Choose Us
            </div>
            <h2 style={{ margin: '0 0 0.75rem', fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>
              Excellence in Every Classroom
            </h2>
            <p style={{ margin: '0 auto', color: '#64748b', fontSize: '1rem', maxWidth: 520, lineHeight: 1.75 }}>
              We believe every child deserves the best start in life. Here's what makes The Best Way Public School the preferred choice for families in Multan.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
            {WHY_US.map(({ icon: Icon, title, desc, color }) => (
              <div key={title} style={{
                padding: '2rem', borderRadius: '1.25rem',
                background: '#fff', border: '1.5px solid #f1f5f9',
                transition: 'all 0.28s cubic-bezier(0.34,1.56,0.64,1)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-6px)';
                  e.currentTarget.style.boxShadow = `0 20px 50px ${color}18`;
                  e.currentTarget.style.borderColor = color + '44';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)';
                  e.currentTarget.style.borderColor = '#f1f5f9';
                }}
              >
                <div style={{
                  width: 54, height: 54, borderRadius: '1rem', marginBottom: '1.25rem',
                  background: color + '15', border: `1.5px solid ${color}28`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color,
                }}>
                  <Icon size={24} />
                </div>
                <h3 style={{ margin: '0 0 0.55rem', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>{title}</h3>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem', lineHeight: 1.75 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ ACADEMIC CLASSES ════════════════════════════════════ */}
      <section id="academics" style={{ padding: '6rem 2rem', background: '#fff' }}>
        <div style={{ maxWidth: 1260, margin: '0 auto' }}>

          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              color: '#d97706', fontSize: '0.7rem', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.13em', marginBottom: '0.75rem',
              background: '#fef3c7', padding: '0.35rem 0.9rem', borderRadius: 99,
              border: '1px solid #fde68a',
            }}>
              <BookOpen size={10} /> Academic Programs
            </div>
            <h2 style={{ margin: '0 0 0.75rem', fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>
              From Nursery to Higher Secondary
            </h2>
            <p style={{ margin: '0 auto', color: '#64748b', fontSize: '1rem', maxWidth: 500, lineHeight: 1.75 }}>
              Comprehensive education at every level — building strong foundations for a bright future.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '1.25rem' }}>
            {CLASSES.map(({ label, sub, icon: Icon, color, bg }) => (
              <div key={label} style={{
                padding: '2rem 1.5rem', borderRadius: '1.25rem', textAlign: 'center',
                background: bg, border: `1.5px solid ${color}22`,
                transition: 'all 0.28s cubic-bezier(0.34,1.56,0.64,1)',
                cursor: 'default',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px) scale(1.03)'; e.currentTarget.style.boxShadow = `0 16px 40px ${color}28`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{
                  width: 56, height: 56, borderRadius: '50%', margin: '0 auto 1rem',
                  background: '#fff', boxShadow: `0 4px 16px ${color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color,
                }}>
                  <Icon size={24} />
                </div>
                <div style={{ fontWeight: 900, fontSize: '1rem', color: '#0f172a', marginBottom: '0.3rem' }}>{label}</div>
                <div style={{ color, fontWeight: 700, fontSize: '0.78rem' }}>{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PRINCIPAL / VISION BAND ══════════════════════════════ */}
      <section style={{
        padding: '6rem 2rem', position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(150deg, #0a1628 0%, #0d1f4a 50%, #08122e 100%)',
      }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: '-20%', right: '-5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.1) 0%, transparent 65%)' }} />
          <div style={{ position: 'absolute', bottom: '-15%', left: '-5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(30,64,175,0.15) 0%, transparent 65%)' }} />
          <div style={{ position: 'absolute', inset: 0, opacity: 0.025, backgroundImage: 'radial-gradient(rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '36px 36px' }} />
        </div>

        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', margin: '0 auto 1.5rem',
            background: 'rgba(245,158,11,0.15)', border: '2px solid rgba(245,158,11,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Heart size={28} color="#fbbf24" fill="rgba(251,191,36,0.2)" />
          </div>
          <div style={{ color: '#fbbf24', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '1.25rem' }}>
            Our Vision &amp; Mission
          </div>
          <h2 style={{
            margin: '0 0 1.5rem',
            fontSize: 'clamp(1.7rem, 3.5vw, 2.5rem)', fontWeight: 900, color: '#fff', lineHeight: 1.25, letterSpacing: '-0.025em',
          }}>
            "Shaping Tomorrow's Leaders<br />With Today's Education"
          </h2>
          <p style={{ margin: '0 auto 2.5rem', color: 'rgba(255,255,255,0.5)', fontSize: '1.05rem', lineHeight: 1.8, maxWidth: 660 }}>
            At The Best Way Public School, we are committed to delivering high-quality education that combines strong academic foundations with moral values, creative thinking, and life skills — preparing every student to excel in all walks of life.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '2.5rem' }}>
            {[
              { val: 'Quality',  desc: 'Education' },
              { val: 'Moral',    desc: 'Values' },
              { val: 'Modern',   desc: 'Methods' },
              { val: 'Caring',   desc: 'Teachers' },
            ].map(({ val, desc }) => (
              <div key={val} style={{ textAlign: 'center' }}>
                <div style={{ color: '#fbbf24', fontWeight: 900, fontSize: '1.3rem', letterSpacing: '-0.02em' }}>{val}</div>
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.2rem' }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PORTALS ══════════════════════════════════════════════ */}
      <section style={{ padding: '6rem 2rem', background: '#f8fafc' }}>
        <div style={{ maxWidth: 1260, margin: '0 auto' }}>

          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              color: '#6d28d9', fontSize: '0.7rem', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.13em', marginBottom: '0.75rem',
              background: '#ede9fe', padding: '0.35rem 0.9rem', borderRadius: 99,
              border: '1px solid #ddd6fe',
            }}>
              <Globe2 size={10} /> Digital Portals
            </div>
            <h2 style={{ margin: '0 0 0.75rem', fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>
              Access Your School Portal
            </h2>
            <p style={{ margin: '0 auto', color: '#64748b', fontSize: '1rem', maxWidth: 480, lineHeight: 1.75 }}>
              Stay connected with the school — anywhere, anytime.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '1.5rem' }}>
            {PORTALS.map(({ title, desc, href, color, Icon }) => (
              <Link key={href} to={href} style={{
                display: 'flex', flexDirection: 'column', textDecoration: 'none',
                padding: '2rem', borderRadius: '1.25rem',
                background: '#fff', border: '1.5px solid #f1f5f9',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                transition: 'all 0.28s cubic-bezier(0.34,1.56,0.64,1)',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = `0 20px 50px ${color}22`; e.currentTarget.style.borderColor = color + '44'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; e.currentTarget.style.borderColor = '#f1f5f9'; }}
              >
                <div style={{
                  width: 52, height: 52, borderRadius: '0.9rem', marginBottom: '1.25rem',
                  background: color + '15', border: `1.5px solid ${color}28`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color,
                }}>
                  <Icon size={22} />
                </div>
                <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>{title}</h3>
                <p style={{ margin: '0 0 1.5rem', fontSize: '0.85rem', color: '#64748b', lineHeight: 1.7, flexGrow: 1 }}>{desc}</p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color, fontWeight: 700, fontSize: '0.83rem' }}>
                  Sign In <ArrowRight size={14} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ══ ADMISSIONS CTA ══════════════════════════════════════ */}
      <section id="admissions" style={{ padding: '6rem 2rem', background: '#fff' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{
            borderRadius: '2rem', overflow: 'hidden', position: 'relative',
            background: 'linear-gradient(135deg, #0a1628 0%, #1e3a8a 40%, #1d4ed8 100%)',
            padding: '5rem 3.5rem', textAlign: 'center',
            boxShadow: '0 32px 80px rgba(10,22,40,0.35)',
          }}>
            <div style={{ position: 'absolute', inset: 0, opacity: 0.07, backgroundImage: 'radial-gradient(rgba(255,255,255,1) 1.5px, transparent 1.5px)', backgroundSize: '28px 28px' }} />
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, transparent, #f59e0b, #d97706, transparent)' }} />
            <div style={{ position: 'absolute', top: '-30%', right: '-5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.14) 0%, transparent 65%)' }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <img src={logo} alt="logo" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(245,158,11,0.5)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', marginBottom: '1.5rem' }} />
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                color: '#fbbf24', fontSize: '0.7rem', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.13em', marginBottom: '1.25rem',
                background: 'rgba(245,158,11,0.15)', padding: '0.35rem 0.9rem', borderRadius: 99,
                border: '1px solid rgba(245,158,11,0.3)',
              }}>
                <GraduationCap size={10} /> Admissions Open 2025
              </div>
              <h2 style={{ margin: '0 0 1rem', fontSize: 'clamp(1.8rem, 3.5vw, 2.75rem)', fontWeight: 900, color: '#fff', letterSpacing: '-0.025em', lineHeight: 1.2 }}>
                Enrol Your Child Today
              </h2>
              <p style={{ margin: '0 auto 2.5rem', color: 'rgba(255,255,255,0.6)', fontSize: '1.05rem', lineHeight: 1.75, maxWidth: 520 }}>
                Give your child the gift of quality education at The Best Way Public School. Limited seats available for the upcoming academic session.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
                <Link to="/apply" style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.65rem',
                  padding: '1rem 2.25rem', borderRadius: '0.85rem',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#0a1628', fontWeight: 800, fontSize: '1rem', textDecoration: 'none',
                  boxShadow: '0 8px 32px rgba(245,158,11,0.4)', transition: 'all 0.2s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(245,158,11,0.5)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(245,158,11,0.4)'; }}
                >
                  Apply Online Now <ArrowRight size={18} />
                </Link>
                <a href="tel:+92" style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.65rem',
                  padding: '1rem 2.25rem', borderRadius: '0.85rem',
                  background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.2)',
                  color: '#fff', fontWeight: 700, fontSize: '1rem', textDecoration: 'none', transition: 'all 0.2s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                >
                  <Phone size={17} /> Call School
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ CONTACT INFO ════════════════════════════════════════ */}
      <section id="contact" style={{ padding: '5rem 2rem', background: '#f8fafc' }}>
        <div style={{ maxWidth: 1260, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
            {[
              { icon: MapPin, title: 'Our Location',   val: 'Multan Ada Bili Wala, Punjab, Pakistan', color: '#dc2626' },
              { icon: Phone,  title: 'Phone Number',   val: '+92 — Call for details',                  color: '#16a34a' },
              { icon: Mail,   title: 'Email Address',  val: 'info@bestwaypublicschool.edu.pk',         color: '#2563eb' },
              { icon: Clock,  title: 'School Hours',   val: 'Mon–Sat: 8:00 AM – 2:00 PM',             color: '#d97706' },
            ].map(({ icon: Icon, title, val, color }) => (
              <div key={title} style={{
                padding: '1.75rem', borderRadius: '1.1rem',
                background: '#fff', border: '1.5px solid #f1f5f9',
                display: 'flex', alignItems: 'flex-start', gap: '1rem',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                transition: 'all 0.25s',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 12px 32px ${color}16`; e.currentTarget.style.borderColor = color + '33'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; e.currentTarget.style.borderColor = '#f1f5f9'; }}
              >
                <div style={{ width: 46, height: 46, borderRadius: '0.85rem', flexShrink: 0, background: color + '12', border: `1.5px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
                  <Icon size={20} />
                </div>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.67rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.35rem' }}>{title}</div>
                  <div style={{ color: '#0f172a', fontWeight: 700, fontSize: '0.875rem', lineHeight: 1.5 }}>{val}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══════════════════════════════════════════════ */}
      <footer style={{ background: 'linear-gradient(150deg, #020818 0%, #0a1628 50%, #08122e 100%)', padding: '4rem 2rem 2rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.025, backgroundImage: 'radial-gradient(rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '32px 32px', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, transparent, #f59e0b, #d97706, transparent)' }} />

        <div style={{ maxWidth: 1260, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '3rem', marginBottom: '3.5rem' }}>

            {/* Brand */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <img src={logo} alt="logo" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(245,158,11,0.35)', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }} />
                <div>
                  <div style={{ color: '#fff', fontWeight: 900, fontSize: '1rem', lineHeight: 1.1 }}>The Best Way</div>
                  <div style={{ color: '#fbbf24', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Public School</div>
                </div>
              </div>
              <p style={{ margin: '0 0 1.25rem', color: 'rgba(255,255,255,0.38)', fontSize: '0.83rem', lineHeight: 1.75 }}>
                Providing quality education from Nursery to Higher Secondary. Nurturing young minds at Multan Ada Bili Wala since 2010.
              </p>
              {/* Social media */}
              <div>
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.75rem' }}>Follow Us</div>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  {SOCIAL.map(({ icon: Icon, label, href, color, bg }) => (
                    <a key={label} href={href} target="_blank" rel="noopener noreferrer" title={label} style={{
                      width: 38, height: 38, borderRadius: '0.65rem',
                      background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'rgba(255,255,255,0.5)', transition: 'all 0.2s', textDecoration: 'none',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.background = color; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 8px 20px ${color}55`; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      <Icon />
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Portals */}
            <div>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '1.1rem' }}>Portals</div>
              {[
                { label: 'Student Portal',  href: '/student-login' },
                { label: 'Parent Portal',   href: '/parent-login' },
                { label: 'Teacher Portal',  href: '/teacher-login' },
                { label: 'Admin Panel',     href: '/login' },
                { label: 'Client Portal',   href: '/client-login' },
              ].map(l => (
                <div key={l.href} style={{ marginBottom: '0.55rem' }}>
                  <Link to={l.href} style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none', transition: 'color 0.2s', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#fbbf24'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.45)'}
                  >
                    <ChevronRight size={12} style={{ flexShrink: 0 }} /> {l.label}
                  </Link>
                </div>
              ))}
            </div>

            {/* Quick Links */}
            <div>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '1.1rem' }}>Quick Links</div>
              {[
                { label: 'Apply for Admission', href: '/apply' },
                { label: 'Online Admission Form', href: '/apply' },
                { label: 'About Us', href: '#about' },
                { label: 'Academic Programs', href: '#academics' },
                { label: 'Contact Us', href: '#contact' },
              ].map(l => (
                <div key={l.label} style={{ marginBottom: '0.55rem' }}>
                  <a href={l.href} style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none', transition: 'color 0.2s', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#fbbf24'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.45)'}
                  >
                    <ChevronRight size={12} style={{ flexShrink: 0 }} /> {l.label}
                  </a>
                </div>
              ))}
            </div>

            {/* Contact in footer */}
            <div>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '1.1rem' }}>Contact</div>
              {[
                { icon: MapPin, text: 'Multan Ada Bili Wala, Punjab, Pakistan' },
                { icon: Phone,  text: '+92 — Call for details' },
                { icon: Mail,   text: 'info@bestwaypublicschool.edu.pk' },
                { icon: Clock,  text: 'Mon–Sat: 8:00 AM – 2:00 PM' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', marginBottom: '0.75rem' }}>
                  <Icon size={14} color="rgba(251,191,36,0.6)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem', lineHeight: 1.55 }}>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '1.75rem',
            display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between',
            alignItems: 'center', gap: '0.75rem',
          }}>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem', fontWeight: 500 }}>
              © 2025 The Best Way Public School, Multan Ada Bili Wala. All rights reserved.
            </p>
            <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
              <span style={{ color: 'rgba(255,255,255,0.25)' }}>Crafted with</span>
              <span style={{ color: '#ef4444', fontSize: '0.9rem' }}>♥</span>
              <span style={{ color: 'rgba(255,255,255,0.25)' }}>by</span>
              <span className="dev-name">Muhammad Sajjad</span>
            </p>
          </div>
        </div>
      </footer>

      {/* ══ Global Styles ══════════════════════════════════════ */}
      <style>{`
        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes floatLogo {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-14px); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50%       { transform: translateX(-50%) translateY(8px); }
        }

        /* ── Developer credit ── */
        @keyframes devShimmer {
          0%   { background-position: -300% center; }
          100% { background-position: 300% center; }
        }
        @keyframes devFloat {
          0%,100% { transform: translateY(0)   rotate(0deg)  scale(1);    }
          12%      { transform: translateY(-7px)  rotate(-6deg) scale(1.08); }
          25%      { transform: translateY(-12px) rotate(5deg)  scale(1.13); }
          37%      { transform: translateY(-8px)  rotate(-4deg) scale(1.1);  }
          50%      { transform: translateY(-14px) rotate(7deg)  scale(1.15); }
          62%      { transform: translateY(-9px)  rotate(-5deg) scale(1.11); }
          75%      { transform: translateY(-11px) rotate(4deg)  scale(1.12); }
          88%      { transform: translateY(-4px)  rotate(-2deg) scale(1.05); }
        }
        @keyframes devGlow {
          0%,100% { filter: drop-shadow(0 0 4px rgba(251,191,36,0.5)) drop-shadow(0 0 12px rgba(245,158,11,0.3)); }
          50%      { filter: drop-shadow(0 0 8px rgba(251,191,36,0.9)) drop-shadow(0 0 24px rgba(245,158,11,0.6)) drop-shadow(0 0 40px rgba(251,191,36,0.3)); }
        }

        .dev-name {
          font-weight: 900;
          font-size: 0.9rem;
          letter-spacing: 0.04em;
          cursor: pointer;
          display: inline-block;
          background: linear-gradient(90deg, #fbbf24 0%, #f59e0b 30%, #fde68a 50%, #f59e0b 70%, #fbbf24 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          transition: background-position 0.3s;
          position: relative;
          text-transform: uppercase;
        }
        .dev-name:hover {
          background: linear-gradient(90deg,
            #fbbf24, #f59e0b, #ef4444, #f97316,
            #eab308, #22c55e, #06b6d4, #6366f1,
            #ec4899, #fbbf24, #f59e0b, #fbbf24);
          background-size: 400% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: devFloat 0.7s ease-in-out infinite,
                     devShimmer 1.2s linear infinite,
                     devGlow 1s ease-in-out infinite;
        }

        /* Hero logo hide on small screens */
        @media (max-width: 768px) {
          .hero-logo-wrap { display: none !important; }
          .nav-links { display: none !important; }
        }
      `}</style>
    </div>
  );
}
