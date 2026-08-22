import { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import {
  Banknote, RefreshCw, Edit2, CheckCircle2, X, Save,
  Users, TrendingUp, Clock, Plus
} from 'lucide-react';

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-slate-500 focus:bg-white transition-colors';
const labelCls = 'block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1';

const STATUS_META = {
  draft: { label: 'Draft', cls: 'bg-slate-100 text-slate-600' },
  paid:  { label: 'Paid',  cls: 'bg-emerald-100 text-emerald-700' },
};

export default function Payroll() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editPayroll, setEditPayroll] = useState(null);
  const [editForm, setEditForm] = useState({ allowances: '', deductions: '' });
  const [saving, setSaving] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(null);

  useEffect(() => { if (month) fetchPayrolls(); }, [month]);
  useEffect(() => {
    document.body.style.overflow = showEditModal ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showEditModal]);

  const fetchPayrolls = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/payroll', { params: { month } });
      setPayrolls(data);
    } catch { toast.error('Failed to load payroll data'); }
    finally { setLoading(false); }
  };

  const generate = async () => {
    if (!month) { toast.warn('Select a month first'); return; }
    setGenerating(true);
    try {
      const { data } = await api.post('/payroll/generate', { month });
      toast.success(`Generated ${data.count || 0} payroll records`);
      fetchPayrolls();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to generate payrolls'); }
    finally { setGenerating(false); }
  };

  const openEdit = (p) => {
    setEditPayroll(p);
    setEditForm({ allowances: p.allowances || '', deductions: p.deductions || '' });
    setShowEditModal(true);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/payroll/${editPayroll._id}`, {
        allowances: parseFloat(editForm.allowances) || 0,
        deductions: parseFloat(editForm.deductions) || 0,
      });
      toast.success('Payroll updated');
      setShowEditModal(false);
      fetchPayrolls();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update'); }
    finally { setSaving(false); }
  };

  const markPaid = async (p) => {
    if (!window.confirm(`Mark payroll for ${p.staff_name} as paid?`)) return;
    setMarkingPaid(p._id);
    try {
      await api.put(`/payroll/${p._id}`, { status: 'paid' });
      toast.success('Marked as paid');
      fetchPayrolls();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update status'); }
    finally { setMarkingPaid(null); }
  };

  const totalPayroll = payrolls.reduce((s, p) => s + (p.net_salary || 0), 0);
  const totalPaid = payrolls.filter(p => p.status === 'paid').reduce((s, p) => s + (p.net_salary || 0), 0);
  const totalPending = totalPayroll - totalPaid;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-slate-700 flex items-center justify-center shadow">
          <Banknote className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Payroll</h1>
          <p className="text-sm text-slate-500">Manage staff salaries and payments</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Payroll', value: `Rs. ${totalPayroll.toLocaleString()}`, icon: Users, color: 'slate' },
          { label: 'Total Paid', value: `Rs. ${totalPaid.toLocaleString()}`, icon: CheckCircle2, color: 'emerald' },
          { label: 'Pending', value: `Rs. ${totalPending.toLocaleString()}`, icon: Clock, color: 'amber' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl bg-${stat.color}-100 flex items-center justify-center`}>
              <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{stat.label}</div>
              <div className="text-xl font-bold text-slate-800">{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className={labelCls}>Payroll Month</label>
            <input type="month" value={month} onChange={e => setMonth(e.target.value)} className={inputCls} />
          </div>
          <button onClick={fetchPayrolls} disabled={loading}
            className="flex items-center gap-2 bg-slate-700 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-slate-800 text-sm disabled:opacity-60">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Reload
          </button>
          <button onClick={generate} disabled={generating}
            className="flex items-center gap-2 bg-slate-700 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-slate-900 text-sm disabled:opacity-60">
            {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Generate Payrolls
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-700">Payroll Records — {month}</h2>
        </div>
        {loading ? (
          <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-700" /></div>
        ) : payrolls.length === 0 ? (
          <div className="text-center py-16 text-slate-400">No payroll records. Click "Generate Payrolls" to create them.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3">Staff Name</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-right px-4 py-3">Basic</th>
                <th className="text-right px-4 py-3">Allowances</th>
                <th className="text-right px-4 py-3">Deductions</th>
                <th className="text-right px-4 py-3">Net Salary</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {payrolls.map(p => {
                  const meta = STATUS_META[p.status] || STATUS_META.draft;
                  return (
                    <tr key={p._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-800">{p.staff_name}</td>
                      <td className="px-4 py-3 text-slate-500 capitalize">{p.role}</td>
                      <td className="px-4 py-3 text-right text-slate-700">Rs. {(p.basic_salary || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-emerald-600">+Rs. {(p.allowances || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-red-500">
                        -Rs. {((p.absence_deduction || 0) + (p.advance_deduction || 0) + (p.deductions || 0)).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-800">Rs. {(p.net_salary || 0).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${meta.cls}`}>{meta.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          {p.status !== 'paid' && (
                            <>
                              <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-600 border border-slate-200">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => markPaid(p)} disabled={markingPaid === p._id}
                                className="flex items-center gap-1 bg-emerald-600 text-white px-2.5 py-1.5 rounded-xl text-xs font-semibold hover:bg-emerald-700 disabled:opacity-60">
                                <CheckCircle2 className="w-3 h-3" /> Mark Paid
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot><tr className="bg-slate-50 font-bold">
                <td colSpan={5} className="px-4 py-3 text-slate-600">Total</td>
                <td className="px-4 py-3 text-right text-slate-800">Rs. {totalPayroll.toLocaleString()}</td>
                <td colSpan={2}></td>
              </tr></tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && editPayroll && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Edit Payroll — {editPayroll.staff_name}</h2>
              <button onClick={() => setShowEditModal(false)} className="p-1.5 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <form onSubmit={saveEdit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-xl p-3 text-xs text-slate-500">
                <div>Basic Salary: <strong className="text-slate-700">Rs. {(editPayroll.basic_salary || 0).toLocaleString()}</strong></div>
                <div>Absence Deduction: <strong className="text-red-500">Rs. {(editPayroll.absence_deduction || 0).toLocaleString()}</strong></div>
              </div>
              <div>
                <label className={labelCls}>Extra Allowances (Rs.)</label>
                <input type="number" min="0" step="0.01" value={editForm.allowances}
                  onChange={e => setEditForm(p => ({ ...p, allowances: e.target.value }))} className={inputCls} placeholder="0" />
              </div>
              <div>
                <label className={labelCls}>Additional Deductions (Rs.)</label>
                <input type="number" min="0" step="0.01" value={editForm.deductions}
                  onChange={e => setEditForm(p => ({ ...p, deductions: e.target.value }))} className={inputCls} placeholder="0" />
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-sm">
                <span className="text-slate-500">Net Salary: </span>
                <span className="font-bold text-slate-800">
                  Rs. {Math.max(0, (editPayroll.basic_salary || 0) + (parseFloat(editForm.allowances) || 0) - (editPayroll.absence_deduction || 0) - (editPayroll.advance_deduction || 0) - (parseFloat(editForm.deductions) || 0)).toLocaleString()}
                </span>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-slate-700 text-white px-4 py-2 rounded-xl font-semibold hover:bg-slate-800 text-sm disabled:opacity-60">
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
