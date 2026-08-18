import { useState, useEffect, useMemo, useRef } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import {
  UserCheck, Plus, Edit2, Trash2, X, Key, Copy, Search,
  Phone, Mail, Users, ChevronDown, RefreshCw, CheckCircle,
  GraduationCap, Hash, Filter,
} from 'lucide-react';

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-teal-400 focus:bg-white transition-colors';
const labelCls = 'block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1';

const initForm = { name: '', email: '', phone: '', student_ids: [] };

export default function Parents() {
  const [parents, setParents]     = useState([]);
  const [students, setStudents]   = useState([]);
  const [classes, setClasses]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState(null);
  const [creds, setCreds]         = useState(null);
  const [form, setForm]           = useState(initForm);

  // Student picker search/filter
  const [stuSearch, setStuSearch]   = useState('');
  const [stuClassFilter, setStuClassFilter] = useState('');

  // Parent list search
  const [search, setSearch]         = useState('');

  // Phone-based child auto-detection
  const [phoneMatches,   setPhoneMatches]   = useState([]);
  const [phoneSearching, setPhoneSearching] = useState(false);
  const phoneTimerRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const [p, s, c] = await Promise.all([
        api.get('/parents'),
        api.get('/students'),
        api.get('/school-classes'),
      ]);
      setParents(p.data || []);
      setStudents(s.data || []);
      setClasses(c.data || []);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // Phone-based auto-detection: debounce search when phone changes
  useEffect(() => {
    const clean = (form.phone || '').replace(/[^0-9]/g, '');
    if (clean.length < 9) { setPhoneMatches([]); return; }
    clearTimeout(phoneTimerRef.current);
    phoneTimerRef.current = setTimeout(async () => {
      setPhoneSearching(true);
      try {
        const { data } = await api.get('/students/family-lookup', { params: { phone: clean } });
        const found = data.students || [];
        setPhoneMatches(found);
        // Auto-add found students to form.student_ids if not already there
        if (found.length) {
          setForm(f => {
            const existing = new Set(f.student_ids.map(id => id.toString()));
            const toAdd = found.map(s => s._id).filter(id => !existing.has(id.toString()));
            return toAdd.length ? { ...f, student_ids: [...f.student_ids, ...toAdd] } : f;
          });
          toast.info(`${found.length} child${found.length > 1 ? 'ren' : ''} found and auto-linked by phone`);
        }
      } catch { setPhoneMatches([]); }
      finally { setPhoneSearching(false); }
    }, 700);
    return () => clearTimeout(phoneTimerRef.current);
  }, [form.phone]);

  const openAdd = () => {
    setForm(initForm);
    setEditing(null);
    setStuSearch('');
    setStuClassFilter('');
    setPhoneMatches([]);
    setShowForm(true);
  };

  const openEdit = (p) => {
    setForm({
      name: p.name,
      email: p.email,
      phone: p.phone || '',
      student_ids: (p.student_ids || []).map(s => s._id || s),
    });
    setEditing(p._id);
    setStuSearch('');
    setStuClassFilter('');
    setPhoneMatches([]);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        const { data } = await api.put(`/parents/${editing}`, form);
        setParents(prev => prev.map(p => p._id === editing ? data : p));
        toast.success('Parent updated');
        setShowForm(false);
      } else {
        const { data } = await api.post('/parents', form);
        setCreds({ email: data.parent.email, password: data.password });
        setShowForm(false);
        load();
      }
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this parent account? This will also unlink their children.')) return;
    try {
      await api.delete(`/parents/${id}`);
      setParents(prev => prev.filter(p => p._id !== id));
      toast.success('Parent account deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const toggleStudent = (id) => {
    setForm(f => ({
      ...f,
      student_ids: f.student_ids.includes(id)
        ? f.student_ids.filter(s => s !== id)
        : [...f.student_ids, id],
    }));
  };

  // Filtered students for picker
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchSearch = !stuSearch ||
        (s.full_name || '').toLowerCase().includes(stuSearch.toLowerCase()) ||
        (s.roll_number || '').toLowerCase().includes(stuSearch.toLowerCase());
      const matchClass = !stuClassFilter || String(s.school_class_id?._id || s.school_class_id) === stuClassFilter;
      return matchSearch && matchClass;
    });
  }, [students, stuSearch, stuClassFilter]);

  // Filtered parents for list
  const filteredParents = useMemo(() => {
    if (!search) return parents;
    const q = search.toLowerCase();
    return parents.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q)
    );
  }, [parents, search]);

  const totalLinked = parents.reduce((s, p) => s + (p.student_ids?.length || 0), 0);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-600 flex items-center justify-center shadow">
            <UserCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Parents</h1>
            <p className="text-sm text-slate-500">Manage parent accounts and link children</p>
          </div>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-teal-700 transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Add Parent
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="text-2xl font-bold text-teal-600">{parents.length}</div>
          <div className="text-xs text-slate-500 font-semibold mt-0.5">Total Parents</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="text-2xl font-bold text-indigo-600">{totalLinked}</div>
          <div className="text-xs text-slate-500 font-semibold mt-0.5">Children Linked</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="text-2xl font-bold text-slate-500">
            {parents.filter(p => !p.student_ids?.length).length}
          </div>
          <div className="text-xs text-slate-500 font-semibold mt-0.5">No Children Linked</div>
        </div>
      </div>

      {/* Search + List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 p-4 border-b border-slate-100">
          <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 flex-1 max-w-xs border border-slate-200">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search parent name or email…"
              className="bg-transparent outline-none text-sm text-slate-700 flex-1" />
          </div>
          <button onClick={load} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="text-xs text-slate-400 font-semibold ml-auto">
            {filteredParents.length} of {parents.length}
          </div>
        </div>

        {filteredParents.length === 0 ? (
          <div className="text-center py-16">
            <UserCheck className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <div className="text-slate-400 font-semibold">
              {parents.length === 0 ? 'No parent accounts yet' : 'No results found'}
            </div>
            {parents.length === 0 && (
              <button onClick={openAdd} className="mt-4 bg-teal-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-teal-700 text-sm transition-colors">
                Add First Parent
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Parent</th>
                  <th className="text-left px-5 py-3">Contact</th>
                  <th className="text-left px-5 py-3">Children</th>
                  <th className="text-right px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredParents.map(p => (
                  <tr key={p._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm shrink-0">
                          {(p.name || '').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800">{p.name}</div>
                          <div className="text-xs text-slate-400">{p.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {p.phone ? (
                        <span className="flex items-center gap-1.5 text-slate-600">
                          <Phone className="w-3.5 h-3.5 text-slate-400" /> {p.phone}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {(p.student_ids || []).length === 0 ? (
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full font-semibold">
                          No children linked
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {(p.student_ids || []).map(s => (
                            <span key={s._id || s}
                              className="flex items-center gap-1 text-xs bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full font-medium border border-teal-100">
                              <GraduationCap className="w-3 h-3" />
                              {s.full_name || 'Student'}
                              {s.roll_number && <span className="text-teal-400">#{s.roll_number}</span>}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(p)}
                          className="p-1.5 hover:bg-teal-50 rounded-lg text-slate-400 hover:text-teal-600 transition-colors" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(p._id)}
                          className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── CREDENTIALS MODAL ─────────────────────────────── */}
      {creds && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-7 h-7 text-teal-600" />
            </div>
            <h2 className="font-bold text-slate-800 text-lg mb-1">Parent Account Created</h2>
            <p className="text-slate-500 text-sm mb-5">
              Share these login credentials with the parent.<br />
              <strong className="text-red-500">Password will not be shown again.</strong>
            </p>
            <div className="bg-slate-50 rounded-xl p-4 text-left space-y-3 mb-5 border border-slate-200">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Login Portal</div>
                <div className="text-sm font-semibold text-teal-600">
                  {window.location.origin}/parent-login
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Email</div>
                  <div className="font-mono font-semibold text-slate-700 text-sm">{creds.email}</div>
                </div>
                <button onClick={() => { navigator.clipboard.writeText(creds.email); toast.success('Email copied!'); }}
                  className="text-slate-400 hover:text-teal-600 transition-colors p-1">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Password</div>
                  <div className="font-mono font-bold text-slate-800 text-base tracking-wider">{creds.password}</div>
                </div>
                <button onClick={() => { navigator.clipboard.writeText(creds.password); toast.success('Password copied!'); }}
                  className="text-slate-400 hover:text-teal-600 transition-colors p-1">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            <button
              onClick={() => {
                const text = `Parent Portal Login\nURL: ${window.location.origin}/parent-login\nEmail: ${creds.email}\nPassword: ${creds.password}`;
                navigator.clipboard.writeText(text);
                toast.success('All credentials copied!');
              }}
              className="w-full mb-3 border border-teal-200 text-teal-700 py-2.5 rounded-xl font-semibold hover:bg-teal-50 text-sm transition-colors flex items-center justify-center gap-2">
              <Copy className="w-4 h-4" /> Copy All
            </button>
            <button onClick={() => setCreds(null)}
              className="w-full bg-teal-600 text-white py-2.5 rounded-xl font-semibold hover:bg-teal-700 transition-colors">
              Done
            </button>
          </div>
        </div>
      )}

      {/* ─── ADD / EDIT FORM MODAL ─────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="font-bold text-slate-800 text-lg">{editing ? 'Edit Parent' : 'Add Parent'}</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {editing ? 'Update details and linked children' : 'Create account and link children'}
                </p>
              </div>
              <button onClick={() => setShowForm(false)}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 space-y-4">

                {/* Parent Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Full Name *</label>
                    <input
                      required value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className={inputCls} placeholder="e.g. Muhammad Ali" />
                  </div>
                  <div>
                    <label className={labelCls}>Phone Number</label>
                    <div className="relative">
                      <input
                        type="tel" value={form.phone}
                        onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                        className={inputCls} placeholder="03XX-XXXXXXX" />
                      {phoneSearching && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="w-4 h-4 border-2 border-teal-200 border-t-teal-600 rounded-full animate-spin"/>
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Enter phone to auto-find enrolled children from this family.
                    </p>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Email Address {!editing && '*'}</label>
                  <input
                    type="email" value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    required={!editing} disabled={!!editing}
                    className={`${inputCls} ${editing ? 'opacity-60 cursor-not-allowed' : ''}`}
                    placeholder="parent@example.com" />
                  {editing
                    ? <p className="text-xs text-slate-400 mt-1">Email cannot be changed after account creation.</p>
                    : <p className="text-xs text-slate-400 mt-1">A secure password will be auto-generated and shown once.</p>}
                </div>

                {/* ── Phone-matched children panel ── */}
                {phoneMatches.length > 0 && (
                  <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="w-4 h-4 text-teal-600"/>
                      <span className="text-xs font-bold text-teal-700 uppercase tracking-wide">
                        {phoneMatches.length} Child{phoneMatches.length > 1 ? 'ren' : ''} Found by Phone
                      </span>
                      <span className="ml-auto text-[10px] bg-teal-200 text-teal-800 font-bold px-2 py-0.5 rounded-full">
                        Auto-linked ✓
                      </span>
                    </div>
                    <div className="space-y-2">
                      {phoneMatches.map(s => (
                        <div key={s._id} className="flex items-center gap-3 bg-white rounded-xl px-3 py-2.5 border border-teal-100">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                            {s.full_name?.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate">{s.full_name}</p>
                            <p className="text-[10px] text-slate-500">
                              {s.roll_number}
                              {s.school_class_id && ` · ${s.school_class_id.name}–${s.school_class_id.section || 'A'}`}
                            </p>
                          </div>
                          <span className="text-[10px] font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full shrink-0">Linked ✓</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Link Children */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={labelCls}>Link Children (Students)</label>
                    {form.student_ids.length > 0 && (
                      <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-bold">
                        {form.student_ids.length} selected
                      </span>
                    )}
                  </div>

                  {/* Search & Filter for students */}
                  <div className="flex gap-2 mb-3">
                    <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 flex-1 border border-slate-200">
                      <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <input
                        value={stuSearch} onChange={e => setStuSearch(e.target.value)}
                        placeholder="Search name or roll no…"
                        className="bg-transparent outline-none text-sm text-slate-700 flex-1" />
                      {stuSearch && (
                        <button type="button" onClick={() => setStuSearch('')} className="text-slate-300 hover:text-slate-500">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <select
                      value={stuClassFilter} onChange={e => setStuClassFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-teal-400 min-w-[120px]">
                      <option value="">All Classes</option>
                      {classes.map(c => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Student list */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    {students.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 text-sm">
                        <GraduationCap className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                        No students found. Add students first.
                      </div>
                    ) : filteredStudents.length === 0 ? (
                      <div className="p-4 text-center text-slate-400 text-sm">
                        No students match your search.
                      </div>
                    ) : (
                      <div className="max-h-56 overflow-y-auto divide-y divide-slate-50">
                        {filteredStudents.map(s => {
                          const isSelected = form.student_ids.includes(s._id);
                          const className = classes.find(c => c._id === String(s.school_class_id?._id || s.school_class_id))?.name;
                          return (
                            <label key={s._id}
                              className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                                isSelected ? 'bg-teal-50' : 'hover:bg-slate-50'
                              }`}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleStudent(s._id)}
                                className="w-4 h-4 rounded accent-teal-600" />
                              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">
                                {(s.full_name || '').charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className={`text-sm font-semibold truncate ${isSelected ? 'text-teal-700' : 'text-slate-700'}`}>
                                  {s.full_name}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {s.roll_number && (
                                    <span className="flex items-center gap-0.5 text-[10px] text-slate-400 font-mono">
                                      <Hash className="w-2.5 h-2.5" />{s.roll_number}
                                    </span>
                                  )}
                                  {className && (
                                    <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">
                                      {className}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {isSelected && (
                                <CheckCircle className="w-4 h-4 text-teal-500 shrink-0" />
                              )}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Selected chips */}
                  {form.student_ids.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {form.student_ids.map(id => {
                        const s = students.find(st => st._id === id);
                        if (!s) return null;
                        return (
                          <span key={id}
                            className="flex items-center gap-1.5 text-xs bg-teal-100 text-teal-700 px-2.5 py-1 rounded-full font-medium">
                            {s.full_name}
                            <button type="button" onClick={() => toggleStudent(id)}
                              className="text-teal-400 hover:text-teal-700 transition-colors">
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-5 border-t border-slate-100 flex gap-3 shrink-0">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 text-sm transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-teal-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-teal-700 text-sm disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                  {saving
                    ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving…</>
                    : editing ? 'Update Parent' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
