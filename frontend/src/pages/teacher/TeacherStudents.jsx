import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Users, Search, Phone, Mail, BookOpen, Hash, CalendarDays } from 'lucide-react';

const SHIFT_COLORS = {
  Morning:   { bg: '#fef3c7', color: '#92400e' },
  Afternoon: { bg: '#dbeafe', color: '#1e40af' },
  Evening:   { bg: '#ede9fe', color: '#4c1d95' },
  Weekend:   { bg: '#dcfce7', color: '#14532d' },
};

const TeacherStudents = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/teacher-portal/students')
      .then(r => setStudents(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = students.filter(s =>
    s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.roll_number?.toLowerCase().includes(search.toLowerCase()) ||
    s.courses?.some(c => c.course_name?.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
            <Users size={24} className="text-emerald-500"/> My Students
          </h2>
          <p className="text-slate-500 mt-1">{students.length} student{students.length !== 1 ? 's' : ''} enrolled in your courses</p>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, roll no or course..."
            className="pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300 w-72"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
          <Users size={40} className="text-slate-300 mx-auto mb-3"/>
          <p className="text-slate-500 font-medium">{search ? 'No students match your search.' : 'No students found in your courses.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(student => {
            const myCourses = student.courses?.filter(c => c.trainer_id) || [];
            const initials = student.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
            return (
              <div key={student._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-extrabold text-lg shadow-sm">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-extrabold text-slate-800 truncate">{student.full_name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono mt-0.5">
                      <Hash size={11}/>{student.roll_number}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {myCourses.map((c, i) => {
                    const batch = c.batch_id;
                    const sc = SHIFT_COLORS[batch?.shift || c.shift] || SHIFT_COLORS.Morning;
                    return (
                      <div key={i} className="rounded-xl border border-emerald-100 overflow-hidden">
                        <div className="flex items-center gap-2 text-sm bg-emerald-50 px-3 py-2">
                          <BookOpen size={13} className="text-emerald-600 shrink-0"/>
                          <span className="font-semibold text-emerald-800 truncate">{c.course_name}</span>
                          {c.shift && <span className="ml-auto text-[10px] font-bold text-emerald-600 bg-white border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">{c.shift}</span>}
                        </div>
                        {batch ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: '#0f172a', padding: '0.375rem 0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <CalendarDays size={11} color="#2dd4bf"/>
                              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fff' }}>{batch.name}</span>
                            </div>
                            {batch.shift && (
                              <span style={{ background: sc.bg, color: sc.color, fontSize: '0.65rem', fontWeight: 700, padding: '1px 8px', borderRadius: 999, flexShrink: 0 }}>
                                {batch.shift}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div style={{ background: '#f8fafc', padding: '0.3rem 0.75rem' }}>
                            <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>No batch assigned</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {(student.phone || student.email) && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-3 text-xs text-slate-500">
                    {student.phone && (
                      <span className="flex items-center gap-1"><Phone size={11}/> {student.phone}</span>
                    )}
                    {student.email && (
                      <span className="flex items-center gap-1 truncate"><Mail size={11}/> {student.email}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TeacherStudents;
