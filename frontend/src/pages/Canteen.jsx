import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import {
  UtensilsCrossed, Plus, Edit2, Trash2, X, Search,
  ChevronDown, Save, RefreshCw, FileText, Coffee,
  Sandwich, Cookie, Droplets, Tag, CheckCircle2,
  AlertCircle, Clock, TrendingUp, Users, DollarSign,
  Download, Send,
} from 'lucide-react';

const inputCls  = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-indigo-400 focus:bg-white transition-colors';
const labelCls  = 'block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1';
const DAYS      = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CATS      = ['breakfast', 'lunch', 'snack', 'drink', 'other'];
const CAT_ICONS = { breakfast: <Coffee size={14}/>, lunch: <Sandwich size={14}/>, snack: <Cookie size={14}/>, drink: <Droplets size={14}/>, other: <Tag size={14}/> };
const CAT_COLOR = { breakfast: 'bg-amber-100 text-amber-700', lunch: 'bg-green-100 text-green-700', snack: 'bg-purple-100 text-purple-700', drink: 'bg-blue-100 text-blue-700', other: 'bg-slate-100 text-slate-700' };

const statusBadge = (status) => {
  if (status === 'paid')     return <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-green-100 text-green-700">Paid</span>;
  if (status === 'invoiced') return <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-700">Invoiced</span>;
  return <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-700">Pending</span>;
};

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

// ─── Tab: Menu Management ─────────────────────────────────────────────────────
function MenuTab() {
  const [items, setItems]           = useState([]);
  const [loading, setLoading]       = useState(false);
  const [showModal, setShowModal]   = useState(false);
  const [editId, setEditId]         = useState(null);
  const [saving, setSaving]         = useState(false);
  const [search, setSearch]         = useState('');
  const [form, setForm]             = useState({ name: '', category: 'lunch', price: '', description: '', available_days: ['Mon','Tue','Wed','Thu','Fri'], is_active: true });

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/canteen/menu'); setItems(data); }
    catch { toast.error('Failed to load menu items'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const openAdd  = () => { setEditId(null); setForm({ name: '', category: 'lunch', price: '', description: '', available_days: ['Mon','Tue','Wed','Thu','Fri'], is_active: true }); setShowModal(true); };
  const openEdit = (it) => { setEditId(it._id); setForm({ name: it.name, category: it.category, price: it.price, description: it.description || '', available_days: it.available_days || [], is_active: it.is_active }); setShowModal(true); };

  const toggleDay = (day) => setForm(p => ({ ...p, available_days: p.available_days.includes(day) ? p.available_days.filter(d => d !== day) : [...p.available_days, day] }));

  const save = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form, price: parseFloat(form.price) || 0 };
      if (editId) { await api.put(`/canteen/menu/${editId}`, payload); toast.success('Item updated'); }
      else         { await api.post('/canteen/menu', payload);          toast.success('Item added'); }
      setShowModal(false); fetchItems();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this menu item?')) return;
    try { await api.delete(`/canteen/menu/${id}`); toast.success('Deleted'); fetchItems(); }
    catch { toast.error('Failed to delete'); }
  };

  const filtered = items.filter(it => it.name.toLowerCase().includes(search.toLowerCase()) || it.category.includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items…" className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm w-56 focus:outline-none focus:border-indigo-400"/>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
          <Plus size={16}/> Add Item
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"/></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <UtensilsCrossed size={40} className="mx-auto mb-3 opacity-30"/>
          <p className="font-medium">No menu items yet. Add your first canteen item.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(it => (
            <div key={it._id} className={`bg-white rounded-2xl border p-4 shadow-sm flex flex-col gap-2 ${!it.is_active ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-slate-800">{it.name}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${CAT_COLOR[it.category]}`}>
                      {CAT_ICONS[it.category]} {it.category}
                    </span>
                    {!it.is_active && <span className="text-xs text-slate-400 font-medium">Inactive</span>}
                  </div>
                </div>
                <p className="text-lg font-extrabold text-indigo-600 whitespace-nowrap">Rs {it.price?.toLocaleString()}</p>
              </div>
              {it.description && <p className="text-xs text-slate-500">{it.description}</p>}
              <div className="flex flex-wrap gap-1">
                {(it.available_days || []).map(d => (
                  <span key={d} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded">{d}</span>
                ))}
              </div>
              <div className="flex gap-2 mt-1 pt-2 border-t border-slate-100">
                <button onClick={() => openEdit(it)} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors">
                  <Edit2 size={13}/> Edit
                </button>
                <button onClick={() => remove(it._id)} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                  <Trash2 size={13}/> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-800">{editId ? 'Edit Item' : 'Add Menu Item'}</h3>
              <button onClick={() => setShowModal(false)}><X size={20} className="text-slate-400"/></button>
            </div>
            <form onSubmit={save} className="space-y-4">
              <div>
                <label className={labelCls}>Item Name</label>
                <input required className={inputCls} placeholder="e.g. Chicken Sandwich" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Category</label>
                  <select className={inputCls} value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                    {CATS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Price (Rs)</label>
                  <input required type="number" min="0" className={inputCls} placeholder="0" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))}/>
                </div>
              </div>
              <div>
                <label className={labelCls}>Description (optional)</label>
                <input className={inputCls} placeholder="Brief description…" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}/>
              </div>
              <div>
                <label className={labelCls}>Available Days</label>
                <div className="flex gap-2 flex-wrap">
                  {DAYS.map(d => (
                    <button type="button" key={d} onClick={() => toggleDay(d)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${form.available_days.includes(d) ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 text-slate-500'}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} className="w-4 h-4 accent-indigo-600"/>
                <label htmlFor="is_active" className="text-sm font-medium text-slate-700">Active</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2">
                  {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Save size={15}/>}
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Monthly Charges ─────────────────────────────────────────────────────
function ChargesTab() {
  const [classes, setClasses]         = useState([]);
  const [classId, setClassId]         = useState('');
  const [month, setMonth]             = useState(getCurrentMonth());
  const [students, setStudents]       = useState([]);
  const [loadingStudents, setLS]      = useState(false);
  const [amounts, setAmounts]         = useState({});
  const [notes, setNotes]             = useState({});
  const [saving, setSaving]           = useState(false);
  const [bulkAmount, setBulkAmount]   = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [academicYears, setAcademicYears] = useState([]);
  const [pushing, setPushing]         = useState(false);

  useEffect(() => {
    api.get('/school-classes').then(r => setClasses(r.data)).catch(() => {});
    api.get('/academic-years').then(r => {
      setAcademicYears(r.data);
      const current = r.data.find(y => y.is_current) || r.data[0];
      if (current) setAcademicYear(current._id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!classId || !month) { setStudents([]); return; }
    setLS(true);
    api.get('/canteen/charges', { params: { class_id: classId, month } })
      .then(r => {
        setStudents(r.data);
        const amt = {}, nt = {};
        r.data.forEach(s => { amt[s.student_id] = s.amount || ''; nt[s.student_id] = s.notes || ''; });
        setAmounts(amt); setNotes(nt);
      })
      .catch(() => toast.error('Failed to load students'))
      .finally(() => setLS(false));
  }, [classId, month]);

  const applyBulk = () => {
    if (!bulkAmount) return;
    const newAmts = {};
    students.forEach(s => { newAmts[s.student_id] = bulkAmount; });
    setAmounts(newAmts);
    toast.success(`Applied Rs ${bulkAmount} to all students`);
  };

  const saveAll = async () => {
    if (!classId || !month) { toast.warn('Select a class and month first'); return; }
    setSaving(true);
    try {
      const charges = students.map(s => ({
        student_id: s.student_id,
        class_id:   classId,
        amount:     parseFloat(amounts[s.student_id]) || 0,
        notes:      notes[s.student_id] || '',
      }));
      await api.post('/canteen/charges/bulk', { month, academic_year_id: academicYear, charges });
      toast.success('Canteen charges saved!');
      // Reload to get updated statuses
      const { data } = await api.get('/canteen/charges', { params: { class_id: classId, month } });
      setStudents(data);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const pushToInvoices = async () => {
    if (!month) return;
    setPushing(true);
    try {
      const { data } = await api.post('/canteen/push-to-invoices', { month, class_id: classId || undefined });
      toast.success(`Pushed to ${data.pushed} invoices. ${data.noInvoice} had no invoice yet.`);
      // Reload
      if (classId) {
        const r = await api.get('/canteen/charges', { params: { class_id: classId, month } });
        setStudents(r.data);
        const amt = {}, nt = {};
        r.data.forEach(s => { amt[s.student_id] = s.amount || ''; nt[s.student_id] = s.notes || ''; });
        setAmounts(amt); setNotes(nt);
      }
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to push'); }
    finally { setPushing(false); }
  };

  const totalAmount = students.reduce((sum, s) => sum + (parseFloat(amounts[s.student_id]) || 0), 0);

  return (
    <div>
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-5 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Academic Year</label>
            <select className={inputCls} value={academicYear} onChange={e => setAcademicYear(e.target.value)}>
              <option value="">— Select Year —</option>
              {academicYears.map(y => <option key={y._id} value={y._id}>{y.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Class</label>
            <select className={inputCls} value={classId} onChange={e => setClassId(e.target.value)}>
              <option value="">— Select Class —</option>
              {classes.map(c => <option key={c._id} value={c._id}>{c.name}{c.section ? ` (${c.section})` : ''}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Month</label>
            <input type="month" className={inputCls} value={month} onChange={e => setMonth(e.target.value)}/>
          </div>
        </div>

        {students.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <input type="number" min="0" className={inputCls} placeholder="Apply same amount to all (Rs)"
                value={bulkAmount} onChange={e => setBulkAmount(e.target.value)}/>
              <button onClick={applyBulk} className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold whitespace-nowrap transition-colors">
                Apply All
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={saveAll} disabled={saving}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60">
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Save size={15}/>}
                {saving ? 'Saving…' : 'Save Charges'}
              </button>
              <button onClick={pushToInvoices} disabled={pushing}
                className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60">
                {pushing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Send size={15}/>}
                {pushing ? 'Pushing…' : 'Push to Invoices'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Summary bar */}
      {students.length > 0 && (
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-slate-600">{students.length} student{students.length !== 1 ? 's' : ''} loaded</p>
          <p className="text-sm font-bold text-indigo-700">Total: Rs {totalAmount.toLocaleString()}</p>
        </div>
      )}

      {/* Student Table */}
      {loadingStudents ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"/></div>
      ) : !classId ? (
        <div className="text-center py-16 text-slate-400">
          <Users size={40} className="mx-auto mb-3 opacity-30"/>
          <p className="font-medium">Select a class above to load students.</p>
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Users size={40} className="mx-auto mb-3 opacity-30"/>
          <p className="font-medium">No active students found in this class.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-3 font-bold text-slate-500 text-xs uppercase tracking-wide">#</th>
                <th className="text-left px-4 py-3 font-bold text-slate-500 text-xs uppercase tracking-wide">Student</th>
                <th className="text-left px-4 py-3 font-bold text-slate-500 text-xs uppercase tracking-wide hidden sm:table-cell">Roll No.</th>
                <th className="text-left px-4 py-3 font-bold text-slate-500 text-xs uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 font-bold text-slate-500 text-xs uppercase tracking-wide">Amount (Rs)</th>
                <th className="text-left px-4 py-3 font-bold text-slate-500 text-xs uppercase tracking-wide hidden md:table-cell">Notes</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, idx) => (
                <tr key={s.student_id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 text-slate-400 font-medium">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {s.full_name?.charAt(0)}
                      </div>
                      <span className="font-semibold text-slate-800">{s.full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">{s.roll_number}</td>
                  <td className="px-4 py-3">{statusBadge(s.status)}</td>
                  <td className="px-4 py-3">
                    <input
                      type="number" min="0"
                      className="w-28 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-400 focus:bg-white transition-colors"
                      placeholder="0"
                      value={amounts[s.student_id] ?? ''}
                      onChange={e => setAmounts(p => ({ ...p, [s.student_id]: e.target.value }))}
                    />
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <input
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-600 outline-none focus:border-indigo-400 focus:bg-white transition-colors"
                      placeholder="Optional note…"
                      value={notes[s.student_id] ?? ''}
                      onChange={e => setNotes(p => ({ ...p, [s.student_id]: e.target.value }))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Monthly Report ──────────────────────────────────────────────────────
function ReportTab() {
  const [month, setMonth]     = useState(getCurrentMonth());
  const [report, setReport]   = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    if (!month) return;
    setLoading(true);
    try {
      const { data } = await api.get('/canteen/report', { params: { month } });
      setReport(data);
    } catch { toast.error('Failed to load report'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchReport(); }, [month]);

  return (
    <div>
      <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-5 shadow-sm flex items-end gap-4">
        <div className="flex-1 max-w-xs">
          <label className={labelCls}>Month</label>
          <input type="month" className={inputCls} value={month} onChange={e => setMonth(e.target.value)}/>
        </div>
        <button onClick={fetchReport} disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''}/> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"/></div>
      ) : !report ? null : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Students', value: report.summary.total_students, icon: <Users size={20}/>, color: 'indigo' },
              { label: 'Total Amount',   value: `Rs ${report.summary.total_amount?.toLocaleString()}`, icon: <DollarSign size={20}/>, color: 'green' },
              { label: 'Invoiced',       value: report.summary.invoiced,       icon: <CheckCircle2 size={20}/>, color: 'blue' },
              { label: 'Pending',        value: report.summary.pending,        icon: <AlertCircle size={20}/>,  color: 'amber' },
            ].map(c => (
              <div key={c.label} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                <div className={`w-9 h-9 rounded-xl bg-${c.color}-100 text-${c.color}-600 flex items-center justify-center mb-2`}>{c.icon}</div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{c.label}</p>
                <p className="text-xl font-extrabold text-slate-800 mt-0.5">{c.value}</p>
              </div>
            ))}
          </div>

          {/* Class Breakdown */}
          {report.classes.map(cls => (
            <div key={cls.class_id} className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-4 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-100">
                <h4 className="font-bold text-slate-700">{cls.class_name}</h4>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-slate-500">{cls.students.length} students</span>
                  <span className="font-bold text-indigo-700">Rs {cls.total?.toLocaleString()}</span>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-50">
                    <th className="text-left px-5 py-2.5 font-bold text-slate-400 text-xs uppercase">Student</th>
                    <th className="text-left px-5 py-2.5 font-bold text-slate-400 text-xs uppercase hidden sm:table-cell">Roll No.</th>
                    <th className="text-left px-5 py-2.5 font-bold text-slate-400 text-xs uppercase">Amount</th>
                    <th className="text-left px-5 py-2.5 font-bold text-slate-400 text-xs uppercase">Status</th>
                    <th className="text-left px-5 py-2.5 font-bold text-slate-400 text-xs uppercase hidden md:table-cell">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {cls.students.map(s => (
                    <tr key={s._id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                      <td className="px-5 py-2.5 font-semibold text-slate-800">{s.student_id?.full_name || '—'}</td>
                      <td className="px-5 py-2.5 text-slate-500 hidden sm:table-cell">{s.student_id?.roll_number || '—'}</td>
                      <td className="px-5 py-2.5 font-bold text-slate-800">Rs {s.amount?.toLocaleString()}</td>
                      <td className="px-5 py-2.5">{statusBadge(s.status)}</td>
                      <td className="px-5 py-2.5 text-slate-500 hidden md:table-cell">{s.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── Main Canteen Page ────────────────────────────────────────────────────────
export default function Canteen() {
  const [tab, setTab] = useState('charges');

  const tabs = [
    { key: 'charges', label: 'Monthly Charges', icon: <DollarSign size={16}/> },
    { key: 'menu',    label: 'Menu Items',       icon: <UtensilsCrossed size={16}/> },
    { key: 'report',  label: 'Monthly Report',   icon: <TrendingUp size={16}/> },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
            <UtensilsCrossed size={26} className="text-indigo-600"/> Canteen Management
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage menu, monthly charges, and fee voucher integration</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl mb-6 w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t.key ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'charges' && <ChargesTab/>}
      {tab === 'menu'    && <MenuTab/>}
      {tab === 'report'  && <ReportTab/>}
    </div>
  );
}
