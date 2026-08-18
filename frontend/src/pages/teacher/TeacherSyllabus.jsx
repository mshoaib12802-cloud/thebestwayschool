import { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  BookMarked, ChevronDown, ChevronRight, CheckCircle2, Circle,
  BookOpen, Award, Target, RefreshCw, Clock
} from 'lucide-react';

const DIFF_CLS = { easy:'bg-emerald-100 text-emerald-700', medium:'bg-amber-100 text-amber-700', hard:'bg-rose-100 text-rose-700' };

export default function TeacherSyllabus() {
  const [syllabi,   setSyllabi]   = useState([]);
  const [selected,  setSelected]  = useState(null); // selected syllabus object
  const [expanded,  setExpanded]  = useState({});
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [msg,       setMsg]       = useState('');

  useEffect(() => {
    api.get('/syllabus/by-teacher')
      .then(r => { setSyllabi(r.data); if(r.data.length) setSelected(r.data[0]); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const flash = (t) => { setMsg(t); setTimeout(()=>setMsg(''),3000); };

  const toggleTopic = async (ch, topic) => {
    if (!selected) return;
    setSaving(true);
    try {
      const r = await api.patch(`/syllabus/${selected._id}/topic`, {
        chapter_id: ch._id,
        topic_id: topic._id,
        is_completed: !topic.is_completed
      });
      // update local selected
      setSyllabi(prev => prev.map(s => s._id===r.data._id ? {...s, chapters:r.data.chapters} : s));
      setSelected(prev => ({...prev, chapters: r.data.chapters}));
      flash(!topic.is_completed ? '✓ Marked as completed' : 'Marked as incomplete');
    } catch { flash('Failed to update'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="text-center py-12 text-slate-400">Loading syllabi…</div>;

  if (!syllabi.length) return (
    <div className="text-center py-20 text-slate-400">
      <BookMarked size={48} className="mx-auto mb-3 opacity-20"/>
      <p className="font-medium">No syllabi assigned</p>
      <p className="text-sm mt-1">Ask admin to create syllabus for your subjects</p>
    </div>
  );

  // stats for selected
  const stats = (() => {
    if (!selected) return null;
    let total=0, done=0, totalW=0;
    selected.chapters?.forEach(ch => ch.topics?.forEach(t => {
      total++; totalW+=t.marks_weightage||0;
      if(t.is_completed) done++;
    }));
    return { total, done, pct: total ? Math.round(done/total*100):0, totalW };
  })();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BookMarked size={22} className="text-primary"/> My Syllabus
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Track and mark topics as you teach</p>
        </div>
        {saving && <div className="flex items-center gap-1 text-xs text-slate-400"><RefreshCw size={12} className="animate-spin"/> Saving…</div>}
      </div>

      {msg && <div className="mb-4 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm">{msg}</div>}

      {/* Subject Tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        {syllabi.map(s => (
          <button key={s._id} onClick={()=>{setSelected(s); setExpanded({});}}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selected?._id===s._id?'bg-primary text-white shadow':'bg-white border border-slate-200 text-slate-600 hover:border-primary hover:text-primary'}`}>
            {s.subject_id?.name}
            <span className="ml-1.5 text-xs opacity-60">{s.class_id?.name}</span>
          </button>
        ))}
      </div>

      {selected && (
        <>
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              {[
                { label:'Chapters', val: selected.chapters?.length||0, icon:<BookOpen size={16}/>, cls:'text-primary' },
                { label:'Topics Done', val:`${stats.done}/${stats.total}`, icon:<CheckCircle2 size={16}/>, cls:'text-emerald-600' },
                { label:'Progress', val:`${stats.pct}%`, icon:<Target size={16}/>, cls:'text-amber-600' },
                { label:'Marks Weightage', val:stats.totalW||'—', icon:<Award size={16}/>, cls:'text-blue-600' },
              ].map(s=>(
                <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
                  <div className={`${s.cls} mb-1`}>{s.icon}</div>
                  <p className="text-xl font-bold text-slate-800">{s.val}</p>
                  <p className="text-xs text-slate-500">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Progress bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5 shadow-sm">
            <div className="flex justify-between text-sm mb-1.5">
              <span className="font-medium text-slate-700">Overall Progress</span>
              <span className="font-bold text-primary">{stats?.pct}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5">
              <div className="bg-primary h-2.5 rounded-full transition-all duration-500" style={{width:`${stats?.pct||0}%`}}/>
            </div>
          </div>

          {/* Chapters */}
          <div className="space-y-3">
            {selected.chapters?.map((ch, ci) => {
              const chDone  = ch.topics?.filter(t=>t.is_completed).length || 0;
              const chTotal = ch.topics?.length || 0;
              const chPct   = chTotal ? Math.round(chDone/chTotal*100) : 0;
              const isOpen  = !!expanded[ci];

              return (
                <div key={ci} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50"
                    onClick={()=>setExpanded(p=>({...p,[ci]:!p[ci]}))}>
                    <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full min-w-[28px] text-center">
                      {ch.chapter_no}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm">{ch.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-24 bg-slate-100 rounded-full h-1.5">
                          <div className="bg-emerald-500 h-1.5 rounded-full" style={{width:`${chPct}%`}}/>
                        </div>
                        <span className="text-xs text-slate-400">{chDone}/{chTotal} topics done</span>
                      </div>
                    </div>
                    {isOpen ? <ChevronDown size={16} className="text-slate-400"/> : <ChevronRight size={16} className="text-slate-400"/>}
                  </div>

                  {isOpen && (
                    <div className="border-t border-slate-100">
                      {(!ch.topics || ch.topics.length === 0) && (
                        <p className="text-center text-xs text-slate-400 py-4">No topics defined for this chapter</p>
                      )}
                      {ch.topics?.map((t, ti) => (
                        <div key={ti} className={`flex items-start gap-3 px-4 py-3 border-b border-slate-50 last:border-0 ${t.is_completed?'bg-emerald-50/40':''}`}>
                          <button onClick={()=>toggleTopic(ch, t)} disabled={saving} className="mt-0.5 shrink-0">
                            {t.is_completed
                              ? <CheckCircle2 size={18} className="text-emerald-500"/>
                              : <Circle size={18} className="text-slate-300 hover:text-primary transition-colors"/>}
                          </button>
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${t.is_completed?'line-through text-slate-400':'text-slate-700'}`}>{t.title}</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${DIFF_CLS[t.difficulty]}`}>
                                {t.difficulty}
                              </span>
                              {t.marks_weightage > 0 && (
                                <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
                                  {t.marks_weightage} marks
                                </span>
                              )}
                              {t.is_completed && t.completion_date && (
                                <span className="text-xs text-emerald-600 flex items-center gap-0.5">
                                  <Clock size={10}/> {new Date(t.completion_date).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
