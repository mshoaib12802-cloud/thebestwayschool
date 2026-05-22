import { useEffect, useState, useCallback } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import api from '../services/api';
import { toast } from 'react-toastify';
import { confirm } from '../utils/confirm';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  QrCode, Calendar, FileSpreadsheet, Search, X,
  User, Clock, CheckCircle2, Download, Briefcase,
  Users, Activity, AlertTriangle, RefreshCw,
  CheckCircle, XCircle, MinusCircle, Filter
} from 'lucide-react';

/* ── helpers ─────────────────────────────────────────── */
const STATUS_COLOR = {
  present: 'bg-emerald-500',
  absent:  'bg-red-500',
  leave:   'bg-amber-500',
  late:    'bg-orange-400',
};
const STATUS_TEXT = {
  present: { label: 'Present', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  absent:  { label: 'Absent',  cls: 'bg-red-100 text-red-700 border-red-200' },
  leave:   { label: 'Leave',   cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  late:    { label: 'Late',    cls: 'bg-orange-100 text-orange-700 border-orange-200' },
  null:    { label: 'Not Marked', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
};
const dotColor = s => STATUS_COLOR[s] || 'bg-slate-300';
const cellColor = s => {
  if (s === 'present') return 'bg-emerald-500 text-white shadow-sm';
  if (s === 'absent')  return 'bg-red-500 text-white shadow-sm';
  if (s === 'leave')   return 'bg-amber-400 text-white shadow-sm';
  if (s === 'late')    return 'bg-orange-400 text-white shadow-sm';
  return 'bg-slate-100 text-slate-300';
};
const currentYear = new Date().getFullYear();
const YEARS = [currentYear - 1, currentYear, currentYear + 1];
const monthName = m => new Date(0, m - 1).toLocaleString('default', { month: 'long' });

/* ── main component ──────────────────────────────────── */
const Attendance = () => {
  const [activeTab, setActiveTab] = useState('scanner');

  /* scanner / manual */
  const [manualId, setManualId]         = useState('');
  const [manualStatus, setManualStatus] = useState('present');
  const [manualDate, setManualDate]     = useState(new Date().toISOString().split('T')[0]);

  /* today's live status */
  const [dailyStatus, setDailyStatus]   = useState([]);
  const [todayLoading, setTodayLoading] = useState(false);
  const [typeFilter, setTypeFilter]     = useState('all');    // all | student | staff
  const [statusFilter, setStatusFilter] = useState('all');    // all | present | absent | leave | null
  const [todaySearch, setTodaySearch]   = useState('');

  /* register */
  const [reportData, setReportData]         = useState([]);
  const [staffReportData, setStaffReportData] = useState([]);
  const [selectedMonth, setSelectedMonth]   = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear]     = useState(currentYear);
  const [loading, setLoading]               = useState(false);
  const [searchQuery, setSearchQuery]       = useState('');
  const [staffSearch, setStaffSearch]       = useState('');

  /* modal */
  const [selectedStudent, setSelectedStudent] = useState(null);

  /* ── fetch daily status ─────────────────────────── */
  const fetchDailyStatus = useCallback(async (silent = false) => {
    if (!silent) setTodayLoading(true);
    try {
      const { data } = await api.get('/attendance/status');
      setDailyStatus(data);
    } catch { /* silent */ }
    finally { setTodayLoading(false); }
  }, []);

  /* ── scanner ────────────────────────────────────── */
  useEffect(() => {
    let scanner;
    if (activeTab === 'scanner') {
      fetchDailyStatus(true);
      const timer = setTimeout(() => {
        scanner = new Html5QrcodeScanner('reader', { fps: 10, qrbox: { width: 250, height: 250 } }, false);
        scanner.render(
          text => handleMarkAttendance(text, 'present', new Date()),
          err  => console.warn(err)
        );
      }, 100);
      return () => {
        clearTimeout(timer);
        if (scanner) scanner.clear().catch(() => {});
      };
    }
  }, [activeTab]);

  /* ── today tab ──────────────────────────────────── */
  useEffect(() => {
    if (activeTab === 'today') fetchDailyStatus();
  }, [activeTab]);

  /* ── register tabs ──────────────────────────────── */
  useEffect(() => {
    if (activeTab === 'report') fetchReport();
    if (activeTab === 'staff')  fetchStaffReport();
  }, [activeTab, selectedMonth, selectedYear]);

  /* ── mark attendance ────────────────────────────── */
  const handleMarkAttendance = async (id, status, date) => {
    try {
      const { data } = await api.post('/attendance/mark', { qr_code: id, status, date });
      toast.success(`✅ ${data.message}`);
      fetchDailyStatus(true);
    } catch (err) {
      toast.error(err.response?.data?.message || '❌ Failed to mark attendance');
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    handleMarkAttendance(manualId, manualStatus, manualDate);
    setManualId('');
  };

  const handleMarkAllPresent = async () => {
    if (!await confirm('Mark ALL active students as present for today?', { title: 'Mark All Present', confirmText: 'Mark Present', danger: false })) return;
    try {
      const { data } = await api.post('/attendance/mark-all', { date: new Date() });
      toast.success(`${data.marked} students marked present`);
      fetchDailyStatus(true);
    } catch { toast.error('Failed to mark all present'); }
  };

  /* ── reports ────────────────────────────────────── */
  const fetchReport = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/attendance/report?month=${selectedMonth}&year=${selectedYear}`);
      setReportData(data);
    } catch { toast.error('Failed to load report'); }
    finally { setLoading(false); }
  };

  const fetchStaffReport = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/attendance/staff-report?month=${selectedMonth}&year=${selectedYear}`);
      setStaffReportData(data);
    } catch { toast.error('Failed to load staff report'); }
    finally { setLoading(false); }
  };

  /* ── exports ────────────────────────────────────── */
  const exportToExcel = () => {
    if (!reportData.length) return toast.warning('No data to export');
    const rows = reportData.map(s => {
      let row = { 'Roll No': s.roll_no, 'Name': s.name, 'Present': s.stats.present, 'Absent': s.stats.absent, 'Leave': s.stats.leave, '%': s.stats.percentage };
      for (let i = 1; i <= 31; i++) row[`${i}`] = s.attendance[i] ? s.attendance[i].charAt(0).toUpperCase() : '-';
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    saveAs(new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/octet-stream' }), `Student_Attendance_${selectedMonth}_${selectedYear}.xlsx`);
    toast.success('Excel downloaded!');
  };

  const exportStaffExcel = () => {
    if (!staffReportData.length) return toast.warning('No data to export');
    const rows = staffReportData.map(s => {
      let row = { 'Name': s.name, 'Role': s.role, 'Present': s.stats.present, 'Absent': s.stats.absent, 'Leave': s.stats.leave, '%': s.stats.percentage };
      for (let i = 1; i <= 31; i++) row[`${i}`] = s.attendance[i] ? s.attendance[i].charAt(0).toUpperCase() : '-';
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Staff Attendance');
    saveAs(new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/octet-stream' }), `Staff_Attendance_${selectedMonth}_${selectedYear}.xlsx`);
    toast.success('Excel downloaded!');
  };

  const exportStudentPDF = () => {
    if (!reportData.length) return toast.warning('No data to export');
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFillColor(15, 23, 42); doc.rect(0, 0, 300, 22, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(13);
    doc.text(`Student Attendance — ${monthName(selectedMonth)} ${selectedYear}`, 10, 14);
    autoTable(doc, {
      startY: 26,
      head: [['Name', 'Roll No', ...[...Array(31)].map((_, i) => `${i + 1}`), 'P', 'A', 'L', '%']],
      body: reportData.map(s => [
        s.name, s.roll_no,
        ...[...Array(31)].map((_, i) => s.attendance[i + 1] ? s.attendance[i + 1].charAt(0).toUpperCase() : ''),
        s.stats.present, s.stats.absent, s.stats.leave || 0, s.stats.percentage
      ]),
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], fontSize: 6.5 },
      bodyStyles: { fontSize: 6 },
      columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 14 } }
    });
    doc.save(`Students_Attendance_${selectedMonth}_${selectedYear}.pdf`);
    toast.success('PDF downloaded!');
  };

  const exportStaffPDF = () => {
    if (!staffReportData.length) return toast.warning('No data to export');
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFillColor(5, 150, 105); doc.rect(0, 0, 300, 22, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(13);
    doc.text(`Staff Attendance — ${monthName(selectedMonth)} ${selectedYear}`, 10, 14);
    autoTable(doc, {
      startY: 26,
      head: [['Name', 'Role', ...[...Array(31)].map((_, i) => `${i + 1}`), 'P', 'A', 'L', '%']],
      body: staffReportData.map(s => [
        s.name, s.role.replace('_', ' '),
        ...[...Array(31)].map((_, i) => s.attendance[i + 1] ? s.attendance[i + 1].charAt(0).toUpperCase() : ''),
        s.stats.present, s.stats.absent, s.stats.leave || 0, s.stats.percentage
      ]),
      theme: 'grid',
      headStyles: { fillColor: [5, 150, 105], fontSize: 6.5 },
      bodyStyles: { fontSize: 6 },
      columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 18 } }
    });
    doc.save(`Staff_Attendance_${selectedMonth}_${selectedYear}.pdf`);
    toast.success('PDF downloaded!');
  };

  /* ── computed today stats ───────────────────────── */
  const todayStats = {
    present:    dailyStatus.filter(p => p.status === 'present').length,
    absent:     dailyStatus.filter(p => p.status === 'absent').length,
    leave:      dailyStatus.filter(p => p.status === 'leave').length,
    not_marked: dailyStatus.filter(p => p.status === null).length,
    total:      dailyStatus.length,
  };

  /* ── filtered today list ────────────────────────── */
  const filteredToday = dailyStatus.filter(p => {
    if (typeFilter !== 'all' && p.person_type !== typeFilter) return false;
    if (statusFilter === 'not_marked' && p.status !== null) return false;
    if (statusFilter !== 'all' && statusFilter !== 'not_marked' && p.status !== statusFilter) return false;
    if (todaySearch && !p.name.toLowerCase().includes(todaySearch.toLowerCase()) &&
        !(p.id_no || '').toLowerCase().includes(todaySearch.toLowerCase())) return false;
    return true;
  });

  /* ── filtered registers ─────────────────────────── */
  const filteredReport = reportData.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.roll_no.includes(searchQuery)
  );
  const filteredStaff = staffReportData.filter(s =>
    s.name.toLowerCase().includes(staffSearch.toLowerCase()) ||
    s.role.toLowerCase().includes(staffSearch.toLowerCase())
  );

  /* ── month/year controls (shared) ──────────────── */
  const PeriodControls = ({ accentClass = 'hover:text-indigo-600' }) => (
    <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
      <div className="flex items-center px-3 text-slate-400 gap-2 text-sm font-bold uppercase tracking-wider">
        <Filter size={15}/> Period
      </div>
      <div className="h-7 w-px bg-slate-200"/>
      <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}
        className={`bg-transparent font-bold text-slate-700 outline-none px-2 py-1 cursor-pointer ${accentClass}`}>
        {[...Array(12)].map((_, i) => <option key={i} value={i + 1}>{monthName(i + 1)}</option>)}
      </select>
      <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
        className={`bg-transparent font-bold text-slate-700 outline-none px-2 py-1 cursor-pointer ${accentClass}`}>
        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  );

  /* ── register table ─────────────────────────────── */
  const RegisterTable = ({ data, nameField = 'name', subField, subLabel }) => (
    <div className="relative overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[1300px]">
        <thead>
          <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
            <th className="p-4 border-b border-slate-200 w-60 sticky left-0 bg-slate-50 z-20 shadow-[4px_0_10px_-5px_rgba(0,0,0,0.1)]">
              {nameField === 'name' ? 'Person' : 'Student'}
            </th>
            {[...Array(31)].map((_, i) => (
              <th key={i} className="p-1 border-b border-slate-200 text-center min-w-[34px]">{i + 1}</th>
            ))}
            <th className="p-3 border-b border-slate-200 text-center min-w-[100px] sticky right-0 bg-slate-50 z-20 shadow-[-4px_0_10px_-5px_rgba(0,0,0,0.1)]">
              P / A / L
            </th>
          </tr>
        </thead>
        <tbody className="text-sm divide-y divide-slate-50">
          {data.map((row, idx) => {
            const pct = parseFloat(row.stats.percentage);
            const lowAtt = pct < 75 && pct > 0;
            return (
              <tr key={row._id}
                onClick={() => nameField === 'name' && subField === 'roll_no' ? setSelectedStudent(row) : null}
                className={`transition-colors group ${subField === 'roll_no' ? 'cursor-pointer' : ''} ${lowAtt ? 'bg-red-50/40 hover:bg-red-50/60' : 'hover:bg-indigo-50/20'}`}
              >
                <td className={`p-3 sticky left-0 z-10 border-r border-slate-100 shadow-[4px_0_10px_-5px_rgba(0,0,0,0.05)] ${lowAtt ? 'bg-red-50/60' : 'bg-white group-hover:bg-indigo-50/30'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                      lowAtt ? 'bg-red-100 text-red-600' :
                      idx % 3 === 0 ? 'bg-indigo-100 text-indigo-600' :
                      idx % 3 === 1 ? 'bg-emerald-100 text-emerald-600' : 'bg-violet-100 text-violet-600'
                    }`}>
                      {row.name.charAt(0)}
                    </div>
                    <div>
                      <span className={`font-bold text-sm block ${lowAtt ? 'text-red-700' : 'text-slate-700 group-hover:text-indigo-600'}`}>
                        {row.name}
                        {lowAtt && <AlertTriangle size={11} className="inline ml-1 text-red-400"/>}
                      </span>
                      <span className="text-slate-400 text-[10px] font-mono">
                        {subField === 'roll_no' ? row.roll_no : row.role?.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </td>

                {[...Array(31)].map((_, i) => {
                  const s = row.attendance[i + 1];
                  return (
                    <td key={i} className="text-center p-1">
                      <div className={`w-7 h-7 mx-auto rounded-lg flex items-center justify-center text-[9px] font-bold ${cellColor(s)}`}>
                        {s ? s.charAt(0).toUpperCase() : ''}
                      </div>
                    </td>
                  );
                })}

                <td className={`p-3 text-center sticky right-0 z-10 border-l border-slate-100 shadow-[-4px_0_10px_-5px_rgba(0,0,0,0.05)] ${lowAtt ? 'bg-red-50/60' : 'bg-white group-hover:bg-indigo-50/30'}`}>
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex gap-1 text-[10px] font-bold">
                      <span className="text-emerald-600">{row.stats.present}P</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-red-600">{row.stats.absent}A</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-amber-600">{row.stats.leave || 0}L</span>
                    </div>
                    <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <span className={`text-[10px] font-extrabold ${pct >= 75 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {row.stats.percentage}
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {data.length === 0 && !loading && (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center">
          <div className="p-4 bg-slate-50 rounded-full mb-3"><Search size={28}/></div>
          <p className="font-medium">No records found for this period.</p>
        </div>
      )}
    </div>
  );

  /* ── render ─────────────────────────────────────── */
  return (
    <div className="space-y-6 pb-12">

      {/* ── HEADER + TABS ────────────────────────────── */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col lg:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl"><Calendar size={24}/></div>
            Attendance Hub
          </h2>
          <p className="text-slate-500 mt-1 text-sm font-medium ml-1">QR scanner, live status, and monthly registers.</p>
        </div>

        <div className="bg-slate-100 p-1.5 rounded-2xl flex flex-wrap gap-1">
          {[
            { key: 'scanner', icon: <QrCode size={16}/>,        label: 'Scanner',         accent: 'text-indigo-600' },
            { key: 'today',   icon: <Activity size={16}/>,       label: 'Today\'s Status', accent: 'text-blue-600' },
            { key: 'report',  icon: <FileSpreadsheet size={16}/>,label: 'Student Register', accent: 'text-indigo-600' },
            { key: 'staff',   icon: <Briefcase size={16}/>,      label: 'Staff Register',  accent: 'text-emerald-600' },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
                activeTab === t.key ? `bg-white ${t.accent} shadow-md` : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          TAB 1: SCANNER & MANUAL
      ══════════════════════════════════════════════ */}
      {activeTab === 'scanner' && (
        <>
          {/* Today's quick stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Present Today',  value: todayStats.present,    color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100', icon: <CheckCircle size={18} className="text-emerald-500"/> },
              { label: 'Absent Today',   value: todayStats.absent,     color: 'text-red-600',     bg: 'bg-red-50 border-red-100',         icon: <XCircle size={18} className="text-red-400"/> },
              { label: 'On Leave',       value: todayStats.leave,      color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-100',     icon: <MinusCircle size={18} className="text-amber-500"/> },
              { label: 'Not Marked Yet', value: todayStats.not_marked, color: 'text-slate-600',   bg: 'bg-slate-50 border-slate-200',     icon: <Clock size={18} className="text-slate-400"/> },
            ].map(s => (
              <div key={s.label} className={`${s.bg} border rounded-2xl p-4 flex items-center gap-4`}>
                <div className="shrink-0">{s.icon}</div>
                <div>
                  <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
                  <p className="text-[11px] text-slate-500 font-medium">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Manual Entry */}
            <div className="bg-white p-7 rounded-3xl shadow-sm border border-slate-100 h-fit lg:sticky lg:top-6">
              <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-xl"><Clock size={18}/></div>
                <h3 className="font-bold text-slate-700">Manual Entry</h3>
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-5">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Roll No / Staff Email</label>
                  <div className="relative">
                    <User className="absolute left-4 top-3.5 text-slate-400" size={16}/>
                    <input className="form-input pl-11" value={manualId} onChange={e => setManualId(e.target.value)} placeholder="Enter ID..." required/>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Status</label>
                    <select className="form-select font-medium" value={manualStatus} onChange={e => setManualStatus(e.target.value)}>
                      <option value="present">✅ Present</option>
                      <option value="absent">❌ Absent</option>
                      <option value="leave">🟡 Leave</option>
                      <option value="late">🟠 Late</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Date</label>
                    <input type="date" className="form-input font-medium" value={manualDate} onChange={e => setManualDate(e.target.value)}/>
                  </div>
                </div>
                <button type="submit" className="w-full bg-slate-900 text-white py-3.5 rounded-2xl font-bold shadow-lg shadow-slate-200 hover:bg-slate-800 hover:-translate-y-0.5 transition-all flex justify-center gap-2 items-center">
                  <CheckCircle2 size={20}/> Mark Attendance
                </button>
              </form>

              <div className="mt-4 pt-4 border-t border-slate-100">
                <button onClick={handleMarkAllPresent}
                  className="w-full bg-emerald-500 text-white py-3 rounded-2xl font-bold text-sm shadow-lg shadow-emerald-100 hover:bg-emerald-600 hover:-translate-y-0.5 transition-all flex justify-center gap-2 items-center">
                  <Users size={17}/> Mark All Students Present
                </button>
              </div>
            </div>

            {/* QR Scanner */}
            <div className="lg:col-span-2">
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-3xl shadow-2xl relative overflow-hidden flex flex-col items-center justify-center text-white min-h-[480px]">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -mr-16 -mt-16"/>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl -ml-16 -mb-16"/>
                <h3 className="font-bold text-xl mb-7 relative z-10 flex items-center gap-3">
                  <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"/>
                  Live QR Scanner
                </h3>
                <div className="relative z-10 p-2 bg-gradient-to-tr from-indigo-500 to-emerald-500 rounded-3xl shadow-2xl">
                  <div id="reader" className="w-[280px] md:w-[360px] bg-black rounded-2xl overflow-hidden"/>
                </div>
                <p className="text-slate-400 text-sm mt-7 relative z-10 font-medium bg-slate-800/60 px-5 py-2 rounded-full border border-slate-700">
                  Hold QR Code steady in front of camera
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════
          TAB 2: TODAY'S LIVE STATUS
      ══════════════════════════════════════════════ */}
      {activeTab === 'today' && (
        <div className="space-y-5">

          {/* Stats strip */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Total',      value: todayStats.total,      color: 'text-slate-700',   bg: 'bg-slate-50 border-slate-200' },
              { label: 'Present',    value: todayStats.present,    color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
              { label: 'Absent',     value: todayStats.absent,     color: 'text-red-600',     bg: 'bg-red-50 border-red-100' },
              { label: 'Leave',      value: todayStats.leave,      color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-100' },
              { label: 'Not Marked', value: todayStats.not_marked, color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-100' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} border rounded-2xl p-4 text-center`}>
                <p className={`text-3xl font-extrabold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row gap-3 items-center">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-3 text-slate-400" size={17}/>
              <input
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-slate-50 focus:bg-white transition-all"
                placeholder="Search by name or ID..."
                value={todaySearch}
                onChange={e => setTodaySearch(e.target.value)}
              />
            </div>

            {/* Type filter */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
              {[['all', 'All'], ['student', 'Students'], ['staff', 'Staff']].map(([k, l]) => (
                <button key={k} onClick={() => setTypeFilter(k)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${typeFilter === k ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>
                  {l}
                </button>
              ))}
            </div>

            {/* Status filter */}
            <div className="flex gap-1 flex-wrap">
              {[
                { k: 'all',        l: 'All',        cls: 'bg-slate-100 text-slate-700' },
                { k: 'present',    l: 'Present',    cls: 'bg-emerald-100 text-emerald-700' },
                { k: 'absent',     l: 'Absent',     cls: 'bg-red-100 text-red-700' },
                { k: 'leave',      l: 'Leave',      cls: 'bg-amber-100 text-amber-700' },
                { k: 'not_marked', l: 'Not Marked', cls: 'bg-blue-100 text-blue-700' },
              ].map(({ k, l, cls }) => (
                <button key={k} onClick={() => setStatusFilter(k)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    statusFilter === k ? `${cls} border-current ring-2 ring-offset-1 ring-current/20` : 'border-transparent bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}>
                  {l}
                </button>
              ))}
            </div>

            <button onClick={() => fetchDailyStatus()} title="Refresh"
              className={`p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors ${todayLoading ? 'animate-spin' : ''}`}>
              <RefreshCw size={16}/>
            </button>
          </div>

          {/* Person List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {todayLoading ? (
              <div className="py-16 text-center text-slate-400">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
                Loading...
              </div>
            ) : filteredToday.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <Activity size={36} className="mx-auto mb-3 text-slate-200"/>
                No records match your filter.
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {filteredToday.map(person => {
                  const sm = STATUS_TEXT[person.status] || STATUS_TEXT.null;
                  return (
                    <div key={person._id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                      {/* Avatar */}
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 ${
                        person.status === 'present' ? 'bg-emerald-100 text-emerald-700' :
                        person.status === 'absent'  ? 'bg-red-100 text-red-700' :
                        person.status === 'leave'   ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {person.name.charAt(0).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 text-sm">{person.name}</p>
                        <p className="text-xs text-slate-400">
                          {person.person_type === 'student' ? `Roll: ${person.id_no}` : person.role?.replace('_', ' ')}
                          {person.check_in && (
                            <span className="ml-2 text-emerald-600 font-medium">
                              In: {new Date(person.check_in).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Status badge */}
                      <span className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shrink-0 ${sm.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${dotColor(person.status)}`}/>
                        {sm.label}
                      </span>

                      {/* Quick-mark buttons */}
                      <div className="flex gap-1.5 shrink-0">
                        {[
                          { s: 'present', label: 'P', cls: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-500 hover:text-white', active: 'bg-emerald-500 text-white' },
                          { s: 'absent',  label: 'A', cls: 'bg-red-100 text-red-700 hover:bg-red-500 hover:text-white',     active: 'bg-red-500 text-white' },
                          { s: 'leave',   label: 'L', cls: 'bg-amber-100 text-amber-700 hover:bg-amber-500 hover:text-white', active: 'bg-amber-500 text-white' },
                        ].map(btn => (
                          <button
                            key={btn.s}
                            onClick={() => handleMarkAttendance(person.identifier, btn.s, new Date())}
                            className={`w-8 h-8 rounded-xl text-xs font-extrabold transition-all hover:scale-110 ${
                              person.status === btn.s ? btn.active : btn.cls
                            }`}
                            title={`Mark ${btn.s}`}
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {filteredToday.length > 0 && (
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-400 font-medium">
                Showing {filteredToday.length} of {dailyStatus.length} people · {new Date().toLocaleDateString('en-PK', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          TAB 3: STUDENT REGISTER
      ══════════════════════════════════════════════ */}
      {activeTab === 'report' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/40 flex flex-col xl:flex-row gap-4 justify-between items-center">
            <PeriodControls/>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3.5 top-3 text-slate-400" size={16}/>
              <input
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 text-sm transition-all"
                placeholder="Search student..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={exportToExcel} className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all flex items-center gap-2 active:scale-95">
                <Download size={16}/> Excel
              </button>
              <button onClick={exportStudentPDF} className="bg-rose-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-rose-600 transition-all flex items-center gap-2 active:scale-95">
                <Download size={16}/> PDF
              </button>
            </div>
          </div>
          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
            </div>
          ) : (
            <RegisterTable data={filteredReport} subField="roll_no"/>
          )}
          {filteredReport.length > 0 && (
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-400 font-medium">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500 inline-block"/> Present</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500 inline-block"/> Absent</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-400 inline-block"/> Leave</span>
              <span className="flex items-center gap-1.5 text-red-400"><AlertTriangle size={11}/> Below 75% attendance</span>
              <span className="ml-auto">{filteredReport.length} students</span>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════
          TAB 4: STAFF REGISTER
      ══════════════════════════════════════════════ */}
      {activeTab === 'staff' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/40 flex flex-col xl:flex-row gap-4 justify-between items-center">
            <PeriodControls accentClass="hover:text-emerald-600"/>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3.5 top-3 text-slate-400" size={16}/>
              <input
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 text-sm transition-all"
                placeholder="Search staff..." value={staffSearch} onChange={e => setStaffSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={exportStaffExcel} className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all flex items-center gap-2 active:scale-95">
                <Download size={16}/> Excel
              </button>
              <button onClick={exportStaffPDF} className="bg-teal-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-teal-700 transition-all flex items-center gap-2 active:scale-95">
                <Download size={16}/> PDF
              </button>
            </div>
          </div>
          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
            </div>
          ) : (
            <RegisterTable data={filteredStaff} subField="role"/>
          )}
          {filteredStaff.length > 0 && (
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-400 font-medium text-right">
              {filteredStaff.length} staff members
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════
          STUDENT DETAIL MODAL
      ══════════════════════════════════════════════ */}
      {selectedStudent && (() => {
        const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
        const firstDay    = new Date(selectedYear, selectedMonth - 1, 1).getDay();
        const pct = parseFloat(selectedStudent.stats.percentage);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[88vh] flex flex-col shadow-2xl">

              {/* Header */}
              <div className="p-6 border-b border-slate-100 rounded-t-3xl flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-indigo-200">
                    {selectedStudent.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">{selectedStudent.name}</h3>
                    <p className="text-slate-500 text-sm">{selectedStudent.roll_no} · {monthName(selectedMonth)} {selectedYear}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedStudent(null)} className="p-2 bg-slate-100 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors">
                  <X size={22}/>
                </button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto p-7 space-y-7">

                {/* Stat cards */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                    <p className="text-3xl font-extrabold text-emerald-600">{selectedStudent.stats.present}</p>
                    <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mt-1">Present</p>
                  </div>
                  <div className="p-5 bg-red-50 rounded-2xl border border-red-100 text-center">
                    <p className="text-3xl font-extrabold text-red-600">{selectedStudent.stats.absent}</p>
                    <p className="text-xs font-bold text-red-700 uppercase tracking-wide mt-1">Absent</p>
                  </div>
                  <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100 text-center">
                    <p className="text-3xl font-extrabold text-amber-600">{selectedStudent.stats.leave || 0}</p>
                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mt-1">Leave</p>
                  </div>
                  <div className={`p-5 rounded-2xl border text-center ${pct >= 75 ? 'bg-indigo-50 border-indigo-100' : 'bg-red-50 border-red-200'}`}>
                    <p className={`text-3xl font-extrabold ${pct >= 75 ? 'text-indigo-600' : 'text-red-600'}`}>
                      {selectedStudent.stats.percentage}
                    </p>
                    <p className={`text-xs font-bold uppercase tracking-wide mt-1 ${pct >= 75 ? 'text-indigo-700' : 'text-red-700'}`}>
                      Rate {pct < 75 ? '⚠️' : ''}
                    </p>
                  </div>
                </div>

                {/* Calendar */}
                <div>
                  <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <Calendar size={18} className="text-indigo-500"/>
                    Activity Calendar — {monthName(selectedMonth)} {selectedYear}
                  </h4>

                  {/* Weekday headers */}
                  <div className="grid grid-cols-7 gap-2 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                      <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase">{d}</div>
                    ))}
                  </div>

                  {/* Calendar grid — aligned to correct starting weekday */}
                  <div className="grid grid-cols-7 gap-2">
                    {/* Empty offset cells */}
                    {[...Array(firstDay)].map((_, i) => <div key={`e${i}`}/>)}
                    {/* Day cells */}
                    {[...Array(daysInMonth)].map((_, i) => {
                      const day = i + 1;
                      const status = selectedStudent.attendance[day];
                      return (
                        <div key={day}
                          className={`aspect-square rounded-xl flex flex-col items-center justify-center border-2 transition-all hover:scale-105 ${
                            status === 'present' ? 'bg-emerald-500 border-emerald-500 text-white shadow-md' :
                            status === 'absent'  ? 'bg-white border-red-200 text-red-500' :
                            status === 'leave'   ? 'bg-amber-100 border-amber-300 text-amber-700' :
                            status === 'late'    ? 'bg-orange-100 border-orange-300 text-orange-700' :
                            'bg-slate-50 border-slate-100 text-slate-300'
                          }`}
                        >
                          <span className="text-sm font-bold">{day}</span>
                          {status && <span className="text-[9px] uppercase font-bold opacity-80 mt-0.5">{status.slice(0, 3)}</span>}
                        </div>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="flex gap-4 mt-4 flex-wrap text-xs text-slate-500">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500 inline-block"/> Present</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border-2 border-red-200 inline-block"/> Absent</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 border-2 border-amber-300 inline-block"/> Leave</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-50 border-2 border-slate-100 inline-block"/> No Record</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-3xl flex justify-end shrink-0">
                <button onClick={() => setSelectedStudent(null)}
                  className="px-6 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors">
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default Attendance;
