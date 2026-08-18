import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import {
  BookMarked, ChevronDown, ChevronRight, Plus, Trash2, Save,
  CheckCircle2, Circle, AlertCircle, RefreshCw, GripVertical,
  BookOpen, Target, Edit3, X, Check, Award
} from 'lucide-react';

const DIFF_MAP = {
  easy:   { label: 'Easy',   cls: 'bg-emerald-100 text-emerald-700' },
  medium: { label: 'Medium', cls: 'bg-amber-100   text-amber-700'   },
  hard:   { label: 'Hard',   cls: 'bg-rose-100    text-rose-700'    },
};

const BLOOM = ['remember','understand','apply','analyze','evaluate','create'];

const emptyTopic = () => ({ title:'', subtopics:[], difficulty:'medium', marks_weightage:0, is_completed:false, completion_date:null, notes:'' });
const emptyChapter = (n) => ({ chapter_no:n, title:'', description:'', topics:[] });

function InlineEdit({ value, onSave, className = '' }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  if (!editing) return (
    <span className={`cursor-pointer group ${className}`} onClick={() => setEditing(true)}>
      {value || <span className="text-slate-400 italic">Click to edit</span>}
      <Edit3 size={12} className="inline ml-1 opacity-0 group-hover:opacity-50" />
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1">
      <input autoFocus value={val} onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if(e.key==='Enter'){onSave(val);setEditing(false);} if(e.key==='Escape'){setVal(value);setEditing(false);} }}
        className="border border-primary rounded px-1 text-sm outline-none"
        style={{minWidth:120}} />
      <button onClick={()=>{onSave(val);setEditing(false);}} className="text-emerald-600"><Check size={14}/></button>
      <button onClick={()=>{setVal(value);setEditing(false);}} className="text-rose-500"><X size={14}/></button>
    </span>
  );
}

export default function SyllabusPage() {
  const [years,    setYears]    = useState([]);
  const [classes,  setClasses]  = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [filter,   setFilter]   = useState({ academic_year_id:'', class_id:'', subject_id:'' });
  const [syllabus, setSyllabus] = useState(null);   // null = not loaded yet
  const [loading,  setLoading]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [expanded, setExpanded] = useState({});      // { chapterIdx: bool }
  const [dirty,    setDirty]    = useState(false);
  const [msg,      setMsg]      = useState('');

  useEffect(() => {
    api.get('/academic-years').then(r => setYears(r.data)).catch(()=>{});
    api.get('/school-classes').then(r => setClasses(r.data)).catch(()=>{});
  }, []);

  useEffect(() => {
    if (!filter.class_id) { setSubjects([]); return; }
    api.get(`/subjects?class_id=${filter.class_id}`).then(r => setSubjects(r.data)).catch(()=>{});
  }, [filter.class_id]);

  const load = async () => {
    const { academic_year_id, class_id, subject_id } = filter;
    if (!academic_year_id || !class_id || !subject_id) return;
    setLoading(true);
    try {
      const r = await api.get('/syllabus', { params: filter });
      if (r.data) {
        setSyllabus(r.data);
        const exp = {};
        r.data.chapters.forEach((_, i) => { exp[i] = true; });
        setExpanded(exp);
      } else {
        setSyllabus({ subject_id, class_id, academic_year_id, title:'', chapters:[] });
        setExpanded({});
      }
      setDirty(false);
    } finally { setLoading(false); }
  };

  const update = (updater) => {
    setSyllabus(prev => { const next = structuredClone(prev); updater(next); return next; });
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const r = await api.post('/syllabus', {
        subject_id: filter.subject_id,
        class_id: filter.class_id,
        academic_year_id: filter.academic_year_id,
        title: syllabus.title,
        chapters: syllabus.chapters
      });
      setSyllabus(r.data);
      setDirty(false);
      flash('Syllabus saved!');
    } catch(e){ flash('Save failed: ' + e.response?.data?.message, true); }
    finally { setSaving(false); }
  };

  const flash = (text, err=false) => {
    setMsg({ text, err });
    setTimeout(() => setMsg(''), 3000);
  };

  // ── computed stats ──────────────────────────────────────────
  const stats = (() => {
    if (!syllabus) return null;
    let total=0, done=0, totalW=0, doneW=0;
    syllabus.chapters.forEach(ch => {
      ch.topics.forEach(t => {
        total++; totalW += t.marks_weightage||0;
        if (t.is_completed) { done++; doneW += t.marks_weightage||0; }
      });
    });
    return { total, done, totalW, doneW, pct: total ? Math.round(done/total*100) : 0 };
  })();

  // ── chapter operations ──────────────────────────────────────
  const addChapter = () => update(s => {
    const n = s.chapters.length + 1;
    s.chapters.push(emptyChapter(n));
    setExpanded(prev => ({ ...prev, [n-1]: true }));
  });

  const deleteChapter = (ci) => update(s => s.chapters.splice(ci,1));

  // ── topic operations ────────────────────────────────────────
  const addTopic = (ci) => update(s => s.chapters[ci].topics.push(emptyTopic()));

  const deleteTopic = (ci, ti) => update(s => s.chapters[ci].topics.splice(ti,1));

  const toggleDone = (ci, ti) => update(s => {
    const t = s.chapters[ci].topics[ti];
    t.is_completed = !t.is_completed;
    t.completion_date = t.is_completed ? new Date().toISOString() : null;
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BookMarked size={24} className="text-primary"/> Syllabus Management
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Build and track curriculum chapter by chapter</p>
        </div>
        {syllabus && dirty && (
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow">
            <Save size={16}/>{saving ? 'Saving…' : 'Save Syllabus'}
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select value={filter.academic_year_id} onChange={e => setFilter(p=>({...p, academic_year_id:e.target.value}))}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
            <option value="">Academic Year</option>
            {years.map(y => <option key={y._id} value={y._id}>{y.label}</option>)}
          </select>
          <select value={filter.class_id} onChange={e => setFilter(p=>({...p, class_id:e.target.value, subject_id:''}))}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
            <option value="">Select Class</option>
            {classes.map(c => <option key={c._id} value={c._id}>{c.name} {c.section}</option>)}
          </select>
          <select value={filter.subject_id} onChange={e => setFilter(p=>({...p, subject_id:e.target.value}))}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm" disabled={!filter.class_id}>
            <option value="">Select Subject</option>
            {subjects.map(s => <option key={s._id} value={s._id}>{s.name} {s.code ? `(${s.code})` : ''}</option>)}
          </select>
          <button onClick={load}
            disabled={!filter.academic_year_id || !filter.class_id || !filter.subject_id || loading}
            className="bg-primary text-white rounded-lg px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50">
            {loading ? <RefreshCw size={14} className="animate-spin"/> : <BookOpen size={14}/>}
            Load Syllabus
          </button>
        </div>
      </div>

      {/* Message */}
      {msg && (
        <div className={`mb-4 px-4 py-2 rounded-lg text-sm font-medium ${msg.err ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
          {msg.text}
        </div>
      )}

      {/* Content */}
      {!syllabus && !loading && (
        <div className="text-center py-16 text-slate-400">
          <BookMarked size={48} className="mx-auto mb-3 opacity-30"/>
          <p>Select academic year, class, and subject to load syllabus</p>
        </div>
      )}

      {syllabus && (
        <>
          {/* Stats Bar */}
          {stats && stats.total > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-700">
                  Overall Progress — {stats.done}/{stats.total} topics completed
                </span>
                <span className="text-sm font-bold text-primary">{stats.pct}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5">
                <div className="bg-primary h-2.5 rounded-full transition-all" style={{width:`${stats.pct}%`}}/>
              </div>
              <div className="flex gap-6 mt-3 text-xs text-slate-500">
                <span><span className="font-bold text-slate-700">{syllabus.chapters.length}</span> Chapters</span>
                <span><span className="font-bold text-slate-700">{stats.total}</span> Topics</span>
                <span><span className="font-bold text-emerald-600">{stats.totalW}</span> Total Marks Weightage</span>
                <span><span className="font-bold text-primary">{stats.doneW}</span> Covered Marks</span>
              </div>
            </div>
          )}

          {/* Syllabus Title */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 shadow-sm flex items-center gap-3">
            <Award size={18} className="text-amber-500 shrink-0"/>
            <div className="flex-1">
              <p className="text-xs text-slate-400 mb-0.5">Syllabus Title</p>
              <InlineEdit value={syllabus.title || 'Untitled Syllabus'}
                className="font-semibold text-slate-700"
                onSave={v => update(s => { s.title = v; })} />
            </div>
          </div>

          {/* Chapters */}
          <div className="space-y-3">
            {syllabus.chapters.map((ch, ci) => {
              const chDone  = ch.topics.filter(t => t.is_completed).length;
              const chTotal = ch.topics.length;
              const chPct   = chTotal ? Math.round(chDone / chTotal * 100) : 0;
              const isOpen  = !!expanded[ci];

              return (
                <div key={ci} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  {/* Chapter Header */}
                  <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50"
                    onClick={() => setExpanded(p => ({...p, [ci]: !p[ci]}))}>
                    <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full min-w-[28px] text-center">
                      {ch.chapter_no}
                    </span>
                    <div className="flex-1 min-w-0">
                      <InlineEdit
                        value={ch.title || `Chapter ${ch.chapter_no}`}
                        className="font-semibold text-slate-800 text-sm"
                        onSave={v => update(s => { s.chapters[ci].title = v; })}
                      />
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-32 bg-slate-100 rounded-full h-1.5">
                          <div className="bg-emerald-500 h-1.5 rounded-full" style={{width:`${chPct}%`}}/>
                        </div>
                        <span className="text-xs text-slate-400">{chDone}/{chTotal} done</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={e => { e.stopPropagation(); addTopic(ci); }}
                        className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md hover:bg-emerald-100 flex items-center gap-1">
                        <Plus size={12}/> Topic
                      </button>
                      <button onClick={e => { e.stopPropagation(); deleteChapter(ci); }}
                        className="text-slate-300 hover:text-rose-500 transition-colors p-1 rounded">
                        <Trash2 size={14}/>
                      </button>
                      {isOpen ? <ChevronDown size={16} className="text-slate-400"/> : <ChevronRight size={16} className="text-slate-400"/>}
                    </div>
                  </div>

                  {/* Topics */}
                  {isOpen && (
                    <div className="border-t border-slate-100">
                      {ch.topics.length === 0 && (
                        <div className="text-center py-6 text-slate-400 text-sm">
                          No topics yet — <button className="text-primary underline" onClick={() => addTopic(ci)}>add one</button>
                        </div>
                      )}
                      {ch.topics.map((t, ti) => (
                        <div key={ti} className={`flex items-start gap-3 px-4 py-3 border-b border-slate-50 last:border-0 ${t.is_completed ? 'bg-emerald-50/50' : 'hover:bg-slate-50'}`}>
                          <button onClick={() => toggleDone(ci, ti)} className="mt-0.5 shrink-0">
                            {t.is_completed
                              ? <CheckCircle2 size={18} className="text-emerald-500"/>
                              : <Circle size={18} className="text-slate-300"/>}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <InlineEdit
                                value={t.title || 'Untitled Topic'}
                                className={`text-sm font-medium ${t.is_completed ? 'line-through text-slate-400' : 'text-slate-700'}`}
                                onSave={v => update(s => { s.chapters[ci].topics[ti].title = v; })}
                              />
                              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${DIFF_MAP[t.difficulty].cls}`}>
                                {DIFF_MAP[t.difficulty].label}
                              </span>
                              {t.marks_weightage > 0 && (
                                <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
                                  {t.marks_weightage}m
                                </span>
                              )}
                              {t.is_completed && t.completion_date && (
                                <span className="text-xs text-emerald-600">
                                  ✓ {new Date(t.completion_date).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            {/* Inline edit for difficulty + weightage */}
                            <div className="flex items-center gap-3 mt-1.5">
                              <select value={t.difficulty}
                                onChange={e => update(s => { s.chapters[ci].topics[ti].difficulty = e.target.value; })}
                                className="text-xs border border-slate-200 rounded px-1.5 py-0.5">
                                <option value="easy">Easy</option>
                                <option value="medium">Medium</option>
                                <option value="hard">Hard</option>
                              </select>
                              <div className="flex items-center gap-1 text-xs">
                                <span className="text-slate-400">Marks:</span>
                                <input type="number" min={0} value={t.marks_weightage}
                                  onChange={e => update(s => { s.chapters[ci].topics[ti].marks_weightage = +e.target.value; })}
                                  className="w-14 border border-slate-200 rounded px-1.5 py-0.5 text-center"/>
                              </div>
                            </div>
                          </div>
                          <button onClick={() => deleteTopic(ci, ti)} className="text-slate-200 hover:text-rose-400 transition-colors mt-0.5 shrink-0">
                            <Trash2 size={13}/>
                          </button>
                        </div>
                      ))}
                      {/* Add topic inline */}
                      <div className="px-4 py-2">
                        <button onClick={() => addTopic(ci)}
                          className="text-xs text-slate-400 hover:text-primary flex items-center gap-1 transition-colors">
                          <Plus size={12}/> Add Topic
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add Chapter */}
          <button onClick={addChapter}
            className="mt-4 w-full border-2 border-dashed border-slate-200 rounded-xl py-3 text-slate-400 hover:border-primary hover:text-primary flex items-center justify-center gap-2 transition-colors text-sm font-medium">
            <Plus size={16}/> Add Chapter
          </button>

          {/* Floating Save */}
          {dirty && (
            <div className="fixed bottom-6 right-6 z-50">
              <button onClick={save} disabled={saving}
                className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl shadow-xl hover:bg-primary/90 transition-colors font-medium text-sm">
                <Save size={16}/>{saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
