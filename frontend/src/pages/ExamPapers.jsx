import { useState, useEffect } from 'react';
import api from '../services/api';
import {
  FileText, Plus, Eye, Trash2, Search, Filter, Calendar, Clock,
  Award, CheckCircle2, BookOpen, Users, AlertTriangle, Download
} from 'lucide-react';

const TYPE_BADGE = {
  annual:       'bg-purple-100 text-purple-700',
  half_yearly:  'bg-blue-100   text-blue-700',
  monthly_test: 'bg-emerald-100 text-emerald-700',
  unit_test:    'bg-amber-100  text-amber-700',
  quiz:         'bg-pink-100   text-pink-700',
  practice:     'bg-slate-100  text-slate-600',
};

const TYPE_LABEL = {
  annual:'Annual', half_yearly:'Half-Yearly', monthly_test:'Monthly Test',
  unit_test:'Unit Test', quiz:'Quiz', practice:'Practice',
};

export default function ExamPapers() {
  const [papers,  setPapers]  = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [fClass,  setFClass]  = useState('');
  const [fType,   setFType]   = useState('');
  const [detail,  setDetail]  = useState(null); // full paper for modal

  useEffect(() => {
    api.get('/school-classes').then(r => setClasses(r.data)).catch(()=>{});
    fetchPapers();
  }, []);

  const fetchPapers = async () => {
    setLoading(true);
    try {
      const r = await api.get('/exam-papers');
      setPapers(r.data);
    } finally { setLoading(false); }
  };

  const openDetail = async (id) => {
    try { const r = await api.get(`/exam-papers/${id}`); setDetail(r.data); }
    catch {}
  };

  const deletePaper = async (id) => {
    if (!window.confirm('Delete this exam paper?')) return;
    await api.delete(`/exam-papers/${id}`);
    setPapers(p => p.filter(x => x._id !== id));
    if (detail?._id === id) setDetail(null);
  };

  const togglePublish = async (id, val) => {
    await api.put(`/exam-papers/${id}`, { is_published: val });
    setPapers(p => p.map(x => x._id===id ? {...x, is_published:val} : x));
    if (detail?._id === id) setDetail(d => ({...d, is_published:val}));
  };

  const filtered = papers.filter(p => {
    const name = (p.title + ' ' + p.subject_id?.name + ' ' + p.class_id?.name).toLowerCase();
    if (search && !name.includes(search.toLowerCase())) return false;
    if (fClass && p.class_id?._id !== fClass) return false;
    if (fType  && p.exam_type !== fType)       return false;
    return true;
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText size={24} className="text-primary"/> Exam Papers
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">All generated exam papers across classes</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Award size={16} className="text-amber-500"/>
          {papers.length} papers  •  {papers.filter(p=>p.is_published).length} published
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search papers…"
              className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm"/>
          </div>
          <select value={fClass} onChange={e=>setFClass(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
            <option value="">All Classes</option>
            {classes.map(c=><option key={c._id} value={c._id}>{c.name} {c.section}</option>)}
          </select>
          <select value={fType} onChange={e=>setFType(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
            <option value="">All Types</option>
            {Object.entries(TYPE_LABEL).map(([k,v])=><option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label:'Total Papers', val: papers.length, icon:<FileText size={18}/>, col:'text-primary' },
          { label:'Published',    val: papers.filter(p=>p.is_published).length,  icon:<CheckCircle2 size={18}/>, col:'text-emerald-600' },
          { label:'Drafts',       val: papers.filter(p=>!p.is_published).length, icon:<AlertTriangle size={18}/>, col:'text-amber-500' },
          { label:'Classes',      val: new Set(papers.map(p=>p.class_id?._id)).size, icon:<Users size={18}/>, col:'text-blue-600' },
        ].map(s=>(
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className={`${s.col} mb-1`}>{s.icon}</div>
            <p className="text-2xl font-bold text-slate-800">{s.val}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <FileText size={48} className="mx-auto mb-3 opacity-30"/>
          <p>No exam papers found</p>
          <p className="text-sm mt-1">Teachers create papers from their portal</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Title</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Class / Subject</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Marks / Time</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Created By</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3"/>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p._id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800 max-w-[220px] truncate">{p.title}</td>
                  <td className="px-4 py-3 text-slate-600">
                    <div>{p.class_id?.name} {p.class_id?.section}</div>
                    <div className="text-xs text-slate-400">{p.subject_id?.name}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_BADGE[p.exam_type]}`}>
                      {TYPE_LABEL[p.exam_type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <div className="flex items-center gap-1"><Award size={12} className="text-amber-500"/>{p.total_marks}m</div>
                    <div className="flex items-center gap-1 text-xs text-slate-400"><Clock size={11}/>{p.duration_minutes} min</div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {p.exam_date ? new Date(p.exam_date).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{p.created_by?.name || '—'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => togglePublish(p._id, !p.is_published)}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${p.is_published ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                      {p.is_published ? 'Published' : 'Draft'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => openDetail(p._id)} className="text-slate-400 hover:text-primary transition-colors">
                        <Eye size={15}/>
                      </button>
                      <button onClick={() => deletePaper(p._id)} className="text-slate-400 hover:text-rose-500 transition-colors">
                        <Trash2 size={15}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {detail && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">{detail.title}</h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {detail.class_id?.name} {detail.class_id?.section} &nbsp;·&nbsp; {detail.subject_id?.name}
                  </p>
                </div>
                <button onClick={()=>setDetail(null)} className="text-slate-400 hover:text-slate-700">✕</button>
              </div>
              <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-600">
                <span className="flex items-center gap-1"><Award size={12} className="text-amber-500"/> {detail.total_marks} marks</span>
                <span className="flex items-center gap-1"><Clock size={12} className="text-blue-500"/> {detail.duration_minutes} min</span>
                <span className="flex items-center gap-1"><Calendar size={12}/> {detail.exam_date ? new Date(detail.exam_date).toLocaleDateString() : 'No date'}</span>
                <span className={`px-2 py-0.5 rounded-full ${TYPE_BADGE[detail.exam_type]}`}>{TYPE_LABEL[detail.exam_type]}</span>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {detail.general_instructions?.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs font-bold text-amber-800 mb-1 uppercase tracking-wide">Instructions</p>
                  <ol className="text-sm text-amber-900 list-decimal list-inside space-y-0.5">
                    {detail.general_instructions.map((ins,i)=><li key={i}>{ins}</li>)}
                  </ol>
                </div>
              )}
              {detail.sections?.map((sec, si) => (
                <div key={si} className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2 flex items-center justify-between">
                    <span className="font-semibold text-slate-700 text-sm">
                      Section {String.fromCharCode(65+si)} — {sec.title}
                    </span>
                    <span className="text-xs text-slate-500">
                      {sec.questions?.length} Q × {sec.marks_per_question}m = {(sec.questions?.length||0)*sec.marks_per_question}m
                      {sec.attempt_any > 0 && ` (attempt any ${sec.attempt_any})`}
                    </span>
                  </div>
                  <div className="p-3 space-y-2">
                    {sec.questions?.map((q, qi) => (
                      <div key={qi} className="flex gap-3 text-sm py-1.5 border-b border-slate-50 last:border-0">
                        <span className="text-slate-400 font-medium min-w-[24px]">{qi+1}.</span>
                        <div className="flex-1">
                          <p className="text-slate-700">{q.text}</p>
                          {q.type === 'mcq' && q.options?.length > 0 && (
                            <div className="grid grid-cols-2 gap-1 mt-1">
                              {q.options.map((opt,oi)=>(
                                <span key={oi} className={`text-xs px-2 py-0.5 rounded ${q.correct_answer==String(oi) ? 'bg-emerald-100 text-emerald-700 font-medium' : 'text-slate-500'}`}>
                                  {String.fromCharCode(65+oi)}. {opt}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 shrink-0">{q.marks}m</span>
                      </div>
                    ))}
                    {(!sec.questions || sec.questions.length === 0) && (
                      <p className="text-xs text-slate-400 text-center py-2">No questions added</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
