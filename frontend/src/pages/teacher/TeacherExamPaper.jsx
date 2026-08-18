import { useState, useEffect, useContext } from 'react';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  FileText, Plus, Trash2, ChevronRight, ChevronLeft, Download,
  BookOpen, List, Eye, Check, X, Search, Filter, Award,
  Circle, CheckCircle2, Edit3, Save, RefreshCw, Zap, AlertTriangle
} from 'lucide-react';

// ── constants ────────────────────────────────────────────────────────────────
const Q_TYPES = [
  { value:'mcq',       label:'MCQ',           short:'A/B/C/D' },
  { value:'short',     label:'Short Question', short:'Short'   },
  { value:'long',      label:'Long Question',  short:'Long'    },
  { value:'true_false',label:'True / False',   short:'T/F'     },
  { value:'fill_blank',label:'Fill in Blank',  short:'Fill'    },
  { value:'pair_match',label:'Pair Match',     short:'Match'   },
];
const EXAM_TYPES  = ['annual','half_yearly','monthly_test','unit_test','quiz','practice'];
const EXAM_LABELS = { annual:'Annual', half_yearly:'Half-Yearly', monthly_test:'Monthly Test', unit_test:'Unit Test', quiz:'Quiz', practice:'Practice' };
const DIFF_CLS = { easy:'bg-emerald-100 text-emerald-700', medium:'bg-amber-100 text-amber-700', hard:'bg-rose-100 text-rose-700' };
const BLOOM    = ['remember','understand','apply','analyze','evaluate','create'];

const defaultSection = (idx) => ({
  _tmp: Date.now() + idx,
  title: idx === 0 ? 'Objective Type' : idx === 1 ? 'Short Questions' : 'Long Questions',
  instructions: '',
  question_type: idx === 0 ? 'mcq' : idx === 1 ? 'short' : 'long',
  marks_per_question: idx === 0 ? 1 : idx === 1 ? 4 : 8,
  attempt_any: 0,
  questions: [],        // array of full question objects (not just IDs) while editing
});

const defaultQ = (subjectId, classId) => ({
  subject_id: subjectId, class_id: classId,
  chapter_title:'', topic_title:'', type:'mcq',
  text:'', options:['','','',''], correct_answer:'0',
  marks:1, difficulty:'medium', bloom_level:'remember'
});

// ── step indicator ───────────────────────────────────────────────────────────
function Steps({ current }) {
  const steps = ['Paper Setup','Build Sections','Add Questions','Preview & Export'];
  return (
    <div className="flex items-center gap-0 mb-8 select-none">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={i} className="flex items-center flex-1 min-w-0">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              active  ? 'bg-primary text-white shadow' :
              done    ? 'bg-emerald-100 text-emerald-700' :
                        'bg-slate-100 text-slate-400'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                active ? 'bg-white/20' : done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                {done ? <Check size={12}/> : i+1}
              </span>
              <span className="hidden sm:block truncate">{s}</span>
            </div>
            {i < 3 && <div className={`h-0.5 flex-1 mx-1 ${done || active ? 'bg-primary/30' : 'bg-slate-200'}`}/>}
          </div>
        );
      })}
    </div>
  );
}

// ── main component ───────────────────────────────────────────────────────────
export default function TeacherExamPaper() {
  const { user } = useContext(AuthContext);

  // meta
  const [step, setStep] = useState(0);
  const [subjects, setSubjects] = useState([]);
  const [classes,  setClasses]  = useState([]);
  const [papers,   setPapers]   = useState([]);
  const [view,     setView]     = useState('list'); // 'list' | 'new'
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState('');

  // step 1 — paper info
  const [info, setInfo] = useState({
    title:'', subject_id:'', class_id:'', exam_type:'monthly_test',
    exam_date:'', duration_minutes:60, total_marks:100, pass_marks:40,
    general_instructions:['Attempt all questions.','Write clearly and legibly.']
  });

  // step 2 — sections
  const [sections, setSections] = useState([defaultSection(0), defaultSection(1), defaultSection(2)]);

  // step 3 — question bank
  const [bankQs,     setBankQs]     = useState([]);
  const [bankFilter, setBankFilter] = useState({ search:'', chapter:'', difficulty:'', type:'' });
  const [addQForm,   setAddQForm]   = useState(null); // open inline form
  const [activeSection, setActiveSection] = useState(0); // which section we're adding to

  const [syllabi, setSyllabi] = useState([]);

  useEffect(() => {
    api.get('/teacher-portal/profile').then(r => {
      const subjectIds = (r.data.subjects || []).map(s=>s._id||s);
      api.get('/subjects').then(sr => setSubjects(sr.data.filter(s => subjectIds.includes(s._id)))).catch(()=>{});
    }).catch(()=>{
      api.get('/subjects').then(r => setSubjects(r.data)).catch(()=>{});
    });
    api.get('/school-classes').then(r => setClasses(r.data)).catch(()=>{});
    fetchPapers();
  }, []);

  // load question bank when we reach step 3
  useEffect(() => {
    if (step === 2 && info.subject_id && info.class_id) {
      api.get('/bank-questions', { params:{ subject_id: info.subject_id, class_id: info.class_id } })
        .then(r => setBankQs(r.data)).catch(()=>{});
    }
  }, [step, info.subject_id, info.class_id]);

  const fetchPapers = async () => {
    try { const r = await api.get('/exam-papers'); setPapers(r.data); } catch {}
  };

  const flash = (text, err=false) => { setMsg({text,err}); setTimeout(()=>setMsg(''),3000); };

  // ── new paper flow ───────────────────────────────────────────────────────
  const startNew = () => {
    setInfo({ title:'', subject_id:'', class_id:'', exam_type:'monthly_test', exam_date:'', duration_minutes:60, total_marks:100, pass_marks:40, general_instructions:['Attempt all questions.','Write clearly and legibly.'] });
    setSections([defaultSection(0), defaultSection(1), defaultSection(2)]);
    setStep(0);
    setView('new');
    setBankQs([]);
  };

  // ── step 1 helpers ───────────────────────────────────────────────────────
  const addInstruction = () => setInfo(p => ({ ...p, general_instructions: [...p.general_instructions, ''] }));
  const setInstruction = (i, v) => setInfo(p => { const a=[...p.general_instructions]; a[i]=v; return {...p, general_instructions:a}; });
  const removeInstruction = (i) => setInfo(p => ({ ...p, general_instructions: p.general_instructions.filter((_,j)=>j!==i) }));

  const step1Valid = info.title && info.subject_id && info.class_id;

  // ── step 2 helpers ───────────────────────────────────────────────────────
  const addSection  = () => setSections(p => [...p, defaultSection(p.length)]);
  const delSection  = (i) => setSections(p => p.filter((_,j)=>j!==i));
  const updSection  = (i, field, val) => setSections(p => p.map((s,j) => j===i ? {...s,[field]:val} : s));

  const sectionTotal = (sec) => {
    const cnt = sec.attempt_any > 0 ? sec.attempt_any : (sec.questions?.length || 0);
    return cnt * (sec.marks_per_question || 0);
  };
  const totalMarksFromSections = sections.reduce((a,s) => a + sectionTotal(s), 0);

  // ── step 3 helpers ───────────────────────────────────────────────────────
  const filteredBank = bankQs.filter(q => {
    if (bankFilter.search && !q.text.toLowerCase().includes(bankFilter.search.toLowerCase()) &&
        !q.chapter_title.toLowerCase().includes(bankFilter.search.toLowerCase())) return false;
    if (bankFilter.chapter && !q.chapter_title.toLowerCase().includes(bankFilter.chapter.toLowerCase())) return false;
    if (bankFilter.difficulty && q.difficulty !== bankFilter.difficulty) return false;
    if (bankFilter.type && q.type !== bankFilter.type) return false;
    return true;
  });

  const isInSection = (sid, qId) => sections[sid]?.questions.some(q => q._id === qId);

  const toggleQInSection = (sid, q) => {
    setSections(p => p.map((s,i) => {
      if (i !== sid) return s;
      const exists = s.questions.some(x => x._id === q._id);
      return { ...s, questions: exists ? s.questions.filter(x=>x._id!==q._id) : [...s.questions, q] };
    }));
  };

  const removeQFromSection = (sid, qId) => {
    setSections(p => p.map((s,i) => i!==sid ? s : {...s, questions: s.questions.filter(q=>q._id!==qId)}));
  };

  // Save a new question to bank + add to active section
  const saveNewQ = async () => {
    if (!addQForm?.text) return;
    try {
      const r = await api.post('/bank-questions', addQForm);
      setBankQs(p => [r.data, ...p]);
      setSections(p => p.map((s,i) => i!==activeSection ? s : {...s, questions:[...s.questions, r.data]}));
      setAddQForm(null);
      flash('Question added to bank & section!');
    } catch(e) { flash('Failed: '+e.response?.data?.message, true); }
  };

  // ── step 4 — save & PDF ──────────────────────────────────────────────────
  const handleSave = async (publish=false) => {
    setSaving(true);
    try {
      const payload = {
        ...info,
        total_marks: totalMarksFromSections || info.total_marks,
        is_published: publish,
        sections: sections.map(s => ({
          title: s.title,
          instructions: s.instructions,
          question_type: s.question_type,
          marks_per_question: s.marks_per_question,
          attempt_any: s.attempt_any,
          questions: s.questions.map(q => q._id)
        }))
      };
      await api.post('/exam-papers', payload);
      flash(publish ? 'Paper published!' : 'Saved as draft!');
      fetchPapers();
      setView('list');
    } catch(e){ flash('Save failed: '+e.response?.data?.message, true); }
    finally { setSaving(false); }
  };

  // ── PDF Generation ───────────────────────────────────────────────────────
  const generatePDF = () => {
    const doc = new jsPDF({ unit:'mm', format:'a4' });
    const PW = 210, PH = 297, M = 15;
    const W = PW - 2*M;
    let y = M;

    const subject  = subjects.find(s=>s._id===info.subject_id);
    const cls      = classes.find(c=>c._id===info.class_id);

    // ─ Navy header ─
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, PW, 28, 'F');

    doc.setFont('helvetica','bold');
    doc.setFontSize(16);
    doc.setTextColor(255,255,255);
    doc.text('INFLORESCENCE ADVANCE SKILLS', PW/2, 11, {align:'center'});
    doc.setFontSize(8);
    doc.setFont('helvetica','normal');
    doc.setTextColor(148,163,184);
    doc.text('Quality Education For Every Student', PW/2, 17, {align:'center'});

    // Gold banner
    doc.setFillColor(251,191,36);
    doc.rect(0, 28, PW, 7, 'F');
    doc.setFont('helvetica','bold');
    doc.setFontSize(9);
    doc.setTextColor(30,20,0);
    doc.text((EXAM_LABELS[info.exam_type]||'').toUpperCase() + ' EXAMINATION', PW/2, 33, {align:'center'});

    y = 42;

    // Info box
    doc.setDrawColor(200,200,200);
    doc.setLineWidth(0.3);
    doc.rect(M, y, W, 22);

    const col = W/3;
    doc.setFont('helvetica','bold');
    doc.setFontSize(8);
    doc.setTextColor(80,80,80);
    doc.text('Subject:', M+3, y+6);
    doc.text('Class:', M+col+3, y+6);
    doc.text('Date:', M+col*2+3, y+6);
    doc.text('Total Marks:', M+3, y+14);
    doc.text('Time Allowed:', M+col+3, y+14);
    doc.text('Pass Marks:', M+col*2+3, y+14);

    doc.setFont('helvetica','normal');
    doc.setTextColor(20,20,20);
    doc.text(subject?.name || '—', M+22, y+6);
    doc.text((cls?.name||'') + ' ' + (cls?.section||''), M+col+18, y+6);
    doc.text(info.exam_date ? new Date(info.exam_date).toLocaleDateString('en-PK') : '___________', M+col*2+18, y+6);
    doc.text(String(info.total_marks || totalMarksFromSections), M+28, y+14);
    doc.text(info.duration_minutes + ' Minutes', M+col+28, y+14);
    doc.text(String(info.pass_marks), M+col*2+25, y+14);

    y += 28;

    // Student row
    doc.setFont('helvetica','normal');
    doc.setFontSize(8);
    doc.setTextColor(50,50,50);
    doc.text('Student Name: _____________________________', M, y+5);
    doc.text('Roll No: __________________', M+W/2, y+5);
    doc.line(M, y+8, PW-M, y+8);
    y += 14;

    // General instructions
    if (info.general_instructions?.filter(Boolean).length > 0) {
      doc.setFillColor(254,252,232);
      doc.rect(M, y, W, 6 + info.general_instructions.filter(Boolean).length * 5, 'F');
      doc.setDrawColor(251,191,36);
      doc.rect(M, y, W, 6 + info.general_instructions.filter(Boolean).length * 5);
      doc.setFont('helvetica','bold');
      doc.setFontSize(8);
      doc.setTextColor(120,80,0);
      doc.text('GENERAL INSTRUCTIONS', M+4, y+5);
      doc.setFont('helvetica','normal');
      doc.setTextColor(60,40,0);
      info.general_instructions.filter(Boolean).forEach((ins,i) => {
        doc.text(`${i+1}. ${ins}`, M+4, y+10 + i*5);
      });
      y += 8 + info.general_instructions.filter(Boolean).length * 5 + 4;
    }

    // Sections & Questions
    const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    sections.forEach((sec, si) => {
      if (sec.questions.length === 0) return;
      // Check page break
      if (y > PH - 40) { doc.addPage(); y = M; }

      // Section header
      doc.setFillColor(15, 23, 42);
      doc.rect(M, y, W, 8, 'F');
      doc.setFont('helvetica','bold');
      doc.setFontSize(9);
      doc.setTextColor(255,255,255);
      const secMark = sec.attempt_any > 0
        ? `(Attempt any ${sec.attempt_any}, ${sec.attempt_any * sec.marks_per_question} marks)`
        : `(${sec.questions.length * sec.marks_per_question} marks)`;
      doc.text(`SECTION ${ALPHA[si]} — ${sec.title.toUpperCase()}  ${secMark}`, PW/2, y+5.5, {align:'center'});
      y += 12;

      if (sec.instructions) {
        doc.setFont('helvetica','italic');
        doc.setFontSize(7.5);
        doc.setTextColor(80,80,80);
        doc.text(`Q.No.${si+1}: ${sec.instructions}`, M, y+4);
        y += 8;
      }

      if (sec.question_type === 'mcq') {
        // MCQ table
        const rows = sec.questions.map((q, qi) => {
          const opts = (q.options||[]).map((o,oi) => `${String.fromCharCode(65+oi)}. ${o}`).join('     ');
          return [`${qi+1}.`, q.text, opts];
        });
        autoTable(doc, {
          startY: y,
          head: [],
          body: rows,
          margin: { left: M, right: M },
          styles: { fontSize:8, cellPadding:2, textColor:[30,30,30] },
          columnStyles: { 0:{cellWidth:8, fontStyle:'bold'}, 1:{cellWidth:80}, 2:{cellWidth:W-88} },
          theme:'plain',
          didDrawPage: d => { y = d.cursor.y; }
        });
        y = doc.lastAutoTable.finalY + 6;
      } else {
        // Short / long questions with answer lines
        const linesPerQ = sec.question_type === 'long' ? 8 : 4;
        sec.questions.forEach((q, qi) => {
          if (y > PH - 30) { doc.addPage(); y = M; }
          doc.setFont('helvetica','bold');
          doc.setFontSize(8.5);
          doc.setTextColor(20,20,20);
          const roman = ['i','ii','iii','iv','v','vi','vii','viii','ix','x'];
          doc.text(`${roman[qi] || qi+1}. ${q.text}`, M, y+4);
          doc.setFont('helvetica','normal');
          doc.setFontSize(7);
          doc.setTextColor(120,120,120);
          doc.text(`(${q.marks} marks)`, PW-M-2, y+4, {align:'right'});
          y += 8;
          for (let l=0; l<linesPerQ; l++) {
            doc.setDrawColor(200,200,200);
            doc.line(M+4, y, PW-M, y);
            y += 5;
          }
          y += 3;
        });
      }
    });

    // Footer
    doc.setFont('helvetica','italic');
    doc.setFontSize(7);
    doc.setTextColor(150,150,150);
    doc.text('Best of Luck! — The Best Way Public School ERP', PW/2, PH-6, {align:'center'});

    doc.save(`${info.title || 'ExamPaper'}.pdf`);
  };

  // ── RENDER ───────────────────────────────────────────────────────────────
  if (view === 'list') return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileText size={22} className="text-primary"/> Exam Paper Generator
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Create professional exam papers from your question bank</p>
        </div>
        <button onClick={startNew}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl shadow font-medium hover:bg-primary/90 transition-colors text-sm">
          <Plus size={16}/> Create New Paper
        </button>
      </div>

      {msg && <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${msg.err?'bg-rose-50 text-rose-700':'bg-emerald-50 text-emerald-700'}`}>{msg.text}</div>}

      {papers.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <FileText size={48} className="mx-auto mb-3 opacity-20"/>
          <p className="font-medium">No exam papers yet</p>
          <p className="text-sm mt-1">Click "Create New Paper" to generate your first paper</p>
          <button onClick={startNew} className="mt-4 bg-primary text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-primary/90">
            Get Started
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {papers.map(p => (
            <div key={p._id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="font-semibold text-slate-800 text-sm leading-snug">{p.title}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${p.is_published?'bg-emerald-100 text-emerald-700':'bg-slate-100 text-slate-500'}`}>
                  {p.is_published ? 'Published' : 'Draft'}
                </span>
              </div>
              <div className="text-xs text-slate-500 space-y-1 mb-4">
                <div className="flex justify-between">
                  <span>{p.class_id?.name} {p.class_id?.section}</span>
                  <span className="font-medium text-slate-700">{p.subject_id?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>{EXAM_LABELS[p.exam_type]}</span>
                  <span>{p.total_marks} marks · {p.duration_minutes} min</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={async()=>{ const r=await api.get(`/exam-papers/${p._id}`); /* reopen in detail view */ }}
                  className="flex-1 text-xs border border-slate-200 text-slate-600 py-1.5 rounded-lg hover:bg-slate-50 flex items-center justify-center gap-1">
                  <Eye size={12}/> View
                </button>
                <button onClick={()=>{ /* open to edit */ }}
                  className="flex-1 text-xs bg-primary/10 text-primary py-1.5 rounded-lg hover:bg-primary/20 flex items-center justify-center gap-1">
                  <Download size={12}/> PDF
                </button>
                <button onClick={async()=>{ if(!confirm('Delete?'))return; await api.delete(`/exam-papers/${p._id}`); fetchPapers(); }}
                  className="text-xs text-rose-400 hover:text-rose-600 px-2 py-1.5 rounded-lg hover:bg-rose-50">
                  <Trash2 size={12}/>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ── WIZARD VIEW ──────────────────────────────────────────────────────────
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setView('list')} className="text-slate-400 hover:text-slate-600 transition-colors">
          <ChevronLeft size={20}/>
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Create Exam Paper</h1>
          <p className="text-xs text-slate-400">4-step wizard</p>
        </div>
      </div>

      {msg && <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${msg.err?'bg-rose-50 text-rose-700':'bg-emerald-50 text-emerald-700'}`}>{msg.text}</div>}

      <Steps current={step}/>

      {/* ── STEP 1: Paper Info ─────────────────────────────────────────── */}
      {step === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-2xl">
          <h2 className="font-bold text-slate-800 mb-5 flex items-center gap-2">
            <BookOpen size={18} className="text-primary"/> Paper Details
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Paper Title *</label>
              <input value={info.title} onChange={e=>setInfo(p=>({...p,title:e.target.value}))}
                placeholder="e.g. Annual Examination 2025-26 — Mathematics"
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"/>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Subject *</label>
                <select value={info.subject_id} onChange={e=>setInfo(p=>({...p,subject_id:e.target.value}))}
                  className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">Select Subject</option>
                  {subjects.map(s=><option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Class *</label>
                <select value={info.class_id} onChange={e=>setInfo(p=>({...p,class_id:e.target.value}))}
                  className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">Select Class</option>
                  {classes.map(c=><option key={c._id} value={c._id}>{c.name} {c.section}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Exam Type</label>
                <select value={info.exam_type} onChange={e=>setInfo(p=>({...p,exam_type:e.target.value}))}
                  className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                  {EXAM_TYPES.map(t=><option key={t} value={t}>{EXAM_LABELS[t]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Exam Date</label>
                <input type="date" value={info.exam_date} onChange={e=>setInfo(p=>({...p,exam_date:e.target.value}))}
                  className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"/>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Duration (min)</label>
                <input type="number" value={info.duration_minutes} onChange={e=>setInfo(p=>({...p,duration_minutes:+e.target.value}))}
                  className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"/>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Total Marks</label>
                <input type="number" value={info.total_marks} onChange={e=>setInfo(p=>({...p,total_marks:+e.target.value}))}
                  className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"/>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Pass Marks</label>
                <input type="number" value={info.pass_marks} onChange={e=>setInfo(p=>({...p,pass_marks:+e.target.value}))}
                  className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"/>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">General Instructions</label>
                <button onClick={addInstruction} className="text-xs text-primary flex items-center gap-1 hover:underline">
                  <Plus size={12}/> Add
                </button>
              </div>
              <div className="space-y-2">
                {info.general_instructions.map((ins,i)=>(
                  <div key={i} className="flex gap-2">
                    <span className="text-xs text-slate-400 mt-2">{i+1}.</span>
                    <input value={ins} onChange={e=>setInstruction(i,e.target.value)}
                      className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm"/>
                    <button onClick={()=>removeInstruction(i)} className="text-slate-300 hover:text-rose-400"><X size={14}/></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button onClick={()=>setStep(1)} disabled={!step1Valid}
              className="flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-xl font-medium text-sm disabled:opacity-50 hover:bg-primary/90 transition-colors">
              Build Sections <ChevronRight size={16}/>
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Sections ───────────────────────────────────────────── */}
      {step === 1 && (
        <div className="max-w-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <List size={18} className="text-primary"/> Paper Sections
            </h2>
            <div className="text-sm font-semibold text-primary">
              Total: {totalMarksFromSections} marks
            </div>
          </div>

          <div className="space-y-3 mb-4">
            {sections.map((sec, si) => (
              <div key={sec._tmp || si} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-sm text-primary">Section {String.fromCharCode(65+si)}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{sectionTotal(sec)} marks</span>
                    <button onClick={()=>delSection(si)} className="text-slate-300 hover:text-rose-400"><Trash2 size={14}/></button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-xs text-slate-500">Section Title</label>
                    <input value={sec.title} onChange={e=>updSection(si,'title',e.target.value)}
                      className="mt-0.5 w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm"/>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Question Type</label>
                    <select value={sec.question_type} onChange={e=>updSection(si,'question_type',e.target.value)}
                      className="mt-0.5 w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm">
                      {Q_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-slate-500">Marks / Question</label>
                    <input type="number" min={1} value={sec.marks_per_question}
                      onChange={e=>updSection(si,'marks_per_question',+e.target.value)}
                      className="mt-0.5 w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-center"/>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Questions Added</label>
                    <input disabled value={sec.questions?.length || 0}
                      className="mt-0.5 w-full border border-slate-100 bg-slate-50 rounded-lg px-2.5 py-1.5 text-sm text-center text-slate-500"/>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Attempt Any (0=All)</label>
                    <input type="number" min={0} value={sec.attempt_any}
                      onChange={e=>updSection(si,'attempt_any',+e.target.value)}
                      className="mt-0.5 w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-center"/>
                  </div>
                </div>
                <div className="mt-2">
                  <label className="text-xs text-slate-500">Section Instructions (optional)</label>
                  <input value={sec.instructions} onChange={e=>updSection(si,'instructions',e.target.value)}
                    placeholder="e.g. Attempt any 5 of the following…"
                    className="mt-0.5 w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm"/>
                </div>
              </div>
            ))}
          </div>

          <button onClick={addSection}
            className="w-full border-2 border-dashed border-slate-200 rounded-xl py-3 text-slate-400 hover:border-primary hover:text-primary flex items-center justify-center gap-2 transition-colors text-sm mb-6">
            <Plus size={16}/> Add Section
          </button>

          <div className="flex justify-between">
            <button onClick={()=>setStep(0)} className="flex items-center gap-1 text-slate-500 hover:text-slate-700 text-sm">
              <ChevronLeft size={16}/> Back
            </button>
            <button onClick={()=>setStep(2)}
              className="flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors">
              Add Questions <ChevronRight size={16}/>
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Questions ──────────────────────────────────────────── */}
      {step === 2 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            {sections.map((s,i)=>(
              <button key={i} onClick={()=>setActiveSection(i)}
                className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${activeSection===i?'bg-primary text-white':'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                Sec {String.fromCharCode(65+i)}
                <span className="ml-1 text-xs opacity-70">({s.questions.length} Q)</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left — Bank */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-3 border-b border-slate-100 bg-slate-50">
                <p className="font-semibold text-slate-700 text-sm mb-2">Question Bank</p>
                <div className="flex gap-2 flex-wrap">
                  <div className="relative flex-1 min-w-32">
                    <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"/>
                    <input value={bankFilter.search} onChange={e=>setBankFilter(p=>({...p,search:e.target.value}))}
                      placeholder="Search…"
                      className="w-full pl-6 pr-2 py-1.5 border border-slate-200 rounded-lg text-xs"/>
                  </div>
                  <select value={bankFilter.difficulty} onChange={e=>setBankFilter(p=>({...p,difficulty:e.target.value}))}
                    className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs">
                    <option value="">All Diff.</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                  <select value={bankFilter.type} onChange={e=>setBankFilter(p=>({...p,type:e.target.value}))}
                    className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs">
                    <option value="">All Types</option>
                    {Q_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="overflow-y-auto" style={{maxHeight:400}}>
                {filteredBank.length === 0 && !bankFilter.search && (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    <BookOpen size={32} className="mx-auto mb-2 opacity-30"/>
                    <p>No questions in bank yet</p>
                    <p className="text-xs mt-1">Use the form below to add questions</p>
                  </div>
                )}
                {filteredBank.map(q => {
                  const inSec = isInSection(activeSection, q._id);
                  return (
                    <div key={q._id}
                      className={`flex gap-2 px-3 py-2.5 border-b border-slate-50 hover:bg-slate-50 transition-colors ${inSec?'bg-emerald-50':''}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-700 font-medium line-clamp-2">{q.text}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${DIFF_CLS[q.difficulty]}`}>{q.difficulty}</span>
                          <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">{q.type}</span>
                          {q.chapter_title && <span className="text-[10px] text-slate-400">{q.chapter_title}</span>}
                          <span className="text-[10px] text-slate-400 ml-auto">{q.marks}m</span>
                        </div>
                      </div>
                      <button onClick={()=>toggleQInSection(activeSection, q)}
                        className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${inSec?'bg-emerald-500 text-white':'bg-slate-100 text-slate-400 hover:bg-primary hover:text-white'}`}>
                        {inSec ? <Check size={12}/> : <Plus size={12}/>}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Add new question form */}
              <div className="p-3 border-t border-slate-100">
                {addQForm ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <select value={addQForm.type} onChange={e=>setAddQForm(p=>({...p,type:e.target.value}))}
                        className="border border-slate-200 rounded px-2 py-1.5 text-xs col-span-2">
                        {Q_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                      <input value={addQForm.chapter_title} onChange={e=>setAddQForm(p=>({...p,chapter_title:e.target.value}))}
                        placeholder="Chapter (optional)" className="border border-slate-200 rounded px-2 py-1.5 text-xs"/>
                      <select value={addQForm.difficulty} onChange={e=>setAddQForm(p=>({...p,difficulty:e.target.value}))}
                        className="border border-slate-200 rounded px-2 py-1.5 text-xs">
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                    <textarea value={addQForm.text} onChange={e=>setAddQForm(p=>({...p,text:e.target.value}))}
                      placeholder="Question text *" rows={2}
                      className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs resize-none"/>
                    {addQForm.type === 'mcq' && (
                      <div className="space-y-1">
                        {(addQForm.options||['','','','']).map((opt,oi)=>(
                          <div key={oi} className="flex items-center gap-1">
                            <input type="radio" name="correct" value={String(oi)}
                              checked={addQForm.correct_answer===String(oi)}
                              onChange={()=>setAddQForm(p=>({...p,correct_answer:String(oi)}))}/>
                            <span className="text-xs text-slate-500 w-4">{String.fromCharCode(65+oi)}.</span>
                            <input value={opt} onChange={e=>{
                              const opts=[...addQForm.options]; opts[oi]=e.target.value;
                              setAddQForm(p=>({...p,options:opts}));
                            }} placeholder={`Option ${String.fromCharCode(65+oi)}`}
                            className="flex-1 border border-slate-200 rounded px-2 py-1 text-xs"/>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-slate-500">Marks:</label>
                      <input type="number" min={1} value={addQForm.marks}
                        onChange={e=>setAddQForm(p=>({...p,marks:+e.target.value}))}
                        className="w-14 border border-slate-200 rounded px-2 py-1 text-xs text-center"/>
                      <div className="flex gap-2 ml-auto">
                        <button onClick={()=>setAddQForm(null)} className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded">Cancel</button>
                        <button onClick={saveNewQ} className="text-xs bg-primary text-white px-3 py-1 rounded hover:bg-primary/90">
                          Save + Add
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button onClick={()=>setAddQForm(defaultQ(info.subject_id, info.class_id))}
                    className="w-full text-xs text-primary border border-primary/30 rounded-lg py-2 hover:bg-primary/5 flex items-center justify-center gap-1 transition-colors">
                    <Plus size={12}/> Add New Question to Bank
                  </button>
                )}
              </div>
            </div>

            {/* Right — Paper preview */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-3 border-b border-slate-100 bg-slate-50">
                <p className="font-semibold text-slate-700 text-sm">Paper — Section {String.fromCharCode(65+activeSection)}</p>
                <p className="text-xs text-slate-400">{sections[activeSection]?.title} · {sections[activeSection]?.marks_per_question}m each</p>
              </div>
              <div className="overflow-y-auto p-3" style={{maxHeight:460}}>
                {sections[activeSection]?.questions.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    Click <Plus size={10} className="inline"/> on questions from the bank to add them here
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sections[activeSection].questions.map((q, qi) => (
                      <div key={q._id} className="flex gap-2 items-start bg-slate-50 rounded-lg px-3 py-2">
                        <span className="text-xs font-bold text-slate-400 mt-0.5 min-w-[18px]">{qi+1}.</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-700">{q.text}</p>
                          {q.type === 'mcq' && q.options?.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-1">
                              {q.options.map((o,oi)=>(
                                <span key={oi} className={`text-[10px] px-1.5 py-0.5 rounded ${q.correct_answer===String(oi)?'bg-emerald-100 text-emerald-700 font-medium':'text-slate-400'}`}>
                                  {String.fromCharCode(65+oi)}. {o}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <button onClick={()=>removeQFromSection(activeSection,q._id)}
                          className="shrink-0 text-slate-300 hover:text-rose-400 mt-0.5"><X size={14}/></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <button onClick={()=>setStep(1)} className="flex items-center gap-1 text-slate-500 hover:text-slate-700 text-sm">
              <ChevronLeft size={16}/> Back
            </button>
            <button onClick={()=>setStep(3)}
              className="flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-xl font-medium text-sm hover:bg-primary/90">
              Preview & Export <ChevronRight size={16}/>
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Preview & Export ───────────────────────────────────── */}
      {step === 3 && (
        <div className="max-w-3xl">
          {/* Paper Preview Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-5">
            {/* Navy header */}
            <div className="bg-slate-900 text-white text-center py-4">
              <p className="font-bold text-base tracking-wide">INFLORESCENCE ADVANCE SKILLS</p>
              <p className="text-xs text-slate-400 mt-0.5">Quality Education For Every Student</p>
            </div>
            <div className="bg-amber-400 text-center py-1.5">
              <p className="text-xs font-bold text-amber-900 tracking-wider uppercase">
                {EXAM_LABELS[info.exam_type]} Examination
              </p>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-3 border-b border-slate-100 text-xs">
              {[
                ['Subject', subjects.find(s=>s._id===info.subject_id)?.name || '—'],
                ['Class',   classes.find(c=>c._id===info.class_id)?.name + ' ' + (classes.find(c=>c._id===info.class_id)?.section||'') || '—'],
                ['Date',    info.exam_date ? new Date(info.exam_date).toLocaleDateString() : '—'],
                ['Total Marks', info.total_marks || totalMarksFromSections],
                ['Time', info.duration_minutes + ' minutes'],
                ['Pass Marks', info.pass_marks],
              ].map(([k,v],i)=>(
                <div key={i} className="p-3 border-r border-b border-slate-100 last:border-r-0">
                  <p className="text-slate-400 text-[10px] uppercase tracking-wide">{k}</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{v}</p>
                </div>
              ))}
            </div>

            {/* Student row */}
            <div className="flex gap-6 px-4 py-3 border-b border-slate-100 text-xs text-slate-500">
              <span>Student Name: <span className="border-b border-slate-300 inline-block w-48">&nbsp;</span></span>
              <span>Roll No: <span className="border-b border-slate-300 inline-block w-24">&nbsp;</span></span>
            </div>

            {/* Instructions */}
            {info.general_instructions.filter(Boolean).length > 0 && (
              <div className="mx-4 my-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-[10px] font-bold text-amber-800 uppercase tracking-widest mb-1">General Instructions</p>
                <ol className="text-xs text-amber-900 list-decimal list-inside space-y-0.5">
                  {info.general_instructions.filter(Boolean).map((ins,i)=><li key={i}>{ins}</li>)}
                </ol>
              </div>
            )}

            {/* Sections */}
            {sections.map((sec, si) => (
              <div key={si} className="mx-4 mb-4">
                <div className="bg-slate-800 text-white text-center py-2 rounded-t-lg">
                  <p className="text-xs font-bold tracking-wide">
                    SECTION {String.fromCharCode(65+si)} — {sec.title.toUpperCase()}
                    {' '}({sec.attempt_any > 0
                      ? `Attempt any ${sec.attempt_any}, ${sec.attempt_any * sec.marks_per_question} marks`
                      : `${sec.questions.length * sec.marks_per_question} marks`})
                  </p>
                </div>
                <div className="border border-t-0 border-slate-200 rounded-b-lg p-3">
                  {sec.instructions && <p className="text-xs italic text-slate-500 mb-2">Q. {sec.instructions}</p>}
                  {sec.questions.length === 0
                    ? <p className="text-xs text-slate-400 text-center py-2">No questions added</p>
                    : sec.questions.map((q,qi)=>(
                      <div key={q._id} className="flex gap-2 mb-3 text-xs">
                        <span className="font-bold text-slate-500 min-w-[18px]">
                          {sec.question_type==='short'||sec.question_type==='long'
                            ? ['i','ii','iii','iv','v','vi','vii','viii','ix','x'][qi]+'.'
                            : (qi+1)+'.'}
                        </span>
                        <div className="flex-1">
                          <p className="text-slate-700">{q.text}</p>
                          {q.type==='mcq' && q.options?.length>0 && (
                            <div className="grid grid-cols-4 gap-1 mt-1">
                              {q.options.map((o,oi)=>(
                                <span key={oi} className="text-slate-500">
                                  <span className="font-bold">{String.fromCharCode(65+oi)}.</span> {o}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className="text-slate-400 shrink-0">({q.marks}m)</span>
                      </div>
                    ))}
                </div>
              </div>
            ))}

            <div className="text-center text-[10px] text-slate-400 py-3 border-t border-slate-100 italic">
              *** Best of Luck ***
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="font-bold text-slate-700 mb-4">Export & Save</h3>
            <div className="flex flex-wrap gap-3">
              <button onClick={generatePDF}
                className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-slate-800 transition-colors shadow">
                <Download size={16}/> Download PDF
              </button>
              <button onClick={()=>handleSave(false)} disabled={saving}
                className="flex items-center gap-2 border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-slate-50 transition-colors">
                <Save size={16}/>{saving?'Saving…':'Save as Draft'}
              </button>
              <button onClick={()=>handleSave(true)} disabled={saving}
                className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-emerald-700 transition-colors shadow">
                <Zap size={16}/>{saving?'Publishing…':'Publish Paper'}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-3">
              Total: <strong>{totalMarksFromSections} marks</strong> across {sections.length} sections
              &nbsp;·&nbsp; {sections.reduce((a,s)=>a+s.questions.length,0)} questions total
            </p>
          </div>

          <div className="flex justify-between mt-4">
            <button onClick={()=>setStep(2)} className="flex items-center gap-1 text-slate-500 hover:text-slate-700 text-sm">
              <ChevronLeft size={16}/> Back to Questions
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
