import { useEffect, useState, useCallback, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import api from '../services/api';
import { toast } from 'react-toastify';
import { savePendingRollCall, getPendingRollCalls, deletePendingRollCall } from '../utils/offlineAttendance';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { loadLogo, drawHeader, drawFooter, TABLE_STYLES, C, fmtDate as kitFmtDate } from '../utils/pdfKit';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import {
  QrCode, Calendar, Search, X, User, Clock, CheckCircle2, Download,
  Briefcase, Users, Activity, AlertTriangle, RefreshCw, CheckCircle,
  XCircle, MinusCircle, Filter, ClipboardList, BarChart2, Zap,
  Coffee, BookOpen, Save, ChevronDown, Bell, TrendingDown,
  Camera, Keyboard, ScanLine, Eye, WifiOff, Upload,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────
   GLOBAL HELPERS (outside component for stable refs)
───────────────────────────────────────────────────────── */
const API_BASE = '';

const STATUS_BADGE = {
  present:  { label: 'Present',    cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  absent:   { label: 'Absent',     cls: 'bg-red-100 text-red-700 border-red-200' },
  late:     { label: 'Late',       cls: 'bg-orange-100 text-orange-700 border-orange-200' },
  leave:    { label: 'Leave',      cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  half_day: { label: 'Half Day',   cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  null:     { label: 'Not Marked', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
};

const cellColor = (s) => {
  if (s === 'present')  return 'bg-emerald-500 text-white shadow-sm';
  if (s === 'absent')   return 'bg-red-500 text-white shadow-sm';
  if (s === 'leave')    return 'bg-amber-400 text-white shadow-sm';
  if (s === 'late')     return 'bg-orange-400 text-white shadow-sm';
  if (s === 'half_day') return 'bg-yellow-400 text-white shadow-sm';
  return 'bg-slate-100 text-slate-300';
};

const beep = (success = true) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = success ? 880 : 330;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch { /* silence */ }
};

const fmt12 = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const fmtDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
};

const currentYear = new Date().getFullYear();
const YEARS = [currentYear - 1, currentYear, currentYear + 1];
const monthName = (m) => new Date(0, m - 1).toLocaleString('default', { month: 'long' });
const todayISO  = () => new Date().toISOString().split('T')[0];

const dotColor = (s) => {
  if (s === 'present')  return 'bg-emerald-500';
  if (s === 'absent')   return 'bg-red-500';
  if (s === 'late')     return 'bg-orange-400';
  if (s === 'leave')    return 'bg-amber-400';
  return 'bg-slate-300';
};

/* ─────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────── */
const Attendance = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  /* ── shared ── */
  const [classes, setClasses]       = useState([]);

  /* ── dashboard ── */
  const [dailyStatus, setDailyStatus]   = useState([]);
  const [dashLoading, setDashLoading]   = useState(false);
  const dashTimerRef = useRef(null);

  /* ── scanner ── */
  const [manualId, setManualId]         = useState('');
  const [manualStatus, setManualStatus] = useState('present');
  const [manualDate, setManualDate]     = useState(todayISO());
  const [manualLateMin, setManualLateMin] = useState(0);
  const [manualNote, setManualNote]     = useState('');
  const [lastScanned, setLastScanned]   = useState(null);
  const scannerRef = useRef(null);

  /* ── roll call ── */
  const [rcClassId, setRcClassId]       = useState('');
  const [rcSection, setRcSection]       = useState('');
  const [rcDate, setRcDate]             = useState(todayISO());
  const [rcStudents, setRcStudents]     = useState([]);
  const [rcLoading, setRcLoading]       = useState(false);
  const [rcDirty, setRcDirty]           = useState(false);
  const [rcSaving, setRcSaving]         = useState(false);
  const [expandedNote, setExpandedNote] = useState({});
  const [rcClassName, setRcClassName]   = useState('');

  /* ── register ── */
  const [regSubTab, setRegSubTab]       = useState('students');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear]   = useState(currentYear);
  const [regClassFilter, setRegClassFilter] = useState('');
  const [regSectionFilter, setRegSectionFilter] = useState('');
  const [reportData, setReportData]       = useState([]);
  const [staffReportData, setStaffReportData] = useState([]);
  const [regLoading, setRegLoading]       = useState(false);
  const [regSearch, setRegSearch]         = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);

  /* ── reports ── */
  const [defThreshold, setDefThreshold]   = useState(75);
  const [defClassId, setDefClassId]       = useState('');
  const [defMonth, setDefMonth]           = useState(new Date().getMonth() + 1);
  const [defYear, setDefYear]             = useState(currentYear);
  const [defaulters, setDefaulters]       = useState([]);
  const [defLoading, setDefLoading]       = useState(false);
  const [trendData, setTrendData]         = useState([]);

  /* ── offline ── */
  const [isOnline,      setIsOnline]      = useState(navigator.onLine);
  const [pendingCount,  setPendingCount]  = useState(0);
  const [syncing,       setSyncing]       = useState(false);

  /* ── staff tab ── */
  const [staffDate, setStaffDate]         = useState(todayISO());
  const [staffList, setStaffList]         = useState([]);
  const [staffLoading, setStaffLoading]   = useState(false);
  const [staffMonthData, setStaffMonthData] = useState([]);
  const [staffMonthLoading, setStaffMonthLoading] = useState(false);
  const [staffMonth, setStaffMonth]       = useState(new Date().getMonth() + 1);
  const [staffYear, setStaffYear]         = useState(currentYear);

  /* ══════════════════════════════════════════════════════
     OFFLINE: track online status + pending count
  ══════════════════════════════════════════════════════ */
  useEffect(() => {
    const goOnline  = () => { setIsOnline(true);  loadPendingCount(); };
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);
    loadPendingCount();
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, []);

  const loadPendingCount = () => {
    getPendingRollCalls().then(items => setPendingCount(items.length)).catch(() => {});
  };

  const syncPending = async () => {
    if (!isOnline) { toast.warn('Still offline — cannot sync'); return; }
    setSyncing(true);
    try {
      const items = await getPendingRollCalls();
      if (!items.length) { toast.info('Nothing to sync'); setSyncing(false); return; }
      let synced = 0;
      for (const item of items) {
        try {
          await api.post('/attendance/bulk', { entries: item.entries, date: item.date, method: item.method });
          await deletePendingRollCall(item.id);
          synced++;
        } catch {}
      }
      toast.success(`Synced ${synced} roll call${synced !== 1 ? 's' : ''}`);
      loadPendingCount();
    } catch { toast.error('Sync failed'); }
    finally { setSyncing(false); }
  };

  /* ══════════════════════════════════════════════════════
     FETCH: Classes
  ══════════════════════════════════════════════════════ */
  useEffect(() => {
    api.get('/school-classes').then(r => setClasses(r.data || [])).catch(() => {});
  }, []);

  /* ══════════════════════════════════════════════════════
     FETCH: Daily Status (shared across tabs)
  ══════════════════════════════════════════════════════ */
  const fetchDailyStatus = useCallback(async (silent = false) => {
    if (!silent) setDashLoading(true);
    try {
      const { data } = await api.get('/attendance/status');
      setDailyStatus(data);
    } catch { /* silent */ }
    finally { setDashLoading(false); }
  }, []);

  /* ══════════════════════════════════════════════════════
     TAB: DASHBOARD — auto-refresh every 30s
  ══════════════════════════════════════════════════════ */
  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDailyStatus();
      dashTimerRef.current = setInterval(() => fetchDailyStatus(true), 30000);
    }
    return () => { if (dashTimerRef.current) clearInterval(dashTimerRef.current); };
  }, [activeTab, fetchDailyStatus]);

  /* ══════════════════════════════════════════════════════
     TAB: SCANNER
  ══════════════════════════════════════════════════════ */
  useEffect(() => {
    if (activeTab !== 'scanner') return;
    fetchDailyStatus(true);
    const timer = setTimeout(() => {
      if (document.getElementById('reader')) {
        const scanner = new Html5QrcodeScanner('reader', { fps: 10, qrbox: { width: 260, height: 260 } }, false);
        scannerRef.current = scanner;
        scanner.render(
          (text) => handleQrScan(text),
          (err)  => { /* ignore decode errors */ }
        );
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      if (scannerRef.current) scannerRef.current.clear().catch(() => {});
      scannerRef.current = null;
    };
  }, [activeTab]);

  const handleQrScan = async (text) => {
    try {
      const { data } = await api.post('/attendance/mark', {
        qr_code: text, status: 'present', date: new Date(), method: 'qr_scan'
      });
      beep(true);
      setLastScanned({ name: data.name, status: data.type, time: new Date(), photo: data.photo, type: data.type });
      toast.success(`${data.message}`);
      fetchDailyStatus(true);
    } catch (err) {
      beep(false);
      toast.error(err.response?.data?.message || 'Scan failed');
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        qr_code: manualId, status: manualStatus, date: manualDate, method: 'manual',
        note: manualNote,
        ...(manualStatus === 'late' && { late_minutes: Number(manualLateMin) }),
      };
      const { data } = await api.post('/attendance/mark', payload);
      beep(true);
      setLastScanned({ name: data.name, status: manualStatus, time: new Date(), photo: data.photo, type: data.type });
      toast.success(data.message);
      setManualId('');
      setManualNote('');
      setManualLateMin(0);
      fetchDailyStatus(true);
    } catch (err) {
      beep(false);
      toast.error(err.response?.data?.message || 'Failed to mark');
    }
  };

  /* ══════════════════════════════════════════════════════
     TAB: ROLL CALL
  ══════════════════════════════════════════════════════ */
  const loadClassRollCall = async () => {
    if (!rcClassId) { toast.warning('Please select a class'); return; }
    setRcLoading(true);
    try {
      const params = new URLSearchParams({ class_id: rcClassId, date: rcDate });
      if (rcSection) params.set('section', rcSection);
      const { data } = await api.get(`/attendance/class-status?${params}`);
      setRcStudents(data);
      setRcDirty(false);
      const cls = classes.find(c => c._id === rcClassId);
      setRcClassName(cls?.name || 'Class');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load class');
    } finally { setRcLoading(false); }
  };

  const updateRcStatus = (studentId, status) => {
    setRcStudents(prev => prev.map(s => s._id === studentId ? { ...s, status } : s));
    setRcDirty(true);
  };

  const updateRcNote = (studentId, note) => {
    setRcStudents(prev => prev.map(s => s._id === studentId ? { ...s, note } : s));
    setRcDirty(true);
  };

  const markAllRcPresent = () => {
    setRcStudents(prev => prev.map(s => s.status ? s : { ...s, status: 'present' }));
    setRcDirty(true);
  };

  const saveRollCall = async () => {
    const entries = rcStudents
      .filter(s => s.status)
      .map(s => ({ person_id: s._id, status: s.status, note: s.note || '', late_minutes: s.late_minutes || 0 }));
    if (!entries.length) { toast.warning('No attendance to save'); return; }
    setRcSaving(true);

    if (!isOnline) {
      try {
        await savePendingRollCall({ entries, date: rcDate, method: 'bulk_rollcall', className: rcClassName });
        toast.info(`Saved offline for ${rcClassName} — will sync when online`);
        setRcDirty(false);
        loadPendingCount();
      } catch { toast.error('Failed to save offline'); }
      finally { setRcSaving(false); }
      return;
    }

    try {
      const { data } = await api.post('/attendance/bulk', { entries, date: rcDate, method: 'bulk_rollcall' });
      toast.success(data.message);
      setRcDirty(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally { setRcSaving(false); }
  };

  const rcStats = {
    present: rcStudents.filter(s => s.status === 'present').length,
    absent:  rcStudents.filter(s => s.status === 'absent').length,
    late:    rcStudents.filter(s => s.status === 'late').length,
    leave:   rcStudents.filter(s => s.status === 'leave' || s.status === 'half_day').length,
    unmarked: rcStudents.filter(s => !s.status).length,
  };

  /* ══════════════════════════════════════════════════════
     TAB: REGISTER
  ══════════════════════════════════════════════════════ */
  const fetchReport = useCallback(async () => {
    setRegLoading(true);
    try {
      const params = new URLSearchParams({ month: selectedMonth, year: selectedYear });
      if (regClassFilter) params.set('class_id', regClassFilter);
      if (regSectionFilter) params.set('section', regSectionFilter);
      const { data } = await api.get(`/attendance/report?${params}`);
      setReportData(data);
    } catch { toast.error('Failed to load register'); }
    finally { setRegLoading(false); }
  }, [selectedMonth, selectedYear, regClassFilter, regSectionFilter]);

  const fetchStaffReport = useCallback(async () => {
    setRegLoading(true);
    try {
      const { data } = await api.get(`/attendance/staff-report?month=${selectedMonth}&year=${selectedYear}`);
      setStaffReportData(data);
    } catch { toast.error('Failed to load staff register'); }
    finally { setRegLoading(false); }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    if (activeTab === 'register') {
      if (regSubTab === 'students') fetchReport();
      else fetchStaffReport();
    }
  }, [activeTab, regSubTab, selectedMonth, selectedYear, regClassFilter, regSectionFilter]);

  const filteredReport = reportData.filter(s =>
    (s.name || '').toLowerCase().includes(regSearch.toLowerCase()) || (s.roll_no || '').includes(regSearch)
  );
  const filteredStaff = staffReportData.filter(s =>
    (s.name || '').toLowerCase().includes(regSearch.toLowerCase())
  );

  /* ── Export: Students Excel ── */
  const exportStudentExcel = () => {
    if (!reportData.length) return toast.warning('No data to export');
    const rows = reportData.map(s => {
      const row = { 'Roll No': s.roll_no, 'Name': s.name, 'P': s.stats.present, 'A': s.stats.absent, 'L': s.stats.leave, 'Late': s.stats.late, '%': s.stats.percentage };
      for (let i = 1; i <= 31; i++) row[`${i}`] = s.attendance[i] ? s.attendance[i].charAt(0).toUpperCase() : '-';
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    saveAs(new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/octet-stream' }), `Student_Attendance_${selectedMonth}_${selectedYear}.xlsx`);
    toast.success('Excel downloaded');
  };

  /* ── Export: Staff Excel ── */
  const exportStaffExcel = () => {
    if (!staffReportData.length) return toast.warning('No data to export');
    const rows = staffReportData.map(s => {
      const row = { 'Name': s.name, 'Role': s.role, 'P': s.stats.present, 'A': s.stats.absent, 'L': s.stats.leave, '%': s.stats.percentage };
      for (let i = 1; i <= 31; i++) {
        const d = s.attendance[i];
        row[`${i}`] = d ? (d.status || d).toString().charAt(0).toUpperCase() : '-';
      }
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Staff');
    saveAs(new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/octet-stream' }), `Staff_Attendance_${selectedMonth}_${selectedYear}.xlsx`);
    toast.success('Excel downloaded');
  };

  /* ── Export: Students PDF ── */
  const exportStudentPDF = async () => {
    if (!reportData.length) return toast.warning('No data to export');
    const doc     = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW   = 297, pageH = 210;
    const logoB64 = await loadLogo();
    const period  = `${monthName(selectedMonth)} ${selectedYear}`;

    const hY = drawHeader(doc, { logoB64, docType: 'Attendance Register', docRef: `Students · ${period}`, date: kitFmtDate(new Date()), pageW });

    // Legend
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(...C.slateLight);
    doc.text('P = Present  ·  A = Absent  ·  L = Leave  ·  H = Half Day', 14, hY + 4);

    // Day columns with status-color cells
    const statusChar = (v) => {
      if (!v) return '';
      const c = v.toString().charAt(0).toUpperCase();
      return c === 'P' ? 'P' : c === 'A' ? 'A' : c === 'L' ? 'L' : c === 'H' ? 'H' : c;
    };

    autoTable(doc, {
      startY: hY + 8,
      margin: { left: 10, right: 10 },
      head: [['Student', 'Roll', ...[...Array(31)].map((_, i) => `${i + 1}`), 'P', 'A', 'L', '%']],
      body: reportData.map(s => [
        s.name, s.roll_no,
        ...[...Array(31)].map((_, i) => ({
          content: statusChar(s.attendance[i + 1]),
          styles: {
            textColor: s.attendance[i+1]?.charAt(0) === 'P' ? C.green : s.attendance[i+1]?.charAt(0) === 'A' ? C.red : C.slate,
            fontStyle: 'bold',
            halign: 'center',
          },
        })),
        { content: s.stats.present, styles: { textColor: C.green, fontStyle: 'bold', halign: 'center' } },
        { content: s.stats.absent,  styles: { textColor: C.red,   fontStyle: 'bold', halign: 'center' } },
        { content: s.stats.leave || 0, styles: { halign: 'center' } },
        { content: s.stats.percentage, styles: { fontStyle: 'bold', halign: 'center', textColor: s.stats.percentage >= 75 ? C.green : C.red } },
      ]),
      headStyles: { ...TABLE_STYLES.headStyles, fontSize: 6, cellPadding: 1.5 },
      bodyStyles: { fontSize: 6, cellPadding: 1.5 },
      alternateRowStyles: { fillColor: C.rowAlt },
      columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 12 } },
      tableLineWidth: 0.15,
    });

    drawFooter(doc, { pageNum: 1, totalPages: 1, pageW, pageH });
    doc.save(`Students_Attendance_${selectedMonth}_${selectedYear}.pdf`);
    toast.success('PDF downloaded');
  };

  /* ── Export: Staff PDF ── */
  const exportStaffPDF = async () => {
    if (!staffReportData.length) return toast.warning('No data to export');
    const doc     = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW   = 297, pageH = 210;
    const logoB64 = await loadLogo();
    const period  = `${monthName(selectedMonth)} ${selectedYear}`;

    const hY = drawHeader(doc, { logoB64, docType: 'Staff Attendance', docRef: period, date: kitFmtDate(new Date()), pageW });
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(...C.slateLight);
    doc.text('P = Present  ·  A = Absent  ·  L = Leave  ·  H = Half Day', 14, hY + 4);

    autoTable(doc, {
      startY: hY + 8,
      margin: { left: 10, right: 10 },
      head: [['Staff Member', 'Role', ...[...Array(31)].map((_, i) => `${i + 1}`), 'P', 'A', 'L', '%']],
      body: staffReportData.map(s => [
        s.name, (s.role || '').replace('_', ' '),
        ...[...Array(31)].map((_, i) => {
          const d = s.attendance[i + 1];
          const ch = d ? (d.status || d).toString().charAt(0).toUpperCase() : '';
          return { content: ch, styles: { textColor: ch === 'P' ? C.green : ch === 'A' ? C.red : C.slate, fontStyle: 'bold', halign: 'center' } };
        }),
        { content: s.stats.present, styles: { textColor: C.green, fontStyle: 'bold', halign: 'center' } },
        { content: s.stats.absent,  styles: { textColor: C.red,   fontStyle: 'bold', halign: 'center' } },
        { content: s.stats.leave || 0, styles: { halign: 'center' } },
        { content: s.stats.percentage, styles: { fontStyle: 'bold', halign: 'center', textColor: s.stats.percentage >= 75 ? C.green : C.red } },
      ]),
      headStyles: { ...TABLE_STYLES.headStyles, fontSize: 6, cellPadding: 1.5 },
      bodyStyles: { fontSize: 6, cellPadding: 1.5 },
      alternateRowStyles: { fillColor: C.rowAlt },
      columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 18 } },
      tableLineWidth: 0.15,
    });

    drawFooter(doc, { pageNum: 1, totalPages: 1, pageW, pageH });
    doc.save(`Staff_Attendance_${selectedMonth}_${selectedYear}.pdf`);
    toast.success('PDF downloaded');
  };

  /* ══════════════════════════════════════════════════════
     TAB: REPORTS — Defaulters + Trend Chart
  ══════════════════════════════════════════════════════ */
  const fetchDefaulters = async () => {
    setDefLoading(true);
    try {
      const params = new URLSearchParams({ threshold: defThreshold, month: defMonth, year: defYear });
      if (defClassId) params.set('class_id', defClassId);
      const { data } = await api.get(`/attendance/defaulters?${params}`);
      setDefaulters(data);
    } catch { toast.error('Failed to load defaulters'); }
    finally { setDefLoading(false); }
  };

  const fetchTrend = useCallback(async () => {
    try {
      const now = new Date();
      const m = now.getMonth() + 1;
      const y = now.getFullYear();
      const [sRes, stRes] = await Promise.all([
        api.get(`/attendance/report?month=${m}&year=${y}`),
        api.get(`/attendance/staff-report?month=${m}&year=${y}`),
      ]);
      const daysInMonth = new Date(y, m, 0).getDate();
      const weeks = [
        { label: 'Week 1', start: 1,  end: 7 },
        { label: 'Week 2', start: 8,  end: 14 },
        { label: 'Week 3', start: 15, end: 21 },
        { label: 'Week 4', start: 22, end: daysInMonth },
      ];

      const weeklyData = weeks.map(w => {
        const days = w.end - w.start + 1;
        let stuPresent = 0, stuTotal = 0;
        let stfPresent = 0, stfTotal = 0;

        sRes.data.forEach(stu => {
          for (let d = w.start; d <= w.end; d++) {
            stuTotal++;
            const s = stu.attendance[d];
            if (s === 'present' || s === 'late') stuPresent++;
          }
        });

        stRes.data.forEach(stf => {
          for (let d = w.start; d <= w.end; d++) {
            stfTotal++;
            const s = stf.attendance[d];
            const status = s?.status || s;
            if (status === 'present' || status === 'late') stfPresent++;
          }
        });

        return {
          week: w.label,
          students: stuTotal > 0 ? +((stuPresent / stuTotal) * 100).toFixed(1) : 0,
          staff:    stfTotal > 0 ? +((stfPresent / stfTotal) * 100).toFixed(1) : 0,
        };
      });
      setTrendData(weeklyData);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchDefaulters();
      fetchTrend();
    }
  }, [activeTab]);

  const exportDefaultersCSV = () => {
    if (!defaulters.length) return toast.warning('No data');
    const headers = ['Rank', 'Name', 'Roll No', 'Class', 'Section', 'Present', 'Absent', 'Total', 'Percentage'];
    const rows = defaulters.map((d, i) =>
      [i + 1, d.full_name, d.roll_number, d.class_name, d.section, d.present, d.absent, d.total, d.percentage + '%']
    );
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    saveAs(new Blob([csv], { type: 'text/csv' }), `Defaulters_${defMonth}_${defYear}.csv`);
    toast.success('CSV downloaded');
  };

  /* ══════════════════════════════════════════════════════
     TAB: STAFF DAILY
  ══════════════════════════════════════════════════════ */
  const fetchStaffDaily = async () => {
    setStaffLoading(true);
    try {
      const { data } = await api.get(`/attendance/status?date=${staffDate}`);
      setStaffList(data.filter(p => p.person_type === 'staff'));
    } catch { toast.error('Failed to load staff status'); }
    finally { setStaffLoading(false); }
  };

  const fetchStaffMonthly = async () => {
    setStaffMonthLoading(true);
    try {
      const { data } = await api.get(`/attendance/staff-report?month=${staffMonth}&year=${staffYear}`);
      setStaffMonthData(data);
    } catch { toast.error('Failed to load staff monthly'); }
    finally { setStaffMonthLoading(false); }
  };

  useEffect(() => {
    if (activeTab === 'staff') {
      fetchStaffDaily();
      fetchStaffMonthly();
    }
  }, [activeTab]);

  const handleStaffMark = async (identifier, status) => {
    try {
      await api.post('/attendance/mark', { qr_code: identifier, status, date: staffDate, method: 'manual' });
      toast.success(`Marked ${status}`);
      fetchStaffDaily();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  /* ══════════════════════════════════════════════════════
     COMPUTED — Dashboard stats
  ══════════════════════════════════════════════════════ */
  const todayStats = {
    total:      dailyStatus.length,
    present:    dailyStatus.filter(p => p.status === 'present').length,
    absent:     dailyStatus.filter(p => p.status === 'absent').length,
    late:       dailyStatus.filter(p => p.status === 'late').length,
    not_marked: dailyStatus.filter(p => p.status === null).length,
  };

  const attendancePct = todayStats.total > 0
    ? Math.round(((todayStats.present + todayStats.late) / todayStats.total) * 100)
    : 0;

  const methodCounts = dailyStatus.reduce((acc, p) => {
    if (p.method) acc[p.method] = (acc[p.method] || 0) + 1;
    return acc;
  }, {});

  const classBreakdown = (() => {
    const map = {};
    dailyStatus.filter(p => p.person_type === 'student' && p.class_id).forEach(p => {
      const id = p.class_id.toString();
      if (!map[id]) map[id] = { present: 0, total: 0, name: p.class_id };
      map[id].total++;
      if (p.status === 'present' || p.status === 'late') map[id].present++;
    });
    return Object.values(map);
  })();

  const recentActivity = [...dailyStatus]
    .filter(p => p.check_in)
    .sort((a, b) => new Date(b.check_in) - new Date(a.check_in))
    .slice(0, 10);

  /* ══════════════════════════════════════════════════════
     TAB DEFINITIONS
  ══════════════════════════════════════════════════════ */
  const TABS = [
    { key: 'dashboard', icon: <Activity size={15}/>,     label: 'Dashboard',    accent: 'text-indigo-600' },
    { key: 'scanner',   icon: <ScanLine size={15}/>,     label: 'Scanner',      accent: 'text-blue-600' },
    { key: 'rollcall',  icon: <ClipboardList size={15}/>, label: 'Roll Call',   accent: 'text-violet-600' },
    { key: 'register',  icon: <BookOpen size={15}/>,     label: 'Register',     accent: 'text-emerald-600' },
    { key: 'reports',   icon: <BarChart2 size={15}/>,    label: 'Reports',      accent: 'text-rose-600' },
    { key: 'staff',     icon: <Briefcase size={15}/>,    label: 'Staff',        accent: 'text-teal-600' },
  ];

  /* ══════════════════════════════════════════════════════
     RENDER HELPERS
  ══════════════════════════════════════════════════════ */
  const StatusBadge = ({ status }) => {
    const s = STATUS_BADGE[status] || STATUS_BADGE.null;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${s.cls}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor(status)}`}/>
        {s.label}
      </span>
    );
  };

  const PeriodControls = ({ accentClass = 'hover:text-indigo-600' }) => (
    <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
      <div className="flex items-center px-3 text-slate-400 gap-2 text-sm font-bold uppercase tracking-wider">
        <Filter size={14}/> Period
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

  /* ── Register Table ── */
  const RegisterTable = ({ data, isStaff = false }) => (
    <div className="relative overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[1300px]">
        <thead>
          <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
            <th className="p-4 border-b border-slate-200 w-56 sticky left-0 bg-slate-50 z-20 shadow-[4px_0_10px_-5px_rgba(0,0,0,0.1)]">
              {isStaff ? 'Staff Member' : 'Student'}
            </th>
            {[...Array(31)].map((_, i) => (
              <th key={i} className="p-1 border-b border-slate-200 text-center min-w-[32px]">{i + 1}</th>
            ))}
            <th className="p-3 border-b border-slate-200 text-center min-w-[110px] sticky right-0 bg-slate-50 z-20 shadow-[-4px_0_10px_-5px_rgba(0,0,0,0.1)]">
              P / A / L / %
            </th>
          </tr>
        </thead>
        <tbody className="text-sm divide-y divide-slate-50">
          {data.map((row, idx) => {
            const pct = parseFloat(row.stats.percentage);
            const lowAtt = pct < 75 && pct > 0;
            return (
              <tr key={row._id}
                onClick={() => !isStaff && setSelectedStudent(row)}
                className={`transition-colors group ${!isStaff ? 'cursor-pointer' : ''} ${lowAtt ? 'bg-red-50/40 hover:bg-red-50/60' : 'hover:bg-indigo-50/20'}`}>
                <td className={`p-3 sticky left-0 z-10 border-r border-slate-100 shadow-[4px_0_10px_-5px_rgba(0,0,0,0.05)] ${lowAtt ? 'bg-red-50/60' : 'bg-white group-hover:bg-indigo-50/30'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                      lowAtt ? 'bg-red-100 text-red-600' :
                      idx % 3 === 0 ? 'bg-indigo-100 text-indigo-600' :
                      idx % 3 === 1 ? 'bg-emerald-100 text-emerald-600' : 'bg-violet-100 text-violet-600'
                    }`}>
                      {(row.name || '').charAt(0)}
                    </div>
                    <div>
                      <span className={`font-bold text-sm block ${lowAtt ? 'text-red-700' : 'text-slate-700 group-hover:text-indigo-600'}`}>
                        {row.name}
                        {lowAtt && <AlertTriangle size={11} className="inline ml-1 text-red-400"/>}
                      </span>
                      <span className="text-slate-400 text-[10px] font-mono">
                        {isStaff ? (row.role || '').replace('_', ' ') : row.roll_no}
                      </span>
                    </div>
                  </div>
                </td>
                {[...Array(31)].map((_, i) => {
                  const raw = row.attendance[i + 1];
                  const s = isStaff ? (raw?.status || raw) : raw;
                  return (
                    <td key={i} className="text-center p-1">
                      <div title={isStaff && raw?.check_in ? `In: ${fmt12(raw.check_in)}` : undefined}
                        className={`w-7 h-7 mx-auto rounded-lg flex items-center justify-center text-[9px] font-bold ${cellColor(s)}`}>
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
                      <div className={`h-full rounded-full ${pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(100, pct)}%` }}/>
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
      {data.length === 0 && !regLoading && (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center">
          <div className="p-4 bg-slate-50 rounded-full mb-3"><Search size={28}/></div>
          <p className="font-medium">No records found for this period.</p>
        </div>
      )}
    </div>
  );

  /* ══════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════ */
  return (
    <div className="space-y-6 pb-12">

      {/* ── HEADER + TAB NAV ── */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl"><Calendar size={24}/></div>
              Attendance Hub
            </h2>
            <p className="text-slate-500 mt-1 text-sm font-medium ml-1">
              Dashboard · QR Scanner · Roll Call · Monthly Register · Reports · Staff
            </p>
          </div>
        </div>
        {/* Scrollable pill tabs */}
        <div className="mt-4 overflow-x-auto pb-1">
          <div className="flex gap-1 bg-slate-100 p-1.5 rounded-2xl w-max min-w-full">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 whitespace-nowrap transition-all ${
                  activeTab === t.key ? `bg-white ${t.accent} shadow-md` : 'text-slate-500 hover:text-slate-700'
                }`}>
                {t.icon} {t.label}
                {t.key === 'rollcall' && rcDirty && (
                  <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"/>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          TAB: DASHBOARD
      ══════════════════════════════════════════════════ */}
      {activeTab === 'dashboard' && (
        <div className="space-y-5">
          {/* 5-stat top row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Total',       value: todayStats.total,      color: 'text-slate-700',   bg: 'bg-white border-slate-200',         icon: <Users size={20} className="text-slate-400"/> },
              { label: 'Present',     value: todayStats.present,    color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100',  icon: <CheckCircle size={20} className="text-emerald-500"/> },
              { label: 'Absent',      value: todayStats.absent,     color: 'text-red-600',     bg: 'bg-red-50 border-red-100',          icon: <XCircle size={20} className="text-red-400"/> },
              { label: 'Late',        value: todayStats.late,       color: 'text-orange-600',  bg: 'bg-orange-50 border-orange-100',    icon: <Clock size={20} className="text-orange-400"/> },
              { label: 'Not Marked',  value: todayStats.not_marked, color: 'text-slate-500',   bg: 'bg-slate-50 border-slate-200',      icon: <MinusCircle size={20} className="text-slate-300"/> },
            ].map(s => (
              <div key={s.label} className={`${s.bg} border rounded-2xl p-4 flex items-center gap-4`}>
                <div className="shrink-0">{s.icon}</div>
                <div>
                  <p className={`text-3xl font-extrabold ${s.color}`}>{s.value}</p>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Attendance ring + methods */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col items-center gap-6">
              {/* Ring */}
              <div className="relative w-36 h-36 shrink-0">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f1f5f9" strokeWidth="3"/>
                  <circle cx="18" cy="18" r="15.9" fill="none"
                    stroke={attendancePct >= 75 ? '#10b981' : attendancePct >= 50 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="3" strokeDasharray={`${attendancePct} ${100 - attendancePct}`}
                    strokeLinecap="round"/>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-2xl font-extrabold ${attendancePct >= 75 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {attendancePct}%
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Today</span>
                </div>
              </div>
              {/* Methods */}
              <div className="w-full space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Methods Used Today</p>
                {[
                  { key: 'qr_scan',      label: 'QR Scan',      icon: <QrCode size={13}/>,      cls: 'text-indigo-600' },
                  { key: 'manual',       label: 'Manual',        icon: <Keyboard size={13}/>,    cls: 'text-blue-600' },
                  { key: 'bulk_rollcall',label: 'Roll Call',     icon: <ClipboardList size={13}/>,cls: 'text-violet-600' },
                  { key: 'self_checkin', label: 'Self Check-in', icon: <User size={13}/>,        cls: 'text-teal-600' },
                ].map(m => (
                  <div key={m.key} className="flex items-center justify-between">
                    <span className={`flex items-center gap-2 text-xs font-medium text-slate-600 ${m.cls}`}>
                      {m.icon} {m.label}
                    </span>
                    <span className="text-xs font-bold text-slate-700">{methodCounts[m.key] || 0}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Class-wise breakdown */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 text-sm">
                <Users size={16} className="text-indigo-500"/> Class-wise Attendance
              </h3>
              {classBreakdown.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8">No class data yet</p>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {classBreakdown.map((c, i) => {
                    const pct = c.total > 0 ? Math.round((c.present / c.total) * 100) : 0;
                    const cls = classes.find(cl => cl._id?.toString() === c.name?.toString());
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                          <span>{cls?.name || 'Unknown Class'}</span>
                          <span className={pct >= 75 ? 'text-emerald-600' : 'text-red-500'}>
                            {c.present}/{c.total} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                            style={{ width: `${pct}%` }}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent activity feed */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm">
                  <Activity size={16} className="text-emerald-500"/> Recent Activity
                </h3>
                <button onClick={() => fetchDailyStatus(true)}
                  className={`p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors ${dashLoading ? 'animate-spin' : ''}`}>
                  <RefreshCw size={14}/>
                </button>
              </div>
              {recentActivity.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8">No activity yet today</p>
              ) : (
                <div className="space-y-2.5 max-h-64 overflow-y-auto">
                  {recentActivity.map(p => (
                    <div key={p._id} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                        p.status === 'present' ? 'bg-emerald-100 text-emerald-600' :
                        p.status === 'late'    ? 'bg-orange-100 text-orange-600' :
                        p.status === 'absent'  ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'
                      }`}>{(p.name || '').charAt(0)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-700 truncate">{p.name}</p>
                        <p className="text-[10px] text-slate-400">{fmt12(p.check_in)}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        p.method === 'qr_scan'      ? 'bg-indigo-100 text-indigo-600' :
                        p.method === 'bulk_rollcall'? 'bg-violet-100 text-violet-600' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {p.method === 'qr_scan' ? 'QR' : p.method === 'bulk_rollcall' ? 'RC' : 'M'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          TAB: SCANNER
      ══════════════════════════════════════════════════ */}
      {activeTab === 'scanner' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Manual form */}
          <div className="space-y-5">
            {/* Last scanned card */}
            {lastScanned && (
              <div className={`rounded-2xl p-4 border-2 flex items-center gap-4 ${
                lastScanned.status === 'Check-In' || lastScanned.status === 'present'
                  ? 'bg-emerald-50 border-emerald-300' : 'bg-orange-50 border-orange-300'
              }`}>
                {lastScanned.photo ? (
                  <img src={`${API_BASE}/uploads/${lastScanned.photo}`} alt={lastScanned.name}
                    className="w-14 h-14 rounded-xl object-cover border-2 border-white shadow"/>
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center text-xl font-bold text-slate-600 border-2 border-white shadow">
                    {(lastScanned.name || '').charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-bold text-slate-800">{lastScanned.name}</p>
                  <p className="text-xs text-slate-500">{fmt12(lastScanned.time)}</p>
                  <span className={`text-xs font-bold ${
                    lastScanned.type === 'Check-Out' ? 'text-orange-600' : 'text-emerald-600'
                  }`}>{lastScanned.type}</span>
                </div>
              </div>
            )}

            {/* Manual form */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-4">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-xl"><Keyboard size={17}/></div>
                <h3 className="font-bold text-slate-700">Manual Entry</h3>
              </div>
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Roll No / Email / QR Code</label>
                  <div className="relative">
                    <User className="absolute left-4 top-3.5 text-slate-400" size={15}/>
                    <input className="form-input pl-11 w-full" value={manualId}
                      onChange={e => setManualId(e.target.value)} placeholder="Enter identifier..." required/>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Status</label>
                    <select className="form-select font-medium w-full" value={manualStatus} onChange={e => setManualStatus(e.target.value)}>
                      <option value="present">Present</option>
                      <option value="late">Late</option>
                      <option value="absent">Absent</option>
                      <option value="leave">Leave</option>
                      <option value="half_day">Half Day</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Date</label>
                    <input type="date" className="form-input w-full font-medium" value={manualDate} onChange={e => setManualDate(e.target.value)}/>
                  </div>
                </div>
                {manualStatus === 'late' && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Late Minutes</label>
                    <input type="number" min="0" max="999" className="form-input w-full"
                      value={manualLateMin} onChange={e => setManualLateMin(e.target.value)} placeholder="0"/>
                  </div>
                )}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Note (optional)</label>
                  <textarea className="form-input w-full resize-none" rows={2} value={manualNote}
                    onChange={e => setManualNote(e.target.value)} placeholder="Add note..."/>
                </div>
                <button type="submit" className="w-full bg-slate-900 text-white py-3.5 rounded-2xl font-bold shadow-lg shadow-slate-200 hover:bg-slate-800 hover:-translate-y-0.5 transition-all flex justify-center gap-2 items-center">
                  <CheckCircle2 size={18}/> Mark Attendance
                </button>
              </form>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 text-center">
                <p className="text-2xl font-extrabold text-emerald-600">{todayStats.present}</p>
                <p className="text-[11px] text-emerald-700 font-medium">Present</p>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-2xl p-3 text-center">
                <p className="text-2xl font-extrabold text-red-600">{todayStats.absent}</p>
                <p className="text-[11px] text-red-700 font-medium">Absent</p>
              </div>
            </div>
          </div>

          {/* Right: QR Camera */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-3xl shadow-2xl relative overflow-hidden flex flex-col items-center justify-center text-white min-h-[500px]">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -mr-16 -mt-16"/>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl -ml-16 -mb-16"/>
              <h3 className="font-bold text-xl mb-6 relative z-10 flex items-center gap-3">
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"/>
                Live QR Scanner
              </h3>
              <div className="relative z-10 p-2 bg-gradient-to-tr from-indigo-500 to-emerald-500 rounded-3xl shadow-2xl">
                <div id="reader" className="w-[280px] md:w-[360px] bg-black rounded-2xl overflow-hidden"/>
              </div>
              <p className="text-slate-400 text-sm mt-6 relative z-10 font-medium bg-slate-800/60 px-5 py-2 rounded-full border border-slate-700">
                Hold QR Code steady in front of camera
              </p>
              {lastScanned && (
                <div className="mt-4 relative z-10 bg-white/10 backdrop-blur-sm rounded-2xl px-6 py-3 text-center border border-white/20">
                  <p className="font-bold text-lg">{lastScanned.name}</p>
                  <p className="text-sm text-emerald-300">{lastScanned.type} · {fmt12(lastScanned.time)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          TAB: ROLL CALL
      ══════════════════════════════════════════════════ */}
      {activeTab === 'rollcall' && (
        <div className="space-y-5">

          {/* Offline / Sync banner */}
          {!isOnline && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-300 rounded-2xl px-5 py-3">
              <WifiOff size={18} className="text-amber-600 shrink-0"/>
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-800">You're offline</p>
                <p className="text-xs text-amber-600">Attendance will be saved locally and synced when you reconnect.</p>
              </div>
            </div>
          )}
          {isOnline && pendingCount > 0 && (
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-300 rounded-2xl px-5 py-3">
              <Upload size={18} className="text-blue-600 shrink-0"/>
              <div className="flex-1">
                <p className="text-sm font-bold text-blue-800">{pendingCount} offline roll call{pendingCount !== 1 ? 's' : ''} pending sync</p>
                <p className="text-xs text-blue-600">You're back online. Click Sync to upload saved attendance.</p>
              </div>
              <button onClick={syncPending} disabled={syncing}
                className="shrink-0 flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-60">
                {syncing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Upload size={14}/>}
                Sync Now
              </button>
            </div>
          )}

          {/* Controls */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Class</label>
                <select className="form-select w-full font-medium" value={rcClassId} onChange={e => setRcClassId(e.target.value)}>
                  <option value="">— Select Class —</option>
                  {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div className="w-32">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Section</label>
                <input className="form-input w-full" value={rcSection} onChange={e => setRcSection(e.target.value)} placeholder="A, B..."/>
              </div>
              <div className="w-40">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Date</label>
                <input type="date" className="form-input w-full" value={rcDate} onChange={e => setRcDate(e.target.value)}/>
              </div>
              <button onClick={loadClassRollCall} disabled={rcLoading}
                className="px-6 py-3 bg-violet-600 text-white rounded-2xl font-bold shadow-lg shadow-violet-200 hover:bg-violet-700 transition-all disabled:opacity-60 flex items-center gap-2">
                {rcLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Eye size={16}/>}
                Load Class
              </button>
            </div>
          </div>

          {rcStudents.length > 0 && (
            <>
              {/* Header row */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-700 text-lg">{rcClassName}</h3>
                  <div className="flex gap-3 mt-1 text-xs font-medium flex-wrap">
                    <span className="text-emerald-600">{rcStats.present} Present</span>
                    <span className="text-red-600">{rcStats.absent} Absent</span>
                    <span className="text-orange-600">{rcStats.late} Late</span>
                    <span className="text-amber-600">{rcStats.leave} Leave</span>
                    <span className="text-slate-400">{rcStats.unmarked} Not Marked</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={markAllRcPresent}
                    className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl font-bold text-sm hover:bg-emerald-200 transition-all flex items-center gap-2">
                    <Zap size={14}/> All Present
                  </button>
                  <button onClick={saveRollCall} disabled={rcSaving || !rcDirty}
                    className="px-4 py-2 bg-violet-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-violet-200 hover:bg-violet-700 transition-all disabled:opacity-50 flex items-center gap-2">
                    {rcSaving ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Save size={14}/>}
                    Save Attendance
                    {rcDirty && <span className="w-2 h-2 bg-orange-300 rounded-full"/>}
                  </button>
                </div>
              </div>

              {/* Student grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rcStudents.map(student => (
                  <div key={student._id} className={`bg-white rounded-2xl border-2 p-4 transition-all ${
                    student.status === 'present' ? 'border-emerald-300 bg-emerald-50/30' :
                    student.status === 'absent'  ? 'border-red-300 bg-red-50/30' :
                    student.status === 'late'    ? 'border-orange-300 bg-orange-50/30' :
                    student.status === 'leave' || student.status === 'half_day' ? 'border-amber-300 bg-amber-50/30' :
                    'border-slate-200'
                  }`}>
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      {student.photo ? (
                        <img src={`${API_BASE}/uploads/${student.photo}`} alt={student.full_name}
                          className="w-11 h-11 rounded-xl object-cover border-2 border-white shadow shrink-0"/>
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm shrink-0">
                          {(student.full_name || '').charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 text-sm truncate">{student.full_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-slate-400 font-mono">{student.roll_number}</span>
                          {student.section && (
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold">{student.section}</span>
                          )}
                        </div>
                      </div>
                      {student.status && <StatusBadge status={student.status}/>}
                    </div>

                    {/* Status buttons: P L A H V */}
                    <div className="flex gap-1.5 mt-3">
                      {[
                        { s: 'present',  label: 'P', cls: 'bg-emerald-500 text-white',  inactive: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' },
                        { s: 'late',     label: 'L', cls: 'bg-orange-500 text-white',   inactive: 'bg-orange-100 text-orange-700 hover:bg-orange-200' },
                        { s: 'absent',   label: 'A', cls: 'bg-red-500 text-white',      inactive: 'bg-red-100 text-red-700 hover:bg-red-200' },
                        { s: 'half_day', label: 'H', cls: 'bg-yellow-500 text-white',   inactive: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' },
                        { s: 'leave',    label: 'V', cls: 'bg-slate-500 text-white',    inactive: 'bg-slate-100 text-slate-700 hover:bg-slate-200' },
                      ].map(btn => (
                        <button key={btn.s} onClick={() => updateRcStatus(student._id, btn.s)}
                          title={btn.s}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-extrabold transition-all hover:scale-105 ${
                            student.status === btn.s ? btn.cls : btn.inactive
                          }`}>
                          {btn.label}
                        </button>
                      ))}
                      <button onClick={() => setExpandedNote(prev => ({ ...prev, [student._id]: !prev[student._id] }))}
                        className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-all"
                        title="Note">
                        <ChevronDown size={13} className={expandedNote[student._id] ? 'rotate-180' : ''}/>
                      </button>
                    </div>

                    {/* Expandable note */}
                    {expandedNote[student._id] && (
                      <textarea
                        className="mt-2 w-full text-xs border border-slate-200 rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-violet-200"
                        rows={2} placeholder="Note..." value={student.note || ''}
                        onChange={e => updateRcNote(student._id, e.target.value)}/>
                    )}
                  </div>
                ))}
              </div>

              {/* Sticky save button at bottom */}
              {rcDirty && (
                <div className="fixed bottom-6 right-6 z-40">
                  <button onClick={saveRollCall} disabled={rcSaving}
                    className="px-6 py-3 bg-violet-600 text-white rounded-2xl font-bold shadow-2xl shadow-violet-400 hover:bg-violet-700 transition-all flex items-center gap-2 animate-bounce">
                    <Save size={17}/> Save Attendance
                  </button>
                </div>
              )}
            </>
          )}

          {rcStudents.length === 0 && !rcLoading && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-16 text-center text-slate-400">
              <ClipboardList size={40} className="mx-auto mb-3 text-slate-200"/>
              <p className="font-medium">Select a class and click "Load Class" to start roll call</p>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          TAB: REGISTER
      ══════════════════════════════════════════════════ */}
      {activeTab === 'register' && (
        <div className="space-y-5">
          {/* Controls bar */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
            <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between">
              <div className="flex flex-wrap gap-3 items-center">
                {/* Sub-tab */}
                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                  {[['students', 'Students', 'text-indigo-600'], ['staff', 'Staff', 'text-emerald-600']].map(([k, l, c]) => (
                    <button key={k} onClick={() => setRegSubTab(k)}
                      className={`px-4 py-1.5 rounded-lg font-bold text-sm transition-all ${regSubTab === k ? `bg-white ${c} shadow` : 'text-slate-500'}`}>
                      {l}
                    </button>
                  ))}
                </div>
                <PeriodControls accentClass={regSubTab === 'students' ? 'hover:text-indigo-600' : 'hover:text-emerald-600'}/>
                {regSubTab === 'students' && (
                  <>
                    <select className="form-select text-sm" value={regClassFilter} onChange={e => setRegClassFilter(e.target.value)}>
                      <option value="">All Classes</option>
                      {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                    <input className="form-input text-sm w-28" value={regSectionFilter}
                      onChange={e => setRegSectionFilter(e.target.value)} placeholder="Section"/>
                  </>
                )}
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={15}/>
                  <input className="form-input pl-9 text-sm w-44" value={regSearch}
                    onChange={e => setRegSearch(e.target.value)} placeholder="Search..."/>
                </div>
                <button onClick={regSubTab === 'students' ? exportStudentExcel : exportStaffExcel}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all flex items-center gap-2">
                  <Download size={15}/> Excel
                </button>
                <button onClick={regSubTab === 'students' ? exportStudentPDF : exportStaffPDF}
                  className="bg-rose-500 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-rose-600 transition-all flex items-center gap-2">
                  <Download size={15}/> PDF
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            {regLoading ? (
              <div className="py-16 text-center">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
              </div>
            ) : (
              <RegisterTable
                data={regSubTab === 'students' ? filteredReport : filteredStaff}
                isStaff={regSubTab === 'staff'}
              />
            )}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs text-slate-400 font-medium">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500 inline-block"/> Present</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500 inline-block"/> Absent</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-400 inline-block"/> Leave</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-400 inline-block"/> Late</span>
              <span className="flex items-center gap-1.5 text-red-400"><AlertTriangle size={11}/> Below 75%</span>
              <span className="ml-auto">
                {regSubTab === 'students' ? filteredReport.length : filteredStaff.length} records
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          TAB: REPORTS
      ══════════════════════════════════════════════════ */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Defaulter Report */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-bold text-slate-700 mb-5 flex items-center gap-2">
              <TrendingDown size={18} className="text-rose-500"/> Defaulter Report
            </h3>
            <div className="flex flex-col md:flex-row gap-4 items-end mb-5">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Threshold: {defThreshold}%
                </label>
                <input type="range" min="50" max="95" step="5" value={defThreshold}
                  onChange={e => setDefThreshold(Number(e.target.value))}
                  className="w-full accent-rose-500"/>
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>50%</span><span>95%</span>
                </div>
              </div>
              <div className="w-48">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Class</label>
                <select className="form-select w-full" value={defClassId} onChange={e => setDefClassId(e.target.value)}>
                  <option value="">All Classes</option>
                  {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div className="w-36">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Month</label>
                <select className="form-select w-full" value={defMonth} onChange={e => setDefMonth(Number(e.target.value))}>
                  {[...Array(12)].map((_, i) => <option key={i} value={i + 1}>{monthName(i + 1)}</option>)}
                </select>
              </div>
              <div className="w-28">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Year</label>
                <select className="form-select w-full" value={defYear} onChange={e => setDefYear(Number(e.target.value))}>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <button onClick={fetchDefaulters} disabled={defLoading}
                className="px-5 py-3 bg-rose-600 text-white rounded-2xl font-bold shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all disabled:opacity-60 flex items-center gap-2">
                {defLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <AlertTriangle size={15}/>}
                Load
              </button>
              {defaulters.length > 0 && (
                <button onClick={exportDefaultersCSV}
                  className="px-4 py-3 bg-slate-700 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all flex items-center gap-2">
                  <Download size={14}/> CSV
                </button>
              )}
            </div>

            {defLoading ? (
              <div className="py-12 text-center">
                <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto"/>
              </div>
            ) : defaulters.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <CheckCircle size={36} className="mx-auto mb-3 text-emerald-200"/>
                <p className="font-medium">No defaulters below {defThreshold}% for this period</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                      <th className="p-3 text-left">#</th>
                      <th className="p-3 text-left">Student</th>
                      <th className="p-3 text-left">Class</th>
                      <th className="p-3 text-center">Present</th>
                      <th className="p-3 text-center">Absent</th>
                      <th className="p-3 text-center">Total</th>
                      <th className="p-3 text-left min-w-[180px]">Attendance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {defaulters.map((d, i) => {
                      const pct = Number(d.percentage);
                      return (
                        <tr key={d._id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-bold text-slate-400">{i + 1}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              {d.photo ? (
                                <img src={`${API_BASE}/uploads/${d.photo}`} alt={d.full_name}
                                  className="w-9 h-9 rounded-xl object-cover border border-slate-100"/>
                              ) : (
                                <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold text-sm">
                                  {(d.full_name || '').charAt(0)}
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-slate-700">{d.full_name}</p>
                                <p className="text-[11px] text-slate-400 font-mono">{d.roll_number}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <p className="font-medium text-slate-600">{d.class_name}</p>
                            <p className="text-[11px] text-slate-400">{d.section}</p>
                          </td>
                          <td className="p-3 text-center font-bold text-emerald-600">{d.present}</td>
                          <td className="p-3 text-center font-bold text-red-600">{d.absent}</td>
                          <td className="p-3 text-center font-bold text-slate-700">{d.total}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${pct < 50 ? 'bg-red-500' : pct < 75 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                                  style={{ width: `${Math.min(100, pct)}%` }}/>
                              </div>
                              <span className={`text-xs font-extrabold w-12 text-right ${pct < 50 ? 'text-red-600' : pct < 75 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                {d.percentage}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-400 font-medium">
                  {defaulters.length} student{defaulters.length !== 1 ? 's' : ''} below {defThreshold}% for {monthName(defMonth)} {defYear}
                </div>
              </div>
            )}
          </div>

          {/* Weekly Trend Chart */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-bold text-slate-700 mb-5 flex items-center gap-2">
              <BarChart2 size={18} className="text-blue-500"/> Weekly Attendance Trend (Current Month)
            </h3>
            {trendData.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <BarChart2 size={32} className="mx-auto mb-2 text-slate-200"/>
                <p className="text-sm">Loading trend data...</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trendData} margin={{ top: 5, right: 30, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                  <XAxis dataKey="week" tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }}/>
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickFormatter={(v) => `${v}%`}/>
                  <Tooltip formatter={(v) => `${v}%`}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}/>
                  <Legend/>
                  <Line type="monotone" dataKey="students" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4 }} name="Students"/>
                  <Line type="monotone" dataKey="staff"    stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} name="Staff"/>
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          TAB: STAFF
      ══════════════════════════════════════════════════ */}
      {activeTab === 'staff' && (
        <div className="space-y-6">
          {/* Daily status */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <Briefcase size={18} className="text-teal-500"/> Staff Daily Status
              </h3>
              <div className="flex items-center gap-3">
                <input type="date" className="form-input" value={staffDate} onChange={e => setStaffDate(e.target.value)}/>
                <button onClick={fetchStaffDaily} disabled={staffLoading}
                  className="px-4 py-2 bg-teal-600 text-white rounded-xl font-bold text-sm hover:bg-teal-700 transition-all disabled:opacity-60 flex items-center gap-2">
                  {staffLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <RefreshCw size={15}/>}
                  Load
                </button>
              </div>
            </div>

            {/* Quick summary */}
            {staffList.length > 0 && (
              <div className="grid grid-cols-4 gap-3 mb-5">
                {[
                  { label: 'Present',    value: staffList.filter(s => s.status === 'present').length, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
                  { label: 'Absent',     value: staffList.filter(s => s.status === 'absent').length,  color: 'text-red-600',     bg: 'bg-red-50 border-red-100' },
                  { label: 'Late',       value: staffList.filter(s => s.status === 'late').length,    color: 'text-orange-600',  bg: 'bg-orange-50 border-orange-100' },
                  { label: 'Not Marked', value: staffList.filter(s => !s.status).length,              color: 'text-slate-500',   bg: 'bg-slate-50 border-slate-200' },
                ].map(s => (
                  <div key={s.label} className={`${s.bg} border rounded-2xl p-3 text-center`}>
                    <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
                    <p className="text-[11px] text-slate-500 font-medium">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {staffLoading ? (
              <div className="py-12 text-center">
                <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"/>
              </div>
            ) : staffList.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Briefcase size={36} className="mx-auto mb-3 text-slate-200"/>
                <p className="font-medium">No staff records for this date</p>
              </div>
            ) : (
              <div className="space-y-3">
                {staffList.map(member => {
                  const duration = member.check_in && member.check_out
                    ? Math.round((new Date(member.check_out) - new Date(member.check_in)) / 60000)
                    : null;
                  return (
                    <div key={member._id} className="flex items-center gap-4 p-4 bg-slate-50/60 hover:bg-slate-50 rounded-2xl border border-slate-100 transition-all">
                      {/* Avatar */}
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 ${
                        member.status === 'present' ? 'bg-emerald-100 text-emerald-700' :
                        member.status === 'absent'  ? 'bg-red-100 text-red-700' :
                        member.status === 'late'    ? 'bg-orange-100 text-orange-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {(member.name || '').charAt(0).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-slate-800 text-sm">{member.name}</p>
                          <span className="text-[10px] bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-bold capitalize">
                            {(member.role || '').replace('_', ' ')}
                          </span>
                          {member.late_minutes > 0 && (
                            <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">
                              +{member.late_minutes}min late
                            </span>
                          )}
                        </div>
                        <div className="flex gap-4 mt-1 text-xs text-slate-400">
                          <span>In: <span className="text-emerald-600 font-medium">{fmt12(member.check_in)}</span></span>
                          <span>Out: <span className="text-red-500 font-medium">{fmt12(member.check_out)}</span></span>
                          {duration !== null && (
                            <span>Duration: <span className="text-indigo-600 font-medium">{Math.floor(duration / 60)}h {duration % 60}m</span></span>
                          )}
                          {member.method && (
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold capitalize">
                              {(member.method || '').replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status badge */}
                      <StatusBadge status={member.status}/>

                      {/* Quick mark */}
                      <div className="flex gap-1.5 shrink-0">
                        {[
                          { s: 'present', label: 'P', cls: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-500 hover:text-white', active: 'bg-emerald-500 text-white' },
                          { s: 'absent',  label: 'A', cls: 'bg-red-100 text-red-700 hover:bg-red-500 hover:text-white',            active: 'bg-red-500 text-white' },
                          { s: 'late',    label: 'L', cls: 'bg-orange-100 text-orange-700 hover:bg-orange-500 hover:text-white',   active: 'bg-orange-500 text-white' },
                        ].map(btn => (
                          <button key={btn.s}
                            onClick={() => handleStaffMark(member.identifier, btn.s)}
                            className={`w-8 h-8 rounded-xl text-xs font-extrabold transition-all hover:scale-110 ${
                              member.status === btn.s ? btn.active : btn.cls
                            }`}>
                            {btn.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Monthly summary */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <Calendar size={18} className="text-indigo-500"/> Staff Monthly Summary
              </h3>
              <div className="flex items-center gap-3">
                <select className="form-select font-medium" value={staffMonth} onChange={e => setStaffMonth(Number(e.target.value))}>
                  {[...Array(12)].map((_, i) => <option key={i} value={i + 1}>{monthName(i + 1)}</option>)}
                </select>
                <select className="form-select font-medium" value={staffYear} onChange={e => setStaffYear(Number(e.target.value))}>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <button onClick={fetchStaffMonthly} disabled={staffMonthLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all disabled:opacity-60 flex items-center gap-2">
                  {staffMonthLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <RefreshCw size={15}/>}
                  Load
                </button>
              </div>
            </div>

            {staffMonthLoading ? (
              <div className="py-12 text-center">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"/>
              </div>
            ) : staffMonthData.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">No data for this period</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                      <th className="p-3 text-left">Staff</th>
                      <th className="p-3 text-left">Role</th>
                      <th className="p-3 text-center text-emerald-600">Present</th>
                      <th className="p-3 text-center text-red-600">Absent</th>
                      <th className="p-3 text-center text-amber-600">Leave</th>
                      <th className="p-3 text-center text-orange-600">Late</th>
                      <th className="p-3 text-center">Attendance %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {staffMonthData.map(m => {
                      const pct = parseFloat(m.stats.percentage);
                      return (
                        <tr key={m._id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-bold text-slate-700">{m.name}</td>
                          <td className="p-3">
                            <span className="text-[11px] bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-bold capitalize">
                              {(m.role || '').replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-3 text-center font-bold text-emerald-600">{m.stats.present}</td>
                          <td className="p-3 text-center font-bold text-red-600">{m.stats.absent}</td>
                          <td className="p-3 text-center font-bold text-amber-600">{m.stats.leave}</td>
                          <td className="p-3 text-center font-bold text-orange-600">{m.stats.late}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-500'}`}
                                  style={{ width: `${Math.min(100, pct)}%` }}/>
                              </div>
                              <span className={`text-xs font-extrabold w-12 text-right ${pct >= 75 ? 'text-emerald-600' : 'text-red-500'}`}>
                                {m.stats.percentage}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          STUDENT DETAIL MODAL
      ══════════════════════════════════════════════════ */}
      {selectedStudent && (() => {
        const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
        const firstDay    = new Date(selectedYear, selectedMonth - 1, 1).getDay();
        const pct = parseFloat(selectedStudent.stats.percentage);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
              {/* Header */}
              <div className="p-6 border-b border-slate-100 rounded-t-3xl flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                  {selectedStudent.photo ? (
                    <img src={`${API_BASE}/uploads/${selectedStudent.photo}`} alt={selectedStudent.name}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-indigo-100 shadow-lg"/>
                  ) : (
                    <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-indigo-200">
                      {(selectedStudent.name || '').charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">{selectedStudent.name}</h3>
                    <p className="text-slate-500 text-sm">{selectedStudent.roll_no} · {monthName(selectedMonth)} {selectedYear}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedStudent(null)}
                  className="p-2 bg-slate-100 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors">
                  <X size={22}/>
                </button>
              </div>
              {/* Body */}
              <div className="overflow-y-auto p-7 space-y-7">
                {/* Stats */}
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { label: 'Present', val: selectedStudent.stats.present, cls: 'bg-emerald-50 border-emerald-100 text-emerald-600' },
                    { label: 'Absent',  val: selectedStudent.stats.absent,  cls: 'bg-red-50 border-red-100 text-red-600' },
                    { label: 'Leave',   val: selectedStudent.stats.leave || 0, cls: 'bg-amber-50 border-amber-100 text-amber-600' },
                    { label: 'Late',    val: selectedStudent.stats.late || 0, cls: 'bg-orange-50 border-orange-100 text-orange-600' },
                  ].map(s => (
                    <div key={s.label} className={`p-5 rounded-2xl border text-center ${s.cls.split(' ').slice(0, 2).join(' ')}`}>
                      <p className={`text-3xl font-extrabold ${s.cls.split(' ')[2]}`}>{s.val}</p>
                      <p className="text-xs font-bold uppercase tracking-wide mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>
                {/* Rate bar */}
                <div className={`p-4 rounded-2xl border ${pct >= 75 ? 'bg-indigo-50 border-indigo-100' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-slate-600">Attendance Rate</span>
                    <span className={`text-2xl font-extrabold ${pct >= 75 ? 'text-indigo-600' : 'text-red-600'}`}>
                      {selectedStudent.stats.percentage}
                    </span>
                  </div>
                  <div className="w-full h-3 bg-white/60 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${pct >= 75 ? 'bg-indigo-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(100, pct)}%` }}/>
                  </div>
                  {pct < 75 && <p className="text-xs text-red-600 font-medium mt-2 flex items-center gap-1"><AlertTriangle size={12}/> Below minimum 75% attendance</p>}
                </div>
                {/* Calendar */}
                <div>
                  <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <Calendar size={18} className="text-indigo-500"/>
                    Attendance Calendar — {monthName(selectedMonth)} {selectedYear}
                  </h4>
                  <div className="grid grid-cols-7 gap-2 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                      <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {[...Array(firstDay)].map((_, i) => <div key={`e${i}`}/>)}
                    {[...Array(daysInMonth)].map((_, i) => {
                      const day = i + 1;
                      const status = selectedStudent.attendance[day];
                      return (
                        <div key={day} className={`aspect-square rounded-xl flex flex-col items-center justify-center border-2 transition-all hover:scale-105 ${
                          status === 'present'  ? 'bg-emerald-500 border-emerald-500 text-white shadow-md' :
                          status === 'absent'   ? 'bg-white border-red-200 text-red-500' :
                          status === 'leave'    ? 'bg-amber-100 border-amber-300 text-amber-700' :
                          status === 'late'     ? 'bg-orange-100 border-orange-300 text-orange-700' :
                          status === 'half_day' ? 'bg-yellow-100 border-yellow-300 text-yellow-700' :
                          'bg-slate-50 border-slate-100 text-slate-300'
                        }`}>
                          <span className="text-sm font-bold">{day}</span>
                          {status && <span className="text-[9px] uppercase font-bold opacity-80 mt-0.5">{status.slice(0, 3)}</span>}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-4 mt-4 flex-wrap text-xs text-slate-500">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500 inline-block"/> Present</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border-2 border-red-200 inline-block"/> Absent</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 border-2 border-amber-300 inline-block"/> Leave</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-100 border-2 border-orange-300 inline-block"/> Late</span>
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
