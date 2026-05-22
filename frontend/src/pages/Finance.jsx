import { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { confirm } from '../utils/confirm';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import {
  Wallet, TrendingUp, TrendingDown, Users, AlertTriangle,
  CheckCircle2, XCircle, Search, DollarSign, Briefcase, Wrench,
  FileText, Eye, Printer, X, Download, Calendar, BellRing,
  Award, ChevronDown, ChevronUp, MessageCircle, Phone, Trash2,
  ArrowUpRight, ArrowDownRight, List, CreditCard, Repeat, Zap,
  BarChart2, Shield, PlayCircle
} from 'lucide-react';

const CATEGORY_LABELS = {
  fee_collection: 'Fee', salary_payment: 'Salary', trainer_commission: 'Commission',
  maintenance: 'Maintenance', utilities: 'Utilities', rent: 'Rent',
  supplies: 'Supplies', marketing: 'Marketing', fine_collection: 'Fine',
  absence: 'Absence Fine', other: 'Other',
};

const TrendTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-4 text-sm">
      <p className="font-extrabold text-slate-700 mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }}/>
          <span className="font-medium text-slate-500 capitalize">{p.name}:</span>
          <span className="font-bold" style={{ color: p.color }}>Rs. {(p.value || 0).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

const Finance = () => {
  const [activeModule, setActiveModule] = useState('fees');
  const [data, setData] = useState({ stats: {}, students: [], staff: [], expenses: [], trainerCommissions: [], allTransactions: [] });
  const [loading, setLoading] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [showLedger, setShowLedger] = useState(false);
  const [ledgerData, setLedgerData] = useState(null);

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    title: '', amount: '', category: 'maintenance',
    date: new Date().toISOString().split('T')[0], is_recurring: false
  });

  const [showCollectModal, setShowCollectModal] = useState(false);
  const [collectTarget, setCollectTarget] = useState(null);
  const [collectForm, setCollectForm] = useState({ amount: '', payment_method: 'cash', date: new Date().toISOString().split('T')[0], notes: '' });

  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [salaryTarget, setSalaryTarget] = useState(null);

  const [showBulkSalaryModal, setShowBulkSalaryModal] = useState(false);
  const [bulkPayLoading, setBulkPayLoading] = useState(false);

  const [expandedTrainer, setExpandedTrainer] = useState(null);

  const [txnTypeFilter, setTxnTypeFilter] = useState('all');
  const [txnSearch, setTxnSearch] = useState('');

  const [recurringExpenses, setRecurringExpenses] = useState([]);
  const [trendData, setTrendData] = useState([]);

  const [showReminderModal, setShowReminderModal] = useState(false);

  const currentDay = new Date().getDate();
  const isLate = currentDay > 5;
  const unpaidCount = data.students.filter(s => s.status === 'Unpaid').length;
  const showLateAlert = isLate && unpaidCount > 0;

  useEffect(() => { fetchFinanceData(); }, [selectedMonth, selectedYear]);
  useEffect(() => { fetchTrend(); fetchRecurringExpenses(); }, []);

  const fetchFinanceData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/finance/monthly?month=${selectedMonth}&year=${selectedYear}&t=${Date.now()}`);
      setData(res.data);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  const fetchTrend = async () => {
    try {
      const res = await api.get('/finance/trend?months=6');
      setTrendData(res.data.trend || []);
    } catch {}
  };

  const fetchRecurringExpenses = async () => {
    try {
      const res = await api.get('/finance/recurring-expenses');
      setRecurringExpenses(res.data || []);
    } catch {}
  };

  // --- FEE COLLECTION ---
  const openCollectModal = (student) => {
    setCollectTarget(student);
    setCollectForm({
      amount: student.total_due || student.fee_amount,
      payment_method: 'cash',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setShowCollectModal(true);
  };

  const submitCollectFee = async (e) => {
    e.preventDefault();
    const amount = Number(collectForm.amount);
    if (!amount || amount <= 0) { toast.error('Invalid amount'); return; }
    try {
      await api.post('/finance/collect-fee', {
        student_id: collectTarget._id,
        amount,
        payment_method: collectForm.payment_method,
        description: collectForm.notes || 'Monthly Fee',
        date: collectForm.date
      });
      toast.success('Fee collected! Trainer commission auto-credited.');
      setShowCollectModal(false);
      setTimeout(fetchFinanceData, 500);
    } catch (error) { toast.error(error.response?.data?.message || 'Transaction failed'); }
  };

  // --- SALARY ---
  const openSalaryModal = (emp) => { setSalaryTarget(emp); setShowSalaryModal(true); };

  const generateSalarySlipPDF = (emp, month, year) => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' });
    const pageW = doc.internal.pageSize.getWidth();

    // Header background
    doc.setFillColor(30, 58, 95);
    doc.rect(0, 0, pageW, 42, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Inflorescence Advance Skills', 14, 16);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('SALARY SLIP', 14, 25);
    doc.setFontSize(10);
    doc.text(`${monthName} ${year}`, 14, 33);

    // Slip No & Date top-right
    doc.setFontSize(9);
    doc.text(`Date: ${new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}`, pageW - 14, 20, { align: 'right' });
    doc.text(`Ref: SAL-${year}${String(month).padStart(2,'0')}-${emp._id?.toString().slice(-4).toUpperCase()}`, pageW - 14, 28, { align: 'right' });

    // Employee details
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Employee Details', 14, 54);
    doc.setLineWidth(0.4);
    doc.setDrawColor(100, 116, 139);
    doc.line(14, 56, pageW - 14, 56);

    const roleLabel = emp.role === 'teacher' ? 'Teacher' : emp.role === 'clerk' ? 'Clerk' : emp.role === 'office_boy' ? 'Office Staff' : 'Staff';
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const empDetails = [
      ['Name:', emp.name],
      ['Designation:', roleLabel],
      ['Pay Period:', `${monthName} ${year}`],
      ['Email:', emp.email || '—'],
    ];
    let y = 63;
    empDetails.forEach(([label, val]) => {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text(label, 14, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.text(String(val), 55, y);
      y += 7;
    });

    // Earnings table
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text('Earnings Breakdown', 14, y);
    doc.line(14, y + 2, pageW - 14, y + 2);

    const rows = [['Basic Salary', '', `Rs. ${Number(emp.salary || 0).toLocaleString()}`]];
    if ((emp.commission_earned || 0) > 0) rows.push(['Commission / Incentive', '', `Rs. ${Number(emp.commission_earned).toLocaleString()}`]);

    autoTable(doc, {
      startY: y + 5,
      head: [['Component', 'Notes', 'Amount']],
      body: rows,
      styles: { fontSize: 10, cellPadding: 4 },
      headStyles: { fillColor: [30, 58, 95], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { fontStyle: 'bold' }, 2: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    });

    const afterTable = doc.lastAutoTable.finalY + 6;

    // Net pay box
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(14, afterTable, pageW - 28, 18, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 58, 95);
    doc.text('NET PAY', 20, afterTable + 12);
    doc.setFontSize(16);
    doc.text(`Rs. ${Number(emp.total_payout || emp.salary || 0).toLocaleString()}`, pageW - 20, afterTable + 12, { align: 'right' });

    // Footer
    const footerY = afterTable + 34;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(14, footerY, pageW - 14, footerY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('This is a computer-generated salary slip and does not require a signature.', pageW / 2, footerY + 6, { align: 'center' });
    doc.text('Inflorescence Advance Skills — ERP System', pageW / 2, footerY + 11, { align: 'center' });

    return doc;
  };

  const submitSalary = async () => {
    try {
      // Generate PDF slip
      const doc = generateSalarySlipPDF(salaryTarget, selectedMonth, selectedYear);
      const pdfBase64 = doc.output('datauristring').split(',')[1];

      await api.post('/finance/pay-salary', {
        staff_id: salaryTarget._id,
        amount: Number(salaryTarget.total_payout || salaryTarget.salary),
        month: selectedMonth,
        year: selectedYear,
        commission: salaryTarget.commission_earned || 0,
        slipPdfBase64: pdfBase64,
      });

      toast.success(`✅ Salary paid & slip emailed to ${salaryTarget.email || salaryTarget.name}`);
      setShowSalaryModal(false);
      setTimeout(fetchFinanceData, 500);
    } catch { toast.error('Payment failed'); }
  };

  const resendSalarySlip = async (emp) => {
    try {
      const doc = generateSalarySlipPDF(emp, selectedMonth, selectedYear);
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      await api.post('/finance/resend-salary-slip', {
        staff_id: emp._id,
        month: selectedMonth,
        year: selectedYear,
        commission: emp.commission_earned || 0,
        slipPdfBase64: pdfBase64,
      });
      toast.success(`Salary slip re-sent to ${emp.email || emp.name}`);
    } catch { toast.error('Failed to resend slip'); }
  };

  const downloadSalarySlip = (emp) => {
    const doc = generateSalarySlipPDF(emp, selectedMonth, selectedYear);
    const monthName = new Date(selectedYear, selectedMonth - 1, 1).toLocaleString('default', { month: 'long' });
    doc.save(`Salary_Slip_${emp.name.replace(/\s+/g,'_')}_${monthName}_${selectedYear}.pdf`);
    toast.success('Salary slip downloaded!');
  };

  const handleBulkPaySalary = async () => {
    setBulkPayLoading(true);
    try {
      const res = await api.post('/finance/pay-all-salaries', { month: selectedMonth, year: selectedYear });
      toast.success(res.data.message);
      setShowBulkSalaryModal(false);
      setTimeout(fetchFinanceData, 500);
    } catch (error) { toast.error(error.response?.data?.message || 'Failed to process salaries'); }
    finally { setBulkPayLoading(false); }
  };

  // --- LEDGER ---
  const handleViewLedger = async (studentId) => {
    try {
      const { data } = await api.get(`/finance/student/${studentId}`);
      setLedgerData(data);
      setShowLedger(true);
    } catch { toast.error('Could not load history'); }
  };

  // --- EXPENSES ---
  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      await api.post('/finance/add-expense', {
        title: expenseForm.title,
        amount: Number(expenseForm.amount),
        category: expenseForm.category,
        date: expenseForm.date
      });
      if (expenseForm.is_recurring) {
        await api.post('/finance/recurring-expenses', {
          title: expenseForm.title,
          amount: Number(expenseForm.amount),
          category: expenseForm.category
        });
        fetchRecurringExpenses();
      }
      toast.success(expenseForm.is_recurring ? 'Expense added & saved as recurring template' : 'Expense added');
      setShowExpenseModal(false);
      setExpenseForm({ title: '', amount: '', category: 'maintenance', date: new Date().toISOString().split('T')[0], is_recurring: false });
      fetchFinanceData();
    } catch { toast.error('Failed to add expense'); }
  };

  const handleDeleteExpense = async (id, description) => {
    if (!await confirm(`Delete expense "${description}"?`, { title: 'Delete Expense' })) return;
    try {
      await api.delete(`/finance/expense/${id}`);
      toast.success('Expense deleted');
      fetchFinanceData();
    } catch (error) { toast.error(error.response?.data?.message || 'Delete failed'); }
  };

  const handleApplyRecurring = async (template) => {
    try {
      await api.post('/finance/add-expense', {
        title: template.title,
        amount: template.amount,
        category: template.category,
        date: new Date().toISOString().split('T')[0]
      });
      const monthName = new Date(0, selectedMonth - 1).toLocaleString('default', { month: 'long' });
      toast.success(`"${template.title}" added for ${monthName} ${selectedYear}`);
      fetchFinanceData();
    } catch { toast.error('Failed to add expense'); }
  };

  const handleDeleteRecurring = async (id) => {
    if (!await confirm('Remove this recurring template?', { title: 'Remove Template', confirmText: 'Remove' })) return;
    try {
      await api.delete(`/finance/recurring-expenses/${id}`);
      toast.success('Template removed');
      fetchRecurringExpenses();
    } catch {}
  };

  // --- WHATSAPP ---
  const formatWANumber = (phone) => {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('92')) return digits;
    if (digits.startsWith('0')) return '92' + digits.slice(1);
    return '92' + digits;
  };

  const buildWAMessage = (student) => {
    const monthName = new Date(0, selectedMonth - 1).toLocaleString('default', { month: 'long' });
    return `Assalam-o-Alaikum!\n\nDear parent/guardian of *${student.name}* (${student.roll_no}),\n\nYour fee of *Rs. ${student.fee_amount?.toLocaleString()}* for *${monthName} ${selectedYear}* is pending.\n\nPlease visit the institute at your earliest convenience to clear your dues.\n\nJazak Allah Khair.`;
  };

  const sendWhatsAppReminder = (student, useGuardian = false) => {
    const phone = useGuardian ? student.guardian_phone : student.phone;
    const number = formatWANumber(phone);
    if (!number) { toast.error('No phone number on record'); return; }
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(buildWAMessage(student))}`, '_blank');
  };

  // --- PDF REPORTS ---
  const generatePDFReport = () => {
    try {
      const doc = new jsPDF();
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.text('Institute Financial Report', 14, 25);
      doc.setFontSize(9);
      doc.setTextColor(200, 200, 200);
      doc.text(`Period: ${selectedMonth}/${selectedYear}  |  Generated: ${new Date().toLocaleString()}`, 14, 33);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.text(`Income: Rs. ${data.stats?.income?.toLocaleString() || 0}`, 14, 50);
      doc.text(`Expense: Rs. ${data.stats?.expense?.toLocaleString() || 0}`, 80, 50);
      doc.text(`Profit: Rs. ${data.stats?.profit?.toLocaleString() || 0}`, 150, 50);
      autoTable(doc, {
        startY: 58,
        head: [['Roll No', 'Name', 'Monthly Fee', 'Late Fee', 'Total Due', 'Paid', 'Status', 'Date']],
        body: filteredStudents.map(s => [
          s.roll_no, s.name,
          `Rs. ${s.fee_amount}`,
          s.late_fee_amount > 0 ? `Rs. ${s.late_fee_amount}` : '-',
          `Rs. ${s.total_due || s.fee_amount}`,
          `Rs. ${s.paid_amount || 0}`,
          s.status, s.paid_date ? new Date(s.paid_date).toLocaleDateString() : '-'
        ]),
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] },
        alternateRowStyles: { fillColor: [240, 240, 255] }
      });
      doc.save(`Finance_${selectedMonth}_${selectedYear}.pdf`);
      toast.success('PDF Downloaded!');
    } catch (error) { console.error(error); toast.error('PDF Generation Failed'); }
  };

  const generatePayrollPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.text('Payroll Report', 14, 22);
      doc.setFontSize(9);
      doc.setTextColor(200, 200, 200);
      doc.text(
        `${new Date(0, selectedMonth - 1).toLocaleString('default', { month: 'long' })} ${selectedYear}  |  Generated: ${new Date().toLocaleString()}`,
        14, 33
      );

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(`Total Staff: ${data.staff.length}`, 14, 50);
      doc.text(`Paid: ${data.staff.filter(e => e.status === 'Paid').length}`, 70, 50);
      doc.text(`Pending: ${data.staff.filter(e => e.status !== 'Paid').length}`, 110, 50);
      doc.text(`Total Payout: Rs. ${totalPayroll.toLocaleString()}`, 150, 50);

      autoTable(doc, {
        startY: 58,
        head: [['Employee', 'Role', 'Base Salary', 'Commission', 'Total Payout', 'Status']],
        body: data.staff.map(e => [
          e.name,
          e.role.replace('_', ' '),
          `Rs. ${e.salary.toLocaleString()}`,
          e.commission_earned > 0 ? `Rs. ${e.commission_earned.toLocaleString()}` : '—',
          `Rs. ${(e.total_payout || e.salary).toLocaleString()}`,
          e.status === 'Paid' ? `Paid (${new Date(e.paid_date).toLocaleDateString()})` : 'Pending'
        ]),
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42] },
        alternateRowStyles: { fillColor: [248, 250, 252] }
      });

      const finalY = doc.lastAutoTable.finalY + 12;
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`Base Salaries: Rs. ${totalBaseSalary.toLocaleString()}`, 14, finalY);
      doc.text(`Commissions: Rs. ${totalCommissions.toLocaleString()}`, 80, finalY);
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'bold');
      doc.text(`Grand Total: Rs. ${totalPayroll.toLocaleString()}`, 14, finalY + 10);

      doc.save(`Payroll_${selectedMonth}_${selectedYear}.pdf`);
      toast.success('Payroll PDF downloaded!');
    } catch (error) { console.error(error); toast.error('PDF generation failed'); }
  };

  // --- DERIVED ---
  const filteredStudents = data.students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.roll_no || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' ? true
      : statusFilter === 'paid' ? s.status === 'Paid' : s.status === 'Unpaid';
    return matchesSearch && matchesStatus;
  });

  const filteredTransactions = (data.allTransactions || []).filter(t => {
    const matchesType = txnTypeFilter === 'all' || t.type === txnTypeFilter;
    const term = txnSearch.toLowerCase();
    const matchesSearch = !term ||
      (t.description || '').toLowerCase().includes(term) ||
      (t.category || '').toLowerCase().includes(term) ||
      (t.student?.name || '').toLowerCase().includes(term);
    return matchesType && matchesSearch;
  });

  const totalBaseSalary = data.staff.reduce((s, e) => s + (e.salary || 0), 0);
  const totalCommissions = data.staff.reduce((s, e) => s + (e.commission_earned || 0), 0);
  const totalPayroll = totalBaseSalary + totalCommissions;
  const totalExpenses = data.expenses.reduce((s, e) => s + e.amount, 0);
  const totalTrainerCommissions = (data.trainerCommissions || []).reduce((s, t) => s + t.total, 0);
  const unpaidStaff = data.staff.filter(e => e.status !== 'Paid');

  const isAlreadyApplied = (template) =>
    data.expenses.some(e => e.description?.toLowerCase() === template.title?.toLowerCase());

  const expenseCategories = [
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'utilities', label: 'Utilities' },
    { value: 'rent', label: 'Rent' },
    { value: 'supplies', label: 'Supplies' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'other', label: 'Other' },
  ];

  const modules = [
    { key: 'fees', label: 'Student Fees', icon: <Users size={16}/> },
    { key: 'salary', label: 'Payroll', icon: <Briefcase size={16}/> },
    { key: 'trainer', label: 'Trainer Earnings', icon: <Award size={16}/> },
    { key: 'expenses', label: 'Expenses', icon: <Wrench size={16}/> },
    { key: 'transactions', label: 'Transactions', icon: <List size={16}/> },
  ];

  return (
    <div className="space-y-8 animate-fade-in-up pb-12">

      {loading && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4 border border-slate-100">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
            <p className="font-bold text-slate-600">Loading finance data...</p>
          </div>
        </div>
      )}

      {/* LATE FEE ALERT */}
      {showLateAlert && (
        <div className="bg-rose-600 rounded-[2rem] p-6 text-white shadow-xl shadow-rose-200 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-full"><BellRing size={28}/></div>
            <div>
              <h3 className="text-xl font-extrabold">Late Fee Alert — Day {currentDay}</h3>
              <p className="text-rose-100 font-medium">{unpaidCount} students have not paid this month.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowReminderModal(true)} className="bg-rose-800 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-rose-900 transition-all border border-rose-700/50">Send Reminders</button>
            <button onClick={() => { setActiveModule('fees'); setStatusFilter('unpaid'); }} className="bg-white text-rose-600 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-rose-50 shadow-lg">View Defaulters</button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 flex items-center gap-3">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shadow-sm"><Wallet size={28}/></div>
            Finance Center
          </h2>
          <p className="text-slate-500 font-medium mt-1 ml-1">Cashflow, Payroll, Trainer Earnings & Reports</p>
        </div>
        <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-200 shadow-sm">
          <div className="pl-3 text-slate-400"><Calendar size={20}/></div>
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-transparent font-bold text-slate-700 outline-none cursor-pointer py-2">
            {[...Array(12)].map((_, i) => <option key={i} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>)}
          </select>
          <div className="w-px h-6 bg-slate-300"/>
          <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="bg-transparent font-bold text-slate-700 outline-none cursor-pointer py-2 pr-4">
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-[2rem] text-white shadow-xl shadow-emerald-200 col-span-2 lg:col-span-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"/>
          <div className="flex items-center gap-2 mb-2 opacity-90"><TrendingUp size={16}/><span className="text-xs font-bold uppercase tracking-wide">Total Income</span></div>
          <p className="text-3xl font-extrabold">Rs. {(data.stats?.income || 0).toLocaleString()}</p>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-rose-500 to-rose-600 p-6 rounded-[2rem] text-white shadow-xl shadow-rose-200">
          <div className="flex items-center gap-2 mb-2 opacity-90"><TrendingDown size={16}/><span className="text-xs font-bold uppercase tracking-wide">Total Expense</span></div>
          <p className="text-3xl font-extrabold">Rs. {(data.stats?.expense || 0).toLocaleString()}</p>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-lg">
          <div className="flex items-center gap-2 mb-2 text-slate-400"><DollarSign size={16}/><span className="text-xs font-bold uppercase tracking-wide">Net Profit</span></div>
          <p className={`text-3xl font-extrabold ${(data.stats?.profit || 0) >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
            Rs. {(data.stats?.profit || 0).toLocaleString()}
          </p>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm grid grid-rows-2 gap-2">
          <div onClick={() => { setActiveModule('fees'); setStatusFilter('paid'); }} className="cursor-pointer flex items-center justify-between hover:bg-emerald-50 rounded-xl px-2 transition-colors">
            <span className="text-xs font-bold text-slate-400 uppercase">Cleared</span>
            <span className="font-extrabold text-emerald-600 text-xl">{data.students.filter(s => s.status === 'Paid').length}</span>
          </div>
          <div onClick={() => { setActiveModule('fees'); setStatusFilter('unpaid'); }} className="cursor-pointer flex items-center justify-between hover:bg-rose-50 rounded-xl px-2 transition-colors">
            <span className="text-xs font-bold text-slate-400 uppercase">Pending</span>
            <span className="font-extrabold text-rose-500 text-xl">{data.students.filter(s => s.status === 'Unpaid').length}</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-violet-500 to-violet-600 p-6 rounded-[2rem] text-white shadow-xl shadow-violet-200">
          <div className="flex items-center gap-2 mb-2 opacity-90"><Shield size={16}/><span className="text-xs font-bold uppercase tracking-wide">Fines Collected</span></div>
          <p className="text-3xl font-extrabold">Rs. {(data.stats?.fines_income || 0).toLocaleString()}</p>
          <p className="text-violet-200 text-xs font-semibold mt-1">This month</p>
        </div>
      </div>

      {/* MONTH-OVER-MONTH TREND CHART */}
      {trendData.length > 0 && (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><BarChart2 size={20}/></div>
              <div>
                <h3 className="font-extrabold text-slate-800">6-Month Financial Trend</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Income vs Expense vs Profit</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block"/><span className="text-slate-500">Income</span></span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-rose-500 inline-block"/><span className="text-slate-500">Expense</span></span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-indigo-500 inline-block"/><span className="text-slate-500">Profit</span></span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={trendData} barGap={4} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
              <XAxis dataKey="label" tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`}/>
              <Tooltip content={<TrendTooltip/>} cursor={{ fill: '#f8fafc' }}/>
              <Bar dataKey="income" name="Income" fill="#10b981" radius={[6, 6, 0, 0]}/>
              <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[6, 6, 0, 0]}/>
              <Bar dataKey="profit" name="Profit" fill="#6366f1" radius={[6, 6, 0, 0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* NAVIGATION */}
      <div className="flex justify-center">
        <div className="flex bg-slate-900 p-1.5 rounded-2xl shadow-2xl shadow-slate-300/50 flex-wrap gap-1">
          {modules.map(m => (
            <button key={m.key} onClick={() => setActiveModule(m.key)}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${activeModule === m.key ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* ===== MODULE 1: STUDENT FEES ===== */}
      {activeModule === 'fees' && (
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden animate-fade-in-up">
          <div className="p-6 border-b border-slate-100 flex flex-col lg:flex-row justify-between items-center gap-4 bg-slate-50/50">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-4 top-3.5 text-slate-400" size={18}/>
              <input className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium bg-white transition-all"
                placeholder="Search by name or roll no..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}/>
            </div>
            <div className="flex gap-3">
              <div className="flex bg-white border border-slate-200 p-1 rounded-xl">
                {['all', 'paid', 'unpaid'].map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${statusFilter === s ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
                    {s}
                  </button>
                ))}
              </div>
              <button onClick={generatePDFReport} className="bg-rose-500 hover:bg-rose-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-rose-200 active:scale-95 transition-all flex items-center gap-2">
                <FileText size={16}/> PDF Report
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-slate-500 text-[11px] font-extrabold uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="p-6">Student</th>
                  <th className="p-6">Monthly Fee</th>
                  <th className="p-6">Paid Amount</th>
                  <th className="p-6">Status</th>
                  <th className="p-6">Paid Date</th>
                  <th className="p-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {filteredStudents.map(student => (
                  <tr key={student._id} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="p-6">
                      <div className="font-bold text-slate-800">{student.name}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{student.roll_no} • {student.phone}</div>
                    </td>
                    <td className="p-6">
                      <div className="font-mono font-bold text-slate-600">Rs. {student.fee_amount.toLocaleString()}</div>
                      {student.late_fee_amount > 0 && (
                        <div className="mt-1 flex flex-col gap-0.5">
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md font-bold border border-amber-200 w-fit">
                            + Rs. {student.late_fee_amount.toLocaleString()} late fee
                          </span>
                          <span className="text-[11px] text-rose-500 font-bold">Total: Rs. {student.total_due?.toLocaleString()}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-6 font-mono font-bold text-emerald-700">
                      {student.paid_amount > 0 ? `Rs. ${student.paid_amount.toLocaleString()}` : '—'}
                    </td>
                    <td className="p-6">
                      {student.status === 'Paid'
                        ? <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold flex w-fit items-center gap-1.5 border border-emerald-200"><CheckCircle2 size={13}/> Paid</span>
                        : <span className="bg-rose-50 text-rose-600 px-3 py-1.5 rounded-lg text-xs font-bold flex w-fit items-center gap-1.5 border border-rose-100"><XCircle size={13}/> Pending</span>}
                    </td>
                    <td className="p-6 text-slate-500 font-medium text-sm">
                      {student.paid_date ? new Date(student.paid_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="p-6 text-right">
                      <div className="flex justify-end gap-2">
                        {student.status === 'Unpaid' && (
                          <>
                            <button onClick={() => openCollectModal(student)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-1.5">
                              <DollarSign size={13}/> Collect
                            </button>
                            <button onClick={() => sendWhatsAppReminder(student)} className="bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-lg shadow-emerald-100 hover:bg-emerald-600 transition-all flex items-center gap-1.5">
                              <MessageCircle size={13}/> WhatsApp
                            </button>
                          </>
                        )}
                        <button onClick={() => handleViewLedger(student._id)} className="bg-white text-slate-600 px-4 py-2 rounded-xl font-bold text-xs border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-1.5">
                          <Eye size={13}/> Ledger
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {filteredStudents.length > 0 && (
                <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                  <tr>
                    <td className="p-6 font-extrabold text-slate-700">Total ({filteredStudents.length})</td>
                    <td className="p-6 font-extrabold font-mono text-slate-700">Rs. {filteredStudents.reduce((s, st) => s + st.fee_amount, 0).toLocaleString()}</td>
                    <td className="p-6 font-extrabold font-mono text-emerald-700">Rs. {filteredStudents.reduce((s, st) => s + (st.paid_amount || 0), 0).toLocaleString()}</td>
                    <td colSpan={3}/>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {filteredStudents.length === 0 && <div className="p-12 text-center text-slate-400 font-medium">No records found for this month.</div>}
        </div>
      )}

      {/* ===== MODULE 2: PAYROLL ===== */}
      {activeModule === 'salary' && (
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden animate-fade-in-up">
          <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Briefcase className="text-indigo-500"/> Payroll — {new Date(0, selectedMonth - 1).toLocaleString('default', { month: 'long' })} {selectedYear}</h3>
              <p className="text-sm text-slate-400 mt-1">Base salary + auto-tracked commission earnings</p>
            </div>
            <div className="flex items-center gap-3">
              {unpaidStaff.length > 0 && (
                <button
                  onClick={() => setShowBulkSalaryModal(true)}
                  className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all flex items-center gap-2"
                >
                  <Zap size={15}/> Pay All ({unpaidStaff.length})
                </button>
              )}
              <button onClick={generatePayrollPDF} className="bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-700 shadow-lg transition-all flex items-center gap-2">
                <FileText size={15}/> Export PDF
              </button>
              <div className="text-right">
                <p className="text-xs text-slate-400 uppercase font-bold">Total Payout</p>
                <p className="text-2xl font-extrabold text-slate-800">Rs. {totalPayroll.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white text-slate-500 text-[11px] font-extrabold uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="p-6">Employee</th>
                  <th className="p-6">Role</th>
                  <th className="p-6">Base Salary</th>
                  <th className="p-6">Commission Earned</th>
                  <th className="p-6">Total Payout</th>
                  <th className="p-6">Salary Status</th>
                  <th className="p-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {data.staff.map(emp => (
                  <tr key={emp._id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-6">
                      <div className="font-bold text-slate-700 text-base">{emp.name}</div>
                    </td>
                    <td className="p-6">
                      <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase border ${
                        emp.role === 'teacher' ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>{emp.role.replace('_', ' ')}</span>
                    </td>
                    <td className="p-6 font-mono font-bold text-slate-600">Rs. {emp.salary.toLocaleString()}</td>
                    <td className="p-6">
                      {emp.commission_percent > 0 ? (
                        <div>
                          <p className="font-mono font-bold text-amber-600">Rs. {(emp.commission_earned || 0).toLocaleString()}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{emp.commission_percent}% rate</p>
                        </div>
                      ) : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                    <td className="p-6 font-mono font-extrabold text-slate-800">Rs. {(emp.total_payout || emp.salary).toLocaleString()}</td>
                    <td className="p-6">
                      {emp.status === 'Paid'
                        ? <span className="text-emerald-600 font-bold text-xs flex items-center gap-1"><CheckCircle2 size={15}/> Paid {emp.paid_date ? new Date(emp.paid_date).toLocaleDateString() : ''}</span>
                        : <span className="text-amber-500 font-bold text-xs flex items-center gap-1"><AlertTriangle size={15}/> Pending</span>}
                    </td>
                    <td className="p-6 text-right">
                      {emp.status === 'Unpaid' ? (
                        <button onClick={() => openSalaryModal(emp)}
                          className="bg-slate-800 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-slate-700 shadow-lg transition-all flex items-center gap-1.5 ml-auto">
                          <CheckCircle2 size={13}/> Process Pay
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 justify-end">
                          <button onClick={() => downloadSalarySlip(emp)}
                            className="bg-indigo-600 text-white px-3 py-1.5 rounded-xl font-bold text-xs hover:bg-indigo-700 transition-all flex items-center gap-1.5 shadow">
                            <Download size={12}/> Slip
                          </button>
                          {emp.email && (
                            <button onClick={() => resendSalarySlip(emp)}
                              className="bg-emerald-600 text-white px-3 py-1.5 rounded-xl font-bold text-xs hover:bg-emerald-700 transition-all flex items-center gap-1.5 shadow">
                              <BellRing size={12}/> Resend
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-200 text-sm font-extrabold text-slate-700">
                <tr>
                  <td className="p-6">Totals</td><td/>
                  <td className="p-6 font-mono">Rs. {totalBaseSalary.toLocaleString()}</td>
                  <td className="p-6 font-mono text-amber-600">Rs. {totalCommissions.toLocaleString()}</td>
                  <td className="p-6 font-mono text-slate-900">Rs. {totalPayroll.toLocaleString()}</td>
                  <td colSpan={2}/>
                </tr>
              </tfoot>
            </table>
          </div>
          {data.staff.length === 0 && <div className="p-12 text-center text-slate-400 font-medium">No staff records found.</div>}
        </div>
      )}

      {/* ===== MODULE 3: TRAINER EARNINGS ===== */}
      {activeModule === 'trainer' && (
        <div className="space-y-6 animate-fade-in-up">
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-6 rounded-[2rem] text-white shadow-xl shadow-amber-200 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-2xl"><Award size={28}/></div>
              <div>
                <h3 className="text-xl font-extrabold">Trainer Commission Earnings</h3>
                <p className="text-amber-100 font-medium">{new Date(0, selectedMonth - 1).toLocaleString('default', { month: 'long' })} {selectedYear} — auto-credited on every fee payment</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-amber-200 text-xs font-bold uppercase">Total Paid Out</p>
              <p className="text-3xl font-extrabold">Rs. {totalTrainerCommissions.toLocaleString()}</p>
            </div>
          </div>

          {(data.trainerCommissions || []).length === 0 ? (
            <div className="bg-white rounded-[2rem] p-16 text-center text-slate-400 font-medium shadow-sm border border-slate-100">
              No trainer commission transactions for this month.
            </div>
          ) : (
            <div className="space-y-4">
              {(data.trainerCommissions || []).map(trainer => (
                <div key={trainer.staff_id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                  <button
                    onClick={() => setExpandedTrainer(expandedTrainer === trainer.staff_id ? null : trainer.staff_id)}
                    className="w-full p-6 flex items-center justify-between hover:bg-amber-50/40 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-xl font-extrabold border border-amber-200">
                        {trainer.name.charAt(0)}
                      </div>
                      <div className="text-left">
                        <p className="font-extrabold text-slate-800 text-lg">{trainer.name}</p>
                        <p className="text-xs text-slate-400 font-semibold uppercase">{trainer.role} • {trainer.transactions.length} commission payments</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs text-slate-400 font-bold uppercase">Earned This Month</p>
                        <p className="text-2xl font-extrabold text-amber-600">Rs. {trainer.total.toLocaleString()}</p>
                      </div>
                      <div className="text-slate-400">{expandedTrainer === trainer.staff_id ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}</div>
                    </div>
                  </button>
                  {expandedTrainer === trainer.staff_id && (
                    <div className="border-t border-slate-100 divide-y divide-slate-50">
                      <div className="grid grid-cols-3 px-6 py-3 bg-slate-50 text-[11px] font-extrabold uppercase text-slate-400 tracking-widest">
                        <span>Student</span><span>Date</span><span className="text-right">Commission</span>
                      </div>
                      {trainer.transactions.map((t, i) => (
                        <div key={i} className="grid grid-cols-3 px-6 py-4 text-sm hover:bg-amber-50/30 transition-colors">
                          <div>
                            <p className="font-bold text-slate-700">{t.student?.name || '—'}</p>
                            <p className="text-xs text-slate-400">{t.student?.roll_no || ''}</p>
                          </div>
                          <p className="text-slate-500 font-medium self-center">{new Date(t.date).toLocaleDateString()}</p>
                          <p className="font-mono font-extrabold text-emerald-600 text-right self-center">+ Rs. {t.amount.toLocaleString()}</p>
                        </div>
                      ))}
                      <div className="px-6 py-4 bg-amber-50 flex justify-between items-center">
                        <span className="text-sm font-extrabold text-amber-800">Month Total</span>
                        <span className="font-mono font-extrabold text-amber-700 text-lg">Rs. {trainer.total.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== MODULE 4: EXPENSES ===== */}
      {activeModule === 'expenses' && (
        <div className="space-y-6 animate-fade-in-up">

          {/* Recurring Templates */}
          {recurringExpenses.length > 0 && (
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-indigo-50/50 flex items-center gap-3">
                <Repeat className="text-indigo-500" size={18}/>
                <div>
                  <h4 className="font-extrabold text-slate-700">Recurring Templates</h4>
                  <p className="text-xs text-slate-400 font-medium">Click "Add for Month" to apply a template to the current period</p>
                </div>
              </div>
              <div className="divide-y divide-slate-50">
                {recurringExpenses.map(template => {
                  const applied = isAlreadyApplied(template);
                  return (
                    <div key={template._id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-indigo-50 text-indigo-500 rounded-xl"><Repeat size={16}/></div>
                        <div>
                          <p className="font-bold text-slate-700">{template.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold uppercase">{template.category}</span>
                            <span className="font-mono font-bold text-slate-500 text-xs">Rs. {template.amount.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {applied ? (
                          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                            <CheckCircle2 size={13}/> Added this month
                          </span>
                        ) : (
                          <button
                            onClick={() => handleApplyRecurring(template)}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-indigo-700 shadow-sm transition-all flex items-center gap-1.5"
                          >
                            <PlayCircle size={13}/> Add for {new Date(0, selectedMonth - 1).toLocaleString('default', { month: 'short' })}
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteRecurring(template._id)}
                          className="p-2 rounded-xl hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-all"
                          title="Remove template"
                        >
                          <Trash2 size={15}/>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Expenses list */}
          <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Wrench className="text-rose-500"/> Operating Expenses</h3>
                <p className="text-sm text-slate-400 mt-1">Maintenance, rent, utilities & other costs (salaries & commissions tracked separately)</p>
              </div>
              <button onClick={() => setShowExpenseModal(true)} className="bg-rose-500 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-rose-200 hover:bg-rose-600 transition-all flex items-center gap-2">
                <Download size={16} className="rotate-180"/> Add Expense
              </button>
            </div>

            <div className="p-8 space-y-3">
              {data.expenses.map((exp, i) => (
                <div key={exp._id || i} className="flex justify-between items-center p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-rose-50 text-rose-500 rounded-2xl"><TrendingDown size={20}/></div>
                    <div>
                      <p className="font-bold text-slate-700">{exp.description}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-bold uppercase">{exp.category || 'other'}</span>
                        <span className="text-xs text-slate-400 font-medium">{new Date(exp.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="font-mono font-extrabold text-rose-600 text-lg">− Rs. {exp.amount.toLocaleString()}</p>
                    <button
                      onClick={() => handleDeleteExpense(exp._id, exp.description)}
                      className="opacity-0 group-hover:opacity-100 p-2 rounded-xl hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-all"
                    >
                      <Trash2 size={16}/>
                    </button>
                  </div>
                </div>
              ))}
              {data.expenses.length === 0 && (
                <div className="text-center text-slate-400 py-10 font-medium border-2 border-dashed border-slate-200 rounded-2xl">
                  No operating expenses recorded for this month.
                </div>
              )}
              {data.expenses.length > 0 && (
                <div className="flex justify-between items-center p-5 bg-rose-50 rounded-2xl border border-rose-100 mt-4">
                  <span className="font-extrabold text-rose-800">Month Total</span>
                  <span className="font-mono font-extrabold text-rose-700 text-xl">− Rs. {totalExpenses.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== MODULE 5: ALL TRANSACTIONS ===== */}
      {activeModule === 'transactions' && (
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden animate-fade-in-up">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row justify-between items-center gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><List className="text-indigo-500"/> All Transactions</h3>
              <p className="text-sm text-slate-400 mt-1">{new Date(0, selectedMonth - 1).toLocaleString('default', { month: 'long' })} {selectedYear} — {(data.allTransactions || []).length} entries</p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                <input
                  className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-52"
                  placeholder="Search transactions..."
                  value={txnSearch} onChange={e => setTxnSearch(e.target.value)}
                />
              </div>
              <div className="flex bg-white border border-slate-200 p-1 rounded-xl">
                {['all', 'income', 'expense'].map(t => (
                  <button key={t} onClick={() => setTxnTypeFilter(t)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                      txnTypeFilter === t
                        ? t === 'income' ? 'bg-emerald-600 text-white' : t === 'expense' ? 'bg-rose-500 text-white' : 'bg-slate-800 text-white'
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-[11px] font-extrabold uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="p-5">Date</th>
                  <th className="p-5">Type</th>
                  <th className="p-5">Category</th>
                  <th className="p-5">Description</th>
                  <th className="p-5">Method</th>
                  <th className="p-5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {filteredTransactions.map((t, i) => (
                  <tr key={t._id || i} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-5 text-slate-500 font-medium whitespace-nowrap">{new Date(t.date).toLocaleDateString()}</td>
                    <td className="p-5">
                      {t.type === 'income'
                        ? <span className="flex items-center gap-1 text-emerald-600 font-bold text-xs"><ArrowUpRight size={14}/> Income</span>
                        : <span className="flex items-center gap-1 text-rose-500 font-bold text-xs"><ArrowDownRight size={14}/> Expense</span>}
                    </td>
                    <td className="p-5">
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-bold uppercase border border-slate-200">
                        {CATEGORY_LABELS[t.category] || t.category}
                      </span>
                    </td>
                    <td className="p-5">
                      <p className="font-medium text-slate-700">{t.description || '—'}</p>
                      {t.student && <p className="text-xs text-slate-400 mt-0.5">{t.student.name} • {t.student.roll_no}</p>}
                    </td>
                    <td className="p-5">
                      <span className="flex items-center gap-1 text-xs font-semibold text-slate-400">
                        <CreditCard size={12}/> {t.payment_method || 'cash'}
                      </span>
                    </td>
                    <td className={`p-5 text-right font-mono font-extrabold text-base ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {t.type === 'income' ? '+' : '−'} Rs. {t.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              {filteredTransactions.length > 0 && (
                <tfoot className="bg-slate-50 border-t-2 border-slate-200 text-sm">
                  <tr>
                    <td className="p-5" colSpan={5}>
                      <span className="font-bold text-slate-500">{filteredTransactions.length} transactions</span>
                      <span className="ml-4 font-bold text-emerald-600">In: Rs. {filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0).toLocaleString()}</span>
                      <span className="ml-4 font-bold text-rose-600">Out: Rs. {filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0).toLocaleString()}</span>
                    </td>
                    <td className="p-5 text-right font-mono font-extrabold text-slate-800">
                      Net: Rs. {(
                        filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0) -
                        filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
                      ).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {filteredTransactions.length === 0 && <div className="p-12 text-center text-slate-400 font-medium">No transactions found.</div>}
        </div>
      )}

      {/* ===== FEE COLLECT MODAL ===== */}
      {showCollectModal && collectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50">
              <div>
                <h3 className="text-xl font-extrabold text-slate-800 flex items-center gap-2"><DollarSign className="text-indigo-500"/> Collect Fee</h3>
                <p className="text-sm text-slate-500 mt-0.5">{collectTarget.name} • {collectTarget.roll_no}</p>
              </div>
              <button onClick={() => setShowCollectModal(false)} className="p-2 rounded-full hover:bg-rose-100 hover:text-rose-600 transition-colors"><X size={20}/></button>
            </div>
            <form onSubmit={submitCollectFee} className="p-6 space-y-4">
              <div className={`grid gap-4 ${collectTarget.late_fee_amount > 0 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Monthly Fee</label>
                  <div className="form-input bg-slate-50 text-slate-500 font-mono font-bold">Rs. {collectTarget.fee_amount?.toLocaleString()}</div>
                </div>
                {collectTarget.late_fee_amount > 0 && (
                  <div>
                    <label className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1 block">Late Fee</label>
                    <div className="form-input bg-amber-50 text-amber-700 font-mono font-bold border-amber-200">+ Rs. {collectTarget.late_fee_amount?.toLocaleString()}</div>
                  </div>
                )}
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Amount to Collect (Rs.)</label>
                <input
                  required type="number"
                  className="form-input font-bold text-slate-700 w-full"
                  value={collectForm.amount}
                  onChange={e => setCollectForm({ ...collectForm, amount: e.target.value })}
                />
                {collectTarget.late_fee_amount > 0 && (
                  <p className="text-xs text-amber-600 mt-1 font-semibold">Suggested total with late fee: Rs. {collectTarget.total_due?.toLocaleString()}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Payment Method</label>
                  <select className="form-select font-bold text-slate-700 w-full" value={collectForm.payment_method} onChange={e => setCollectForm({ ...collectForm, payment_method: e.target.value })}>
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="online">Online</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Date</label>
                  <input type="date" className="form-input font-bold text-slate-700 w-full" value={collectForm.date} onChange={e => setCollectForm({ ...collectForm, date: e.target.value })}/>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Notes (optional)</label>
                <input className="form-input font-medium text-slate-700 w-full" value={collectForm.notes} onChange={e => setCollectForm({ ...collectForm, notes: e.target.value })} placeholder="e.g. Partial payment, receipt #123"/>
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                <CheckCircle2 size={16}/> Confirm & Collect Rs. {Number(collectForm.amount || 0).toLocaleString()}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ===== SALARY CONFIRM MODAL ===== */}
      {showSalaryModal && salaryTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-extrabold text-slate-800 flex items-center gap-2"><Briefcase className="text-indigo-500"/> Process Salary</h3>
              <button onClick={() => setShowSalaryModal(false)} className="p-2 rounded-full hover:bg-rose-100 hover:text-rose-600 transition-colors"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-3">
                <div className="flex justify-between"><span className="text-sm font-bold text-slate-500">Employee</span><span className="font-extrabold text-slate-800">{salaryTarget.name}</span></div>
                <div className="flex justify-between"><span className="text-sm font-bold text-slate-500">Base Salary</span><span className="font-mono font-bold text-slate-700">Rs. {salaryTarget.salary?.toLocaleString()}</span></div>
                {salaryTarget.commission_earned > 0 && (
                  <div className="flex justify-between"><span className="text-sm font-bold text-slate-500">Commission</span><span className="font-mono font-bold text-amber-600">Rs. {salaryTarget.commission_earned?.toLocaleString()}</span></div>
                )}
                <div className="border-t border-slate-200 pt-3 flex justify-between">
                  <span className="text-sm font-extrabold text-slate-700">Total Payout</span>
                  <span className="font-mono font-extrabold text-slate-900 text-lg">Rs. {(salaryTarget.total_payout || salaryTarget.salary)?.toLocaleString()}</span>
                </div>
              </div>
              {salaryTarget.email ? (
                <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5"/>
                  <p className="text-xs text-emerald-800 font-semibold">
                    Salary slip PDF will be generated and emailed to <strong>{salaryTarget.email}</strong>
                  </p>
                </div>
              ) : (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5"/>
                  <p className="text-xs text-amber-800 font-semibold">No email on file — slip will not be sent automatically</p>
                </div>
              )}
              <p className="text-xs text-slate-400 font-medium text-center">
                Payment for {new Date(0, selectedMonth - 1).toLocaleString('default', { month: 'long' })} {selectedYear}.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowSalaryModal(false)} className="flex-1 py-3 rounded-xl font-bold text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all">Cancel</button>
                <button onClick={submitSalary} className="flex-1 py-3 rounded-xl font-bold text-sm bg-slate-800 text-white hover:bg-slate-700 shadow-lg transition-all flex items-center justify-center gap-2">
                  <CheckCircle2 size={15}/> Confirm Pay
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== BULK SALARY MODAL ===== */}
      {showBulkSalaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-emerald-50 shrink-0">
              <div>
                <h3 className="text-xl font-extrabold text-slate-800 flex items-center gap-2"><Zap className="text-emerald-600"/> Pay All Salaries</h3>
                <p className="text-sm text-slate-500 mt-0.5">{unpaidStaff.length} staff pending • {new Date(0, selectedMonth - 1).toLocaleString('default', { month: 'long' })} {selectedYear}</p>
              </div>
              <button onClick={() => setShowBulkSalaryModal(false)} className="p-2 rounded-full hover:bg-rose-100 hover:text-rose-600 transition-colors"><X size={20}/></button>
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
              {unpaidStaff.map(emp => (
                <div key={emp._id} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm">
                      {emp.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{emp.name}</p>
                      <p className="text-xs text-slate-400 font-medium capitalize">{emp.role.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <span className="font-mono font-extrabold text-slate-700">Rs. {(emp.total_payout || emp.salary).toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 shrink-0 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-slate-700">Total Payout</span>
                <span className="font-mono font-extrabold text-slate-900 text-xl">
                  Rs. {unpaidStaff.reduce((s, e) => s + (e.total_payout || e.salary || 0), 0).toLocaleString()}
                </span>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowBulkSalaryModal(false)} className="flex-1 py-3 rounded-xl font-bold text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all">Cancel</button>
                <button
                  onClick={handleBulkPaySalary}
                  disabled={bulkPayLoading}
                  className="flex-1 py-3 rounded-xl font-bold text-sm bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {bulkPayLoading
                    ? <><div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"/> Processing...</>
                    : <><Zap size={15}/> Process All {unpaidStaff.length} Salaries</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== ADD EXPENSE MODAL ===== */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-extrabold text-slate-800 flex items-center gap-2"><Wrench className="text-rose-500"/> Add Expense</h3>
              <button onClick={() => setShowExpenseModal(false)} className="p-2 rounded-full hover:bg-rose-100 hover:text-rose-600 transition-colors"><X size={20}/></button>
            </div>
            <form onSubmit={handleAddExpense} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Description</label>
                <input required className="form-input font-bold text-slate-700 w-full" value={expenseForm.title} onChange={e => setExpenseForm({ ...expenseForm, title: e.target.value })} placeholder="e.g. Electricity Bill"/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Category</label>
                  <select className="form-select font-bold text-slate-700 w-full" value={expenseForm.category} onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })}>
                    {expenseCategories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Amount (Rs.)</label>
                  <input required type="number" className="form-input font-bold text-slate-700 w-full" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} placeholder="5000"/>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Date</label>
                <input type="date" className="form-input font-bold text-slate-700 w-full" value={expenseForm.date} onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })}/>
              </div>
              <label className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100 cursor-pointer hover:bg-indigo-100 transition-colors">
                <input
                  type="checkbox"
                  checked={expenseForm.is_recurring}
                  onChange={e => setExpenseForm({ ...expenseForm, is_recurring: e.target.checked })}
                  className="w-4 h-4 accent-indigo-600"
                />
                <div>
                  <p className="text-sm font-bold text-indigo-700 flex items-center gap-1.5"><Repeat size={13}/> Save as recurring template</p>
                  <p className="text-xs text-indigo-400 font-medium">Appear in the recurring section each month</p>
                </div>
              </label>
              <button type="submit" className="w-full bg-rose-500 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-rose-600 transition-all">Add Expense</button>
            </form>
          </div>
        </div>
      )}

      {/* ===== LEDGER MODAL ===== */}
      {showLedger && ledgerData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <div>
                <h3 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2"><FileText className="text-indigo-500"/> Fee Ledger</h3>
                <p className="text-sm font-bold text-slate-500 mt-1">{ledgerData.student.name} • {ledgerData.student.roll_no}</p>
              </div>
              <button onClick={() => setShowLedger(false)} className="p-2 bg-white rounded-full hover:bg-rose-50 hover:text-rose-600 transition-colors shadow-sm"><X size={24}/></button>
            </div>
            <div className="overflow-y-auto p-8 bg-white">
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 text-center">
                  <p className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-widest">Net Payable</p>
                  <p className="text-2xl font-extrabold text-indigo-700 mt-1">Rs. {ledgerData.summary.total.toLocaleString()}</p>
                </div>
                <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 text-center">
                  <p className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-widest">Total Paid</p>
                  <p className="text-2xl font-extrabold text-emerald-700 mt-1">Rs. {ledgerData.summary.paid.toLocaleString()}</p>
                </div>
                <div className={`p-5 rounded-2xl border text-center ${ledgerData.summary.balance > 0 ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
                  <p className={`text-[10px] font-extrabold uppercase tracking-widest ${ledgerData.summary.balance > 0 ? 'text-rose-400' : 'text-slate-400'}`}>Balance</p>
                  <p className={`text-2xl font-extrabold mt-1 ${ledgerData.summary.balance > 0 ? 'text-rose-600' : 'text-slate-700'}`}>Rs. {ledgerData.summary.balance.toLocaleString()}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center mb-2 px-2">
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Payment History</h4>
                  <button onClick={() => window.print()} className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-800 uppercase"><Printer size={12}/> Print</button>
                </div>
                {ledgerData.history.length > 0 ? ledgerData.history.map((txn, i) => (
                  <div key={i} className="flex justify-between items-center p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs border border-emerald-200">IN</div>
                      <div>
                        <p className="font-bold text-slate-700 text-sm">{txn.description}</p>
                        <p className="text-xs text-slate-400 font-bold mt-0.5">{new Date(txn.date).toLocaleDateString()} • {txn.payment_method}</p>
                      </div>
                    </div>
                    <p className="font-mono font-bold text-emerald-600 text-lg">+ Rs. {txn.amount.toLocaleString()}</p>
                  </div>
                )) : (
                  <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold text-sm">No transactions found.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== WHATSAPP BULK REMINDER MODAL ===== */}
      {showReminderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-emerald-50 shrink-0">
              <div>
                <h3 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                  <MessageCircle className="text-emerald-600" size={22}/> WhatsApp Fee Reminders
                </h3>
                <p className="text-sm text-slate-500 mt-1 font-medium">
                  {data.students.filter(s => s.status === 'Unpaid').length} unpaid students — {new Date(0, selectedMonth - 1).toLocaleString('default', { month: 'long' })} {selectedYear}
                </p>
              </div>
              <button onClick={() => setShowReminderModal(false)} className="p-2 rounded-full hover:bg-rose-100 hover:text-rose-600 transition-colors"><X size={20}/></button>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
              {data.students.filter(s => s.status === 'Unpaid').length === 0 ? (
                <div className="p-12 text-center text-slate-400 font-medium">All students have paid this month!</div>
              ) : (
                data.students.filter(s => s.status === 'Unpaid').map(student => (
                  <div key={student._id} className="p-5 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-base shrink-0">
                        {student.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate">{student.name}</p>
                        <p className="text-xs text-slate-400 font-mono">{student.roll_no}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-extrabold text-rose-600">Rs. {student.fee_amount?.toLocaleString()}</p>
                      <p className="text-xs text-slate-400">pending</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {student.phone && (
                        <button onClick={() => sendWhatsAppReminder(student, false)} className="bg-emerald-500 text-white px-3 py-2 rounded-xl font-bold text-xs hover:bg-emerald-600 transition-all flex items-center gap-1.5 shadow-sm">
                          <Phone size={12}/> Student
                        </button>
                      )}
                      {student.guardian_phone && (
                        <button onClick={() => sendWhatsAppReminder(student, true)} className="bg-slate-700 text-white px-3 py-2 rounded-xl font-bold text-xs hover:bg-slate-800 transition-all flex items-center gap-1.5 shadow-sm">
                          <Phone size={12}/> Guardian
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-xs text-slate-400 text-center font-medium shrink-0">
              Each button opens WhatsApp with a pre-filled message. Allow pop-ups if your browser blocks them.
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Finance;
