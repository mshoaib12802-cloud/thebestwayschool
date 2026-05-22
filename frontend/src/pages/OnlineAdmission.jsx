import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-toastify';
import { School, CheckCircle2, User, Phone, BookOpen, Mail, Users, ArrowLeft } from 'lucide-react';

const OnlineAdmission = () => {
  const [form, setForm] = useState({
    name: '', father_name: '', phone: '', email: '', interest: '', source: 'Online Form'
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/visitors/add', form);
      setSubmitted(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally { setLoading(false); }
  };

  if (submitted) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #09091a 0%, #0f0a30 50%, #0a1428 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ background: '#fff', borderRadius: '1.75rem', padding: '3rem 2.5rem', maxWidth: 460, width: '100%', textAlign: 'center', boxShadow: '0 24px 80px rgba(0,0,0,0.3)' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
          <CheckCircle2 size={40} color="#059669" />
        </div>
        <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.6rem', fontWeight: 900, color: '#0f172a' }}>Application Submitted!</h2>
        <p style={{ margin: '0 0 0.5rem', color: '#475569', lineHeight: 1.65, fontSize: '0.95rem' }}>
          Thank you, <strong>{form.name}</strong>! Your admission application has been received.
        </p>
        <p style={{ margin: '0 0 2rem', color: '#64748b', fontSize: '0.875rem', lineHeight: 1.65 }}>
          Our admissions team will review your application and send your login credentials to <strong>{form.email}</strong> within 24–48 hours after approval.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button onClick={() => { setSubmitted(false); setForm({ name: '', father_name: '', phone: '', email: '', interest: '', source: 'Online Form' }); }}
            style={{ padding: '0.875rem', borderRadius: '0.875rem', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '0.95rem' }}>
            Submit Another Application
          </button>
          <Link to="/student-login" style={{ padding: '0.875rem', borderRadius: '0.875rem', background: '#f1f5f9', color: '#334155', fontWeight: 700, textDecoration: 'none', fontSize: '0.95rem', display: 'block', textAlign: 'center' }}>
            Already have credentials? Login
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #09091a 0%, #0f0a30 50%, #0a1428 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', fontFamily: "'Inter', sans-serif" }}>

      {/* Decorative orbs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -100, left: -100, width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: -80, right: -80, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,165,233,0.15) 0%, transparent 70%)' }} />
      </div>

      <div style={{ width: '100%', maxWidth: 560, position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 60, height: 60, borderRadius: '1.1rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', marginBottom: '1rem', backdropFilter: 'blur(10px)' }}>
            <School size={28} color="#fff" />
          </div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>Inflorescence Advance Skills</h1>
          <p style={{ margin: '0.35rem 0 0', color: '#a78bfa', fontSize: '0.875rem', fontWeight: 600 }}>Online Admission Application</p>
        </div>

        {/* Card */}
        <div style={{ background: '#fff', borderRadius: '1.5rem', boxShadow: '0 24px 80px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
          {/* Top accent */}
          <div style={{ height: 4, background: 'linear-gradient(90deg, #7c3aed, #4f46e5, #0ea5e9)' }} />

          <div style={{ padding: '2rem' }}>
            <h2 style={{ margin: '0 0 0.35rem', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Apply for Admission</h2>
            <p style={{ margin: '0 0 1.75rem', color: '#64748b', fontSize: '0.875rem' }}>Fill in your details and we'll process your application within 24–48 hours.</p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

              {/* Row: Name + Father Name */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Field label="Full Name *" icon={<User size={15} />} placeholder="e.g. Ali Hassan"
                  value={form.name} onChange={set('name')} required />
                <Field label="Father's Name *" icon={<Users size={15} />} placeholder="e.g. Usman Hassan"
                  value={form.father_name} onChange={set('father_name')} required />
              </div>

              {/* Phone */}
              <Field label="Phone Number *" icon={<Phone size={15} />} placeholder="0300-0000000"
                value={form.phone} onChange={set('phone')} required />

              {/* Email */}
              <Field label="Gmail Address *" type="email" icon={<Mail size={15} />} placeholder="yourname@gmail.com"
                value={form.email} onChange={set('email')} required
                hint="Your login credentials will be sent to this Gmail after approval." />

              {/* Course Interest */}
              <Field label="Course Interested In *" icon={<BookOpen size={15} />} placeholder="e.g. Web Development, Graphic Design, AI"
                value={form.interest} onChange={set('interest')} required />

              <button type="submit" disabled={loading} style={{
                marginTop: '0.5rem', padding: '1rem', borderRadius: '0.875rem',
                background: loading ? '#94a3b8' : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                color: '#fff', fontWeight: 800, fontSize: '1rem', border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                boxShadow: loading ? 'none' : '0 8px 24px rgba(124,58,237,0.4)',
                transition: 'all 0.2s',
              }}>
                {loading
                  ? <><span style={{ width: 18, height: 18, border: '2.5px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Submitting...</>
                  : <><CheckCircle2 size={18} /> Submit Application</>
                }
              </button>
            </form>

            <p style={{ margin: '1.25rem 0 0', textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8' }}>
              Already have credentials?{' '}
              <Link to="/student-login" style={{ color: '#7c3aed', fontWeight: 700, textDecoration: 'none' }}>Login to Student Portal</Link>
            </p>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
          <Link to="/" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <ArrowLeft size={13} /> Back to Home
          </Link>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

const Field = ({ label, hint, icon, ...props }) => {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: '0.5rem' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        {icon && <div style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: focused ? '#7c3aed' : '#94a3b8', transition: 'color 0.2s' }}>{icon}</div>}
        <input
          {...props}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: `0.8rem ${icon ? '2.5rem' : '1rem'} 0.8rem ${icon ? '2.5rem' : '1rem'}`,
            fontSize: '0.9rem', fontWeight: 500, color: '#0f172a',
            background: focused ? '#f5f3ff' : '#f8fafc',
            border: `2px solid ${focused ? '#7c3aed' : '#e2e8f0'}`,
            borderRadius: '0.75rem', outline: 'none',
            transition: 'all 0.2s',
          }}
        />
      </div>
      {hint && <p style={{ margin: '0.3rem 0 0', fontSize: '0.72rem', color: '#64748b' }}>{hint}</p>}
    </div>
  );
};

export default OnlineAdmission;
