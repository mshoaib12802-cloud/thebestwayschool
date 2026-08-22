import { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import {
  Receipt, Plus, Search, RefreshCw, X, CreditCard,
  Filter, TrendingUp, AlertTriangle, CheckCircle2, Clock,
  ChevronDown, ChevronRight, Eye, Banknote,
} from 'lucide-react';
import RupeeIcon from '../components/RupeeIcon';

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-emerald-400 focus:bg-white transition-colors';
const labelCls = 'block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1';

const STATUS_META = {
  unpaid:  { label: 'Unpaid',  cls: 'bg-red-100 text-red-700',     icon: AlertTriangle },
  partial: { label: 'Partial', cls: 'bg-amber-100 text-amber-700', icon: Clock },
  paid:    { label: 'Paid',    cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
};

function fmt(m) {
  if (!m) return '—';
  const [y, mo] = m.split('-');
  return new Date(y, mo - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
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

  useEffect(() => { fetchClasses(); fetchAcademicYears(); }, []);

  useEffect(() => {
    document.body.style.overflow = (showCollectModal || showDetailModal) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showCollectModal, showDetailModal]);

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
      toast.success(`Generated: ${data.created || 0} new, ${data.skipped || 0} already existed`);
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
                  const isOverdue = inv.due_date && new Date(inv.due_date) < new Date() && inv.status !== 'paid';
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
                          {inv.status !== 'paid' && (
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
              {selectedInvoice.status !== 'paid' && (
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
    </div>
  );
}
