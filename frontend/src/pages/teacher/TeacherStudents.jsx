import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Users, Search, Phone, Mail, BookOpen, Hash, CalendarDays, School, GraduationCap } from 'lucide-react';

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
    s.school_class_id?.name?.toLowerCase().includes(search.toLowerCase()) ||
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
          <p className="text-slate-500 mt-1">{students.length} student{students.length !== 1 ? 's' : ''} enrolled</p>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, roll no or class..."
            className="pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300 w-72"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
          <Users size={40} className="text-slate-300 mx-auto mb-3"/>
          <p className="text-slate-500 font-medium">
            {search ? 'No students match your search.' : 'No students found. Make sure you are assigned to classes in the timetable.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(student => {
            const initials = student.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
            const isSchoolStudent = !!student.school_class_id;
            const myCourses = student.courses?.filter(c => c.trainer_id) || [];

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
                  {isSchoolStudent && (
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center gap-1 shrink-0">
                      <GraduationCap size={10}/> School
                    </span>
                  )}
                </div>

                {/* School system: show class info */}
                {isSchoolStudent && student.school_class_id && (
                  <div className="rounded-xl border border-indigo-100 overflow-hidden">
                    <div className="flex items-center gap-2 text-sm bg-indigo-50 px-3 py-2">
                      <School size={13} className="text-indigo-600 shrink-0"/>
                      <span className="font-semibold text-indigo-800">
                        Class {student.school_class_id.name}
                        {student.school_class_id.section ? ` — ${student.school_class_id.section}` : ''}
                      </span>
                      {student.school_class_id.grade_level && (
                        <span className="ml-auto text-[10px] font-bold text-indigo-600 bg-white border border-indigo-200 px-2 py-0.5 rounded-full shrink-0">
                          Grade {student.school_class_id.grade_level}
                        </span>
                      )}
                    </div>
                    {student.academic_year_id?.label && (
                      <div className="bg-slate-50 px-3 py-1.5 flex items-center gap-2">
                        <CalendarDays size={11} className="text-slate-400"/>
                        <span className="text-xs text-slate-500 font-medium">{student.academic_year_id.label}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Legacy: show course info */}
                {!isSchoolStudent && myCourses.map((c, i) => {
                  const batch = c.batch_id;
                  const sc = SHIFT_COLORS[batch?.shift || c.shift] || SHIFT_COLORS.Morning;
                  return (
                    <div key={i} className="rounded-xl border border-emerald-100 overflow-hidden mb-2">
                      <div className="flex items-center gap-2 text-sm bg-emerald-50 px-3 py-2">
                        <BookOpen size={13} className="text-emerald-600 shrink-0"/>
                        <span className="font-semibold text-emerald-800 truncate">{c.course_name}</span>
                        {c.shift && (
                          <span className="ml-auto text-[10px] font-bold text-emerald-600 bg-white border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">{c.shift}</span>
                        )}
                      </div>
                      {batch ? (
                        <div className="flex items-center justify-between gap-2 bg-slate-900 px-3 py-1.5">
                          <div className="flex items-center gap-1.5">
                            <CalendarDays size={11} color="#2dd4bf"/>
                            <span className="text-xs font-bold text-white">{batch.name}</span>
                          </div>
                          {batch.shift && (
                            <span style={{ background: sc.bg, color: sc.color }} className="text-[10px] font-bold px-2 py-0.5 rounded-full">
                              {batch.shift}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="bg-slate-50 px-3 py-1.5">
                          <span className="text-[11px] text-slate-400 font-medium">No batch assigned</span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {(student.phone || student.email) && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-3 text-xs text-slate-500">
                    {student.phone && <span className="flex items-center gap-1"><Phone size={11}/> {student.phone}</span>}
                    {student.email && <span className="flex items-center gap-1 truncate"><Mail size={11}/> {student.email}</span>}
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
