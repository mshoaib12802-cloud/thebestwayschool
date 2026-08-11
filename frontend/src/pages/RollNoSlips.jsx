import { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { loadLogo as kitLoadLogo, C } from '../utils/pdfKit';
import {
  FileText, Plus, Trash2, Download, Settings,
  Users, BookOpen, Calendar, Printer, ChevronRight,
  GraduationCap, AlertCircle,
} from 'lucide-react';

const API_BASE = '';

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

const fmtDate = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
};
const dayName = (d) => d ? DAYS[new Date(d).getDay()] : '';

// Convert an image URL → base64 data URL (for embedding in PDF)
const urlToBase64 = (url) => new Promise((resolve) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width  = img.naturalWidth;
    c.height = img.naturalHeight;
    c.getContext('2d').drawImage(img, 0, 0);
    resolve(c.toDataURL('image/jpeg'));
  };
  img.onerror = () => resolve(null);
  img.src = url;
});

// ── PDF Generator ─────────────────────────────────────────────────────────
async function generateSlipsPDF({ students, schedule, config }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PW = 210, PH = 297;
  const HALF = PH / 2;   // 2 slips per page — top and bottom halves
  const MARGIN = 8;
  const SLIP_H = HALF - 4; // usable height per slip

  // Pre-load logo (try settings upload, then bundled 512px PNG via pdfKit)
  let logoB64 = null;
  try { logoB64 = await urlToBase64(`${API_BASE}/uploads/logo.jpeg`); } catch { /* */ }
  if (!logoB64) logoB64 = await kitLoadLogo();

  // Pre-load all student photos
  const photoMap = {};
  await Promise.all(
    students.map(async (s) => {
      if (s.photo) {
        const b64 = await urlToBase64(`${API_BASE}/uploads/students/${s.photo}`);
        if (b64) photoMap[s._id] = b64;
      }
    })
  );

  const drawSlip = (s, yOffset) => {
    const L = MARGIN;
    const W = PW - MARGIN * 2;
    const T = yOffset + 2;

    // ── Outer border ─────────────────────────────────────────────────────
    doc.setDrawColor(...C.navy);
    doc.setLineWidth(0.8);
    doc.rect(L, T, W, SLIP_H - 4);

    // ── Double-line decorative inner border ───────────────────────────────
    doc.setDrawColor(...C.navy);
    doc.setLineWidth(0.25);
    doc.rect(L + 1.5, T + 1.5, W - 3, SLIP_H - 7);

    // ── Header background band ────────────────────────────────────────────
    doc.setFillColor(...C.navy);
    doc.rect(L + 1.5, T + 1.5, W - 3, 22, 'F');
    // Gold top trim
    doc.setFillColor(...C.gold);
    doc.rect(L + 1.5, T + 1.5, W - 3, 1, 'F');

    // Logo (top-left inside header)
    if (logoB64) {
      doc.addImage(logoB64, 'JPEG', L + 3.5, T + 2.5, 18, 18, undefined, 'FAST');
    }

    // School name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(config.schoolName.toUpperCase(), PW / 2, T + 9, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(config.schoolAddress || '', PW / 2, T + 14, { align: 'center' });

    // "ROLL NUMBER SLIP" gold title banner
    doc.setFillColor(...C.gold);
    doc.rect(L + 1.5, T + 23.5, W - 3, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...C.navy);
    doc.text('ROLL NUMBER SLIP', PW / 2, T + 28.5, { align: 'center' });

    // Exam title (below yellow band)
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(80, 80, 80);
    doc.text(config.examTitle, PW / 2, T + 33.5, { align: 'center' });

    // ── Student photo (top-right corner) ──────────────────────────────────
    const photoX = PW - MARGIN - 1.5 - 22;
    const photoY = T + 35;
    const photoW = 20, photoH = 24;
    if (photoMap[s._id]) {
      doc.addImage(photoMap[s._id], 'JPEG', photoX, photoY, photoW, photoH, undefined, 'FAST');
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.3);
      doc.rect(photoX, photoY, photoW, photoH);
    } else {
      doc.setFillColor(230, 230, 230);
      doc.rect(photoX, photoY, photoW, photoH, 'F');
      doc.setFontSize(6);
      doc.setTextColor(130, 130, 130);
      doc.text('Photo', photoX + photoW / 2, photoY + photoH / 2 + 1, { align: 'center' });
    }

    // ── Roll number (large, prominent) ────────────────────────────────────
    doc.setFillColor(235, 242, 255);
    doc.roundedRect(L + 3, T + 35, 55, 12, 1.5, 1.5, 'F');
    doc.setDrawColor(...C.gold);
    doc.setLineWidth(0.5);
    doc.roundedRect(L + 3, T + 35, 55, 12, 1.5, 1.5, 'S');
    doc.setFillColor(...C.gold);
    doc.roundedRect(L + 3, T + 35, 2.5, 12, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(120, 130, 150);
    doc.text('ROLL NUMBER', L + 7, T + 39.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...C.navy);
    doc.text(s.roll_number, L + 7, T + 45.5);

    // Seat number (if available)
    if (s.seat_info?.seat_no) {
      doc.setFillColor(255, 248, 230);
      doc.rect(L + 61, T + 35, 45, 12, 'F');
      doc.setDrawColor(200, 150, 0);
      doc.setLineWidth(0.3);
      doc.rect(L + 61, T + 35, 45, 12);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 100, 100);
      doc.text('SEAT NO.', L + 63, T + 39.5);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(150, 100, 0);
      doc.text(s.seat_info.seat_no, L + 63, T + 45.5);
    }

    // ── Student info fields ────────────────────────────────────────────────
    const fieldX  = L + 3;
    const labelW  = 32;
    let fy = T + 51;
    const lineH   = 6.5;
    const infoW   = photoX - fieldX - 3;

    const drawField = (label, value) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(80, 80, 80);
      doc.text(label + ' :', fieldX, fy);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(0, 0, 0);
      // underline
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      doc.line(fieldX + labelW, fy + 1, fieldX + infoW, fy + 1);
      doc.text(value || '—', fieldX + labelW + 1, fy);
      fy += lineH;
    };

    drawField("Student's Name", s.full_name);
    drawField("Father's Name",  s.father_name || '—');
    drawField('Class / Grade',  `${s.school_class}${s.section ? ' — Section ' + s.section : ''}`);
    drawField('Subject Group',  s.subject_group !== 'None' ? s.subject_group : 'N/A (Primary / Middle)');
    drawField('Medium',         s.medium || 'English');
    if (s.seat_info?.room_name) drawField('Examination Room', s.seat_info.room_name);

    // ── Exam schedule table ───────────────────────────────────────────────
    const tableTop = T + 51 + lineH * (s.seat_info?.room_name ? 6 : 5) + 2;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(0, 84, 166);
    doc.text('EXAMINATION SCHEDULE', L + 3, tableTop);

    if (schedule.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6);
      doc.setTextColor(150, 150, 150);
      doc.text('No schedule entries added.', L + 3, tableTop + 5);
    } else {
      autoTable(doc, {
        startY: tableTop + 2,
        margin: { left: L + 3, right: MARGIN + 3 },
        head: [['Date', 'Day', 'Subject', 'Time']],
        body: schedule.map(e => [
          fmtDate(e.date),
          dayName(e.date),
          e.subject,
          e.time || '9:00 AM – 12:00 PM',
        ]),
        styles: {
          fontSize: 6.2,
          cellPadding: 1.2,
          lineColor: [180, 200, 230],
          lineWidth: 0.2,
          textColor: [20, 20, 20],
          font: 'helvetica',
        },
        headStyles: {
          fillColor: C.navy,
          textColor: C.white,
          fontStyle: 'bold',
          fontSize: 6.5,
        },
        alternateRowStyles: { fillColor: C.rowAlt },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 20 },
          2: { cellWidth: 'auto' },
          3: { cellWidth: 30 },
        },
        theme: 'grid',
      });
    }

    // ── Instructions ──────────────────────────────────────────────────────
    const instrTop = Math.max(
      schedule.length > 0 ? (doc.lastAutoTable?.finalY || tableTop + 20) + 3 : tableTop + 10,
      T + SLIP_H - 22
    );

    doc.setFillColor(248, 248, 235);
    doc.roundedRect(L + 3, instrTop, W - 6, 13, 1.5, 1.5, 'F');
    doc.setDrawColor(...C.gold);
    doc.setLineWidth(0.3);
    doc.roundedRect(L + 3, instrTop, W - 6, 13, 1.5, 1.5, 'S');
    doc.setFillColor(...C.gold);
    doc.roundedRect(L + 3, instrTop, 2.5, 13, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(...C.navy);
    doc.text('IMPORTANT INSTRUCTIONS:', L + 7, instrTop + 3.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(80, 80, 80);
    const instructions = [
      '1. This slip must be produced at the examination centre. Entry will not be allowed without it.',
      '2. Mobile phones, smart watches and electronic devices are strictly prohibited in the examination hall.',
      '3. Report to the centre at least 30 minutes before the examination starts.',
      '4. Write your Roll Number clearly on every answer sheet.',
    ];
    instructions.forEach((line, i) => {
      doc.text(line, L + 7, instrTop + 7 + i * 3.2);
    });

    // ── Signature line ─────────────────────────────────────────────────────
    const sigY = T + SLIP_H - 5.5;
    doc.setDrawColor(100, 100, 100);
    doc.setLineWidth(0.2);
    doc.line(PW - MARGIN - 1.5 - 52, sigY, PW - MARGIN - 1.5 - 5, sigY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(80, 80, 80);
    doc.text('Principal / Controller of Examinations', PW - MARGIN - 1.5 - 52, sigY + 3.5);

    // ── Dashed cut line between slips ─────────────────────────────────────
    if (yOffset === 0) {
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.3);
      doc.setLineDash([2, 2]);
      doc.line(0, HALF, PW, HALF);
      doc.setLineDash([]);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(180, 180, 180);
      doc.text('✂  Cut here', PW / 2, HALF - 0.5, { align: 'center' });
    }
  };

  // ── Render all slips, 2 per page ──────────────────────────────────────────
  for (let i = 0; i < students.length; i++) {
    if (i > 0 && i % 2 === 0) doc.addPage();
    const slotIndex = i % 2;  // 0 = top half, 1 = bottom half
    drawSlip(students[i], slotIndex === 0 ? 0 : HALF);
  }

  doc.save(`Roll_No_Slips_${config.examTitle.replace(/\s+/g, '_')}.pdf`);
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function RollNoSlips() {
  const [classes, setClasses]     = useState([]);
  const [years, setYears]         = useState([]);
  const [students, setStudents]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [fetching, setFetching]   = useState(false);
  const [generating, setGenerating] = useState(false);
  const [step, setStep]           = useState(1); // 1=setup, 2=schedule, 3=preview

  const [config, setConfig] = useState({
    schoolName:    'INFLORESCENCE ADVANCE SKILLS',
    schoolAddress: 'Multan, Punjab, Pakistan',
    examTitle:     '',
    class_id:      '',
    academic_year_id: '',
  });

  const [schedule, setSchedule] = useState([
    { subject: '', date: '', time: '9:00 AM – 12:00 PM' },
  ]);

  useEffect(() => {
    Promise.all([api.get('/school-classes'), api.get('/academic-years')])
      .then(([c, y]) => { setClasses(c.data || []); setYears(y.data || []); })
      .catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false));
  }, []);

  const fetchStudents = async () => {
    if (!config.class_id) { toast.error('Please select a class'); return; }
    if (!config.examTitle.trim()) { toast.error('Please enter an exam title'); return; }
    setFetching(true);
    try {
      const params = new URLSearchParams({ class_id: config.class_id });
      if (config.academic_year_id) params.append('academic_year_id', config.academic_year_id);
      const { data } = await api.get(`/roll-no-slips/students?${params}`);
      if (data.length === 0) { toast.warning('No students found for the selected class.'); return; }
      setStudents(data);
      setStep(2);
    } catch { toast.error('Failed to fetch students'); }
    finally { setFetching(false); }
  };

  const addRow = () => setSchedule(s => [...s, { subject: '', date: '', time: '9:00 AM – 12:00 PM' }]);
  const removeRow = (i) => setSchedule(s => s.filter((_, idx) => idx !== i));
  const updateRow = (i, field, val) => setSchedule(s => s.map((r, idx) => idx === i ? { ...r, [field]: val } : r));

  const validSchedule = schedule.filter(r => r.subject.trim() && r.date);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generateSlipsPDF({ students, schedule: validSchedule, config });
      toast.success(`Generated ${students.length} slip(s) — PDF downloading.`);
    } catch (e) {
      toast.error('PDF generation failed: ' + e.message);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600"/>
    </div>
  );

  const selectedClass = classes.find(c => c._id === config.class_id);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <FileText size={24} className="text-sky-600"/> Roll Number Slips
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">Generate Multan Board–style roll number slips for exams</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8">
        {[
          { n: 1, label: 'Exam Setup' },
          { n: 2, label: 'Schedule' },
          { n: 3, label: 'Generate' },
        ].map((s, i, arr) => (
          <div key={s.n} className="flex items-center gap-2 flex-1">
            <div className={`flex items-center gap-2 flex-1 ${step >= s.n ? 'opacity-100' : 'opacity-40'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${step > s.n ? 'bg-green-500 text-white' : step === s.n ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                {step > s.n ? '✓' : s.n}
              </div>
              <span className={`text-sm font-semibold hidden sm:block ${step === s.n ? 'text-sky-700' : 'text-slate-500'}`}>{s.label}</span>
            </div>
            {i < arr.length - 1 && <ChevronRight size={16} className="text-slate-300 flex-shrink-0"/>}
          </div>
        ))}
      </div>

      {/* ── Step 1: Exam Setup ─────────────────────────────────────────── */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <Settings size={16} className="text-sky-600"/>
            <h2 className="font-bold text-slate-700">Exam Configuration</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">School / Institution Name</label>
              <input value={config.schoolName}
                onChange={e => setConfig(c => ({ ...c, schoolName: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                placeholder="Full school name as it should appear on slip"/>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">School Address</label>
              <input value={config.schoolAddress}
                onChange={e => setConfig(c => ({ ...c, schoolAddress: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                placeholder="City, District, Province"/>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Exam Title <span className="text-red-500">*</span></label>
              <input value={config.examTitle}
                onChange={e => setConfig(c => ({ ...c, examTitle: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                placeholder="e.g.  Annual Examination 2025   |   Mid-Term Examination — Spring 2025"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Class <span className="text-red-500">*</span></label>
              <select value={config.class_id}
                onChange={e => setConfig(c => ({ ...c, class_id: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400">
                <option value="">Select class...</option>
                {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Academic Year</label>
              <select value={config.academic_year_id}
                onChange={e => setConfig(c => ({ ...c, academic_year_id: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400">
                <option value="">All years</option>
                {years.map(y => <option key={y._id} value={y._id}>{y.label}</option>)}
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button onClick={fetchStudents} disabled={fetching}
              className="flex items-center gap-2 bg-sky-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-sky-700 disabled:opacity-50">
              {fetching
                ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"/>
                : <Users size={16}/>}
              {fetching ? 'Loading students…' : 'Load Students & Continue'}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Exam Schedule ──────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Summary card */}
          <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4 flex items-center gap-4">
            <GraduationCap size={32} className="text-sky-600 flex-shrink-0"/>
            <div>
              <p className="font-bold text-sky-800">{config.examTitle}</p>
              <p className="text-sm text-sky-600">
                {selectedClass?.name || '—'} &nbsp;·&nbsp; {students.length} student{students.length !== 1 ? 's' : ''} found
              </p>
            </div>
          </div>

          {/* Schedule editor */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-sky-600"/>
                <h2 className="font-bold text-slate-700">Examination Schedule</h2>
              </div>
              <button onClick={addRow}
                className="flex items-center gap-1.5 text-xs font-semibold bg-sky-50 text-sky-600 border border-sky-200 px-3 py-1.5 rounded-lg hover:bg-sky-100">
                <Plus size={13}/> Add Subject
              </button>
            </div>

            <div className="space-y-2">
              {/* Column headers */}
              <div className="grid grid-cols-12 gap-2 px-1">
                <div className="col-span-4 text-xs font-semibold text-slate-500 uppercase">Subject</div>
                <div className="col-span-3 text-xs font-semibold text-slate-500 uppercase">Date</div>
                <div className="col-span-4 text-xs font-semibold text-slate-500 uppercase">Time</div>
                <div className="col-span-1"/>
              </div>

              {schedule.map((row, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <input value={row.subject} onChange={e => updateRow(i, 'subject', e.target.value)}
                    placeholder="e.g. Urdu, Mathematics…"
                    className="col-span-4 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"/>
                  <input type="date" value={row.date} onChange={e => updateRow(i, 'date', e.target.value)}
                    className="col-span-3 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"/>
                  <input value={row.time} onChange={e => updateRow(i, 'time', e.target.value)}
                    placeholder="9:00 AM – 12:00 PM"
                    className="col-span-4 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"/>
                  <button onClick={() => removeRow(i)} disabled={schedule.length === 1}
                    className="col-span-1 p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-30 transition-colors">
                    <Trash2 size={14}/>
                  </button>
                </div>
              ))}
            </div>

            {validSchedule.length === 0 && (
              <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded-lg p-2.5">
                <AlertCircle size={13}/>
                Fill at least Subject + Date to include schedule on slips. You can also leave blank and add it later.
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(1)}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-semibold text-sm hover:bg-slate-50">
              ← Back
            </button>
            <button onClick={() => setStep(3)}
              className="flex items-center gap-2 bg-sky-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-sky-700">
              Preview & Generate <ChevronRight size={15}/>
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Preview & Generate ────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
              <p className="text-xs text-slate-500 font-semibold uppercase">Students</p>
              <p className="text-2xl font-bold text-sky-700 mt-1">{students.length}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
              <p className="text-xs text-slate-500 font-semibold uppercase">Subjects</p>
              <p className="text-2xl font-bold text-slate-700 mt-1">{validSchedule.length}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
              <p className="text-xs text-slate-500 font-semibold uppercase">PDF Pages</p>
              <p className="text-2xl font-bold text-slate-700 mt-1">{Math.ceil(students.length / 2)}</p>
            </div>
          </div>

          {/* Student list preview */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-700 flex items-center gap-2">
                <Users size={15} className="text-sky-600"/> Students on Slips
              </h2>
              <span className="text-xs text-slate-400">2 slips per A4 page</span>
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
              {students.map((s, i) => (
                <div key={s._id} className="flex items-center gap-3 px-5 py-2.5">
                  <span className="text-xs text-slate-400 w-6">{i + 1}</span>
                  {s.photo
                    ? <img src={`${API_BASE}/uploads/students/${s.photo}`} className="w-8 h-8 rounded-full object-cover border border-slate-100"/>
                    : <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-xs font-bold">{s.full_name?.charAt(0)}</div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{s.full_name}</p>
                    <p className="text-xs text-slate-400">{s.father_name} &nbsp;·&nbsp; {s.school_class}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xs font-bold text-sky-700">{s.roll_number}</p>
                    {s.subject_group !== 'None' && (
                      <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-1.5 rounded-full">{s.subject_group}</span>
                    )}
                  </div>
                  {s.seat_info && (
                    <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full ml-1">
                      {s.seat_info.seat_no}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Schedule preview */}
          {validSchedule.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100">
                <h2 className="font-bold text-slate-700 flex items-center gap-2">
                  <Calendar size={15} className="text-sky-600"/> Exam Schedule Preview
                </h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs text-slate-500 uppercase">
                    <th className="text-left px-5 py-2 font-semibold">Date</th>
                    <th className="text-left px-5 py-2 font-semibold">Day</th>
                    <th className="text-left px-5 py-2 font-semibold">Subject</th>
                    <th className="text-left px-5 py-2 font-semibold">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {validSchedule.map((r, i) => (
                    <tr key={i} className="border-t border-slate-50">
                      <td className="px-5 py-2 font-semibold text-slate-700">{fmtDate(r.date)}</td>
                      <td className="px-5 py-2 text-slate-500">{dayName(r.date)}</td>
                      <td className="px-5 py-2 font-semibold text-slate-800">{r.subject}</td>
                      <td className="px-5 py-2 text-slate-600">{r.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-between">
            <button onClick={() => setStep(2)}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-semibold text-sm hover:bg-slate-50">
              ← Back
            </button>
            <button onClick={handleGenerate} disabled={generating}
              className="flex items-center gap-2 bg-sky-600 text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-sky-700 disabled:opacity-50 shadow-md">
              {generating
                ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"/>
                : <Download size={17}/>}
              {generating ? 'Generating PDF…' : `Download PDF  (${students.length} Slips)`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
