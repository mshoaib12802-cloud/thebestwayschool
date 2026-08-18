import { useState, useEffect } from 'react';
import api from '../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  FileText, Plus, Trash2, Eye, Send, X, ChevronDown,
  Users, CheckCircle, Clock, Download, Edit2, BookOpen, Layers
} from 'lucide-react';

const SHIFT_COLORS = {
  Morning:   { bg: '#fffbeb', color: '#92400e', border: '#fde68a' },
  Afternoon: { bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe' },
  Evening:   { bg: '#f5f3ff', color: '#5b21b6', border: '#ddd6fe' },
  Weekend:   { bg: '#f0fdf4', color: '#14532d', border: '#bbf7d0' },
};


const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function dayOfDate(dateStr) {
  if (!dateStr) return '';
  return DAYS[new Date(dateStr).getDay()];
}

const blankEntry = () => ({
  subject: '', date: '', start_time: '', end_time: '', room: '', examiner: '', notes: ''
});

export default function DateSheet() {
  const [tab, setTab] = useState('list');
  const [sheets, setSheets] = useState([]);
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // form state
  const [form, setForm] = useState({
    title: '', course_id: '', batch_id: '', description: '', academic_year: new Date().getFullYear().toString(),
    entries: [blankEntry()],
  });
  const [courseStudents, setCourseStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // detail modal
  const [detailSheet, setDetailSheet] = useState(null);

  useEffect(() => {
    fetchSheets();
    fetchCourses();
    fetchBatches();
  }, []);

  const fetchSheets = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/date-sheets`);
      setSheets(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchCourses = async () => {
    try {
      const { data } = await api.get(`/courses`);
      setCourses(data);
    } catch (e) { console.error(e); }
  };

  const fetchBatches = async () => {
    try {
      const { data } = await api.get(`/batches`);
      setBatches(data);
    } catch (e) { console.error(e); }
  };

  const onCourseChange = async (courseId) => {
    setForm(f => ({ ...f, course_id: courseId, batch_id: '' }));
    if (!courseId) { setCourseStudents([]); return; }
    try {
      setStudentsLoading(true);
      const { data } = await api.get(`/date-sheets/course/${courseId}/students`);
      setCourseStudents(data.students || []);
    } catch (e) { console.error(e); }
    finally { setStudentsLoading(false); }
  };

  const addEntry = () => setForm(f => ({ ...f, entries: [...f.entries, blankEntry()] }));
  const removeEntry = (i) => setForm(f => ({ ...f, entries: f.entries.filter((_, idx) => idx !== i) }));
  const updateEntry = (i, field, value) =>
    setForm(f => ({ ...f, entries: f.entries.map((e, idx) => idx === i ? { ...e, [field]: value } : e) }));

  const resetForm = () => {
    setForm({ title: '', course_id: '', batch_id: '', description: '', academic_year: new Date().getFullYear().toString(), entries: [blankEntry()] });
    setCourseStudents([]);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.course_id) return alert('Title and course are required');
    const validEntries = form.entries.filter(en => en.subject && en.date);
    if (!validEntries.length) return alert('Add at least one exam entry with subject and date');
    try {
      setSaving(true);
      if (editingId) {
        await api.put(`/date-sheets/${editingId}`, { ...form, entries: validEntries });
      } else {
        await api.post(`/date-sheets/add`, { ...form, entries: validEntries });
      }
      resetForm();
      setTab('list');
      fetchSheets();
    } catch (e) { alert(e.response?.data?.message || 'Error saving date sheet'); }
    finally { setSaving(false); }
  };

  const startEdit = (sheet) => {
    setForm({
      title: sheet.title,
      course_id: sheet.course_id?._id || sheet.course_id,
      batch_id: sheet.batch_id?._id || sheet.batch_id || '',
      description: sheet.description || '',
      academic_year: sheet.academic_year || '',
      entries: sheet.entries.length ? sheet.entries.map(en => ({
        ...en, date: en.date ? en.date.slice(0, 10) : ''
      })) : [blankEntry()],
    });
    setEditingId(sheet._id);
    onCourseChange(sheet.course_id?._id || sheet.course_id);
    setTab('create');
  };

  const togglePublish = async (id) => {
    try {
      await api.put(`/date-sheets/${id}/publish`, {});
      fetchSheets();
    } catch (e) { alert('Error updating publish status'); }
  };

  const deleteSheet = async (id) => {
    if (!confirm('Delete this date sheet?')) return;
    try {
      await api.delete(`/date-sheets/${id}`);
      fetchSheets();
    } catch (e) { alert('Error deleting'); }
  };

  const downloadPDF = (sheet) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();

    // Header background
    doc.setFillColor(30, 27, 75);
    doc.rect(0, 0, pageW, 38, 'F');

    // Institute name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('INFLORESCENCE ADVANCE SKILLS', pageW / 2, 14, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Date Sheet / Examination Schedule', pageW / 2, 22, { align: 'center' });

    doc.setFontSize(9);
    doc.setTextColor(180, 200, 255);
    doc.text('Excellence in Advanced Skills', pageW / 2, 29, { align: 'center' });

    // Divider line
    doc.setDrawColor(99, 102, 241);
    doc.setLineWidth(0.8);
    doc.line(14, 38, pageW - 14, 38);

    // Sheet meta info box
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
    const col1X = 18, col2X = pageW / 2 + 4;
    const batchName = sheet.batch_id?.name || (typeof sheet.batch_id === 'string' ? null : null);
    const courseLabel = batchName ? `${sheet.course_name}  |  Batch: ${batchName}` : sheet.course_name;
    doc.text(`Course: ${courseLabel}`, col1X, 61);
    doc.text(`Academic Year: ${sheet.academic_year || '—'}`, col2X, 61);
    if (sheet.description) {
      doc.text(`Note: ${sheet.description}`, col1X, 68);
    }
    const pubDate = sheet.published_at ? new Date(sheet.published_at).toLocaleDateString('en-PK') : new Date().toLocaleDateString('en-PK');
    doc.text(`Published: ${pubDate}`, col2X, 68);

    // Table
    const rows = sheet.entries.map((en, idx) => [
      idx + 1,
      en.subject,
      en.date ? new Date(en.date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
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
      headStyles: {
        fillColor: [30, 27, 75], textColor: 255,
        fontStyle: 'bold', halign: 'center', fontSize: 9
      },
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

    // Footer note
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setDrawColor(200, 200, 230);
    doc.setLineWidth(0.3);
    doc.line(14, finalY, pageW - 14, finalY);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 160);
    doc.text('Students are advised to report 15 minutes before the exam. Bring your Student ID Card.', pageW / 2, finalY + 6, { align: 'center' });
    doc.text('The Best Way Public School — Learn, Grow & Succeed', pageW / 2, finalY + 12, { align: 'center' });

    doc.save(`DateSheet_${sheet.course_name}_${sheet.title}.pdf`);
  };

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Date Sheets</h1>
          <p className="text-sm text-slate-500 mt-1">Create & publish exam date sheets for courses</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setTab('list'); resetForm(); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'list' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            All Date Sheets
          </button>
          <button
            onClick={() => { setTab('create'); if (editingId) resetForm(); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${tab === 'create' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            <Plus size={16} /> Create New
          </button>
        </div>
      </div>

      {/* LIST TAB */}
      {tab === 'list' && (
        <div>
          {loading ? (
            <div className="text-center py-16 text-slate-400">Loading...</div>
          ) : sheets.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-slate-100 shadow-sm">
              <FileText size={48} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">No date sheets yet</p>
              <p className="text-slate-400 text-sm mt-1">Create a date sheet and publish it for students</p>
              <button onClick={() => setTab('create')} className="mt-4 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                Create First Date Sheet
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {sheets.map(sheet => (
                <div key={sheet._id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-800 text-base">{sheet.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sheet.is_published ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {sheet.is_published ? '✓ Published' : '⏳ Draft'}
                        </span>
                        {sheet.batch_id?.name && (() => {
                          const sc = SHIFT_COLORS[sheet.batch_id.shift] || SHIFT_COLORS.Morning;
                          return (
                            <span style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, fontSize: '0.7rem', fontWeight: 700, padding: '1px 8px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <Layers size={10} /> {sheet.batch_id.name}
                            </span>
                          );
                        })()}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1"><BookOpen size={13} /> {sheet.course_name}</span>
                        {sheet.academic_year && <span>AY {sheet.academic_year}</span>}
                        <span>{sheet.entries.length} exam{sheet.entries.length !== 1 ? 's' : ''}</span>
                        {sheet.published_at && (
                          <span className="text-green-600">Published {new Date(sheet.published_at).toLocaleDateString('en-PK')}</span>
                        )}
                      </div>
                      {sheet.description && <p className="text-xs text-slate-400 mt-1">{sheet.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => setDetailSheet(sheet)} className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Preview">
                        <Eye size={17} />
                      </button>
                      <button onClick={() => downloadPDF(sheet)} className="p-2 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Download PDF">
                        <Download size={17} />
                      </button>
                      <button onClick={() => startEdit(sheet)} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                        <Edit2 size={17} />
                      </button>
                      <button
                        onClick={() => togglePublish(sheet._id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${sheet.is_published ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                      >
                        <Send size={12} />
                        {sheet.is_published ? 'Unpublish' : 'Publish'}
                      </button>
                      <button onClick={() => deleteSheet(sheet._id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>

                  {/* Entries mini preview */}
                  {sheet.entries.length > 0 && (
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-50">
                            <th className="px-3 py-1.5 text-left text-slate-500 font-medium rounded-l">Subject</th>
                            <th className="px-3 py-1.5 text-left text-slate-500 font-medium">Date</th>
                            <th className="px-3 py-1.5 text-left text-slate-500 font-medium">Day</th>
                            <th className="px-3 py-1.5 text-left text-slate-500 font-medium">Time</th>
                            <th className="px-3 py-1.5 text-left text-slate-500 font-medium rounded-r">Room</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sheet.entries.slice(0, 5).map((en, i) => (
                            <tr key={i} className="border-t border-slate-50">
                              <td className="px-3 py-1.5 text-slate-700 font-medium">{en.subject}</td>
                              <td className="px-3 py-1.5 text-slate-600">
                                {en.date ? new Date(en.date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short' }) : '—'}
                              </td>
                              <td className="px-3 py-1.5 text-slate-500">{dayOfDate(en.date)}</td>
                              <td className="px-3 py-1.5 text-slate-500">{en.start_time || '—'}{en.end_time ? ` – ${en.end_time}` : ''}</td>
                              <td className="px-3 py-1.5 text-slate-500">{en.room || '—'}</td>
                            </tr>
                          ))}
                          {sheet.entries.length > 5 && (
                            <tr><td colSpan={5} className="px-3 py-1 text-slate-400 text-center">+{sheet.entries.length - 5} more...</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE / EDIT TAB */}
      {tab === 'create' && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-6">
          <h2 className="text-lg font-semibold text-slate-800">{editingId ? 'Edit Date Sheet' : 'Create Date Sheet'}</h2>

          {/* Basic info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
              <input
                className="form-input w-full"
                placeholder="e.g. Mid-Term Exam Schedule — June 2026"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Academic Year</label>
              <input
                className="form-input w-full"
                placeholder="2026"
                value={form.academic_year}
                onChange={e => setForm(f => ({ ...f, academic_year: e.target.value }))}
              />
            </div>
          </div>

          {/* Course dropdown */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Course *</label>
            <div className="relative">
              <select
                className="form-input w-full appearance-none pr-8"
                value={form.course_id}
                onChange={e => onCourseChange(e.target.value)}
                required
                disabled={!!editingId}
              >
                <option value="">— Select a Course —</option>
                {courses.filter(c => c.is_active).map(c => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
              <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            {editingId && <p className="text-xs text-slate-400 mt-1">Course cannot be changed when editing</p>}
          </div>

          {/* Batch dropdown — optional, filtered by selected course */}
          {form.course_id && (() => {
            const selectedCourse = courses.find(c => c._id === form.course_id);
            const courseBatches = batches.filter(b => b.course_name === selectedCourse?.name);
            if (!courseBatches.length) return null;
            return (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Batch <span className="text-slate-400 font-normal">(optional)</span></label>
                <div className="relative">
                  <select
                    className="form-input w-full appearance-none pr-8"
                    value={form.batch_id}
                    onChange={e => setForm(f => ({ ...f, batch_id: e.target.value }))}
                  >
                    <option value="">— All students of this course —</option>
                    {courseBatches.map(b => (
                      <option key={b._id} value={b._id}>{b.name}{b.shift ? ` (${b.shift})` : ''}</option>
                    ))}
                  </select>
                  <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
                <p className="text-xs text-slate-400 mt-1">Assign to a specific batch to help students identify which group this schedule is for</p>
              </div>
            );
          })()}

          {/* Students preview */}
          {form.course_id && (
            <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
              <div className="flex items-center gap-2 mb-2">
                <Users size={15} className="text-indigo-600" />
                <span className="text-sm font-medium text-indigo-700">
                  {studentsLoading ? 'Loading students...' : `${courseStudents.length} student${courseStudents.length !== 1 ? 's' : ''} enrolled — date sheet will be sent to all`}
                </span>
              </div>
              {!studentsLoading && courseStudents.length > 0 && (
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {courseStudents.map(s => (
                    <span key={s._id} className="text-xs bg-white border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded-full">
                      {s.full_name} <span className="text-indigo-400">({s.roll_number})</span>
                    </span>
                  ))}
                </div>
              )}
              {!studentsLoading && courseStudents.length === 0 && (
                <p className="text-xs text-indigo-500">No active students enrolled in this course yet</p>
              )}
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes / Instructions (optional)</label>
            <textarea
              className="form-input w-full"
              rows={2}
              placeholder="e.g. Students must bring student ID card. No mobile phones allowed."
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>

          {/* Exam entries */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-slate-700">Exam Schedule Entries *</label>
              <button type="button" onClick={addEntry} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                <Plus size={14} /> Add Row
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500">
                    <th className="px-3 py-2 text-left font-medium text-xs rounded-l w-8">#</th>
                    <th className="px-3 py-2 text-left font-medium text-xs">Subject / Paper *</th>
                    <th className="px-3 py-2 text-left font-medium text-xs">Date *</th>
                    <th className="px-3 py-2 text-left font-medium text-xs">Day</th>
                    <th className="px-3 py-2 text-left font-medium text-xs">Start Time</th>
                    <th className="px-3 py-2 text-left font-medium text-xs">End Time</th>
                    <th className="px-3 py-2 text-left font-medium text-xs">Room</th>
                    <th className="px-3 py-2 text-left font-medium text-xs">Examiner</th>
                    <th className="px-3 py-2 rounded-r w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {form.entries.map((en, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-3 py-2 text-slate-400 text-xs">{i + 1}</td>
                      <td className="px-3 py-2">
                        <input
                          className="form-input w-full text-sm"
                          placeholder="e.g. Web Design"
                          value={en.subject}
                          onChange={e => updateEntry(i, 'subject', e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="date"
                          className="form-input w-full text-sm"
                          value={en.date}
                          onChange={e => updateEntry(i, 'date', e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2 text-slate-500 text-xs font-medium min-w-[80px]">
                        {dayOfDate(en.date) || <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-2">
                        <input type="time" className="form-input w-full text-sm" value={en.start_time}
                          onChange={e => updateEntry(i, 'start_time', e.target.value)} />
                      </td>
                      <td className="px-3 py-2">
                        <input type="time" className="form-input w-full text-sm" value={en.end_time}
                          onChange={e => updateEntry(i, 'end_time', e.target.value)} />
                      </td>
                      <td className="px-3 py-2">
                        <input className="form-input w-full text-sm" placeholder="Room A" value={en.room}
                          onChange={e => updateEntry(i, 'room', e.target.value)} />
                      </td>
                      <td className="px-3 py-2">
                        <input className="form-input w-full text-sm" placeholder="Name" value={en.examiner}
                          onChange={e => updateEntry(i, 'examiner', e.target.value)} />
                      </td>
                      <td className="px-3 py-2">
                        {form.entries.length > 1 && (
                          <button type="button" onClick={() => removeEntry(i)} className="text-slate-300 hover:text-red-500 transition-colors">
                            <X size={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={saving} className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-60 flex items-center gap-2">
              {saving ? 'Saving...' : (editingId ? 'Update Date Sheet' : 'Save Date Sheet')}
            </button>
            <button type="button" onClick={() => { resetForm(); setTab('list'); }} className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Detail Modal */}
      {detailSheet && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDetailSheet(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-800">{detailSheet.title}</h2>
                <p className="text-sm text-slate-500">{detailSheet.course_name} {detailSheet.academic_year && `· ${detailSheet.academic_year}`}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => downloadPDF(detailSheet)} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                  <Download size={15} /> Download PDF
                </button>
                <button onClick={() => setDetailSheet(null)} className="p-2 text-slate-400 hover:text-slate-600">
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
                      <td className="px-4 py-2.5 font-medium text-slate-800">{en.subject}</td>
                      <td className="px-4 py-2.5 text-slate-600">
                        {en.date ? new Date(en.date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500">{dayOfDate(en.date)}</td>
                      <td className="px-4 py-2.5 text-slate-500">{en.start_time || '—'}{en.end_time ? ` – ${en.end_time}` : ''}</td>
                      <td className="px-4 py-2.5 text-slate-500">{en.room || '—'}</td>
                      <td className="px-4 py-2.5 text-slate-500">{en.examiner || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
