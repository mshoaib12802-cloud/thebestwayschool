import { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import {
  Receipt, Plus, Search, RefreshCw, X, CreditCard,
  Filter, TrendingUp, AlertTriangle, CheckCircle2, Clock,
  ChevronDown, ChevronRight, Eye, Banknote, Printer,
} from 'lucide-react';
import RupeeIcon from '../components/RupeeIcon';

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-emerald-400 focus:bg-white transition-colors';
const labelCls = 'block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1';

const STATUS_META = {
  unpaid:         { label: 'Unpaid',         cls: 'bg-red-100 text-red-700',     icon: AlertTriangle },
  partial:        { label: 'Partial',        cls: 'bg-amber-100 text-amber-700', icon: Clock },
  paid:           { label: 'Paid',           cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  rolled_forward: { label: 'Rolled Forward', cls: 'bg-slate-100 text-slate-500', icon: ChevronRight },
};

function fmt(m) {
  if (!m) return '—';
  const [y, mo] = m.split('-');
  return new Date(y, mo - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
}

// ── Fee voucher print block (one per student) ───────────────────────────────
function voucherBlock(inv, isLast) {
  const items    = inv.items || [];
  const discount = inv.discount_amount || 0;
  const lateFine = inv.late_fine || 0;
  const payable  = (inv.total_amount || 0) + lateFine;
  const meta     = STATUS_META[inv.status] || STATUS_META.unpaid;

  const rows = items.map((it, i) => `
    <tr>
      <td style="padding:6px 8px;border-bottom:1px solid #e8ecf5;">${i + 1}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e8ecf5;font-weight:600;">${it.fee_head_name || '—'}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e8ecf5;text-align:right;font-weight:700;">Rs. ${(it.amount || 0).toLocaleString()}</td>
    </tr>`).join('');

  return `
  <div class="voucher" style="${isLast ? '' : 'page-break-after:always;'}">
    <div class="hdr">
      <div class="hdr-inner">
        <div class="logo-circle"><img src="/icons/icon-512.png" onerror="this.style.display='none'"/></div>
        <div class="school-info">
          <div class="school">The Best Way Public School</div>
          <div class="tagline">Excellence in Education</div>
        </div>
        <div class="doc-badge"><span>Fee Voucher</span></div>
      </div>
    </div>
    <div class="body">
      <div class="info">
        <div class="info-row"><span class="lbl">Student Name</span><span class="val">${inv.student_id?.full_name || '—'}</span></div>
        <div class="info-row"><span class="lbl">Father Name</span><span class="val">${inv.student_id?.father_name || '—'}</span></div>
        <div class="info-row"><span class="lbl">Roll Number</span><span class="val">${inv.student_id?.roll_number || '—'}</span></div>
        <div class="info-row"><span class="lbl">Class</span><span class="val">${inv.class_id?.name || '—'} ${inv.class_id?.section ? '— ' + inv.class_id.section : ''}</span></div>
        <div class="info-row"><span class="lbl">Fee Month</span><span class="val">${fmt(inv.month)}</span></div>
        <div class="info-row"><span class="lbl">Due Date</span><span class="val">${inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span></div>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:9.5pt;margin-top:10px;">
        <thead>
          <tr style="background:#0b1528;">
            <th style="padding:6px 8px;text-align:left;color:#fff;font-size:8pt;text-transform:uppercase;width:28px;">#</th>
            <th style="padding:6px 8px;text-align:left;color:#fff;font-size:8pt;text-transform:uppercase;">Fee Head</th>
            <th style="padding:6px 8px;text-align:right;color:#fff;font-size:8pt;text-transform:uppercase;">Amount</th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="3" style="padding:10px;text-align:center;color:#94a3b8;">No items</td></tr>'}</tbody>
        <tfoot>
          ${discount > 0 ? `
          <tr style="background:#f8fafc;">
            <td colspan="2" style="padding:6px 8px;font-size:9pt;color:#475569;">Concession / discount</td>
            <td style="padding:6px 8px;text-align:right;font-weight:700;color:#059669;">− Rs. ${discount.toLocaleString()}</td>
          </tr>` : ''}
          <tr style="background:#f1f5f9;font-weight:800;">
            <td colspan="2" style="padding:7px 8px;">Total</td>
            <td style="padding:7px 8px;text-align:right;">Rs. ${(inv.total_amount || 0).toLocaleString()}</td>
          </tr>
          ${lateFine > 0 ? `
          <tr style="background:#fef2f2;">
            <td colspan="2" style="padding:6px 8px;font-size:9pt;color:#b91c1c;font-weight:600;">Late fine (overdue)</td>
            <td style="padding:6px 8px;text-align:right;font-weight:700;color:#b91c1c;">+ Rs. ${lateFine.toLocaleString()}</td>
          </tr>` : ''}
          <tr style="background:#0b1528;">
            <td colspan="2" style="padding:8px;color:#fff;font-weight:800;">Payable</td>
            <td style="padding:8px;text-align:right;color:#c9a84c;font-weight:900;font-size:11pt;">Rs. ${payable.toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>

      <div class="summ">
        <div class="s"><div class="slbl">Paid</div><div class="sval" style="color:#4ade80;">Rs. ${(inv.paid_amount || 0).toLocaleString()}</div></div>
        <div class="s"><div class="slbl">Balance</div><div class="sval" style="color:#f87171;">Rs. ${(inv.balance || 0).toLocaleString()}</div></div>
        <div class="s"><div class="slbl">Status</div><div class="sval" style="font-size:12pt;">${meta.label.toUpperCase()}</div></div>
      </div>

      <div class="sigs">
        <div class="sig"><div class="sig-line">Parent / Guardian Signature</div></div>
        <div class="sig"><div class="sig-line">Cashier / Authorized Signature</div></div>
      </div>
    </div>
    <div class="foot">
      <strong>The Best Way Public School</strong> &nbsp;·&nbsp;
      Computer-generated voucher &nbsp;·&nbsp; Please pay before the due date to avoid late fine.
    </div>
  </div>`;
}

function openVoucherPrint(invoicesToPrint) {
  const win = window.open('', '_blank', 'width=850,height=1100');
  const blocks = invoicesToPrint.map((inv, i) => voucherBlock(inv, i === invoicesToPrint.length - 1)).join('');
  const names = invoicesToPrint.map(i => i.student_id?.full_name || 'Student').join(', ');

  win.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>Fee Voucher — ${names}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Inter',sans-serif;background:#e8ecf2;display:flex;flex-direction:column;align-items:center;padding:24px;gap:24px;}
  .voucher{width:210mm;background:white;box-shadow:0 8px 40px rgba(0,0,0,.18);position:relative;overflow:hidden;}

  .hdr{background:linear-gradient(135deg,#0b1528 0%,#162444 55%,#0b1528 100%);padding:20px 22px 16px;position:relative;}
  .hdr::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,#c9a84c,#c9a84c,transparent);}
  .hdr-inner{display:flex;align-items:center;gap:18px;}
  .logo-circle{width:56px;height:56px;border-radius:50%;border:2.5px solid #c9a84c;overflow:hidden;background:#fff;flex-shrink:0;}
  .logo-circle img{width:100%;height:100%;object-fit:cover;}
  .school-info{flex:1;}
  .school{font-size:17pt;font-weight:900;color:#fff;letter-spacing:-0.01em;line-height:1.1;}
  .tagline{font-size:8pt;color:#c9a84c;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;margin-top:3px;}
  .doc-badge{background:linear-gradient(135deg,#c9a84c,#e8cc7a);border-radius:6px;padding:5px 16px;}
  .doc-badge span{font-size:8pt;font-weight:900;color:#0b1528;letter-spacing:0.12em;text-transform:uppercase;}

  .body{padding:16px 20px;}
  .info{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:6px 0 4px;padding:12px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;border-left:3px solid #c9a84c;}
  .info-row{display:flex;align-items:baseline;gap:8px;}
  .lbl{font-size:8pt;color:#94a3b8;font-weight:700;min-width:90px;text-transform:uppercase;letter-spacing:0.05em;}
  .val{font-size:10pt;font-weight:700;color:#0b1528;flex:1;padding-left:4px;border-bottom:1px dotted #cbd5e1;}

  .summ{display:flex;border:1.5px solid #0b1528;border-radius:8px;overflow:hidden;margin:14px 0;background:#0b1528;}
  .s{flex:1;text-align:center;padding:10px 6px;border-right:1px solid rgba(255,255,255,0.1);}
  .s:last-child{border-right:none;}
  .slbl{font-size:7pt;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.08em;font-weight:700;}
  .sval{font-size:15pt;font-weight:900;color:#fff;margin-top:4px;line-height:1;}

  .sigs{display:flex;gap:20px;margin-top:28px;}
  .sig{flex:1;text-align:center;}
  .sig-line{border-top:1.5px solid #0b1528;padding-top:5px;margin-top:36px;font-size:8.5pt;color:#64748b;font-weight:600;}

  .foot{margin-top:14px;text-align:center;font-size:7.5pt;color:#94a3b8;padding:8px;background:#f8fafc;border-top:1px solid #e2e8f0;}
  .foot strong{color:#c9a84c;}

  @media print{
    body{background:white;padding:0;gap:0;}
    .voucher{box-shadow:none;}
    @page{size:A4;margin:6mm;}
  }
</style>
</head>
<body>
${blocks}
<script>window.onload=function(){window.print();}</script>
</body>
</html>`);
  win.document.close();
}

export default function FeeInvoices() {
  const [classes, setClasses] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [filterClass, setFilterClass] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');

  const [showCollectModal, setShowCollectModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [collectForm, setCollectForm] = useState({ amount: '', payment_method: 'cash', notes: '' });
  const [collecting, setCollecting] = useState(false);
  const [printingId, setPrintingId] = useState(null);

  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkPayMethod, setBulkPayMethod] = useState('cash');
  const [bulkCollecting, setBulkCollecting] = useState(false);

  useEffect(() => { fetchClasses(); fetchAcademicYears(); }, []);

  useEffect(() => {
    document.body.style.overflow = (showCollectModal || showDetailModal) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showCollectModal, showDetailModal]);

  useEffect(() => { fetchInvoices(); }, [filterClass, filterYear, filterMonth, filterStatus]);

  const fetchClasses = async () => {
    try { const { data } = await api.get('/school-classes'); setClasses(data); } catch { /* */ }
  };
  const fetchAcademicYears = async () => {
    try { const { data } = await api.get('/academic-years'); setAcademicYears(data); } catch { /* */ }
  };

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterClass) params.class_id = filterClass;
      if (filterYear) params.academic_year_id = filterYear;
      if (filterMonth) params.month = filterMonth;
      if (filterStatus !== 'all') params.status = filterStatus;
      const { data } = await api.get('/fee-structure/invoices', { params });
      setInvoices(data);
    } catch { toast.error('Failed to load invoices'); }
    finally { setLoading(false); }
  };

  const generateInvoices = async () => {
    if (!filterClass || !filterYear || !filterMonth) {
      toast.warn('Select class, academic year, and month to generate');
      return;
    }
    setGenerating(true);
    try {
      const { data } = await api.post('/fee-structure/generate', {
        class_id: filterClass,
        academic_year_id: filterYear,
        month: filterMonth,
      });
      const sibNote = data.siblingsCreated ? `, ${data.siblingsCreated} sibling voucher(s) linked` : '';
      const arrNote = data.arrearsRolled ? `, ${data.arrearsRolled} prior unpaid invoice(s) carried forward` : '';
      toast.success(`Generated: ${data.created || 0} new, ${data.skipped || 0} already existed${sibNote}${arrNote}`);
      fetchInvoices();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to generate invoices'); }
    finally { setGenerating(false); }
  };

  const openCollect = (inv) => {
    setSelectedInvoice(inv);
    setCollectForm({ amount: inv.balance || '', payment_method: 'cash', notes: '' });
    setShowCollectModal(true);
  };

  const openDetail = (inv) => {
    setSelectedInvoice(inv);
    setShowDetailModal(true);
  };

  // Prints this student's voucher, and — if a sibling (same parent, same
  // month) also has an invoice — includes their voucher in the same print job.
  const printVoucher = async (inv) => {
    setPrintingId(inv._id);
    try {
      let siblings = [];
      try {
        const { data } = await api.get(`/fee-structure/invoices/${inv._id}/siblings`);
        siblings = data || [];
      } catch { /* siblings are a bonus — still print this voucher if the lookup fails */ }
      openVoucherPrint([inv, ...siblings]);
    } finally {
      setPrintingId(null);
    }
  };

  const handleCollect = async (e) => {
    e.preventDefault();
    setCollecting(true);
    try {
      await api.post(`/fee-structure/invoices/${selectedInvoice._id}/pay`, collectForm);
      toast.success('Payment recorded successfully');
      setShowCollectModal(false);
      fetchInvoices();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to record payment'); }
    finally { setCollecting(false); }
  };

  // student_id is populated as an object by the backend
  const studentName = (inv) => inv.student_id?.full_name || '—';
  const rollNo      = (inv) => inv.student_id?.roll_number || '—';

  const filtered = invoices.filter(inv => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      studentName(inv).toLowerCase().includes(q) ||
      rollNo(inv).toLowerCase().includes(q)
    );
  });

  // Exactly what's on screen right now (same filters + search), minus
  // invoices there's nothing left to collect on — this is what "Collect All"
  // acts on, so the button never touches a row the admin can't see.
  const collectableFiltered = filtered.filter(inv => inv.status === 'unpaid' || inv.status === 'partial');
  const collectableTotal = collectableFiltered.reduce((s, i) => s + (i.balance || 0), 0);

  const bulkCollectAndPrint = async () => {
    setBulkCollecting(true);
    try {
      const { data } = await api.post('/fee-structure/invoices/bulk-pay', {
        invoice_ids: collectableFiltered.map(i => i._id),
        payment_method: bulkPayMethod,
      });
      toast.success(data.message);
      setShowBulkModal(false);
      if (data.invoices?.length) openVoucherPrint(data.invoices);
      fetchInvoices();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk collection failed');
    } finally {
      setBulkCollecting(false);
    }
  };

  // Stats
  const totalAmt    = invoices.reduce((s, i) => s + (i.total_amount || 0), 0);
  const collected   = invoices.reduce((s, i) => s + (i.paid_amount  || 0), 0);
  const pending     = invoices.reduce((s, i) => s + (i.balance      || 0), 0);
  const overdueCount = invoices.filter(i => i.due_date && new Date(i.due_date) < new Date() && i.status !== 'paid').length;
  const paidCount    = invoices.filter(i => i.status === 'paid').length;
  const collectionRate = totalAmt > 0 ? Math.round((collected / totalAmt) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center shadow">
          <Receipt className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Fee Invoices</h1>
          <p className="text-sm text-slate-500">Generate invoices and record fee collections</p>
        </div>
      </div>

      {/* Stats — shown only when invoices are loaded */}
      {invoices.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Total Invoiced',  value: `Rs. ${totalAmt.toLocaleString()}`,  color: 'slate',   icon: Receipt },
            { label: 'Collected',       value: `Rs. ${collected.toLocaleString()}`,  color: 'emerald', icon: CheckCircle2 },
            { label: 'Outstanding',     value: `Rs. ${pending.toLocaleString()}`,    color: 'red',     icon: AlertTriangle },
            { label: 'Overdue',         value: overdueCount,                       color: 'orange',  icon: Clock },
            { label: 'Collection Rate', value: `${collectionRate}%`,              color: 'sky',     icon: TrendingUp },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className={`text-xl font-bold text-${s.color}-600`}>{s.value}</div>
              <div className="text-xs text-slate-500 font-semibold mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[140px]">
            <label className={labelCls}>Class</label>
            <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className={inputCls}>
              <option value="">All Classes</option>
              {classes.map(c => <option key={c._id} value={c._id}>{c.name || `${c.grade} ${c.section || ''}`}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className={labelCls}>Academic Year</label>
            <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className={inputCls}>
              <option value="">All Years</option>
              {academicYears.map(y => <option key={y._id} value={y._id}>{y.label || y.name}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className={labelCls}>Month</label>
            <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className={inputCls} />
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className={labelCls}>Status</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={inputCls}>
              <option value="all">All</option>
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
              <option value="rolled_forward">Rolled Forward</option>
            </select>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={fetchInvoices} disabled={loading}
              className="flex items-center gap-2 bg-slate-700 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-slate-800 text-sm disabled:opacity-60 transition-colors">
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Filter className="w-4 h-4" />}
              Load
            </button>
            <button onClick={generateInvoices} disabled={generating}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-emerald-700 text-sm disabled:opacity-60 transition-colors"
              title="Select class + year + month, then generate">
              {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Generate
            </button>
            {collectableFiltered.length > 0 && (
              <button onClick={() => setShowBulkModal(true)}
                className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-amber-600 text-sm transition-colors"
                title="Collect payment for every unpaid/partial invoice currently shown below">
                <CreditCard className="w-4 h-4" />
                Collect All ({collectableFiltered.length})
              </button>
            )}
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-3 flex items-center gap-1">
          <ChevronRight className="w-3 h-3" />
          Select class + academic year + month, then click <strong>Generate</strong> to create invoices for all students in that class.
        </p>
      </div>

      {/* Collection Progress Bar */}
      {invoices.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-700">Collection Progress</span>
            <span className="text-sm font-bold text-emerald-600">{collectionRate}%</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${collectionRate}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-xs text-emerald-600 font-semibold">{paidCount} fully paid</span>
            <span className="text-xs text-red-500 font-semibold">{invoices.length - paidCount} outstanding</span>
          </div>
        </div>
      )}

      {/* Invoice Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 p-5 border-b border-slate-100">
          <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 flex-1 max-w-xs border border-slate-200">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search student or roll no…"
              className="bg-transparent outline-none text-sm text-slate-700 flex-1" />
          </div>
          <div className="text-xs text-slate-400 font-semibold ml-auto">
            {filtered.length} invoice{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Receipt className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <div className="text-slate-400 font-semibold">No invoices found</div>
            <div className="text-slate-400 text-sm mt-1">Use the filters above and click Load, or Generate invoices for a class.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3">Student</th>
                  <th className="text-left px-4 py-3">Roll No</th>
                  <th className="text-left px-4 py-3">Month</th>
                  <th className="text-right px-4 py-3">Total</th>
                  <th className="text-right px-4 py-3">Paid</th>
                  <th className="text-right px-4 py-3">Balance</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Due Date</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(inv => {
                  const meta = STATUS_META[inv.status] || STATUS_META.unpaid;
                  const isOverdue = inv.due_date && new Date(inv.due_date) < new Date() && inv.status !== 'paid' && inv.status !== 'rolled_forward';
                  return (
                    <tr key={inv._id} className={`hover:bg-slate-50 transition-colors ${isOverdue ? 'bg-red-50/40' : ''}`}>
                      <td className="px-4 py-3 font-semibold text-slate-800">{studentName(inv)}</td>
                      <td className="px-4 py-3 text-slate-500">{rollNo(inv)}</td>
                      <td className="px-4 py-3 text-slate-600">{fmt(inv.month)}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-700">
                        Rs. {(inv.total_amount || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-600 font-semibold">
                        Rs. {(inv.paid_amount || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-red-600">
                        Rs. {(inv.balance || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${meta.cls}`}>
                          <meta.icon className="w-3 h-3" /> {meta.label}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-sm ${isOverdue ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—'}
                        {isOverdue && <span className="ml-1 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">OVERDUE</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openDetail(inv)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors" title="View Details">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => printVoucher(inv)} disabled={printingId === inv._id}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors disabled:opacity-50" title="Print Voucher">
                            {printingId === inv._id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                          </button>
                          {inv.status !== 'paid' && inv.status !== 'rolled_forward' && (
                            <button onClick={() => openCollect(inv)}
                              className="flex items-center gap-1 bg-emerald-600 text-white px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-colors">
                              <CreditCard className="w-3 h-3" /> Collect
                            </button>
                          )}
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

      {/* ─── INVOICE DETAIL MODAL ─────────────────────────────────────── */}
      {showDetailModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Invoice Details</h2>
                <p className="text-xs text-slate-400 mt-0.5">{studentName(selectedInvoice)} — {fmt(selectedInvoice.month)}</p>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Summary Chips */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <div className="text-base font-bold text-slate-700">Rs. {(selectedInvoice.total_amount || 0).toLocaleString()}</div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Total</div>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <div className="text-base font-bold text-emerald-600">Rs. {(selectedInvoice.paid_amount || 0).toLocaleString()}</div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Paid</div>
                </div>
                <div className="bg-red-50 rounded-xl p-3 text-center">
                  <div className="text-base font-bold text-red-600">Rs. {(selectedInvoice.balance || 0).toLocaleString()}</div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Balance</div>
                </div>
              </div>

              {/* Status + Due Date */}
              <div className="flex items-center justify-between text-sm">
                <div>
                  <span className="text-slate-400 mr-2">Status:</span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${(STATUS_META[selectedInvoice.status] || STATUS_META.unpaid).cls}`}>
                    {(STATUS_META[selectedInvoice.status] || STATUS_META.unpaid).label}
                  </span>
                </div>
                {selectedInvoice.due_date && (
                  <div className="text-slate-500">
                    Due: <span className="font-semibold">{new Date(selectedInvoice.due_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              {/* Fee Breakdown */}
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Fee Breakdown</div>
                {(selectedInvoice.items || []).length === 0 ? (
                  <div className="text-slate-400 text-sm text-center py-4">No items</div>
                ) : (
                  <div className="border border-slate-100 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-xs text-slate-500 uppercase">
                          <th className="text-left px-4 py-2">Fee Head</th>
                          <th className="text-right px-4 py-2">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {(selectedInvoice.items || []).map((item, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-4 py-2.5 font-medium text-slate-700">{item.fee_head_name || '—'}</td>
                            <td className="px-4 py-2.5 text-right font-bold text-slate-800">
                              Rs. {(item.amount || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        {(selectedInvoice.discount_amount || 0) > 0 && (
                          <tr className="bg-slate-50">
                            <td className="px-4 py-2 text-slate-500 text-xs">
                              Concession / discount
                              {selectedInvoice.concessions?.length > 0 && (
                                <span className="text-slate-400">
                                  {' '}— {selectedInvoice.concessions.map(c => c.label).filter((v, i, a) => a.indexOf(v) === i).join(', ')}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-right font-semibold text-emerald-600">
                              − Rs. {(selectedInvoice.discount_amount || 0).toLocaleString()}
                            </td>
                          </tr>
                        )}
                        <tr className="bg-slate-50 font-bold">
                          <td className="px-4 py-2.5 text-slate-700">Total</td>
                          <td className="px-4 py-2.5 text-right text-emerald-700">
                            Rs. {(selectedInvoice.total_amount || 0).toLocaleString()}
                          </td>
                        </tr>
                        {(selectedInvoice.late_fine || 0) > 0 && (
                          <>
                            <tr className="bg-red-50">
                              <td className="px-4 py-2 text-red-600 text-xs font-semibold">Late fine (overdue)</td>
                              <td className="px-4 py-2 text-right font-bold text-red-600">
                                + Rs. {(selectedInvoice.late_fine || 0).toLocaleString()}
                              </td>
                            </tr>
                            <tr className="bg-slate-100 font-bold">
                              <td className="px-4 py-2.5 text-slate-700">Payable</td>
                              <td className="px-4 py-2.5 text-right text-slate-800">
                                Rs. {((selectedInvoice.total_amount || 0) + (selectedInvoice.late_fine || 0)).toLocaleString()}
                              </td>
                            </tr>
                          </>
                        )}
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              {selectedInvoice.notes && (
                <div className="bg-amber-50 rounded-xl p-3 text-sm text-amber-800">
                  <span className="font-semibold">Notes:</span> {selectedInvoice.notes}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-100 flex gap-3">
              <button onClick={() => setShowDetailModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 text-sm transition-colors">
                Close
              </button>
              <button onClick={() => printVoucher(selectedInvoice)} disabled={printingId === selectedInvoice._id}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                {printingId === selectedInvoice._id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />} Print Voucher
              </button>
              {selectedInvoice.status !== 'paid' && selectedInvoice.status !== 'rolled_forward' && (
                <button
                  onClick={() => { setShowDetailModal(false); openCollect(selectedInvoice); }}
                  className="flex-1 bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-emerald-700 text-sm transition-colors flex items-center justify-center gap-2">
                  <CreditCard className="w-4 h-4" /> Collect Payment
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── COLLECT PAYMENT MODAL ─────────────────────────────────────── */}
      {showCollectModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Collect Payment</h2>
              <button onClick={() => setShowCollectModal(false)} className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Student Info Banner */}
            <div className="px-5 py-3.5 bg-emerald-50 border-b border-emerald-100">
              <div className="text-sm font-bold text-slate-800">{studentName(selectedInvoice)}</div>
              <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                <span>Roll: {rollNo(selectedInvoice)}</span>
                <span>Month: {fmt(selectedInvoice.month)}</span>
              </div>
              <div className="flex items-center gap-4 mt-1.5">
                <span className="text-xs text-slate-500">Total: <strong className="text-slate-700">Rs. {(selectedInvoice.total_amount || 0).toLocaleString()}</strong></span>
                <span className="text-xs text-slate-500">Already paid: <strong className="text-emerald-600">Rs. {(selectedInvoice.paid_amount || 0).toLocaleString()}</strong></span>
                <span className="text-xs text-slate-500">Balance: <strong className="text-red-600">Rs. {(selectedInvoice.balance || 0).toLocaleString()}</strong></span>
                {(selectedInvoice.late_fine || 0) > 0 && (
                  <span className="text-xs text-slate-500">Incl. late fine: <strong className="text-red-600">Rs. {(selectedInvoice.late_fine || 0).toLocaleString()}</strong></span>
                )}
              </div>
            </div>

            <form onSubmit={handleCollect} className="p-5 space-y-4">
              <div>
                <label className={labelCls}>Amount (Rs.) *</label>
                <input required type="number" min="1" max={selectedInvoice.balance} step="0.01"
                  value={collectForm.amount}
                  onChange={e => setCollectForm(p => ({ ...p, amount: e.target.value }))}
                  className={inputCls} placeholder="Enter amount to collect" />
                <div className="flex gap-2 mt-2">
                  {[25, 50, 100].map(pct => {
                    const amt = Math.round((selectedInvoice.balance || 0) * pct / 100);
                    return (
                      <button key={pct} type="button"
                        onClick={() => setCollectForm(p => ({ ...p, amount: amt }))}
                        className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded-lg font-semibold transition-colors">
                        {pct}% (Rs. {amt.toLocaleString()})
                      </button>
                    );
                  })}
                  <button type="button"
                    onClick={() => setCollectForm(p => ({ ...p, amount: selectedInvoice.balance || '' }))}
                    className="text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-2 py-1 rounded-lg font-semibold transition-colors">
                    Full Balance
                  </button>
                </div>
              </div>
              <div>
                <label className={labelCls}>Payment Method *</label>
                <select required value={collectForm.payment_method}
                  onChange={e => setCollectForm(p => ({ ...p, payment_method: e.target.value }))}
                  className={inputCls}>
                  <option value="cash">Cash</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="online">Online Payment</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Notes</label>
                <textarea value={collectForm.notes}
                  onChange={e => setCollectForm(p => ({ ...p, notes: e.target.value }))}
                  rows={2} className={inputCls} placeholder="Cheque no., transaction ID, etc." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCollectModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 text-sm transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={collecting}
                  className="flex-1 bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-emerald-700 text-sm disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                  {collecting
                    ? <><RefreshCw className="w-4 h-4 animate-spin" /> Recording…</>
                    : <><Banknote className="w-4 h-4" /> Record Payment</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── BULK COLLECT CONFIRMATION MODAL ──────────────────────────── */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Collect All</h2>
              <button onClick={() => setShowBulkModal(false)} className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm text-amber-800">
                  This marks the <strong>full outstanding balance as paid</strong> for every unpaid/partial invoice currently shown in the table below (matching your current class/year/month/search filters) — <strong>{collectableFiltered.length} invoice(s)</strong>, totaling <strong>Rs. {collectableTotal.toLocaleString()}</strong>.
                </p>
                <p className="text-xs text-amber-600 mt-2">
                  A voucher for every one of them will print automatically right after. This cannot be undone from here — double check the filters above before confirming.
                </p>
              </div>

              <div>
                <label className={labelCls}>Payment Method *</label>
                <select value={bulkPayMethod} onChange={e => setBulkPayMethod(e.target.value)} className={inputCls}>
                  <option value="cash">Cash</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="online">Online Payment</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowBulkModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 text-sm transition-colors">
                  Cancel
                </button>
                <button type="button" onClick={bulkCollectAndPrint} disabled={bulkCollecting}
                  className="flex-1 bg-amber-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-amber-600 text-sm disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                  {bulkCollecting
                    ? <><RefreshCw className="w-4 h-4 animate-spin" /> Collecting…</>
                    : <><CreditCard className="w-4 h-4" /> Confirm & Collect {collectableFiltered.length}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
