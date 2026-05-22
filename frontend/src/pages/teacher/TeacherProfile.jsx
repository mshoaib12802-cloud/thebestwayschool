import { useEffect, useState } from 'react';
import api from '../../services/api';
import {
  User, Phone, Mail, BookOpen, Calendar, Award,
  Users, GraduationCap, CheckCircle, Layers,
  TrendingUp, BarChart2, AlertTriangle, Banknote
} from 'lucide-react';

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

const TeacherProfile = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/teacher-portal/profile')
      .then(r => setData(r.data))
      .catch(err => setError(err.response?.data?.message || 'Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="text-center text-rose-500 mt-20 bg-rose-50 rounded-2xl p-8">
      <AlertTriangle size={32} className="mx-auto mb-2"/>
      <p className="font-semibold">{error}</p>
    </div>
  );

  if (!data) return null;

  const { teacher, stats, assignedCourses } = data;
  const initials = teacher.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const joinedDate = teacher.createdAt
    ? new Date(teacher.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';
  const modulesPct = stats.modulesTotal > 0
    ? Math.round((stats.modulesCompleted / stats.modulesTotal) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Hero Card */}
      <div className="relative overflow-hidden rounded-3xl shadow-lg"
        style={{ background: 'linear-gradient(135deg, #064e3b 0%, #059669 50%, #10b981 100%)' }}>
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, white, transparent)', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, white, transparent)', transform: 'translate(-30%, 30%)' }} />

        <div className="relative p-8 flex flex-col sm:flex-row items-center gap-6">
          <div className="w-24 h-24 rounded-2xl bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center text-3xl font-bold text-white shadow-xl">
            {initials}
          </div>

          <div className="flex-1 text-center sm:text-left">
            <span className="inline-block bg-white/20 text-white text-xs px-3 py-0.5 rounded-full mb-2 capitalize">
              {teacher.role}
            </span>
            <h1 className="text-3xl font-bold text-white mb-1">{teacher.name}</h1>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-emerald-200 text-sm">
              {teacher.email && (
                <span className="flex items-center gap-1"><Mail size={13}/> {teacher.email}</span>
              )}
              {teacher.phone && (
                <span className="flex items-center gap-1"><Phone size={13}/> {teacher.phone}</span>
              )}
            </div>
          </div>

          <div className="flex gap-6 text-center">
            <div>
              <p className="text-3xl font-bold text-white">{stats.studentCount}</p>
              <p className="text-emerald-300 text-xs mt-0.5">Students</p>
            </div>
            <div className="w-px bg-white/20" />
            <div>
              <p className="text-3xl font-bold text-white">{stats.courseCount}</p>
              <p className="text-emerald-300 text-xs mt-0.5">Courses</p>
            </div>
            <div className="w-px bg-white/20" />
            <div>
              <p className="text-3xl font-bold text-white">{stats.examCount}</p>
              <p className="text-emerald-300 text-xs mt-0.5">Exams</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Users size={22} className="text-emerald-600"/>} label="My Students" value={stats.studentCount} color="bg-emerald-50"/>
        <StatCard icon={<BookOpen size={22} className="text-indigo-600"/>} label="My Courses" value={stats.courseCount} color="bg-indigo-50"/>
        <StatCard icon={<Layers size={22} className="text-blue-600"/>} label="Modules Done" value={`${stats.modulesCompleted}/${stats.modulesTotal}`} color="bg-blue-50"/>
        <StatCard icon={<Award size={22} className="text-amber-600"/>} label="Exams Created" value={stats.examCount} color="bg-amber-50"/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <User size={18} className="text-emerald-500"/> Personal Information
          </h2>
          <div className="space-y-1">
            {[
              { label: 'Full Name', value: teacher.name, icon: <User size={15}/> },
              { label: 'Email', value: teacher.email || '—', icon: <Mail size={15}/> },
              { label: 'Phone', value: teacher.phone || '—', icon: <Phone size={15}/> },
              { label: 'Role', value: teacher.role ? teacher.role.charAt(0).toUpperCase() + teacher.role.slice(1) : '—', icon: <GraduationCap size={15}/> },
              { label: 'Joined On', value: joinedDate, icon: <Calendar size={15}/> },
              { label: 'Commission Rate', value: teacher.commission_percent != null ? `${teacher.commission_percent}%` : '—', icon: <TrendingUp size={15}/> },
              { label: 'Total Earned', value: stats.totalEarnings != null ? `Rs. ${stats.totalEarnings.toLocaleString()}` : '—', icon: <Banknote size={15}/> },
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

        {/* Module Progress + Courses */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <BarChart2 size={18} className="text-emerald-500"/> Overall Module Progress
            </h2>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-600">{stats.modulesCompleted} of {stats.modulesTotal} modules completed</span>
              <span className="font-bold text-emerald-600">{modulesPct}%</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all"
                style={{ width: `${modulesPct}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: 'Completed', value: stats.modulesCompleted, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Remaining', value: stats.modulesTotal - stats.modulesCompleted, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Total', value: stats.modulesTotal, color: 'text-slate-600', bg: 'bg-slate-50' },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className={`${bg} rounded-xl py-3`}>
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {assignedCourses?.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <BookOpen size={18} className="text-emerald-500"/> Assigned Courses
              </h2>
              <div className="space-y-3">
                {assignedCourses.map((c) => (
                  <div key={c._id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <BookOpen size={16} className="text-emerald-600"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-700 truncate">{c.name}</p>
                      {c.duration && (
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <CheckCircle size={11}/> {c.duration}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherProfile;
