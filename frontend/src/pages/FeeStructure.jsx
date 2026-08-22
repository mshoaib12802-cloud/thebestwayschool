import { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import {
  Plus, Edit2, Trash2, X, Save, RefreshCw,
  Tag, List, ToggleLeft, ToggleRight, LayoutGrid,
  Calendar, ChevronRight, AlertCircle, CheckCircle,
} from 'lucide-react';
import RupeeIcon from '../components/RupeeIcon';

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-sky-400 focus:bg-white transition-colors';
const labelCls = 'block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1';

const initialHeadForm = { name: '', description: '', is_recurring: true };

export default function FeeStructure() {
  const [activeTab, setActiveTab] = useState('heads');

  // Fee Heads
  const [feeHeads, setFeeHeads] = useState([]);
  const [loadingHeads, setLoadingHeads] = useState(false);
  const [showHeadModal, setShowHeadModal] = useState(false);
  const [editHeadId, setEditHeadId] = useState(null);
  const [headForm, setHeadForm] = useState(initialHeadForm);
  const [savingHead, setSavingHead] = useState(false);

  // Fee Structures
  const [classes, setClasses] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [structure, setStructure] = useState(null);
  const [loadingStructure, setLoadingStructure] = useState(false);
  const [showStructureModal, setShowStructureModal] = useState(false);
  const [structureItems, setStructureItems] = useState([]);
  const [dueDay, setDueDay] = useState(10);
  const [savingStructure, setSavingStructure] = useState(false);

  // All Structures Overview
  const [allStructures, setAllStructures] = useState([]);
  const [loadingAll, setLoadingAll] = useState(false);

  useEffect(() => {
    fetchFeeHeads();
    fetchClasses();
    fetchAcademicYears();
  }, []);

  useEffect(() => {
    if (activeTab === 'overview') fetchAllStructures();
  }, [activeTab]);

  useEffect(() => {
    document.body.style.overflow = (showHeadModal || showStructureModal) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showHeadModal, showStructureModal]);

  const fetchFeeHeads = async () => {
    setLoadingHeads(true);
    try {
      const { data } = await api.get('/fee-structure/fee-heads');
      setFeeHeads(data);
    } catch { toast.error('Failed to load fee heads'); }
    finally { setLoadingHeads(false); }
  };

  const fetchClasses = async () => {
    try {
      const { data } = await api.get('/school-classes');
      setClasses(data);
    } catch { /* optional */ }
  };

  const fetchAcademicYears = async () => {
    try {
      const { data } = await api.get('/academic-years');
      setAcademicYears(data);
    } catch { /* optional */ }
  };

  const fetchStructure = async () => {
    if (!selectedClass || !selectedYear) { toast.warn('Select class and academic year'); return; }
    setLoadingStructure(true);
    try {
      const { data } = await api.get('/fee-structure/structures', {
        params: { class_id: selectedClass, academic_year_id: selectedYear },
      });
      const match = Array.isArray(data) ? data[0] : data;
      setStructure(match || null);
      if (!match) toast.info('No structure found — click "Set Structure" to create one');
    } catch {
      setStructure(null);
    }
    finally { setLoadingStructure(false); }
  };

  const fetchAllStructures = async () => {
    setLoadingAll(true);
    try {
      const { data } = await api.get('/fee-structure/structures');
      setAllStructures(Array.isArray(data) ? data : []);
    } catch { toast.error('Failed to load structures'); }
    finally { setLoadingAll(false); }
  };

  const openAddHead = () => {
    setEditHeadId(null);
    setHeadForm(initialHeadForm);
    setShowHeadModal(true);
  };

  const openEditHead = (h) => {
    setEditHeadId(h._id);
    setHeadForm({ name: h.name, description: h.description || '', is_recurring: h.is_recurring });
    setShowHeadModal(true);
  };

  const saveHead = async (e) => {
    e.preventDefault();
    setSavingHead(true);
    try {
      if (editHeadId) {
        await api.put(`/fee-structure/fee-heads/${editHeadId}`, headForm);
        toast.success('Fee head updated');
      } else {
        await api.post('/fee-structure/fee-heads', headForm);
        toast.success('Fee head created');
      }
      setShowHeadModal(false);
      fetchFeeHeads();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); }
    finally { setSavingHead(false); }
  };

  const deleteHead = async (id) => {
    if (!window.confirm('Delete this fee head? It will be deactivated.')) return;
    try {
      await api.delete(`/fee-structure/fee-heads/${id}`);
      toast.success('Fee head deleted');
      fetchFeeHeads();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to delete'); }
  };

  const openStructureModal = () => {
    const items = feeHeads.map(h => {
      const existing = structure?.items?.find(i => String(i.fee_head_id) === h._id || String(i.fee_head_id?._id) === h._id);
      return {
        fee_head_id: h._id,
        fee_head_name: h.name,
        name: h.name,
        is_recurring: h.is_recurring,
        amount: existing?.amount ?? '',
      };
    });
    setStructureItems(items);
    setDueDay(structure?.due_day ?? 10);
    setShowStructureModal(true);
  };

  const saveStructure = async (e) => {
    e.preventDefault();
    if (!selectedClass || !selectedYear) { toast.warn('Select class and academic year first'); return; }
    const filled = structureItems.filter(i => i.amount !== '' && Number(i.amount) >= 0);
    if (!filled.length) { toast.warn('Enter at least one fee amount'); return; }
    setSavingStructure(true);
    try {
      const payload = {
        class_id: selectedClass,
        academic_year_id: selectedYear,
        due_day: Number(dueDay),
        items: filled.map(i => ({
          fee_head_id: i.fee_head_id,
          fee_head_name: i.fee_head_name,
          amount: parseFloat(i.amount),
        })),
      };
      await api.post('/fee-structure/structures', payload);
      toast.success('Fee structure saved successfully');
      setShowStructureModal(false);
      fetchStructure();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save structure'); }
    finally { setSavingStructure(false); }
  };

  const recurringHeads = feeHeads.filter(h => h.is_recurring).length;
  const oneTimeHeads = feeHeads.filter(h => !h.is_recurring).length;

  // Only recurring heads are billed by the monthly run — one-time heads
  // (Admission Fee etc.) are charged once, at enrolment.
  const isMonthlyItem = item =>
    feeHeads.find(h => h._id === String(item.fee_head_id?._id || item.fee_head_id))?.is_recurring !== false;
  const sumMonthly = (items = []) =>
    items.filter(isMonthlyItem).reduce((s, i) => s + (i.amount || 0), 0);
  const sumOneTime = (items = []) =>
    items.filter(i => !isMonthlyItem(i)).reduce((s, i) => s + (i.amount || 0), 0);

  const tabs = [
    { id: 'heads',      label: 'Fee Heads',    icon: Tag },
    { id: 'structures', label: 'Structures',   icon: List },
    { id: 'overview',   label: 'Overview',     icon: LayoutGrid },
  ];

  const selectedClassName = classes.find(c => c._id === selectedClass);
  const selectedYearName  = academicYears.find(y => y._id === selectedYear);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-sky-600 flex items-center justify-center shadow">
          <RupeeIcon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Fee Structure</h1>
          <p className="text-sm text-slate-500">Define fee heads and set per-class fee structures</p>
        </div>
      </div>

      {/* Workflow Banner */}
      <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 mb-6 flex flex-wrap gap-3 items-center text-sm text-sky-800">
        <span className="flex items-center gap-1.5 font-bold"><span className="w-5 h-5 rounded-full bg-sky-600 text-white text-xs flex items-center justify-center">1</span> Create Fee Heads</span>
        <ChevronRight className="w-4 h-4 text-sky-400" />
        <span className="flex items-center gap-1.5 font-bold"><span className="w-5 h-5 rounded-full bg-sky-600 text-white text-xs flex items-center justify-center">2</span> Set Fee Amounts per Class</span>
        <ChevronRight className="w-4 h-4 text-sky-400" />
        <span className="flex items-center gap-1.5 font-bold"><span className="w-5 h-5 rounded-full bg-sky-600 text-white text-xs flex items-center justify-center">3</span> Generate Monthly Invoices</span>
        <ChevronRight className="w-4 h-4 text-sky-400" />
        <span className="flex items-center gap-1.5 font-bold"><span className="w-5 h-5 rounded-full bg-sky-600 text-white text-xs flex items-center justify-center">4</span> Collect Payments</span>
        <span className="ml-auto text-xs text-sky-600 bg-sky-100 px-2 py-0.5 rounded-full">Steps 3 & 4 → Fee Invoices page</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-2xl p-1 border border-slate-100 shadow-sm mb-6 w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === t.id ? 'bg-sky-600 text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* ─── FEE HEADS TAB ─────────────────────────────────────────────── */}
      {activeTab === 'heads' && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Total Fee Heads', value: feeHeads.length, color: 'sky' },
              { label: 'Recurring (Monthly)', value: recurringHeads, color: 'emerald' },
              { label: 'One-time', value: oneTimeHeads, color: 'amber' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div className={`text-2xl font-bold text-${s.color}-600`}>{s.value}</div>
                <div className="text-xs text-slate-500 font-semibold mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-700">Fee Heads</h2>
              <button onClick={openAddHead}
                className="flex items-center gap-2 bg-sky-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-sky-700 text-sm transition-colors">
                <Plus className="w-4 h-4" /> Add Fee Head
              </button>
            </div>
            {loadingHeads ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600" />
              </div>
            ) : feeHeads.length === 0 ? (
              <div className="text-center py-16">
                <Tag className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <div className="text-slate-400 font-semibold">No fee heads yet</div>
                <div className="text-slate-400 text-sm mt-1">Add fee categories like Tuition, Transport, etc.</div>
                <button onClick={openAddHead} className="mt-4 bg-sky-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-sky-700 text-sm transition-colors">
                  Add First Fee Head
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                      <th className="text-left px-5 py-3">#</th>
                      <th className="text-left px-5 py-3">Name</th>
                      <th className="text-left px-5 py-3">Description</th>
                      <th className="text-left px-5 py-3">Type</th>
                      <th className="text-right px-5 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {feeHeads.map((h, idx) => (
                      <tr key={h._id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 text-slate-400 text-xs">{idx + 1}</td>
                        <td className="px-5 py-3 font-semibold text-slate-800">{h.name}</td>
                        <td className="px-5 py-3 text-slate-500 max-w-xs truncate">{h.description || '—'}</td>
                        <td className="px-5 py-3">
                          {h.is_recurring ? (
                            <span className="inline-flex items-center gap-1 bg-sky-100 text-sky-700 text-xs font-bold px-2.5 py-1 rounded-full">
                              <RefreshCw className="w-3 h-3" /> Monthly
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full">
                              One-time
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button onClick={() => openEditHead(h)}
                            className="p-1.5 hover:bg-sky-50 rounded-lg text-sky-600 mr-1 transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteHead(h._id)}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── FEE STRUCTURES TAB ────────────────────────────────────────── */}
      {activeTab === 'structures' && (
        <div className="space-y-4">
          {/* Selector */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-600 mb-4">Select Class & Academic Year</h3>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[180px]">
                <label className={labelCls}>Class</label>
                <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className={inputCls}>
                  <option value="">Select Class</option>
                  {classes.map(c => <option key={c._id} value={c._id}>{c.name || `${c.grade} ${c.section || ''}`}</option>)}
                </select>
              </div>
              <div className="flex-1 min-w-[180px]">
                <label className={labelCls}>Academic Year</label>
                <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className={inputCls}>
                  <option value="">Select Year</option>
                  {academicYears.map(y => <option key={y._id} value={y._id}>{y.label || y.name}</option>)}
                </select>
              </div>
              <button onClick={fetchStructure} disabled={loadingStructure}
                className="flex items-center gap-2 bg-sky-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-sky-700 text-sm disabled:opacity-60 transition-colors">
                {loadingStructure
                  ? <RefreshCw className="w-4 h-4 animate-spin" />
                  : <RefreshCw className="w-4 h-4" />}
                Load
              </button>
            </div>
          </div>

          {/* Structure Display */}
          {structure ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-700">
                    {selectedClassName?.name || selectedClassName?.grade} — {selectedYearName?.label || selectedYearName?.name}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Due on day {structure.due_day} of each month
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Monthly Total</div>
                    <div className="text-xl font-bold text-sky-700">
                      Rs. {sumMonthly(structure.items).toLocaleString()}
                    </div>
                  </div>
                  <button onClick={openStructureModal}
                    className="flex items-center gap-2 bg-sky-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-sky-700 text-sm transition-colors">
                    <Edit2 className="w-4 h-4" /> Edit
                  </button>
                </div>
              </div>
              {(structure.items || []).length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  No fee items. Click Edit to add amounts.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                        <th className="text-left px-5 py-3">Fee Head</th>
                        <th className="text-left px-5 py-3">Type</th>
                        <th className="text-right px-5 py-3">Amount (Rs.)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {(structure.items || []).map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-5 py-3 font-medium text-slate-700">
                            {item.fee_head_name || item.fee_head_id?.name || '—'}
                          </td>
                          <td className="px-5 py-3">
                            {feeHeads.find(h => h._id === String(item.fee_head_id))?.is_recurring !== false ? (
                              <span className="text-xs text-sky-600 font-semibold">Monthly</span>
                            ) : (
                              <span className="text-xs text-amber-600 font-semibold">One-time</span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-right font-bold text-slate-800">
                            Rs. {(item.amount || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-sky-50">
                        <td colSpan={2} className="px-5 py-3 font-bold text-slate-700">Total per Month</td>
                        <td className="px-5 py-3 text-right font-bold text-sky-700 text-base">
                          Rs. {sumMonthly(structure.items).toLocaleString()}
                        </td>
                      </tr>
                      {sumOneTime(structure.items) > 0 && (
                        <tr className="bg-amber-50">
                          <td colSpan={2} className="px-5 py-3 font-bold text-slate-700">
                            One-time <span className="font-medium text-amber-700">— charged at enrolment only</span>
                          </td>
                          <td className="px-5 py-3 text-right font-bold text-amber-700 text-base">
                            Rs. {sumOneTime(structure.items).toLocaleString()}
                          </td>
                        </tr>
                      )}
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          ) : !loadingStructure && selectedClass && selectedYear ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
              <AlertCircle className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <div className="text-slate-500 font-semibold mb-1">No fee structure for this class/year</div>
              <div className="text-slate-400 text-sm mb-5">
                {feeHeads.length === 0
                  ? 'First create fee heads, then set amounts here.'
                  : 'Define the fee amounts for each fee head.'}
              </div>
              {feeHeads.length === 0 ? (
                <button onClick={() => setActiveTab('heads')}
                  className="bg-sky-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-sky-700 text-sm transition-colors">
                  Go to Fee Heads
                </button>
              ) : (
                <button onClick={openStructureModal}
                  className="bg-sky-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-sky-700 text-sm transition-colors">
                  <span className="flex items-center gap-2"><Plus className="w-4 h-4" /> Set Fee Structure</span>
                </button>
              )}
            </div>
          ) : !loadingStructure ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center text-slate-400">
              Select a class and academic year, then click Load.
            </div>
          ) : null}
        </div>
      )}

      {/* ─── OVERVIEW TAB ──────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {loadingAll ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600" />
            </div>
          ) : allStructures.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
              <LayoutGrid className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <div className="text-slate-500 font-semibold">No fee structures defined yet</div>
              <div className="text-slate-400 text-sm mt-1 mb-5">Go to Structures tab to create per-class fee structures.</div>
              <button onClick={() => setActiveTab('structures')}
                className="bg-sky-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-sky-700 text-sm transition-colors">
                Create Structure
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                  <div className="text-2xl font-bold text-sky-600">{allStructures.length}</div>
                  <div className="text-xs text-slate-500 font-semibold mt-0.5">Class Structures</div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                  <div className="text-2xl font-bold text-emerald-600">
                    Rs. {Math.max(...allStructures.map(s => sumMonthly(s.items))).toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-500 font-semibold mt-0.5">Highest Monthly Fee</div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                  <div className="text-2xl font-bold text-amber-600">
                    Rs. {Math.min(...allStructures.map(s => sumMonthly(s.items))).toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-500 font-semibold mt-0.5">Lowest Monthly Fee</div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                  <div className="text-2xl font-bold text-slate-700">
                    Rs. {Math.round(allStructures.reduce((sum, s) => sum + sumMonthly(s.items), 0) / allStructures.length).toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-500 font-semibold mt-0.5">Average Monthly Fee</div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100">
                  <h2 className="text-base font-bold text-slate-700">All Class Fee Structures</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                        <th className="text-left px-5 py-3">Class</th>
                        <th className="text-left px-5 py-3">Academic Year</th>
                        <th className="text-left px-5 py-3">Fee Items</th>
                        <th className="text-left px-5 py-3">Due Day</th>
                        <th className="text-right px-5 py-3">Monthly Total</th>
                        <th className="text-right px-5 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {allStructures.map(s => {
                        const total = sumMonthly(s.items);
                        const className = s.class_id?.name || `${s.class_id?.grade || ''} ${s.class_id?.section || ''}`.trim() || '—';
                        const yearName = s.academic_year_id?.label || '—';
                        return (
                          <tr key={s._id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-3 font-semibold text-slate-800">{className}</td>
                            <td className="px-5 py-3 text-slate-500">{yearName}</td>
                            <td className="px-5 py-3">
                              <div className="flex flex-wrap gap-1">
                                {(s.items || []).slice(0, 3).map((item, i) => (
                                  <span key={i} className="text-xs bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full font-medium">
                                    {item.fee_head_name || '—'}
                                  </span>
                                ))}
                                {(s.items || []).length > 3 && (
                                  <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                                    +{s.items.length - 3} more
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-3 text-slate-500">Day {s.due_day}</td>
                            <td className="px-5 py-3 text-right font-bold text-sky-700">
                              Rs. {total.toLocaleString()}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <button
                                onClick={() => {
                                  if (s.class_id?._id) setSelectedClass(s.class_id._id);
                                  if (s.academic_year_id?._id) setSelectedYear(s.academic_year_id._id);
                                  setActiveTab('structures');
                                }}
                                className="text-xs bg-sky-50 text-sky-600 hover:bg-sky-100 px-3 py-1.5 rounded-xl font-semibold transition-colors">
                                Edit
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── FEE HEAD MODAL ────────────────────────────────────────────── */}
      {showHeadModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">{editHeadId ? 'Edit Fee Head' : 'Add Fee Head'}</h2>
              <button onClick={() => setShowHeadModal(false)} className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={saveHead} className="p-5 space-y-4">
              <div>
                <label className={labelCls}>Name *</label>
                <input required value={headForm.name}
                  onChange={e => setHeadForm(p => ({ ...p, name: e.target.value }))}
                  className={inputCls} placeholder="e.g. Tuition Fee, Transport, Library" />
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <textarea value={headForm.description}
                  onChange={e => setHeadForm(p => ({ ...p, description: e.target.value }))}
                  rows={2} className={inputCls} placeholder="Optional description" />
              </div>
              <div>
                <label className={labelCls}>Billing Type</label>
                <div className="flex gap-3 mt-1">
                  {[
                    { val: true,  label: 'Monthly (Recurring)',  color: 'sky' },
                    { val: false, label: 'One-time',              color: 'amber' },
                  ].map(opt => (
                    <button key={String(opt.val)} type="button"
                      onClick={() => setHeadForm(p => ({ ...p, is_recurring: opt.val }))}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                        headForm.is_recurring === opt.val
                          ? opt.val ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-amber-500 bg-amber-50 text-amber-700'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowHeadModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 text-sm transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={savingHead}
                  className="flex-1 bg-sky-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-sky-700 text-sm disabled:opacity-60 transition-colors">
                  {savingHead ? 'Saving…' : editHeadId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── STRUCTURE MODAL ───────────────────────────────────────────── */}
      {showStructureModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Set Fee Structure</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedClassName?.name || selectedClassName?.grade} — {selectedYearName?.label || selectedYearName?.name}
                </p>
              </div>
              <button onClick={() => setShowStructureModal(false)} className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={saveStructure} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Due Day */}
                <div className="bg-sky-50 rounded-xl p-3 flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-sky-600 shrink-0" />
                  <div className="flex-1">
                    <label className={labelCls}>Due Day of Month</label>
                    <input type="number" min={1} max={28} value={dueDay}
                      onChange={e => setDueDay(e.target.value)}
                      className="w-24 bg-white border border-sky-200 rounded-lg px-3 py-1.5 text-sm font-bold text-sky-700 outline-none focus:border-sky-400" />
                  </div>
                  <span className="text-xs text-sky-600 font-medium">Invoices due on this day each month</span>
                </div>

                {/* Fee Items */}
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Fee Amounts</div>
                  {structureItems.length === 0 ? (
                    <div className="text-center text-slate-400 py-6">
                      No fee heads. Create fee heads first.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {structureItems.map((item, idx) => (
                        <div key={item.fee_head_id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-slate-700">{item.name}</div>
                            <div className="text-xs text-slate-400">{item.is_recurring ? 'Monthly' : 'One-time'}</div>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-slate-500 text-sm font-semibold">Rs.</span>
                            <input
                              type="number" min="0" step="0.01"
                              value={item.amount}
                              onChange={e => setStructureItems(prev =>
                                prev.map((it, i) => i === idx ? { ...it, amount: e.target.value } : it)
                              )}
                              className="w-28 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-sky-400"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Total Preview */}
                {structureItems.some(i => i.amount !== '') && (() => {
                  const filled  = structureItems.filter(i => i.amount !== '');
                  const monthly = filled.filter(i => i.is_recurring !== false)
                    .reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
                  const oneTime = filled.filter(i => i.is_recurring === false)
                    .reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
                  return (
                    <div className="space-y-2">
                      <div className="bg-sky-600 rounded-xl p-3 flex items-center justify-between text-white">
                        <span className="font-semibold text-sm">Monthly Total</span>
                        <span className="font-bold text-lg">Rs. {monthly.toLocaleString()}</span>
                      </div>
                      {oneTime > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
                          <span className="font-semibold text-sm text-amber-800">
                            One-time <span className="font-medium">— billed at enrolment, not monthly</span>
                          </span>
                          <span className="font-bold text-lg text-amber-700">Rs. {oneTime.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
              <div className="p-5 border-t border-slate-100 flex gap-3">
                <button type="button" onClick={() => setShowStructureModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 text-sm transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={savingStructure}
                  className="flex-1 bg-sky-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-sky-700 text-sm disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                  {savingStructure
                    ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving…</>
                    : <><Save className="w-4 h-4" /> Save Structure</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
