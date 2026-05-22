import { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  Layers, CheckCircle2, Play, Lock, BookOpen, Clock,
  Link2, FileText, Award, ArrowRight, Flame, Target, Calendar
} from 'lucide-react';

const TYPE_COLORS = {
  theory: 'bg-blue-100 text-blue-700 border-blue-200',
  practical: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  project: 'bg-violet-100 text-violet-700 border-violet-200',
  assessment: 'bg-amber-100 text-amber-700 border-amber-200',
  workshop: 'bg-rose-100 text-rose-700 border-rose-200',
};

const daysBetween = (a, b) => Math.max(0, Math.floor((new Date(b) - new Date(a)) / 86400000));

const StudentModules = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCourse, setActiveCourse] = useState(0);

  useEffect(() => {
    api.get('/student-portal/modules')
      .then(r => setCourses(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  if (courses.length === 0) return (
    <div className="bg-white rounded-3xl p-16 text-center border border-slate-100">
      <Layers size={48} className="text-slate-200 mx-auto mb-4"/>
      <h3 className="text-xl font-extrabold text-slate-400 mb-2">No Modules Yet</h3>
      <p className="text-slate-400">Your teacher hasn't added course modules yet. Check back soon!</p>
    </div>
  );

  const course = courses[activeCourse] || courses[0];
  const { modules = [], total, completed, in_progress: inProgress, upcoming, progress_pct } = course;

  const currentModule = modules.find(m => m.status === 'in_progress');
  const completedModules = modules.filter(m => m.status === 'completed');
  const streak = (() => {
    let s = 0;
    for (let i = modules.length - 1; i >= 0; i--) {
      if (modules[i].status === 'completed') s++;
      else break;
    }
    return s;
  })();

  const estimatedDaysLeft = modules
    .filter(m => m.status !== 'completed')
    .reduce((s, m) => s + (m.duration_days || 0), 0);

  const allDone = total > 0 && completed === total;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
          <Layers size={24} className="text-indigo-500"/> My Modules
        </h2>
        <p className="text-slate-500 mt-1">Track your learning progress module by module</p>
      </div>

      {/* Course tabs (if enrolled in multiple) */}
      {courses.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {courses.map((c, i) => (
            <button key={i} onClick={() => setActiveCourse(i)}
              className={`px-5 py-2 rounded-xl font-bold text-sm transition-all ${activeCourse === i ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}>
              {c.course_name}
            </button>
          ))}
        </div>
      )}

      {/* All Done Banner */}
      {allDone && (
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-3xl p-6 text-white shadow-xl shadow-emerald-200 flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
            <Award size={36}/>
          </div>
          <div>
            <h3 className="text-2xl font-extrabold">Course Complete!</h3>
            <p className="text-emerald-100 font-medium mt-1">You have successfully completed all {total} modules of {course.course_name}. Congratulations!</p>
          </div>
        </div>
      )}

      {/* Stats strip */}
      {total > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Completed</p>
            <p className="text-3xl font-extrabold text-emerald-600">{completed}</p>
            <p className="text-xs text-slate-400 mt-0.5">of {total} modules</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Progress</p>
            <p className="text-3xl font-extrabold text-indigo-600">{progress_pct}%</p>
            <p className="text-xs text-slate-400 mt-0.5">{upcoming} modules ahead</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Flame size={11}/> Streak</p>
            <p className="text-3xl font-extrabold text-amber-500">{streak}</p>
            <p className="text-xs text-slate-400 mt-0.5">modules in a row</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Target size={11}/> Est. Remaining</p>
            <p className="text-3xl font-extrabold text-slate-700">{estimatedDaysLeft}d</p>
            <p className="text-xs text-slate-400 mt-0.5">to complete course</p>
          </div>
        </div>
      )}

      {/* Big progress bar */}
      {total > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <span className="font-extrabold text-slate-700">{course.course_name}</span>
            <span className="font-extrabold text-indigo-600 text-lg">{progress_pct}%</span>
          </div>
          <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 relative overflow-hidden"
              style={{ width: `${progress_pct}%`, background: allDone ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #6366f1, #8b5cf6)' }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse" style={{ animationDuration: '2s' }}/>
            </div>
          </div>
          <div className="flex justify-between text-xs font-bold text-slate-400 mt-2">
            <span className="text-emerald-500">{completed} done</span>
            {inProgress > 0 && <span className="text-blue-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse inline-block"/>{inProgress} in progress</span>}
            <span>{upcoming} upcoming</span>
          </div>
        </div>
      )}

      {/* Currently learning highlight */}
      {currentModule && (
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-3xl p-5 text-white shadow-xl shadow-indigo-200">
          <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1"><Play size={11}/> Currently Learning</p>
          <h3 className="text-xl font-extrabold">{currentModule.title}</h3>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-xs bg-white/20 px-2 py-1 rounded-lg font-bold capitalize">{currentModule.type}</span>
            <span className="text-xs text-indigo-200 font-medium flex items-center gap-1">
              <Calendar size={11}/> Started {new Date(currentModule.started_date).toLocaleDateString()}
            </span>
            <span className="text-xs text-indigo-200 font-medium flex items-center gap-1">
              <Clock size={11}/> {daysBetween(currentModule.started_date, new Date())} days in
            </span>
          </div>
          {currentModule.description && (
            <p className="text-indigo-100 text-sm mt-3 leading-relaxed opacity-90">{currentModule.description}</p>
          )}
          {currentModule.resources?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {currentModule.resources.map((r, i) => (
                r.url
                  ? <a key={i} href={r.url} target="_blank" rel="noreferrer" className="text-[11px] bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 transition-colors"><Link2 size={11}/>{r.title}</a>
                  : <span key={i} className="text-[11px] bg-white/20 text-white px-3 py-1.5 rounded-xl font-bold flex items-center gap-1"><Link2 size={11}/>{r.title}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Module Timeline */}
      {total === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-100">
          <BookOpen size={40} className="text-slate-200 mx-auto mb-3"/>
          <p className="text-slate-400 font-medium">No modules defined for this course yet.</p>
        </div>
      ) : (
        <div className="space-y-0">
          <h3 className="text-sm font-extrabold text-slate-400 uppercase tracking-widest mb-4">Module Timeline</h3>
          {modules.map((mod, idx) => {
            const isCompleted = mod.status === 'completed';
            const isInProgress = mod.status === 'in_progress';
            const isUpcoming = mod.status === 'upcoming';
            const isLast = idx === modules.length - 1;
            const actualDays = isCompleted && mod.started_date && mod.completed_date
              ? daysBetween(mod.started_date, mod.completed_date)
              : null;

            return (
              <div key={mod._id} className="relative flex gap-4">
                {/* Connector line */}
                {!isLast && (
                  <div className={`absolute left-[18px] top-10 bottom-0 w-0.5 ${isCompleted ? 'bg-emerald-200' : 'bg-slate-100'}`}/>
                )}

                {/* Status circle */}
                <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center z-10 border-2 mt-1 ${
                  isCompleted ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-200' :
                  isInProgress ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200' :
                  'bg-white border-slate-200 text-slate-300'
                }`}>
                  {isCompleted ? <CheckCircle2 size={16}/> :
                   isInProgress ? <Play size={14}/> :
                   <Lock size={13}/>}
                </div>

                {/* Card */}
                <div className={`flex-1 mb-4 rounded-2xl border overflow-hidden transition-all ${
                  isCompleted ? 'bg-emerald-50 border-emerald-100' :
                  isInProgress ? 'bg-indigo-50 border-indigo-200 shadow-lg shadow-indigo-100/50' :
                  'bg-white border-slate-100 opacity-60'
                }`}>
                  <div className="p-4">
                    {/* Module header row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-400">#{mod.order}</span>
                          <h4 className={`font-extrabold ${isUpcoming ? 'text-slate-400' : 'text-slate-800'}`}>{mod.title}</h4>
                          {isInProgress && (
                            <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block"/> LIVE
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isUpcoming ? 'bg-slate-100 text-slate-400 border-slate-200' : TYPE_COLORS[mod.type] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                            {mod.type}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium flex items-center gap-0.5"><Clock size={9}/> {mod.duration_days}d planned</span>
                          {isCompleted && actualDays !== null && (
                            <span className={`text-[10px] font-bold ${actualDays <= mod.duration_days ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {actualDays}d actual
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status badge */}
                      {isCompleted && (
                        <div className="text-right shrink-0">
                          <span className="text-[10px] text-emerald-600 font-bold block">Completed</span>
                          <span className="text-[10px] text-slate-400">{new Date(mod.completed_date).toLocaleDateString()}</span>
                        </div>
                      )}
                      {isInProgress && mod.started_date && (
                        <div className="text-right shrink-0">
                          <span className="text-[10px] text-indigo-600 font-bold block">In Progress</span>
                          <span className="text-[10px] text-slate-400">Since {new Date(mod.started_date).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    {mod.description && !isUpcoming && (
                      <p className="text-xs text-slate-500 mt-2 leading-relaxed">{mod.description}</p>
                    )}

                    {/* Teacher notes (only if completed and notes_visible) */}
                    {isCompleted && mod.teacher_notes && mod.notes_visible && (
                      <div className="mt-3 bg-white rounded-xl p-3 border border-emerald-200">
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1 flex items-center gap-1">
                          <FileText size={9}/> Teacher Notes
                        </p>
                        <p className="text-xs text-slate-600 leading-relaxed">{mod.teacher_notes}</p>
                      </div>
                    )}

                    {/* Resources (only for completed or in_progress) */}
                    {!isUpcoming && mod.resources?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {mod.resources.map((r, i) => (
                          r.url
                            ? <a key={i} href={r.url} target="_blank" rel="noreferrer" className="text-[10px] bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-colors"><Link2 size={9}/>{r.title}</a>
                            : <span key={i} className="text-[10px] bg-white border border-slate-200 text-slate-500 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1"><Link2 size={9}/>{r.title}</span>
                        ))}
                      </div>
                    )}

                    {/* Upcoming placeholder */}
                    {isUpcoming && (
                      <p className="text-xs text-slate-400 mt-2 italic">Module details will be visible when started by your teacher.</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentModules;
