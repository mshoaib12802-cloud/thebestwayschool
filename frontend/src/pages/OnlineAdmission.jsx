import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-toastify';
import {
  CheckCircle2, User, Phone, BookOpen, Mail,
  Users, ArrowLeft, MapPin, Calendar, GraduationCap,
  School, Sparkles, ArrowRight,
} from 'lucide-react';
import logo from '../assets/logo2.jpeg';

const CLASSES = [
  'Nursery', 'KG (Kindergarten)',
  'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5',
  'Class 6', 'Class 7', 'Class 8',
  'Class 9', 'Class 10 (Matric)',
  'Class 11 (FSc / FA / ICS)', 'Class 12 (FSc / FA / ICS)',
];

const SOURCES = [
  'Social Media (Facebook/Instagram)',
  'Friend or Family Referral',
  'Banner / Advertisement',
  'Walk-in Visit',
  'Newspaper',
  'Other',
];

const OnlineAdmission = () => {
  const [form, setForm] = useState({
    name: '', father_name: '', dob: '', class_applying: '',
    previous_school: '', phone: '', email: '', address: '', source: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name:         form.name,
        father_name:  form.father_name,
        phone:        form.phone,
        email:        form.email,
        source:       form.source || 'Online Form',
        interest:     `${form.class_applying}${form.dob ? ` | DOB: ${form.dob}` : ''}${form.previous_school ? ` | Prev: ${form.previous_school}` : ''}${form.address ? ` | Address: ${form.address}` : ''}`,
      };
      await api.post('/visitors/add', payload);
      setSubmitted(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally { setLoading(false); }
  };

  /* ── Success Screen ── */
  if (submitted) return (
    <div style={ROOT_STYLE}>
      <Bg />
      <div style={{ width: '100%', maxWidth: 500, position: 'relative', zIndex: 1 }}>
        <div style={{ background: '#fff', borderRadius: '2rem', overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.35)', textAlign: 'center' }}>
          <div style={{ height: 5, background: 'linear-gradient(90deg, #0a1628, #1e3a8a, #f59e0b, #d97706)' }} />
          <div style={{ padding: '3rem 2.5rem' }}>
            <div style={{ width: 90, height: 90, borderRadius: '50%', background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: '0 8px 32px rgba(5,150,105,0.25)' }}>
              <CheckCircle2 size={46} color="#059669" />
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#ecfdf5', color: '#059669', fontSize: '0.7rem', fontWeight: 700, padding: '0.3rem 0.85rem', borderRadius: 99, border: '1px solid #a7f3d0', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              <CheckCircle2 size={10} /> Application Received
            </div>
            <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.7rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Welcome to The Best Way!
            </h2>
            <p style={{ margin: '0 0 0.5rem', color: '#475569', lineHeight: 1.7, fontSize: '0.95rem' }}>
              Thank you, <strong style={{ color: '#0a1628' }}>{form.name}</strong>! Your admission application for <strong style={{ color: '#1d4ed8' }}>{form.class_applying}</strong> has been submitted successfully.
            </p>
            <p style={{ margin: '0 0 2rem', color: '#64748b', fontSize: '0.875rem', lineHeight: 1.7 }}>
              Our admissions team will review your application and contact you on <strong>{form.phone}</strong> and send login credentials to <strong>{form.email}</strong> within <strong>24–48 hours</strong>.
            </p>

            <div style={{ background: '#f8fafc', borderRadius: '1rem', padding: '1.25rem', marginBottom: '2rem', border: '1px solid #e8edf2', textAlign: 'left' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>Application Summary</div>
              {[
                { label: 'Student Name',  val: form.name },
                { label: 'Father Name',   val: form.father_name },
                { label: 'Class Applied', val: form.class_applying },
                { label: 'Phone',         val: form.phone },
              ].map(({ label, val }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.83rem' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>{label}</span>
                  <span style={{ color: '#0f172a', fontWeight: 700 }}>{val}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                onClick={() => { setSubmitted(false); setForm({ name:'',father_name:'',dob:'',class_applying:'',previous_school:'',phone:'',email:'',address:'',source:'' }); }}
                style={{ padding: '0.9rem', borderRadius: '0.9rem', background: 'linear-gradient(135deg, #0a1628, #1e3a8a)', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '0.95rem' }}>
                Submit Another Application
              </button>
              <Link to="/student-login" style={{ padding: '0.9rem', borderRadius: '0.9rem', background: '#f1f5f9', color: '#334155', fontWeight: 700, textDecoration: 'none', fontSize: '0.95rem', display: 'block', textAlign: 'center' }}>
                Already have login? Sign In →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  /* ── Main Form ── */
  return (
    <div style={ROOT_STYLE}>
      <Bg />
      <div style={{ width: '100%', maxWidth: 680, position: 'relative', zIndex: 1 }}>

        {/* ── School Header ── */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src={logo} alt="The Best Way Public School"
            style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(245,158,11,0.5)', boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 6px rgba(245,158,11,0.1)', marginBottom: '1rem' }} />
          <h1 style={{ margin: '0 0 0.3rem', fontSize: '1.65rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>
            The Best Way Public School
          </h1>
          <p style={{ margin: '0 0 0.5rem', color: 'rgba(251,191,36,0.8)', fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Multan Ada Bili Wala
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'rgba(255,255,255,0.45)', fontSize: '0.72rem', fontWeight: 600, fontStyle: 'italic' }}>
            <Sparkles size={11} color="#fbbf24" fill="#fbbf24" />
            "Learn, Grow &amp; Succeed"
            <Sparkles size={11} color="#fbbf24" fill="#fbbf24" />
          </div>
        </div>

        {/* ── Card ── */}
        <div style={{ background: '#fff', borderRadius: '1.75rem', boxShadow: '0 32px 80px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
          {/* Top stripe */}
          <div style={{ height: 5, background: 'linear-gradient(90deg, #0a1628 0%, #1e3a8a 35%, #f59e0b 65%, #d97706 100%)' }} />

          <div style={{ padding: '2.25rem' }}>
            {/* Card header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ width: 52, height: 52, borderRadius: '1rem', background: 'linear-gradient(135deg, #0a1628, #1e3a8a)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 16px rgba(10,22,40,0.3)' }}>
                <GraduationCap size={24} color="#fbbf24" />
              </div>
              <div>
                <h2 style={{ margin: '0 0 0.2rem', fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
                  Admission Application Form
                </h2>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.83rem' }}>
                  Fill in the details below — our team will reach you within 24–48 hours.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* Section: Student Info */}
              <SectionLabel icon={<User size={13} />} text="Student Information" />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Field label="Student's Full Name *" icon={<User size={15} />} placeholder="e.g. Ali Hassan"
                  value={form.name} onChange={set('name')} required />
                <Field label="Father's Name *" icon={<Users size={15} />} placeholder="e.g. Usman Hassan"
                  value={form.father_name} onChange={set('father_name')} required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Field label="Date of Birth" icon={<Calendar size={15} />} type="date"
                  value={form.dob} onChange={set('dob')} />
                <SelectField label="Class Applying For *" icon={<GraduationCap size={15} />}
                  value={form.class_applying} onChange={set('class_applying')} required>
                  <option value="">— Select Class —</option>
                  {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </SelectField>
              </div>

              <Field label="Previous School (if any)" icon={<School size={15} />} placeholder="e.g. ABC Public School, Multan"
                value={form.previous_school} onChange={set('previous_school')} />

              {/* Section: Contact */}
              <SectionLabel icon={<Phone size={13} />} text="Contact Details" />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Field label="Phone / WhatsApp *" icon={<Phone size={15} />} placeholder="0300-0000000"
                  value={form.phone} onChange={set('phone')} required />
                <Field label="Email (Gmail) *" type="email" icon={<Mail size={15} />} placeholder="yourname@gmail.com"
                  value={form.email} onChange={set('email')} required
                  hint="Login credentials will be sent here after approval." />
              </div>

              <Field label="Home Address / Area" icon={<MapPin size={15} />} placeholder="e.g. Street 5, Bilal Colony, Multan"
                value={form.address} onChange={set('address')} />

              {/* Section: Source */}
              <SectionLabel icon={<Sparkles size={13} />} text="How Did You Hear About Us?" />

              <SelectField label="Source" icon={<BookOpen size={15} />}
                value={form.source} onChange={set('source')}>
                <option value="">— Select Source —</option>
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </SelectField>

              {/* Notice box */}
              <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '0.875rem', padding: '1rem 1.25rem', display: 'flex', gap: '0.75rem' }}>
                <CheckCircle2 size={18} color="#2563eb" style={{ flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontSize: '0.82rem', color: '#1e40af', lineHeight: 1.65 }}>
                  <strong>Important:</strong> Please ensure your email and phone number are correct. Our admissions team will verify your application and contact you with further details and admission fee information.
                </div>
              </div>

              {/* Submit */}
              <button type="submit" disabled={loading} style={{
                marginTop: '0.25rem', padding: '1.1rem',
                borderRadius: '0.9rem',
                background: loading ? '#94a3b8' : 'linear-gradient(135deg, #0a1628 0%, #1e3a8a 50%, #1d4ed8 100%)',
                color: '#fff', fontWeight: 800, fontSize: '1rem', border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                boxShadow: loading ? 'none' : '0 8px 28px rgba(10,22,40,0.4)',
                transition: 'all 0.2s',
                position: 'relative', overflow: 'hidden',
              }}
                onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 14px 36px rgba(10,22,40,0.5)'; } }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = loading ? 'none' : '0 8px 28px rgba(10,22,40,0.4)'; }}
              >
                {/* Gold shimmer stripe */}
                {!loading && <div style={{ position: 'absolute', top: 0, bottom: 0, width: '35%', background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.18), transparent)', animation: 'btnShimmer 2.5s linear infinite', pointerEvents: 'none' }} />}
                {loading
                  ? <><Spinner /> Processing Application...</>
                  : <><GraduationCap size={19} /> Submit Admission Application <ArrowRight size={17} /></>
                }
              </button>
            </form>

            <p style={{ margin: '1.25rem 0 0', textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8' }}>
              Already have login credentials?{' '}
              <Link to="/student-login" style={{ color: '#1d4ed8', fontWeight: 700, textDecoration: 'none' }}>
                Sign in to Student Portal →
              </Link>
            </p>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <Link to="/" style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', transition: 'color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}
          >
            <ArrowLeft size={13} /> Back to Home
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes btnShimmer {
          0%   { left: -40%; }
          100% { left: 120%; }
        }
      `}</style>
    </div>
  );
};

/* ── Helpers ────────────────────────────────────────────── */
const ROOT_STYLE = {
  minHeight: '100vh',
  background: 'linear-gradient(150deg, #020818 0%, #0a1628 35%, #0d1f4a 65%, #08122e 100%)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '2rem 1.25rem',
  fontFamily: "'Inter', sans-serif",
};

const Bg = () => (
  <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, transparent, #f59e0b, #d97706, transparent)' }} />
    <div style={{ position: 'absolute', top: -120, left: -120, width: 550, height: 550, borderRadius: '50%', background: 'radial-gradient(circle, rgba(30,64,175,0.2) 0%, transparent 65%)' }} />
    <div style={{ position: 'absolute', bottom: -100, right: -100, width: 450, height: 450, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.1) 0%, transparent 65%)' }} />
    <div style={{ position: 'absolute', inset: 0, opacity: 0.025, backgroundImage: 'radial-gradient(rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
  </div>
);

const SectionLabel = ({ icon, text }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e3a8a', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', paddingBottom: '0.25rem', borderBottom: '2px solid #dbeafe' }}>
    {icon} {text}
  </div>
);

const Spinner = () => (
  <span style={{ width: 18, height: 18, border: '2.5px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block', flexShrink: 0 }} />
);

const Field = ({ label, hint, icon, ...props }) => {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: '0.45rem' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        {icon && (
          <div style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: focused ? '#1d4ed8' : '#94a3b8', transition: 'color 0.2s', pointerEvents: 'none' }}>
            {icon}
          </div>
        )}
        <input {...props}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: `0.8rem ${icon ? '2.5rem' : '1rem'} 0.8rem ${icon ? '2.5rem' : '1rem'}`,
            fontSize: '0.9rem', fontWeight: 500, color: '#0f172a',
            background: focused ? '#eff6ff' : '#f8fafc',
            border: `2px solid ${focused ? '#1d4ed8' : '#e2e8f0'}`,
            borderRadius: '0.8rem', outline: 'none', transition: 'all 0.2s',
          }}
        />
      </div>
      {hint && <p style={{ margin: '0.3rem 0 0', fontSize: '0.7rem', color: '#64748b' }}>{hint}</p>}
    </div>
  );
};

const SelectField = ({ label, icon, children, ...props }) => {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: '0.45rem' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        {icon && (
          <div style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: focused ? '#1d4ed8' : '#94a3b8', transition: 'color 0.2s', pointerEvents: 'none', zIndex: 1 }}>
            {icon}
          </div>
        )}
        <select {...props}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: `0.8rem ${icon ? '2.5rem' : '1rem'} 0.8rem ${icon ? '2.5rem' : '1rem'}`,
            fontSize: '0.9rem', fontWeight: 500, color: props.value ? '#0f172a' : '#94a3b8',
            background: focused ? '#eff6ff' : '#f8fafc',
            border: `2px solid ${focused ? '#1d4ed8' : '#e2e8f0'}`,
            borderRadius: '0.8rem', outline: 'none', transition: 'all 0.2s',
            appearance: 'none', cursor: 'pointer',
          }}
        >
          {children}
        </select>
        <div style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94a3b8' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </div>
    </div>
  );
};

export default OnlineAdmission;
