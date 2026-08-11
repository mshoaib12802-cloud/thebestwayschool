import { useEffect, useState } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { generateCertificate } from '../../utils/generateCertificate';
import {
  User, Phone, Mail, BookOpen, Calendar, CreditCard,
  Award, CheckCircle, AlertTriangle, TrendingUp,
  Users, Clock, Star, Download, Layers, MapPin, Heart,
} from 'lucide-react';

const API_BASE = '';

const SHIFT_COLORS = {
  Morning:   { bg: '#fef3c7', color: '#92400e' },
  Afternoon: { bg: '#dbeafe', color: '#1e40af' },
  Evening:   { bg: '#ede9fe', color: '#4c1d95' },
  Weekend:   { bg: '#dcfce7', color: '#14532d' },
};

const StatCard = ({ icon, label, value, color }) => (
  <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
    </div>
  </div>
);

const StudentProfile = () => {
  const [profile, setProfile] = useState(null);
  const [fees, setFees] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/student-portal/profile'),
      api.get('/student-portal/fees'),
      api.get('/student-portal/attendance'),
      api.get('/student-portal/results'),
    ]).then(([p, f, a, r]) => {
      setProfile(p.data);
      setFees(f.data);
      setAttendance(a.data);
      setResults(r.data);
    }).catch(err => {
      setError(err.response?.data?.message || 'Failed to load profile');
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="text-center text-rose-500 mt-20 bg-rose-50 rounded-2xl p-8">
      <AlertTriangle size={32} className="mx-auto mb-2"/>
      <p className="font-semibold">{error}</p>
    </div>
  );

  if (!profile) return null;

  const course = profile.courses?.[0] || {};
  const admissionDate = profile.admission_date
    ? new Date(profile.admission_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';
  const balanceDue = fees ? fees.summary.balance : 0;
  const attendancePct = attendance ? attendance.summary.percent : 0;
  const passedExams = results.filter(r => r.grade !== 'F').length;
  const initials = profile.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
      {/* Hero Card */}
      <div className="relative overflow-hidden rounded-3xl shadow-lg"
        style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 50%, #6366f1 100%)' }}>
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, white, transparent)', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, white, transparent)', transform: 'translate(-30%, 30%)' }} />

        <div className="relative p-8 flex flex-col sm:flex-row items-center gap-6">
          <div className="w-24 h-28 rounded-2xl bg-white/20 backdrop-blur-sm border-2 border-white/30 overflow-hidden flex items-center justify-center text-3xl font-bold text-white shadow-xl flex-shrink-0">
            {profile.photo
              ? <img src={`${API_BASE}/uploads/students/${profile.photo}`} alt={profile.full_name} className="w-full h-full object-cover"/>
              : initials}
          </div>

          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              {profile.isActive === false && (
                <span className="bg-amber-400 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Star size={10}/> Alumni
                </span>
              )}
              {profile.school_class_id?.name && (
                <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
                  {profile.school_class_id.name}{profile.section ? ` — ${profile.section}` : ''}
                </span>
              )}
              {profile.subject_group && profile.subject_group !== 'None' && (
                <span className="bg-amber-400/30 text-amber-100 text-xs px-2 py-0.5 rounded-full font-semibold">
                  {profile.subject_group}
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold text-white mb-1">{profile.full_name}</h1>
            <p className="text-indigo-200 text-sm font-mono font-semibold">{profile.roll_number}</p>
          </div>

          {profile.isActive === false && (
            <button
              onClick={() => { generateCertificate(profile); toast.success('Certificate downloaded!'); }}
              className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-amber-900 font-bold px-4 py-2 rounded-xl transition-colors text-sm shadow-md"
            >
              <Download size={16}/> Download Certificate
            </button>
          )}

          <div className="flex gap-6 text-center">
            <div>
              <p className="text-3xl font-bold text-white">{attendancePct}%</p>
              <p className="text-indigo-300 text-xs mt-0.5">Attendance</p>
            </div>
            <div className="w-px bg-white/20" />
            <div>
              <p className="text-3xl font-bold text-white">{passedExams}</p>
              <p className="text-indigo-300 text-xs mt-0.5">Exams Passed</p>
            </div>
            <div className="w-px bg-white/20" />
            <div>
              <p className={`text-3xl font-bold ${balanceDue > 0 ? 'text-rose-300' : 'text-emerald-300'}`}>
                {balanceDue > 0 ? `Rs.${balanceDue.toLocaleString()}` : 'Clear'}
              </p>
              <p className="text-indigo-300 text-xs mt-0.5">Fee Balance</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<TrendingUp size={22} className="text-indigo-600"/>} label="Attendance" value={`${attendancePct}%`} color="bg-indigo-50"/>
        <StatCard icon={<Award size={22} className="text-amber-600"/>} label="Exams Passed" value={passedExams} color="bg-amber-50"/>
        <StatCard icon={<CreditCard size={22} className="text-emerald-600"/>} label="Total Paid" value={fees ? `Rs.${fees.summary.paid.toLocaleString()}` : '—'} color="bg-emerald-50"/>
        <StatCard icon={<AlertTriangle size={22} className="text-rose-500"/>} label="Balance Due" value={balanceDue > 0 ? `Rs.${balanceDue.toLocaleString()}` : 'Nil'} color="bg-rose-50"/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <User size={18} className="text-indigo-500"/> Personal Information
          </h2>
          <div className="space-y-1">
            {[
              { label: 'Full Name', value: profile.full_name, icon: <User size={15}/> },
              { label: 'Date of Birth', value: profile.dob ? new Date(profile.dob).toLocaleDateString('en-PK', { day:'numeric', month:'long', year:'numeric'}) : '—', icon: <Calendar size={15}/> },
              { label: 'Blood Group', value: profile.blood_group || '—', icon: <Heart size={15}/> },
              { label: 'Father\'s Name', value: profile.father_name || '—', icon: <Users size={15}/> },
              { label: 'Father\'s Phone', value: profile.father_phone || profile.phone || '—', icon: <Phone size={15}/> },
              { label: 'Mother\'s Name', value: profile.mother_name || '—', icon: <Users size={15}/> },
              { label: 'Email', value: profile.email || '—', icon: <Mail size={15}/> },
              { label: 'Address', value: [profile.address, profile.city].filter(Boolean).join(', ') || '—', icon: <MapPin size={15}/> },
              { label: 'Admission Date', value: admissionDate, icon: <Calendar size={15}/> },
            ].map(({ label, value, icon }) => (
              <div key={label} className="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-0">
                <div className="mt-0.5 text-slate-400">{icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-400 font-medium">{label}</p>
                  <p className="text-sm font-semibold text-slate-700 truncate">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Course + Attendance */}
        <div className="space-y-4">
          {profile.courses?.map((c, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <BookOpen size={18} className="text-indigo-500"/> {c.course_name}
              </h2>
              <div className="space-y-1">
                {[
                  { label: 'Duration', value: c.duration || '—', icon: <Clock size={15}/> },
                  { label: 'Total Fee', value: `Rs.${(c.total_fee || 0).toLocaleString()}`, icon: <CreditCard size={15}/> },
                  { label: 'Discount', value: c.discount_amount ? `Rs.${c.discount_amount.toLocaleString()}` : 'None', icon: <Star size={15}/> },
                  { label: 'Net Payable', value: `Rs.${((c.total_fee || 0) - (c.discount_amount || 0)).toLocaleString()}`, icon: <CreditCard size={15}/> },
                  { label: 'Trainer', value: c.trainer_id?.name || '—', icon: <User size={15}/> },
                ].map(({ label, value, icon }) => (
                  <div key={label} className="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-0">
                    <div className="mt-0.5 text-slate-400">{icon}</div>
                    <div className="flex-1">
                      <p className="text-xs text-slate-400 font-medium">{label}</p>
                      <p className="text-sm font-semibold text-slate-700">{value}</p>
                    </div>
                  </div>
                ))}
                {/* Batch Info */}
                <div className="flex items-start gap-3 py-2.5">
                  <div className="mt-0.5 text-slate-400"><Layers size={15}/></div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-400 font-medium">Batch</p>
                    {c.batch_id ? (() => {
                      const b = c.batch_id;
                      const bsc = SHIFT_COLORS[b.shift] || SHIFT_COLORS.Morning;
                      return (
                        <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderRadius: '0.75rem', padding: '0.625rem 0.875rem', marginTop: '0.35rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <div>
                            <p style={{ margin: 0, fontWeight: 800, fontSize: '0.875rem', color: '#fff' }}>{b.name}</p>
                            {(b.start_date || b.end_date) && (
                              <p style={{ margin: '0.15rem 0 0', fontSize: '0.7rem', color: '#94a3b8' }}>
                                {b.start_date ? new Date(b.start_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '?'}
                                {' → '}
                                {b.end_date ? new Date(b.end_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Ongoing'}
                              </p>
                            )}
                          </div>
                          {b.shift && (
                            <span style={{ background: bsc.bg, color: bsc.color, padding: '2px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, flexShrink: 0 }}>
                              {b.shift}
                            </span>
                          )}
                        </div>
                      );
                    })() : (
                      <p className="text-sm font-semibold text-slate-400">Not assigned to any batch</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {attendance && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h2 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <CheckCircle size={18} className="text-emerald-500"/> This Month's Attendance
              </h2>
              <div className="flex gap-4 text-center mb-4">
                {[
                  { label: 'Present', value: attendance.summary.present, color: 'text-emerald-600' },
                  { label: 'Leave', value: attendance.summary.leave, color: 'text-amber-500' },
                  { label: 'Absent', value: attendance.summary.absent, color: 'text-rose-500' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex-1 bg-slate-50 rounded-xl py-3">
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Attendance Rate</span>
                <span className="font-bold">{attendance.summary.percent}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full"
                  style={{ width: `${attendance.summary.percent}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Exam Results */}
      {results.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Award size={18} className="text-amber-500"/> Exam Results
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-slate-100">
                  <th className="text-left py-2 pr-4 font-medium">Exam</th>
                  <th className="text-left py-2 pr-4 font-medium">Course</th>
                  <th className="text-center py-2 pr-4 font-medium">Marks</th>
                  <th className="text-center py-2 font-medium">Grade</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => {
                  const gradeColors = { 'A+': 'bg-emerald-100 text-emerald-700', 'A': 'bg-green-100 text-green-700', 'B': 'bg-blue-100 text-blue-700', 'C': 'bg-amber-100 text-amber-700', 'D': 'bg-orange-100 text-orange-700', 'F': 'bg-rose-100 text-rose-700' };
                  return (
                    <tr key={i} className="border-b border-slate-50 last:border-0">
                      <td className="py-3 pr-4 font-medium text-slate-700">{r.exam_id?.title || '—'}</td>
                      <td className="py-3 pr-4 text-slate-500">{r.exam_id?.course_name || '—'}</td>
                      <td className="py-3 pr-4 text-center text-slate-600">{r.marks_obtained}/{r.exam_id?.total_marks || '—'}</td>
                      <td className="py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${gradeColors[r.grade] || 'bg-slate-100 text-slate-600'}`}>
                          {r.grade}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentProfile;
