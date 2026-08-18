import { useState, useEffect } from 'react';
import api from '../../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileText, Download, Eye, X, CalendarDays, Clock, MapPin, User, Layers } from 'lucide-react';

const SHIFT_COLORS = {
  Morning:   { bg: 'rgba(255,251,235,0.15)', color: '#fcd34d', border: 'rgba(252,211,77,0.3)' },
  Afternoon: { bg: 'rgba(239,246,255,0.15)', color: '#93c5fd', border: 'rgba(147,197,253,0.3)' },
  Evening:   { bg: 'rgba(245,243,255,0.15)', color: '#c4b5fd', border: 'rgba(196,181,253,0.3)' },
  Weekend:   { bg: 'rgba(240,253,244,0.15)', color: '#6ee7b7', border: 'rgba(110,231,183,0.3)' },
};


const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
function dayOfDate(dateStr) {
  if (!dateStr) return '';
  return DAYS[new Date(dateStr).getDay()];
}

function formatDate(dateStr, opts = { day: '2-digit', month: 'short', year: 'numeric' }) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-PK', opts);
}

export default function StudentDateSheet() {
  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailSheet, setDetailSheet] = useState(null);

  useEffect(() => {
    api.get('/student-portal/date-sheets')
      .then(({ data }) => setSheets(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const downloadPDF = (sheet) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(30, 27, 75);
    doc.rect(0, 0, pageW, 38, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(19);
    doc.setFont('helvetica', 'bold');
    doc.text('INFLORESCENCE ADVANCE SKILLS', pageW / 2, 14, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Date Sheet / Examination Schedule', pageW / 2, 22, { align: 'center' });

    doc.setFontSize(8.5);
    doc.setTextColor(180, 200, 255);
    doc.text('Excellence in Advanced Skills', pageW / 2, 29, { align: 'center' });

    doc.setDrawColor(99, 102, 241);
    doc.setLineWidth(0.8);
    doc.line(14, 38, pageW - 14, 38);

    // Info box
    doc.setFillColor(245, 245, 255);
    doc.roundedRect(14, 42, pageW - 28, 32, 3, 3, 'F');
    doc.setDrawColor(180, 180, 220);
    doc.setLineWidth(0.3);
    doc.roundedRect(14, 42, pageW - 28, 32, 3, 3, 'S');

    doc.setTextColor(30, 27, 75);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(sheet.title, pageW / 2, 52, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(70, 70, 120);
    const batchLabel = sheet.batch_id?.name ? `  |  Batch: ${sheet.batch_id.name}` : '';
    doc.text(`Course: ${sheet.course_name}${batchLabel}`, 18, 61);
    doc.text(`Academic Year: ${sheet.academic_year || '—'}`, pageW / 2 + 4, 61);
    if (sheet.description) {
      doc.text(`Note: ${sheet.description}`, 18, 68);
    }
    const pubDate = sheet.published_at ? formatDate(sheet.published_at) : '—';
    doc.text(`Published: ${pubDate}`, pageW / 2 + 4, 68);

    // Table
    const rows = sheet.entries.map((en, idx) => [
      idx + 1,
      en.subject,
      en.date ? formatDate(en.date) : '—',
      dayOfDate(en.date),
      en.start_time ? `${en.start_time}${en.end_time ? ' – ' + en.end_time : ''}` : '—',
      en.room || '—',
      en.examiner || '—',
    ]);

    autoTable(doc, {
      startY: 80,
      head: [['#', 'Subject', 'Date', 'Day', 'Time', 'Room', 'Examiner']],
      body: rows,
      styles: { fontSize: 9, cellPadding: 3.5, font: 'helvetica' },
      headStyles: { fillColor: [30, 27, 75], textColor: 255, fontStyle: 'bold', halign: 'center', fontSize: 9 },
      alternateRowStyles: { fillColor: [245, 245, 255] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { cellWidth: 42 },
        2: { halign: 'center', cellWidth: 28 },
        3: { halign: 'center', cellWidth: 22 },
        4: { halign: 'center', cellWidth: 28 },
        5: { halign: 'center', cellWidth: 22 },
        6: { cellWidth: 28 },
      },
      margin: { left: 14, right: 14 },
      didDrawPage: (data) => {
        const pg = doc.internal.getCurrentPageInfo().pageNumber;
        const total = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${pg} of ${total}`, pageW / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
      },
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setDrawColor(200, 200, 230);
    doc.setLineWidth(0.3);
    doc.line(14, finalY, pageW - 14, finalY);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 160);
    doc.text('Report 15 minutes before the exam. Bring your Student ID Card.', pageW / 2, finalY + 6, { align: 'center' });
    doc.text('The Best Way Public School — Learn, Grow & Succeed', pageW / 2, finalY + 12, { align: 'center' });

    doc.save(`DateSheet_${sheet.course_name}.pdf`);
  };

  if (loading) {
    return <div className="text-center py-20 text-indigo-300">Loading date sheets...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Date Sheets</h1>
        <p className="text-sm text-slate-500 mt-1">Published exam schedules for your enrolled courses</p>
      </div>

      {sheets.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <CalendarDays size={52} className="mx-auto text-indigo-200 mb-4" />
          <h3 className="text-slate-600 font-semibold text-lg">No Date Sheets Published</h3>
          <p className="text-slate-400 text-sm mt-2">Your institute hasn't published any date sheets yet.<br />Check back soon!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sheets.map(sheet => (
            <div key={sheet._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {/* Card header */}
              <div className="p-5 flex items-start justify-between gap-4" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #3730a3 100%)' }}>
                <div>
                  <h3 className="text-white font-bold text-base leading-tight">{sheet.title}</h3>
                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                    <p className="text-indigo-300 text-sm">{sheet.course_name}{sheet.academic_year ? ` · ${sheet.academic_year}` : ''}</p>
                    {sheet.batch_id?.name && (() => {
                      const sc = SHIFT_COLORS[sheet.batch_id.shift] || SHIFT_COLORS.Morning;
                      return (
                        <span style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, fontSize: '0.65rem', fontWeight: 700, padding: '1px 8px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Layers size={9} /> {sheet.batch_id.name}
                        </span>
                      );
                    })()}
                  </div>
                  {sheet.description && <p className="text-indigo-200 text-xs mt-1">{sheet.description}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setDetailSheet(sheet)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium transition-colors border border-white/20"
                  >
                    <Eye size={13} /> View
                  </button>
                  <button
                    onClick={() => downloadPDF(sheet)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-400 hover:bg-indigo-300 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    <Download size={13} /> PDF
                  </button>
                </div>
              </div>

              {/* Summary stats */}
              <div className="flex items-center gap-6 px-5 py-3 bg-indigo-50/60 border-b border-indigo-100/50 text-xs text-indigo-700">
                <span className="flex items-center gap-1"><FileText size={12} /> {sheet.entries.length} Exam{sheet.entries.length !== 1 ? 's' : ''}</span>
                {sheet.entries.length > 0 && sheet.entries[0].date && (
                  <span className="flex items-center gap-1">
                    <CalendarDays size={12} />
                    {formatDate(sheet.entries[0].date, { day: '2-digit', month: 'short' })}
                    {sheet.entries.length > 1 ? ` → ${formatDate(sheet.entries[sheet.entries.length - 1].date, { day: '2-digit', month: 'short' })}` : ''}
                  </span>
                )}
                {sheet.published_at && (
                  <span className="flex items-center gap-1 text-green-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                    Published {formatDate(sheet.published_at, { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>

              {/* Entries table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs">
                      <th className="px-4 py-2.5 text-left font-semibold">#</th>
                      <th className="px-4 py-2.5 text-left font-semibold">Subject</th>
                      <th className="px-4 py-2.5 text-left font-semibold">Date</th>
                      <th className="px-4 py-2.5 text-left font-semibold">Day</th>
                      <th className="px-4 py-2.5 text-left font-semibold">Time</th>
                      <th className="px-4 py-2.5 text-left font-semibold">Room</th>
                      <th className="px-4 py-2.5 text-left font-semibold">Examiner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sheet.entries.map((en, i) => (
                      <tr key={i} className={`border-t border-slate-50 ${i % 2 === 1 ? 'bg-slate-50/40' : ''}`}>
                        <td className="px-4 py-3 text-slate-400 text-xs font-medium">{i + 1}</td>
                        <td className="px-4 py-3 text-slate-800 font-semibold">{en.subject}</td>
                        <td className="px-4 py-3 text-indigo-700 font-medium">
                          {en.date ? formatDate(en.date) : '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-500">{dayOfDate(en.date)}</td>
                        <td className="px-4 py-3 text-slate-500">
                          {en.start_time ? (
                            <span className="flex items-center gap-1"><Clock size={11} />{en.start_time}{en.end_time ? ` – ${en.end_time}` : ''}</span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {en.room ? <span className="flex items-center gap-1"><MapPin size={11} />{en.room}</span> : '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {en.examiner ? <span className="flex items-center gap-1"><User size={11} />{en.examiner}</span> : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bottom note */}
              <div className="px-5 py-3 bg-amber-50 border-t border-amber-100 text-xs text-amber-700">
                ⏰ Please report 15 minutes before your exam and bring your Student ID Card.
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full detail modal */}
      {detailSheet && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDetailSheet(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-800">{detailSheet.title}</h2>
                <p className="text-sm text-slate-500">{detailSheet.course_name}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => downloadPDF(detailSheet)} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                  <Download size={15} /> Download PDF
                </button>
                <button onClick={() => setDetailSheet(null)} className="p-2 text-slate-400 hover:text-slate-700">
                  <X size={20} />
                </button>
              </div>
            </div>
            {detailSheet.description && (
              <div className="mx-5 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                📋 {detailSheet.description}
              </div>
            )}
            <div className="p-5 overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr style={{ background: 'linear-gradient(90deg, #1e1b4b, #3730a3)' }}>
                    {['#', 'Subject', 'Date', 'Day', 'Time', 'Room', 'Examiner'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-white text-xs font-semibold text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {detailSheet.entries.map((en, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-indigo-50/40'}>
                      <td className="px-4 py-2.5 text-slate-400 text-xs">{i + 1}</td>
                      <td className="px-4 py-2.5 font-semibold text-slate-800">{en.subject}</td>
                      <td className="px-4 py-2.5 text-indigo-700 font-medium">{en.date ? formatDate(en.date) : '—'}</td>
                      <td className="px-4 py-2.5 text-slate-500">{dayOfDate(en.date)}</td>
                      <td className="px-4 py-2.5 text-slate-500">{en.start_time || '—'}{en.end_time ? ` – ${en.end_time}` : ''}</td>
                      <td className="px-4 py-2.5 text-slate-500">{en.room || '—'}</td>
                      <td className="px-4 py-2.5 text-slate-500">{en.examiner || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 pb-5 pt-2 text-xs text-slate-400 border-t border-slate-50">
              ⏰ Report 15 minutes early · Bring Student ID Card · The Best Way Public School
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
