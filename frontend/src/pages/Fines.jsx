import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Plus, Trash2, Zap } from 'lucide-react';
import api from '../services/api';

const CATEGORIES = [
  { value: 'late_arrival', label: 'Late Arrival' },
  { value: 'absence', label: 'Absence' },
  { value: 'misconduct', label: 'Misconduct' },
  { value: 'library', label: 'Library / Books' },
  { value: 'damage', label: 'Property Damage' },
  { value: 'uniform', label: 'Uniform' },
  { value: 'other', label: 'Other' },
];

const STATUS_META = {
  pending: { label: 'Pending', cls: 'bg-yellow-100 text-yellow-800 border-yellow-200', dot: 'bg-yellow-400' },
  paid:    { label: 'Paid',    cls: 'bg-green-100 text-green-800 border-green-200',   dot: 'bg-green-500' },
  waived:  { label: 'Waived',  cls: 'bg-slate-100 text-slate-500 border-slate-200',   dot: 'bg-slate-400' },
};

const isAuto = (fine) => (fine.notes || '').toLowerCase().includes('auto-generated');

export default function Fines() {
  const [tab, setTab] = useState('student');           // student | staff
  const [statusTab, setStatusTab] = useState('all');   // all | pending | paid | waived
  const [fines, setFines] = useState([]);
  const [summary, setSummary] = useState({});
  const [students, setStudents] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [waiveModal, setWaiveModal] = useState(null);
  const [waiveNote, setWaiveNote] = useState('');
  const [form, setForm] = useState({
    target_id: '', category: 'late_arrival', reason: '', amount: '',
    issued_date: new Date().toISOString().slice(0, 10), notes: '',
  });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [fRes, sRes] = await Promise.all([
        api.get(`/fines?target_type=${tab}`),
        api.get('/fines/summary'),
      ]);
      setFines(Array.isArray(fRes.data) ? fRes.data : []);
      setSummary(sRes.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const fetchTargetLists = async () => {
    try {
      const [stRes, sfRes] = await Promise.all([
        api.get('/students'),
        api.get('/staff'),
      ]);
      const stData = stRes.data;
      const sfData = sfRes.data;
      setStudents(Array.isArray(stData) ? stData : stData.students || []);
      setStaff(Array.isArray(sfData) ? sfData : []);
    } catch { /* silent */ }
  };

  useEffect(() => { fetchAll(); }, [tab]);
  useEffect(() => { fetchTargetLists(); }, []);

  // Client-side filter by status tab
  const filtered = statusTab === 'all' ? fines : fines.filter(f => f.status === statusTab);

  const counts = {
    all: fines.length,
    pending: fines.filter(f => f.status === 'pending').length,
    paid:    fines.filter(f => f.status === 'paid').length,
    waived:  fines.filter(f => f.status === 'waived').length,
  };

  const handleIssue = async (e) => {
    e.preventDefault();
    try {
      await api.post('/fines', { ...form, target_type: tab });
      setShowModal(false);
      setForm({ target_id: '', category: 'late_arrival', reason: '', amount: '', issued_date: new Date().toISOString().slice(0, 10), notes: '' });
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Error issuing fine.');
    }
  };

  const handlePay = async (id) => {
    if (!confirm('Mark this fine as paid?')) return;
    await api.put(`/fines/${id}/pay`);
    fetchAll();
  };

  const handleWaive = async () => {
    await api.put(`/fines/${waiveModal}/waive`, { notes: waiveNote });
    setWaiveModal(null); setWaiveNote(''); fetchAll();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this fine record?')) return;
    await api.delete(`/fines/${id}`);
    fetchAll();
  };

  const pendingAmt   = tab === 'student' ? summary.student_pending_amount : summary.staff_pending_amount;
  const collectedAmt = tab === 'student' ? summary.student_collected : summary.staff_collected;
  const waivedAmt    = tab === 'student' ? summary.student_waived : summary.staff_waived;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Fines Management</h1>
          <p className="text-slate-500 text-sm mt-1">Automatic &amp; manual fines for students and staff</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition-colors font-medium shadow-sm"
        >
          <Plus size={18} /> Issue Fine
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 border border-yellow-200 shadow-sm">
          <p className="text-xs text-slate-500 mb-1 font-medium">Pending ({tab})</p>
          <p className="text-2xl font-extrabold text-yellow-600">Rs. {(pendingAmt || 0).toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">{counts.pending} unpaid fine{counts.pending !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-green-200 shadow-sm">
          <p className="text-xs text-slate-500 mb-1 font-medium">Collected ({tab})</p>
          <p className="text-2xl font-extrabold text-green-600">Rs. {(collectedAmt || 0).toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">{counts.paid} paid fine{counts.paid !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500 mb-1 font-medium">Waived ({tab})</p>
          <p className="text-2xl font-extrabold text-slate-500">Rs. {(waivedAmt || 0).toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">{counts.waived} waived</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500 mb-1 font-medium">All Pending (Both)</p>
          <p className="text-2xl font-extrabold text-slate-800">
            Rs. {((summary.student_pending_amount || 0) + (summary.staff_pending_amount || 0)).toLocaleString()}
          </p>
          <p className="text-xs text-slate-400 mt-1">Students + Staff</p>
        </div>
      </div>

      {/* Main Panel */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

        {/* Type Tabs (Student / Staff) */}
        <div className="flex border-b border-slate-200 px-4">
          {[
            { key: 'student', label: 'Student Fines' },
            { key: 'staff',   label: 'Staff Fines' },
          ].map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setStatusTab('all'); }}
              className={`px-6 py-4 font-semibold text-sm transition-colors ${
                tab === t.key ? 'border-b-2 border-red-600 text-red-600' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
          {[
            { key: 'all',     label: 'All',     color: 'text-slate-700' },
            { key: 'pending', label: 'Unpaid',  color: 'text-yellow-700' },
            { key: 'paid',    label: 'Paid',    color: 'text-green-700' },
            { key: 'waived',  label: 'Waived',  color: 'text-slate-500' },
          ].map(s => (
            <button key={s.key} onClick={() => setStatusTab(s.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusTab === s.key
                  ? 'bg-white shadow border border-slate-200 ' + s.color
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {s.label}
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
                statusTab === s.key ? 'bg-slate-100' : 'bg-slate-100 text-slate-400'
              }`}>
                {counts[s.key]}
              </span>
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-12 text-slate-400">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <CheckCircle size={36} className="mx-auto mb-3 text-slate-200"/>
              No {statusTab !== 'all' ? statusTab : ''} fines found.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs font-bold uppercase tracking-wide border-b border-slate-100">
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Reason</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(f => {
                  const person = f.target_type === 'student' ? f.student_id : f.staff_id;
                  const meta = STATUS_META[f.status] || STATUS_META.pending;
                  const auto = isAuto(f);
                  return (
                    <tr key={f._id} className={`hover:bg-slate-50 transition-colors ${f.status === 'paid' ? 'opacity-75' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                            {(person?.name || person?.full_name || '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{person?.name || person?.full_name || '—'}</p>
                            {f.target_type === 'student' && person?.roll_number && (
                              <p className="text-[10px] text-slate-400">{person.roll_number}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-600 capitalize">{f.category.replace(/_/g, ' ')}</span>
                          {auto && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-extrabold rounded uppercase tracking-wide border border-indigo-100">
                              <Zap size={9}/> Auto
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-[180px] truncate">{f.reason}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {new Date(f.issued_date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {f.status === 'paid' && f.paid_date && (
                          <div className="text-green-600 font-medium">
                            Paid {new Date(f.paid_date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short' })}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-800">
                        Rs. {f.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${meta.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`}/>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {f.status === 'pending' && (
                            <>
                              <button onClick={() => handlePay(f._id)} title="Mark Paid"
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                                <CheckCircle size={16}/>
                              </button>
                              <button onClick={() => { setWaiveModal(f._id); setWaiveNote(''); }} title="Waive"
                                className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
                                <XCircle size={16}/>
                              </button>
                            </>
                          )}
                          <button onClick={() => handleDelete(f._id)} title="Delete"
                            className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 size={16}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer legend */}
        {fines.length > 0 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1"><Zap size={11} className="text-indigo-400"/> Auto = system-generated on absence</span>
            <span>Showing {filtered.length} of {fines.length} fines</span>
          </div>
        )}
      </div>

      {/* Issue Fine Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <AlertTriangle size={20} className="text-red-500"/> Issue Fine
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleIssue} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {tab === 'student' ? 'Student' : 'Staff Member'} *
                </label>
                <select required value={form.target_id}
                  onChange={e => setForm(f => ({ ...f, target_id: e.target.value }))}
                  className="form-input w-full">
                  <option value="">Select {tab === 'student' ? 'Student' : 'Staff'}...</option>
                  {tab === 'student'
                    ? students.map(s => <option key={s._id} value={s._id}>{s.full_name} ({s.roll_number})</option>)
                    : staff.map(s => <option key={s._id} value={s._id}>{s.name} — {s.role}</option>)
                  }
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
                  <select value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="form-input w-full">
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount (Rs.) *</label>
                  <input type="number" required min="1" placeholder="100"
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    className="form-input w-full"/>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason *</label>
                <input type="text" required placeholder="e.g. Late by 45 minutes"
                  value={form.reason}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  className="form-input w-full"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input type="date" value={form.issued_date}
                  onChange={e => setForm(f => ({ ...f, issued_date: e.target.value }))}
                  className="form-input w-full"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
                <textarea rows={2} placeholder="Any additional details..."
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="form-input w-full resize-none"/>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 font-medium">
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 font-semibold">
                  Issue Fine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Waive Modal */}
      {waiveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <h2 className="font-bold text-lg text-slate-800 mb-3">Waive Fine</h2>
            <p className="text-slate-500 text-sm mb-4">Provide a reason for waiving (optional):</p>
            <textarea rows={3} placeholder="Reason for waiving..."
              value={waiveNote}
              onChange={e => setWaiveNote(e.target.value)}
              className="form-input w-full resize-none mb-4"/>
            <div className="flex gap-3">
              <button onClick={() => setWaiveModal(null)}
                className="flex-1 py-2.5 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 font-medium">
                Cancel
              </button>
              <button onClick={handleWaive}
                className="flex-1 py-2.5 bg-slate-700 text-white rounded-xl hover:bg-slate-800 font-semibold">
                Waive Fine
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
