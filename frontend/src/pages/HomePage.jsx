import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen, Users, Play, ChevronDown, ChevronRight,
  Monitor, FileText, BarChart3, Clock, Star, ArrowRight,
  Zap, Shield, CheckCircle, Award, GraduationCap,
  Briefcase, TrendingUp, Sparkles, Globe2, Layers,
} from 'lucide-react';
import axios from 'axios';
import logo from '../assets/logo.jpeg';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const COURSE_GRADIENTS = [
  ['#7c3aed', '#6d28d9'],
  ['#0891b2', '#0e7490'],
  ['#059669', '#047857'],
  ['#dc2626', '#b91c1c'],
  ['#d97706', '#b45309'],
  ['#db2777', '#be185d'],
];

const FEATURES = [
  { icon: Play,      title: 'Video Learning',        desc: 'YouTube, Vimeo & Drive lectures — streamed directly inside the platform, no downloads needed.', accent: '#7c3aed' },
  { icon: Zap,       title: 'Live Online Exams',      desc: 'Timed MCQ exams with auto-grading, negative marking, and instant result cards.', accent: '#0891b2' },
  { icon: BarChart3, title: 'Progress Tracking',      desc: 'Beautiful dashboards that track course completion, attendance streaks and performance.', accent: '#059669' },
  { icon: FileText,  title: 'Digital Documents',      desc: 'Fee receipts, salary slips, and result cards auto-generated as professional PDFs.', accent: '#d97706' },
  { icon: Layers,    title: 'Full ERP System',        desc: 'HR, Finance, Admissions, CRM and Attendance — all integrated into one admin panel.', accent: '#dc2626' },
  { icon: Award,     title: 'Certifications',         desc: 'Earn verifiable course completion certificates after clearing exams and attendance.', accent: '#db2777' },
];

const PORTALS = [
  { title: 'Student Portal',   desc: 'Courses, video lectures, results, fees, and live exams.',           href: '/student-login',  color: '#7c3aed', bg: 'from-violet-600 to-indigo-600', Icon: GraduationCap, items: ['Video Lectures', 'Live Exams', 'Fee Records', 'Attendance'] },
  { title: 'Teacher Portal',   desc: 'Upload content, manage classes, and track student progress.',        href: '/teacher-login',  color: '#059669', bg: 'from-emerald-600 to-teal-600',   Icon: Users,          items: ['Course Modules', 'Create Exams', 'Student Progress', 'Timetable'] },
  { title: 'Admin Panel',      desc: 'Full institute management — HR, Finance, and Admissions.',          href: '/login',          color: '#0891b2', bg: 'from-cyan-600 to-sky-600',       Icon: Shield,         items: ['Finance & Payroll', 'Admissions', 'Staff Management', 'Reports'] },
  { title: 'Client Portal',    desc: 'Track your projects, invoices, and team communications.',           href: '/client-login',   color: '#d97706', bg: 'from-amber-500 to-orange-500',   Icon: Briefcase,      items: ['Project Updates', 'Invoices', 'Direct Messages', 'Deliverables'] },
];

const STATS = [
  { value: '500+', label: 'Students Enrolled',  icon: GraduationCap },
  { value: '98%',  label: 'Satisfaction Rate',  icon: Star },
  { value: '24/7', label: 'Platform Access',    icon: Monitor },
  { value: '100%', label: 'Digital & Paperless',icon: TrendingUp },
];

const LOGIN_ITEMS = [
  { label: 'Student',      sub: 'Courses & Exams',    href: '/student-login',  dot: '#a78bfa' },
  { label: 'Teacher',      sub: 'Manage Classes',      href: '/teacher-login',  dot: '#34d399' },
  { label: 'Admin / Staff',sub: 'Full ERP Access',     href: '/login',          dot: '#60a5fa' },
  { label: 'Client',       sub: 'Projects & Invoices', href: '/client-login',   dot: '#fbbf24' },
];

export default function HomePage() {
  const [courses, setCourses] = useState([]);
  const [loginOpen, setLoginOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const loginRef = useRef(null);

  useEffect(() => {
    axios.get(`${API}/courses/public`).then(r => setCourses(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handler = e => { if (loginRef.current && !loginRef.current.contains(e.target)) setLoginOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", background: '#fff', overflowX: 'hidden' }}>

      {/* ── NAVBAR ─────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        transition: 'all 0.3s',
        background: scrolled ? 'rgba(8,8,20,0.97)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* Logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}>
            <img
              src={logo}
              alt="Inflorescence Advance Skills"
              style={{
                width: 46, height: 46, borderRadius: '50%',
                objectFit: 'cover',
                boxShadow: '0 0 0 2px rgba(255,255,255,0.15), 0 4px 14px rgba(0,0,0,0.35)',
                flexShrink: 0,
              }}
            />
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: '1rem', lineHeight: 1.1, letterSpacing: '-0.01em' }}>Inflorescence</div>
              <div style={{ color: '#818cf8', fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Advance Skills</div>
            </div>
          </Link>

          {/* Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>

            {/* Sign In dropdown */}
            <div ref={loginRef} style={{ position: 'relative' }}>
              <button onClick={() => setLoginOpen(v => !v)} style={{
                display: 'flex', alignItems: 'center', gap: '0.45rem',
                padding: '0.5rem 1.1rem',
                background: 'transparent',
                border: '1.5px solid rgba(255,255,255,0.2)',
                borderRadius: '0.6rem',
                color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.background = 'rgba(124,58,237,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.background = 'transparent'; }}
              >
                Sign In
                <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: loginOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
              </button>

              {loginOpen && (
                <div style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 10px)',
                  width: 230, background: '#0f172a',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '1rem', overflow: 'hidden',
                  boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
                  animation: 'fadeDown 0.15s ease',
                }}>
                  {LOGIN_ITEMS.map((p, i) => (
                    <Link key={i} to={p.href} onClick={() => setLoginOpen(false)} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.8rem 1rem', textDecoration: 'none',
                      borderBottom: i < LOGIN_ITEMS.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                      transition: 'background 0.15s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.dot, flexShrink: 0 }} />
                        <div>
                          <div style={{ color: '#f1f5f9', fontSize: '0.83rem', fontWeight: 700 }}>{p.label}</div>
                          <div style={{ color: '#475569', fontSize: '0.68rem', fontWeight: 500 }}>{p.sub}</div>
                        </div>
                      </div>
                      <ChevronRight size={13} color="#334155" />
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link to="/apply" style={{
              padding: '0.5rem 1.2rem',
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              color: '#fff', fontWeight: 700, fontSize: '0.85rem',
              borderRadius: '0.6rem', textDecoration: 'none',
              boxShadow: '0 4px 16px rgba(124,58,237,0.4)',
              transition: 'all 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(124,58,237,0.5)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(124,58,237,0.4)'; }}
            >
              Apply Now
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────────────── */}
      <section style={{
        minHeight: '100vh', paddingTop: 68,
        background: 'linear-gradient(145deg, #050510 0%, #0e0730 45%, #130d40 70%, #080f24 100%)',
        position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'center',
      }}>
        {/* Background decorations */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {/* Gradient orbs */}
          <div style={{ position: 'absolute', top: '10%', left: '-5%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 65%)', filter: 'blur(1px)' }} />
          <div style={{ position: 'absolute', top: '30%', right: '-8%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,165,233,0.12) 0%, transparent 65%)' }} />
          <div style={{ position: 'absolute', bottom: '5%', left: '30%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 65%)' }} />
          {/* Dot grid */}
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.025,
            backgroundImage: 'radial-gradient(rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }} />
        </div>

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '5rem 1.5rem 6rem', position: 'relative', zIndex: 1, width: '100%' }}>

          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.4rem 1.1rem', borderRadius: 99,
            background: 'rgba(124,58,237,0.14)', border: '1px solid rgba(124,58,237,0.35)',
            color: '#c4b5fd', fontSize: '0.72rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.12em',
            marginBottom: '2rem',
          }}>
            <Sparkles size={11} fill="currentColor" />
            Pakistan's #1 Advance Skills Platform
          </div>

          {/* Headline */}
          <h1 style={{
            margin: '0 0 1.5rem',
            fontSize: 'clamp(2.6rem, 5.5vw, 4.2rem)',
            fontWeight: 900, color: '#fff', lineHeight: 1.12,
            letterSpacing: '-0.03em', maxWidth: 740,
          }}>
            Learn Digital Skills.{' '}
            <br />
            <span style={{
              background: 'linear-gradient(90deg, #a78bfa 0%, #38bdf8 55%, #34d399 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Build Your Future.
            </span>
          </h1>

          <p style={{
            margin: '0 0 3rem', fontSize: '1.15rem',
            color: 'rgba(255,255,255,0.5)', lineHeight: 1.8, maxWidth: 560,
          }}>
            Professional courses with live video lectures, online exams, and a complete institute management system — all in one platform built for the modern learner.
          </p>

          {/* CTA Buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '5rem' }}>
            <Link to="/apply" style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.7rem',
              padding: '0.95rem 2rem', borderRadius: '0.8rem',
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              color: '#fff', fontWeight: 800, fontSize: '1rem', textDecoration: 'none',
              boxShadow: '0 8px 32px rgba(124,58,237,0.45)',
              transition: 'all 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(124,58,237,0.55)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(124,58,237,0.45)'; }}
            >
              Start Learning Today <ArrowRight size={18} />
            </Link>
            <Link to="/student-login" style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.7rem',
              padding: '0.95rem 2rem', borderRadius: '0.8rem',
              background: 'rgba(255,255,255,0.05)',
              border: '1.5px solid rgba(255,255,255,0.15)',
              color: '#e2e8f0', fontWeight: 700, fontSize: '1rem', textDecoration: 'none',
              transition: 'all 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
            >
              <Play size={17} fill="currentColor" /> Student Login
            </Link>
          </div>

          {/* Stats */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: '0',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '1rem', overflow: 'hidden',
            maxWidth: 680,
          }}>
            {STATS.map(({ value, label, icon: Icon }, i) => (
              <div key={label} style={{
                flex: '1 1 150px', padding: '1.4rem 1.5rem',
                borderRight: i < STATS.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                display: 'flex', alignItems: 'center', gap: '0.75rem',
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: '0.6rem', flexShrink: 0,
                  background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa',
                }}>
                  <Icon size={17} />
                </div>
                <div>
                  <div style={{ color: '#fff', fontWeight: 900, fontSize: '1.3rem', lineHeight: 1, letterSpacing: '-0.02em' }}>{value}</div>
                  <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.68rem', fontWeight: 600, marginTop: '0.2rem' }}>{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COURSES ────────────────────────────────────────── */}
      {courses.length > 0 && (
        <section style={{ padding: '6rem 1.5rem', background: '#f8fafc' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>

            {/* Section header */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '3rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  color: '#7c3aed', fontSize: '0.72rem', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.6rem',
                  background: '#f3f0ff', padding: '0.3rem 0.75rem', borderRadius: 99,
                  border: '1px solid #ddd6fe',
                }}>
                  <BookOpen size={10} /> Our Programs
                </div>
                <h2 style={{ margin: '0 0 0.4rem', fontSize: '2.1rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.025em', lineHeight: 1.2 }}>
                  Professional Courses
                </h2>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>
                  Build real digital skills for today's job market
                </p>
              </div>
              <Link to="/apply" style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.65rem 1.35rem', borderRadius: '0.65rem',
                background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                color: '#fff', fontWeight: 700, fontSize: '0.85rem',
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(124,58,237,0.35)',
                transition: 'all 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(124,58,237,0.45)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(124,58,237,0.35)'; }}
              >
                View All & Enroll <ArrowRight size={15} />
              </Link>
            </div>

            {/* Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '1.5rem' }}>
              {courses.map((course, i) => {
                const [g1, g2] = COURSE_GRADIENTS[i % COURSE_GRADIENTS.length];
                return (
                  <div key={course._id} style={{
                    background: '#fff', borderRadius: '1.25rem',
                    border: '1px solid #e8edf2', overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    transition: 'all 0.28s cubic-bezier(0.34,1.56,0.64,1)',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = '0 20px 50px rgba(0,0,0,0.12)'; e.currentTarget.style.borderColor = '#d1d5db'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = '#e8edf2'; }}
                  >
                    {/* Card top */}
                    <div style={{
                      height: 130, background: `linear-gradient(135deg, ${g1}, ${g2})`,
                      position: 'relative', overflow: 'hidden',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.18) 1.5px, transparent 1.5px)', backgroundSize: '18px 18px' }} />
                      <div style={{
                        width: 60, height: 60, borderRadius: '1rem',
                        background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
                        border: '1.5px solid rgba(255,255,255,0.25)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <BookOpen size={26} color="rgba(255,255,255,0.95)" />
                      </div>
                      {course.student_count > 0 && (
                        <div style={{
                          position: 'absolute', top: 12, right: 12,
                          background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)',
                          color: '#fff', fontSize: '0.68rem', fontWeight: 700,
                          padding: '0.25rem 0.65rem', borderRadius: 99,
                          display: 'flex', alignItems: 'center', gap: '0.3rem',
                          border: '1px solid rgba(255,255,255,0.15)',
                        }}>
                          <Users size={10} /> {course.student_count} enrolled
                        </div>
                      )}
                    </div>

                    {/* Card body */}
                    <div style={{ padding: '1.35rem' }}>
                      <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.975rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.35 }}>
                        {course.name}
                      </h3>
                      <div style={{ display: 'flex', gap: '1rem', color: '#94a3b8', fontSize: '0.78rem', marginBottom: '1.25rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Clock size={12} /> {course.duration}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Star size={12} style={{ color: '#f59e0b', fill: '#f59e0b' }} /> 4.8</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ color: '#94a3b8', fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total Fee</div>
                          <div style={{ color: '#0f172a', fontWeight: 900, fontSize: '1.25rem', letterSpacing: '-0.02em' }}>
                            Rs. {course.total_fee?.toLocaleString()}
                          </div>
                        </div>
                        <Link to="/apply" style={{
                          padding: '0.5rem 1.1rem', borderRadius: '0.6rem',
                          background: `linear-gradient(135deg, ${g1}, ${g2})`,
                          color: '#fff', fontWeight: 700, fontSize: '0.78rem',
                          textDecoration: 'none', transition: 'opacity 0.2s',
                          boxShadow: `0 4px 12px ${g1}55`,
                        }}
                          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                        >
                          Enroll
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── FEATURES ───────────────────────────────────────── */}
      <section style={{ padding: '6rem 1.5rem', background: '#fff' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>

          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              color: '#7c3aed', fontSize: '0.72rem', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.75rem',
              background: '#f3f0ff', padding: '0.3rem 0.75rem', borderRadius: 99,
              border: '1px solid #ddd6fe',
            }}>
              <Globe2 size={10} /> Platform Features
            </div>
            <h2 style={{ margin: '0 0 0.75rem', fontSize: '2.1rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.025em' }}>
              Everything in One Place
            </h2>
            <p style={{ margin: '0 auto', color: '#64748b', fontSize: '1rem', maxWidth: 500, lineHeight: 1.7 }}>
              A complete digital ecosystem — from video lectures to payroll management.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
            {FEATURES.map(({ icon: Icon, title, desc, accent }) => (
              <div key={title} style={{
                padding: '1.75rem', borderRadius: '1.15rem',
                border: '1.5px solid #f1f5f9', background: '#fafafa',
                transition: 'all 0.25s',
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = accent + '44';
                  e.currentTarget.style.background = '#fff';
                  e.currentTarget.style.boxShadow = `0 10px 40px ${accent}14`;
                  e.currentTarget.style.transform = 'translateY(-3px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#f1f5f9';
                  e.currentTarget.style.background = '#fafafa';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{
                  width: 50, height: 50, borderRadius: '0.85rem',
                  background: accent + '14',
                  border: `1.5px solid ${accent}28`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: accent, marginBottom: '1.1rem',
                }}>
                  <Icon size={22} />
                </div>
                <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>{title}</h3>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem', lineHeight: 1.7 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PORTALS ────────────────────────────────────────── */}
      <section style={{
        padding: '6rem 1.5rem',
        background: 'linear-gradient(150deg, #050510 0%, #0e0730 50%, #080f24 100%)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: 550, height: 550, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.13) 0%, transparent 65%)' }} />
          <div style={{ position: 'absolute', bottom: '-10%', left: '-5%', width: 450, height: 450, borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,165,233,0.09) 0%, transparent 65%)' }} />
          <div style={{ position: 'absolute', inset: 0, opacity: 0.02, backgroundImage: 'radial-gradient(rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        </div>

        <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>

          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              color: '#a78bfa', fontSize: '0.72rem', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.75rem',
              background: 'rgba(167,139,250,0.1)', padding: '0.3rem 0.75rem', borderRadius: 99,
              border: '1px solid rgba(167,139,250,0.25)',
            }}>
              <Shield size={10} /> Choose Your Role
            </div>
            <h2 style={{ margin: '0 0 0.75rem', fontSize: '2.1rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.025em' }}>
              Your Portal Awaits
            </h2>
            <p style={{ margin: '0 auto', color: 'rgba(255,255,255,0.38)', fontSize: '1rem', maxWidth: 460, lineHeight: 1.7 }}>
              A tailored experience for every role — from students to administrators.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
            {PORTALS.map(({ title, desc, href, color, bg, Icon, items }) => (
              <Link key={href} to={href} style={{
                display: 'flex', flexDirection: 'column', textDecoration: 'none',
                padding: '1.75rem', borderRadius: '1.25rem',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                transition: 'all 0.28s',
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.borderColor = color + '55';
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = `0 20px 50px ${color}22`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Icon */}
                <div style={{
                  width: 50, height: 50, borderRadius: '0.9rem', marginBottom: '1.25rem',
                  background: `linear-gradient(135deg, ${color}dd, ${color}99)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 6px 20px ${color}44`,
                }}>
                  <Icon size={22} color="#fff" />
                </div>

                <h3 style={{ margin: '0 0 0.4rem', fontSize: '1rem', fontWeight: 800, color: '#f1f5f9' }}>{title}</h3>
                <p style={{ margin: '0 0 1.5rem', fontSize: '0.82rem', color: 'rgba(255,255,255,0.38)', lineHeight: 1.6 }}>{desc}</p>

                <ul style={{ margin: '0 0 1.75rem', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {items.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)' }}>
                      <CheckCircle size={12} color={color} style={{ flexShrink: 0 }} />
                      {f}
                    </li>
                  ))}
                </ul>

                <div style={{
                  marginTop: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  color: color, fontSize: '0.82rem', fontWeight: 700,
                }}>
                  Sign In <ArrowRight size={13} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────── */}
      <section style={{ padding: '6rem 1.5rem', background: '#f8fafc', position: 'relative', overflow: 'hidden' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{
            borderRadius: '2rem', overflow: 'hidden', position: 'relative',
            background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 45%, #0ea5e9 100%)',
            padding: '4rem 3rem', textAlign: 'center',
            boxShadow: '0 24px 80px rgba(124,58,237,0.3)',
          }}>
            {/* Pattern */}
            <div style={{ position: 'absolute', inset: 0, opacity: 0.08, backgroundImage: 'radial-gradient(rgba(255,255,255,1) 1.5px, transparent 1.5px)', backgroundSize: '26px 26px' }} />
            {/* Glow blobs */}
            <div style={{ position: 'absolute', top: '-40%', right: '-10%', width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 65%)' }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                color: 'rgba(255,255,255,0.75)', fontSize: '0.72rem', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '1.25rem',
                background: 'rgba(255,255,255,0.15)', padding: '0.3rem 0.85rem', borderRadius: 99,
                border: '1px solid rgba(255,255,255,0.2)',
              }}>
                <GraduationCap size={10} /> Admissions Open
              </div>
              <h2 style={{ margin: '0 0 1rem', fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', fontWeight: 900, color: '#fff', letterSpacing: '-0.025em', lineHeight: 1.2 }}>
                Ready to Start Your Journey?
              </h2>
              <p style={{ margin: '0 auto 2.25rem', color: 'rgba(255,255,255,0.7)', fontSize: '1.05rem', lineHeight: 1.7, maxWidth: 500 }}>
                Join hundreds of students building real digital skills at Inflorescence Advance Skills.
              </p>
              <Link to="/apply" style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.7rem',
                padding: '0.95rem 2.25rem', borderRadius: '0.8rem',
                background: '#fff', color: '#4f46e5',
                fontWeight: 800, fontSize: '1rem', textDecoration: 'none',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                transition: 'all 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,0,0.25)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.2)'; }}
              >
                Apply for Admission <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────── */}
      <footer style={{ background: '#fff', borderTop: '1px solid #e8edf2', padding: '3rem 1.5rem' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '2rem', marginBottom: '2.5rem' }}>

            {/* Brand */}
            <div style={{ maxWidth: 290 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.9rem' }}>
                <img
                  src={logo}
                  alt="Inflorescence Advance Skills"
                  style={{
                    width: 52, height: 52, borderRadius: '50%',
                    objectFit: 'cover', flexShrink: 0,
                    border: '2px solid #e8edf2',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  }}
                />
                <div>
                  <div style={{ color: '#0f172a', fontWeight: 800, fontSize: '0.95rem', lineHeight: 1.2 }}>Inflorescence Advance Skills</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.04em' }}>Institute of Advance Skills</div>
                </div>
              </div>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.82rem', lineHeight: 1.65 }}>
                Pakistan's modern advanced skills platform — quality education and institute management in one place.
              </p>
            </div>

            {/* Links */}
            <div style={{ display: 'flex', gap: '3.5rem', flexWrap: 'wrap' }}>
              <div>
                <div style={{ color: '#94a3b8', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.9rem' }}>Portals</div>
                {[
                  { label: 'Student Login', href: '/student-login' },
                  { label: 'Teacher Login', href: '/teacher-login' },
                  { label: 'Admin Login',   href: '/login' },
                  { label: 'Client Login',  href: '/client-login' },
                ].map(l => (
                  <div key={l.href} style={{ marginBottom: '0.5rem' }}>
                    <Link to={l.href} style={{ color: '#475569', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none', transition: 'color 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#7c3aed'}
                      onMouseLeave={e => e.currentTarget.style.color = '#475569'}
                    >{l.label}</Link>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ color: '#94a3b8', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.9rem' }}>Quick Links</div>
                {[
                  { label: 'Apply Now',    href: '/apply' },
                  { label: 'Online Form',  href: '/apply' },
                ].map(l => (
                  <div key={l.label} style={{ marginBottom: '0.5rem' }}>
                    <Link to={l.href} style={{ color: '#475569', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none', transition: 'color 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#7c3aed'}
                      onMouseLeave={e => e.currentTarget.style.color = '#475569'}
                    >{l.label}</Link>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.78rem', fontWeight: 600 }}>
              © 2025 Inflorescence Advance Skills. All rights reserved.
            </p>
            <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.72rem', fontWeight: 500 }}>
              Built with care for Pakistan's learners.
            </p>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
