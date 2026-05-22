import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import {
  Briefcase, Plus, Edit2, Trash2, Eye, RefreshCw, X, ChevronDown, ChevronUp,
  MessageCircle, FileText, CheckCircle2, Clock, AlertCircle, Send,
  Building2, Phone, Mail, Globe, MapPin, Tag, User, Copy, Check,
  AlertTriangle, LayoutGrid, ListFilter,
} from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n) => `Rs. ${Number(n || 0).toLocaleString()}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtTime = (d) => {
  if (!d) return '';
  const date = new Date(d);
  const diff = Date.now() - date;
  if (diff < 60000)    return 'just now';
  if (diff < 3600000)  return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return date.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
  return date.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
};

const STATUS_COLORS = {
  active:   'bg-emerald-100 text-emerald-700',
  inactive: 'bg-slate-100 text-slate-600',
  prospect: 'bg-blue-100 text-blue-700',
};
const PROJ_STATUS_COLORS = {
  planning:    'bg-slate-100 text-slate-600',
  in_progress: 'bg-blue-100 text-blue-700',
  review:      'bg-violet-100 text-violet-700',
  completed:   'bg-emerald-100 text-emerald-700',
  on_hold:     'bg-amber-100 text-amber-700',
};
const INV_STATUS_COLORS = {
  draft:   'bg-slate-100 text-slate-600',
  sent:    'bg-blue-100 text-blue-700',
  partial: 'bg-amber-100 text-amber-700',
  paid:    'bg-emerald-100 text-emerald-700',
  overdue: 'bg-rose-100 text-rose-700',
};
const MS_STATUS_ICONS = { pending: Clock, in_progress: AlertCircle, completed: CheckCircle2 };

// ── Reusable components ───────────────────────────────────────────────────────

const Input = ({ label, value, onChange, type = 'text', required }) => (
  <div>
    <label className="block text-xs font-bold text-slate-500 mb-1">{label}{required && ' *'}</label>
    <input type={type} value={value} onChange={e => onChange(e.target.value)} required={required}
      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-amber-400"/>
  </div>
);

const Select = ({ label, value, onChange, options }) => (
  <div>
    <label className="block text-xs font-bold text-slate-500 mb-1">{label}</label>
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-amber-400 bg-white">
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return (
    <button onClick={copy} className="ml-1 text-slate-400 hover:text-amber-600 transition-colors">
      {copied ? <Check size={13} className="text-emerald-500"/> : <Copy size={13}/>}
    </button>
  );
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${wide ? 'max-w-4xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto`}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-extrabold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={20}/></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ── Client Form ───────────────────────────────────────────────────────────────

function ClientForm({ initial = {}, onSave, onClose, loading }) {
  const [form, setForm] = useState({
    company_name: initial.company_name || '', contact_person: initial.contact_person || '',
    email: initial.email || '', phone: initial.phone || '',
    address: initial.address || '', city: initial.city || '',
    industry: initial.industry || '', website: initial.website || '',
    status: initial.status || 'active', notes: initial.notes || '', source: initial.source || '',
  });
  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Company Name" value={form.company_name} onChange={set('company_name')} required/>
        <Input label="Contact Person" value={form.contact_person} onChange={set('contact_person')} required/>
        <Input label="Email" value={form.email} onChange={set('email')} type="email" required/>
        <Input label="Phone" value={form.phone} onChange={set('phone')}/>
        <Input label="City" value={form.city} onChange={set('city')}/>
        <Input label="Industry" value={form.industry} onChange={set('industry')}/>
        <Input label="Website" value={form.website} onChange={set('website')}/>
        <Input label="Source" value={form.source} onChange={set('source')}/>
        <Select label="Status" value={form.status} onChange={set('status')} options={[
          { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'prospect', label: 'Prospect' },
        ]}/>
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-500 mb-1">Address</label>
        <textarea value={form.address} onChange={e => set('address')(e.target.value)} rows={2}
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400 resize-none"/>
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-500 mb-1">Notes (internal)</label>
        <textarea value={form.notes} onChange={e => set('notes')(e.target.value)} rows={2}
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400 resize-none"/>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onClose}
          className="px-4 py-2 rounded-xl text-sm font-bold text-slate-500 border border-slate-200 hover:bg-slate-50">Cancel</button>
        <button type="submit" disabled={loading}
          className="px-5 py-2 rounded-xl text-sm font-bold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50">
          {loading ? 'Saving…' : 'Save Client'}
        </button>
      </div>
    </form>
  );
}

// ── Project Form (with staff assignment) ─────────────────────────────────────

function ProjectForm({ clients, staffList, initial = {}, onSave, onClose, loading }) {
  const [form, setForm] = useState({
    client_id:   initial.client_id?._id || initial.client_id || '',
    title:       initial.title || '',
    description: initial.description || '',
    service_type: initial.service_type || '',
    status:      initial.status || 'planning',
    priority:    initial.priority || 'medium',
    start_date:  initial.start_date ? initial.start_date.split('T')[0] : '',
    deadline:    initial.deadline   ? initial.deadline.split('T')[0]   : '',
    budget:      initial.budget || '',
    currency:    initial.currency || 'PKR',
    client_notes:   initial.client_notes   || '',
    internal_notes: initial.internal_notes || '',
    is_visible_to_client: initial.is_visible_to_client !== false,
  });
  const [selectedStaff, setSelectedStaff] = useState(
    (initial.assigned_to || []).map(u => u._id || u)
  );
  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  const toggleStaff = (id) => setSelectedStaff(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  );

  return (
    <form onSubmit={e => { e.preventDefault(); onSave({ ...form, assigned_to: selectedStaff }); }} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Select label="Client *" value={form.client_id} onChange={set('client_id')} options={[
            { value: '', label: '— Select client —' },
            ...clients.map(c => ({ value: c._id, label: c.company_name })),
          ]}/>
        </div>
        <div className="md:col-span-2"><Input label="Project Title *" value={form.title} onChange={set('title')} required/></div>
        <Input label="Service Type" value={form.service_type} onChange={set('service_type')}/>
        <Select label="Status" value={form.status} onChange={set('status')} options={[
          { value: 'planning', label: 'Planning' }, { value: 'in_progress', label: 'In Progress' },
          { value: 'review', label: 'Review' }, { value: 'completed', label: 'Completed' }, { value: 'on_hold', label: 'On Hold' },
        ]}/>
        <Select label="Priority" value={form.priority} onChange={set('priority')} options={[
          { value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }, { value: 'urgent', label: 'Urgent' },
        ]}/>
        <Select label="Currency" value={form.currency} onChange={set('currency')} options={[
          { value: 'PKR', label: 'PKR' }, { value: 'USD', label: 'USD' },
        ]}/>
        <Input label="Budget" value={form.budget} onChange={set('budget')} type="number"/>
        <Input label="Start Date" value={form.start_date} onChange={set('start_date')} type="date"/>
        <Input label="Deadline"   value={form.deadline}   onChange={set('deadline')}   type="date"/>
      </div>

      {/* Assigned staff */}
      {staffList.length > 0 && (
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-2">Assign Team Members</label>
          <div className="flex flex-wrap gap-2">
            {staffList.map(s => (
              <button key={s._id} type="button" onClick={() => toggleStaff(s._id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  selectedStaff.includes(s._id)
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}>
                <User size={11}/> {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-xs font-bold text-slate-500 mb-1">Description</label>
        <textarea value={form.description} onChange={e => set('description')(e.target.value)} rows={2}
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400 resize-none"/>
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-500 mb-1">Client Notes <span className="font-normal text-slate-400">(visible to client)</span></label>
        <textarea value={form.client_notes} onChange={e => set('client_notes')(e.target.value)} rows={2}
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400 resize-none"/>
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-500 mb-1">Internal Notes <span className="font-normal text-slate-400">(staff only)</span></label>
        <textarea value={form.internal_notes} onChange={e => set('internal_notes')(e.target.value)} rows={2}
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400 resize-none"/>
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={form.is_visible_to_client} onChange={e => set('is_visible_to_client')(e.target.checked)}
          className="rounded text-amber-600"/>
        <span className="font-medium text-slate-700">Visible to client in their portal</span>
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onClose}
          className="px-4 py-2 rounded-xl text-sm font-bold text-slate-500 border border-slate-200 hover:bg-slate-50">Cancel</button>
        <button type="submit" disabled={loading}
          className="px-5 py-2 rounded-xl text-sm font-bold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50">
          {loading ? 'Saving…' : 'Save Project'}
        </button>
      </div>
    </form>
  );
}

// ── Invoice Form ──────────────────────────────────────────────────────────────

function InvoiceForm({ clients, projects, initial = {}, onSave, onClose, loading }) {
  const [form, setForm] = useState({
    client_id:  initial.client_id?._id  || initial.client_id  || '',
    project_id: initial.project_id?._id || initial.project_id || '',
    title: initial.title || '', notes: initial.notes || '',
    tax_pct: initial.tax_pct || 0,
    due_date: initial.due_date ? initial.due_date.split('T')[0] : '',
  });
  const [items, setItems] = useState(initial.items?.length ? initial.items : [{ description: '', quantity: 1, unit_price: '' }]);
  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  const updateItem = (i, k, v) => setItems(arr => arr.map((it, idx) => idx === i ? { ...it, [k]: v } : it));
  const addItem    = () => setItems(arr => [...arr, { description: '', quantity: 1, unit_price: '' }]);
  const removeItem = i => setItems(arr => arr.filter((_, idx) => idx !== i));

  const subtotal  = items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0);
  const taxAmount = Math.round(subtotal * (Number(form.tax_pct) || 0) / 100);
  const total     = subtotal + taxAmount;

  const filteredProjects = projects.filter(p => !form.client_id || p.client_id?._id === form.client_id || p.client_id === form.client_id);

  return (
    <form onSubmit={e => { e.preventDefault(); onSave({ ...form, items }); }} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select label="Client *" value={form.client_id} onChange={set('client_id')} options={[
          { value: '', label: '— Select client —' },
          ...clients.map(c => ({ value: c._id, label: c.company_name })),
        ]}/>
        <Select label="Project (optional)" value={form.project_id} onChange={set('project_id')} options={[
          { value: '', label: '— No project —' },
          ...filteredProjects.map(p => ({ value: p._id, label: p.title })),
        ]}/>
        <div className="md:col-span-2"><Input label="Invoice Title *" value={form.title} onChange={set('title')} required/></div>
        <Input label="Due Date" value={form.due_date} onChange={set('due_date')} type="date"/>
        <Input label="Tax %" value={form.tax_pct} onChange={set('tax_pct')} type="number"/>
      </div>

      <div>
        <p className="text-xs font-bold text-slate-500 mb-2">Line Items</p>
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input value={it.description} onChange={e => updateItem(i, 'description', e.target.value)}
                placeholder="Description" className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"/>
              <input value={it.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} type="number" min="1"
                placeholder="Qty" className="w-16 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400 text-center"/>
              <input value={it.unit_price} onChange={e => updateItem(i, 'unit_price', e.target.value)} type="number" min="0"
                placeholder="Price" className="w-28 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400 text-right"/>
              <span className="text-xs text-slate-500 w-24 text-right">
                {`Rs. ${((Number(it.quantity) || 0) * (Number(it.unit_price) || 0)).toLocaleString()}`}
              </span>
              {items.length > 1 && (
                <button type="button" onClick={() => removeItem(i)} className="text-slate-300 hover:text-rose-500"><X size={14}/></button>
              )}
            </div>
          ))}
        </div>
        <button type="button" onClick={addItem}
          className="mt-2 text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1">
          <Plus size={13}/> Add Item
        </button>
      </div>

      <div className="bg-slate-50 rounded-xl p-3 text-sm space-y-1">
        <div className="flex justify-between text-slate-500"><span>Subtotal</span><span className="font-bold">{fmt(subtotal)}</span></div>
        {form.tax_pct > 0 && <div className="flex justify-between text-slate-500"><span>Tax ({form.tax_pct}%)</span><span className="font-bold">{fmt(taxAmount)}</span></div>}
        <div className="flex justify-between font-extrabold text-slate-800 text-base border-t border-slate-200 pt-1"><span>Total</span><span>{fmt(total)}</span></div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-500 mb-1">Notes</label>
        <textarea value={form.notes} onChange={e => set('notes')(e.target.value)} rows={2}
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400 resize-none"/>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onClose}
          className="px-4 py-2 rounded-xl text-sm font-bold text-slate-500 border border-slate-200 hover:bg-slate-50">Cancel</button>
        <button type="submit" disabled={loading}
          className="px-5 py-2 rounded-xl text-sm font-bold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50">
          {loading ? 'Saving…' : 'Save Invoice'}
        </button>
      </div>
    </form>
  );
}

// ── Messages Panel ────────────────────────────────────────────────────────────

function MessagesPanel({ clientId }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = useCallback(() => {
    api.get(`/clients/${clientId}/messages`).then(r => setMessages(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const res = await api.post(`/clients/${clientId}/messages`, { message: text.trim() });
      setMessages(prev => [...prev, res.data]);
      setText('');
    } catch { /* silent */ } finally { setSending(false); }
  };

  if (loading) return <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="flex flex-col" style={{ height: '420px' }}>
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 mb-3">
        {messages.length === 0 && <p className="text-center text-slate-400 text-sm py-8">No messages yet. Start the conversation.</p>}
        {messages.map(msg => {
          const isStaff = msg.sender_type === 'staff';
          return (
            <div key={msg._id} className={`flex ${isStaff ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                isStaff ? 'bg-amber-600 text-white rounded-tr-sm' : 'bg-slate-100 text-slate-800 rounded-tl-sm'
              }`}>
                {!isStaff && <p className="text-[10px] font-bold text-slate-500 mb-0.5">Client</p>}
                {msg.message}
                <p className={`text-[10px] mt-0.5 ${isStaff ? 'text-amber-200' : 'text-slate-400'}`}>{fmtTime(msg.createdAt)}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2">
        <textarea value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }}}
          placeholder="Reply to client… (Enter to send)" rows={2}
          className="flex-1 resize-none border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"/>
        <button onClick={send} disabled={!text.trim() || sending}
          className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center hover:bg-amber-700 disabled:opacity-40 self-end">
          <Send size={15}/>
        </button>
      </div>
    </div>
  );
}

// ── Milestones Panel ──────────────────────────────────────────────────────────

function MilestonesPanel({ project, onProjectUpdate }) {
  const [adding, setAdding] = useState(false);
  const [msForm, setMsForm] = useState({ title: '', due_date: '' });
  const [saving, setSaving] = useState(false);

  const addMs = async (e) => {
    e.preventDefault();
    if (!msForm.title.trim()) return;
    setSaving(true);
    try {
      const res = await api.post(`/clients/projects/${project._id}/milestones`, msForm);
      onProjectUpdate(res.data);
      setMsForm({ title: '', due_date: '' });
      setAdding(false);
    } catch { /* silent */ } finally { setSaving(false); }
  };

  const updateMs = async (msId, status) => {
    try {
      const res = await api.put(`/clients/projects/${project._id}/milestones/${msId}`, { status });
      onProjectUpdate(res.data);
    } catch { /* silent */ }
  };

  const deleteMs = async (msId) => {
    if (!confirm('Delete milestone?')) return;
    try {
      const res = await api.delete(`/clients/projects/${project._id}/milestones/${msId}`);
      onProjectUpdate(res.data);
    } catch { /* silent */ }
  };

  const calcProgress = (proj) => {
    const ms = proj.milestones || [];
    if (!ms.length) return proj.progress_pct || 0;
    return Math.round((ms.filter(m => m.status === 'completed').length / ms.length) * 100);
  };

  const pct = calcProgress(project);

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct === 100 ? '#10b981' : '#f59e0b' }}/>
        </div>
        <span className="text-sm font-extrabold text-amber-600 flex-shrink-0">{pct}%</span>
      </div>
      <div className="space-y-2 mb-3">
        {(project.milestones || []).length === 0 && <p className="text-xs text-slate-400">No milestones yet.</p>}
        {(project.milestones || []).map(ms => {
          const Icon = MS_STATUS_ICONS[ms.status] || Clock;
          return (
            <div key={ms._id} className="flex items-center gap-2">
              <Icon size={14} className={ms.status === 'completed' ? 'text-emerald-500' : ms.status === 'in_progress' ? 'text-blue-500' : 'text-slate-400'}/>
              <span className={`flex-1 text-sm ${ms.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-700'}`}>{ms.title}</span>
              {ms.client_approved && <span className="text-xs text-emerald-600 font-bold">✓ Approved</span>}
              {ms.due_date && <span className="text-xs text-slate-400">{fmtDate(ms.due_date)}</span>}
              <select value={ms.status} onChange={e => updateMs(ms._id, e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-1 py-0.5 focus:outline-none bg-white">
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Done</option>
              </select>
              <button onClick={() => deleteMs(ms._id)} className="text-slate-300 hover:text-rose-500"><Trash2 size={13}/></button>
            </div>
          );
        })}
      </div>
      {adding ? (
        <form onSubmit={addMs} className="border border-dashed border-amber-300 rounded-xl p-3 space-y-2">
          <input value={msForm.title} onChange={e => setMsForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Milestone title *" className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-amber-400"/>
          <div className="flex gap-2">
            <input value={msForm.due_date} onChange={e => setMsForm(f => ({ ...f, due_date: e.target.value }))} type="date"
              className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-amber-400"/>
            <button type="submit" disabled={saving}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50">
              {saving ? '…' : 'Add'}
            </button>
            <button type="button" onClick={() => setAdding(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 border border-slate-200 hover:bg-slate-50">Cancel</button>
          </div>
        </form>
      ) : (
        <button onClick={() => setAdding(true)} className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1">
          <Plus size={12}/> Add Milestone
        </button>
      )}
    </div>
  );
}

// ── Client Detail Modal ───────────────────────────────────────────────────────

function ClientDetailModal({ client, staffList, onClose }) {
  const [tab, setTab] = useState('overview');
  const [projects, setProjects] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [showAddProject, setShowAddProject] = useState(false);
  const [showAddInvoice, setShowAddInvoice] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [expandedProject, setExpandedProject] = useState(null);
  const [creds, setCreds] = useState(null);
  const [sendingInvoice, setSendingInvoice] = useState(null);

  const load = useCallback(() => {
    setLoadingDetail(true);
    api.get(`/clients/${client._id}`)
      .then(r => { setProjects(r.data.projects || []); setInvoices(r.data.invoices || []); })
      .catch(() => {})
      .finally(() => setLoadingDetail(false));
  }, [client._id]);

  useEffect(() => { load(); }, [load]);

  const resetCreds = async () => {
    if (!confirm('Reset client login credentials? A new password will be emailed to the client.')) return;
    try {
      const res = await api.get(`/clients/${client._id}/credentials`);
      setCreds(res.data);
    } catch { alert('Failed to reset credentials'); }
  };

  const saveProject = async (form) => {
    if (!form.client_id) form.client_id = client._id;
    setFormLoading(true);
    try {
      if (editProject) {
        const res = await api.put(`/clients/projects/${editProject._id}`, form);
        setProjects(p => p.map(x => x._id === res.data._id ? res.data : x));
      } else {
        const res = await api.post('/clients/projects', { ...form, client_id: client._id });
        setProjects(p => [res.data, ...p]);
      }
      setShowAddProject(false); setEditProject(null);
    } catch { /* silent */ } finally { setFormLoading(false); }
  };

  const deleteProject = async (pid) => {
    if (!confirm('Delete this project and all its milestones?')) return;
    try { await api.delete(`/clients/projects/${pid}`); setProjects(p => p.filter(x => x._id !== pid)); }
    catch { /* silent */ }
  };

  const saveInvoice = async (form) => {
    if (!form.client_id) form.client_id = client._id;
    setFormLoading(true);
    try {
      const res = await api.post('/clients/invoices', { ...form, client_id: client._id });
      setInvoices(inv => [res.data, ...inv]);
      setShowAddInvoice(false);
    } catch { /* silent */ } finally { setFormLoading(false); }
  };

  const updateInvoiceStatus = async (invId, status, paid_amount) => {
    try {
      const res = await api.put(`/clients/invoices/${invId}`, { status, paid_amount });
      setInvoices(inv => inv.map(x => x._id === res.data._id ? res.data : x));
    } catch { /* silent */ }
  };

  const handleSendInvoice = async (invId) => {
    if (!confirm('Send this invoice to the client via email and mark it as sent?')) return;
    setSendingInvoice(invId);
    try {
      const res = await api.post(`/clients/invoices/${invId}/send`);
      setInvoices(inv => inv.map(x => x._id === res.data._id ? res.data : x));
    } catch { alert('Failed to send invoice'); } finally { setSendingInvoice(null); }
  };

  const deleteInvoice = async (invId) => {
    if (!confirm('Delete this invoice?')) return;
    try { await api.delete(`/clients/invoices/${invId}`); setInvoices(inv => inv.filter(x => x._id !== invId)); }
    catch { /* silent */ }
  };

  return (
    <>
      <Modal title={client.company_name} onClose={onClose} wide>
        {/* Tabs */}
        <div className="flex gap-1 mb-5 border-b border-slate-100 -mt-2">
          {['overview', 'projects', 'invoices', 'messages'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-bold capitalize border-b-2 transition-colors ${
                tab === t ? 'border-amber-500 text-amber-700' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}>{t}
            </button>
          ))}
        </div>

        {/* ── Overview ── */}
        {tab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Building2, label: 'Company',   value: client.company_name },
                { icon: User,      label: 'Contact',   value: client.contact_person },
                { icon: Mail,      label: 'Email',     value: client.email },
                { icon: Phone,     label: 'Phone',     value: client.phone },
                { icon: MapPin,    label: 'City',      value: client.city },
                { icon: Globe,     label: 'Website',   value: client.website },
                { icon: Tag,       label: 'Industry',  value: client.industry },
                { icon: Tag,       label: 'Source',    value: client.source },
              ].filter(f => f.value).map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-2">
                  <Icon size={14} className="text-amber-500 flex-shrink-0"/>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{label}</p>
                    <p className="text-sm text-slate-700">{value}</p>
                  </div>
                </div>
              ))}
            </div>
            {client.notes && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                <p className="text-xs font-bold text-amber-700 mb-0.5">Notes</p>
                <p className="text-sm text-amber-900">{client.notes}</p>
              </div>
            )}
            <div className="border-t border-slate-100 pt-4 space-y-2">
              <p className="text-xs font-bold text-slate-500">Portal Access</p>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                Email: <strong>{client.email}</strong><CopyBtn text={client.email}/>
              </div>
              {creds && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm space-y-1">
                  <p className="font-bold text-emerald-700">New credentials emailed to client</p>
                  <p>Email: <strong>{creds.email}</strong> <CopyBtn text={creds.email}/></p>
                  <p>Password: <strong>{creds.password}</strong> <CopyBtn text={creds.password}/></p>
                </div>
              )}
              <button onClick={resetCreds}
                className="flex items-center gap-1.5 text-xs font-bold text-rose-500 hover:text-rose-700 border border-rose-200 rounded-xl px-3 py-1.5 hover:bg-rose-50">
                <RefreshCw size={13}/> Reset & Email New Password
              </button>
            </div>
          </div>
        )}

        {/* ── Projects ── */}
        {tab === 'projects' && !loadingDetail && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-sm font-bold text-slate-600">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
              <button onClick={() => { setEditProject(null); setShowAddProject(true); }}
                className="flex items-center gap-1.5 text-xs font-bold bg-amber-600 text-white px-3 py-1.5 rounded-xl hover:bg-amber-700">
                <Plus size={13}/> New Project
              </button>
            </div>
            {projects.length === 0 && <p className="text-center text-slate-400 py-8 text-sm">No projects yet.</p>}
            {projects.map(proj => (
              <div key={proj._id} className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${PROJ_STATUS_COLORS[proj.status]}`}>
                        {proj.status?.replace('_', ' ')}
                      </span>
                      {proj.assigned_to?.length > 0 && (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <User size={10}/> {proj.assigned_to.map(u => u.name || u).join(', ')}
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-slate-800 text-sm truncate">{proj.title}</p>
                    {proj.deadline && <p className="text-xs text-slate-400">Due: {fmtDate(proj.deadline)}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => { setEditProject(proj); setShowAddProject(true); }}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-amber-100 flex items-center justify-center text-slate-500 hover:text-amber-700">
                      <Edit2 size={13}/>
                    </button>
                    <button onClick={() => deleteProject(proj._id)}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-rose-100 flex items-center justify-center text-slate-500 hover:text-rose-600">
                      <Trash2 size={13}/>
                    </button>
                    <button onClick={() => setExpandedProject(expandedProject === proj._id ? null : proj._id)}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500">
                      {expandedProject === proj._id ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
                    </button>
                  </div>
                </div>
                {expandedProject === proj._id && (
                  <div className="border-t border-slate-100 bg-slate-50 p-4">
                    <MilestonesPanel project={proj} onProjectUpdate={updated =>
                      setProjects(p => p.map(x => x._id === updated._id ? updated : x))
                    }/>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Invoices ── */}
        {tab === 'invoices' && !loadingDetail && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-sm font-bold text-slate-600">{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</p>
              <button onClick={() => setShowAddInvoice(true)}
                className="flex items-center gap-1.5 text-xs font-bold bg-amber-600 text-white px-3 py-1.5 rounded-xl hover:bg-amber-700">
                <Plus size={13}/> New Invoice
              </button>
            </div>
            {invoices.length === 0 && <p className="text-center text-slate-400 py-8 text-sm">No invoices yet.</p>}
            {invoices.map(inv => (
              <div key={inv._id} className={`border rounded-xl p-4 ${inv.status === 'overdue' ? 'border-rose-200 bg-rose-50/30' : 'border-slate-200'}`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${INV_STATUS_COLORS[inv.status]}`}>{inv.status}</span>
                      <span className="text-xs text-slate-400">{inv.invoice_no}</span>
                      {inv.status === 'overdue' && <AlertTriangle size={12} className="text-rose-500"/>}
                    </div>
                    <p className="font-bold text-slate-800 text-sm truncate">{inv.title}</p>
                    <div className="flex gap-3 text-xs text-slate-400 mt-0.5">
                      <span className="font-bold text-slate-600">{fmt(inv.total)}</span>
                      {inv.paid_amount > 0 && <span className="text-emerald-600">Paid: {fmt(inv.paid_amount)}</span>}
                      {inv.due_date && <span>Due: {fmtDate(inv.due_date)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Send invoice button */}
                    {(inv.status === 'draft' || inv.status === 'sent') && (
                      <button onClick={() => handleSendInvoice(inv._id)}
                        disabled={sendingInvoice === inv._id}
                        title="Send invoice email to client"
                        className="flex items-center gap-1 text-xs font-bold bg-blue-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                        <Send size={11}/> {sendingInvoice === inv._id ? '…' : 'Send'}
                      </button>
                    )}
                    <select value={inv.status} onChange={e => updateInvoiceStatus(inv._id, e.target.value, inv.paid_amount)}
                      className="text-xs border border-slate-200 rounded-lg px-1.5 py-1 focus:outline-none bg-white">
                      {['draft','sent','partial','paid','overdue'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {inv.status === 'partial' && (
                      <input type="number" defaultValue={inv.paid_amount}
                        onBlur={e => updateInvoiceStatus(inv._id, inv.status, Number(e.target.value))}
                        className="w-24 text-xs border border-slate-200 rounded-lg px-1.5 py-1 focus:outline-none" placeholder="Paid amt"/>
                    )}
                    <button onClick={() => deleteInvoice(inv._id)}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-rose-100 flex items-center justify-center text-slate-400 hover:text-rose-600">
                      <Trash2 size={13}/>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Messages ── */}
        {tab === 'messages' && <MessagesPanel clientId={client._id}/>}
      </Modal>

      {showAddProject && (
        <Modal title={editProject ? 'Edit Project' : 'New Project'} onClose={() => { setShowAddProject(false); setEditProject(null); }}>
          <ProjectForm clients={[client]} staffList={staffList}
            initial={editProject || { client_id: client._id }}
            onSave={saveProject} onClose={() => { setShowAddProject(false); setEditProject(null); }} loading={formLoading}/>
        </Modal>
      )}
      {showAddInvoice && (
        <Modal title="New Invoice" onClose={() => setShowAddInvoice(false)}>
          <InvoiceForm clients={[client]} projects={projects} initial={{ client_id: client._id }}
            onSave={saveInvoice} onClose={() => setShowAddInvoice(false)} loading={formLoading}/>
        </Modal>
      )}
    </>
  );
}

// ── Global All Projects tab ───────────────────────────────────────────────────

function AllProjectsTab({ clients, staffList }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    api.get('/clients/projects').then(r => setProjects(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? projects : projects.filter(p => p.status === filter);

  const saveProject = async (form) => {
    setFormLoading(true);
    try {
      const res = await api.post('/clients/projects', form);
      setProjects(p => [res.data, ...p]);
      setShowAdd(false);
    } catch { /* silent */ } finally { setFormLoading(false); }
  };

  const updateStatus = async (pid, status) => {
    try {
      const res = await api.put(`/clients/projects/${pid}`, { status });
      setProjects(p => p.map(x => x._id === res.data._id ? res.data : x));
    } catch { /* silent */ }
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {['all', 'planning', 'in_progress', 'review', 'completed', 'on_hold'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                filter === s ? 'bg-amber-600 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
              }`}>{s === 'all' ? 'All' : s.replace('_', ' ')}</button>
          ))}
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 text-xs font-bold bg-amber-600 text-white px-3 py-2 rounded-xl hover:bg-amber-700">
          <Plus size={13}/> New Project
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
          <Briefcase size={36} className="text-slate-200 mx-auto mb-3"/>
          <p className="font-bold text-slate-400">No projects found</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase">Project</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase hidden md:table-cell">Client</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Status</th>
                <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase hidden lg:table-cell">Progress</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase hidden lg:table-cell">Deadline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(p => (
                <tr key={p._id} className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <p className="font-bold text-slate-800 text-sm">{p.title}</p>
                    {p.service_type && <p className="text-xs text-slate-400">{p.service_type}</p>}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-sm text-slate-600">
                    {p.client_id?.company_name || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <select value={p.status} onChange={e => updateStatus(p._id, e.target.value)}
                      className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none bg-white capitalize">
                      {['planning','in_progress','review','completed','on_hold'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-center">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${p.progress_pct || 0}%`, background: p.progress_pct === 100 ? '#10b981' : '#f59e0b' }}/>
                      </div>
                      <span className="text-xs font-bold text-slate-500 w-8">{p.progress_pct || 0}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-500">{fmtDate(p.deadline)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <Modal title="New Project" onClose={() => setShowAdd(false)}>
          <ProjectForm clients={clients} staffList={staffList} initial={{}} onSave={saveProject} onClose={() => setShowAdd(false)} loading={formLoading}/>
        </Modal>
      )}
    </div>
  );
}

// ── Global All Invoices tab ───────────────────────────────────────────────────

function AllInvoicesTab({ clients }) {
  const [invoices, setInvoices] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [sendingInvoice, setSendingInvoice] = useState(null);

  useEffect(() => {
    Promise.all([api.get('/clients/invoices'), api.get('/clients/projects')])
      .then(([inv, proj]) => { setInvoices(inv.data); setProjects(proj.data); })
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? invoices : invoices.filter(i => i.status === filter);

  const saveInvoice = async (form) => {
    setFormLoading(true);
    try {
      const res = await api.post('/clients/invoices', form);
      setInvoices(inv => [res.data, ...inv]);
      setShowAdd(false);
    } catch { /* silent */ } finally { setFormLoading(false); }
  };

  const updateStatus = async (invId, status) => {
    try {
      const res = await api.put(`/clients/invoices/${invId}`, { status });
      setInvoices(inv => inv.map(x => x._id === res.data._id ? res.data : x));
    } catch { /* silent */ }
  };

  const handleSend = async (invId) => {
    if (!confirm('Send this invoice to the client via email?')) return;
    setSendingInvoice(invId);
    try {
      const res = await api.post(`/clients/invoices/${invId}/send`);
      setInvoices(inv => inv.map(x => x._id === res.data._id ? res.data : x));
    } catch { alert('Failed to send invoice'); } finally { setSendingInvoice(null); }
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"/></div>;

  const totalPending = invoices.filter(i => ['sent','partial','overdue'].includes(i.status))
    .reduce((s, i) => s + (i.total - i.paid_amount), 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Invoices', value: invoices.length,                                     color: 'bg-slate-100 text-slate-700' },
          { label: 'Pending',        value: invoices.filter(i => i.status === 'sent').length,    color: 'bg-blue-100 text-blue-700' },
          { label: 'Overdue',        value: invoices.filter(i => i.status === 'overdue').length, color: 'bg-rose-100 text-rose-700' },
          { label: 'Total Pending',  value: fmt(totalPending),                                   color: 'bg-amber-100 text-amber-700', small: true },
        ].map(({ label, value, color, small }) => (
          <div key={label} className={`rounded-2xl p-3 text-center ${color}`}>
            <p className={`font-extrabold ${small ? 'text-base' : 'text-2xl'}`}>{value}</p>
            <p className="text-xs font-bold mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {['all', 'draft', 'sent', 'partial', 'paid', 'overdue'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                filter === s ? 'bg-amber-600 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
              }`}>{s}</button>
          ))}
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 text-xs font-bold bg-amber-600 text-white px-3 py-2 rounded-xl hover:bg-amber-700">
          <Plus size={13}/> New Invoice
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
          <FileText size={36} className="text-slate-200 mx-auto mb-3"/>
          <p className="font-bold text-slate-400">No invoices found</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase">Invoice</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase hidden md:table-cell">Client</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase hidden lg:table-cell">Due</th>
                <th className="text-right px-5 py-3 text-xs font-bold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(inv => (
                <tr key={inv._id} className={`hover:bg-slate-50 ${inv.status === 'overdue' ? 'bg-rose-50/30' : ''}`}>
                  <td className="px-5 py-3">
                    <p className="font-bold text-slate-800">{inv.invoice_no}</p>
                    <p className="text-xs text-slate-400 truncate max-w-[160px]">{inv.title}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-sm text-slate-600">
                    {inv.client_id?.company_name || '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="font-bold text-slate-800">{fmt(inv.total)}</p>
                    {inv.paid_amount > 0 && <p className="text-xs text-emerald-600">Paid: {fmt(inv.paid_amount)}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <select value={inv.status} onChange={e => updateStatus(inv._id, e.target.value)}
                      className="text-xs border border-slate-200 rounded-lg px-1.5 py-1 focus:outline-none bg-white">
                      {['draft','sent','partial','paid','overdue'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-500">{fmtDate(inv.due_date)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5 justify-end">
                      {(inv.status === 'draft' || inv.status === 'sent') && (
                        <button onClick={() => handleSend(inv._id)} disabled={sendingInvoice === inv._id}
                          className="flex items-center gap-1 text-xs font-bold bg-blue-600 text-white px-2.5 py-1 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                          <Send size={11}/> {sendingInvoice === inv._id ? '…' : 'Send'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <Modal title="New Invoice" onClose={() => setShowAdd(false)}>
          <InvoiceForm clients={clients} projects={projects} initial={{}} onSave={saveInvoice} onClose={() => setShowAdd(false)} loading={formLoading}/>
        </Modal>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Clients() {
  const [clients, setClients]     = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [unreadMap, setUnreadMap] = useState({});
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [mainTab, setMainTab]     = useState('clients');
  const [showAdd, setShowAdd]     = useState(false);
  const [editClient, setEditClient]   = useState(null);
  const [viewClient, setViewClient]   = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get('/clients'),
      api.get('/clients/staff'),
      api.get('/clients/unread-counts'),
    ]).then(([cl, st, unread]) => {
      setClients(cl.data);
      setStaffList(st.data);
      const map = {};
      (unread.data || []).forEach(u => { map[u._id] = u.count; });
      setUnreadMap(map);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.company_name?.toLowerCase().includes(q) || c.contact_person?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const saveClient = async (form) => {
    setFormLoading(true);
    try {
      if (editClient) {
        const res = await api.put(`/clients/${editClient._id}`, form);
        setClients(c => c.map(x => x._id === res.data._id ? { ...x, ...res.data } : x));
      } else {
        const res = await api.post('/clients', form);
        setClients(c => [{ ...res.data.client, project_count: 0, active_projects: 0, pending_amount: 0 }, ...c]);
        if (res.data.credentials) {
          alert(`Client created! Login credentials have been emailed to the client.\n\nEmail: ${res.data.credentials.email}\nPassword: ${res.data.credentials.password}`);
        }
      }
      setShowAdd(false); setEditClient(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save client');
    } finally { setFormLoading(false); }
  };

  const deleteClient = async (id) => {
    if (!confirm('Delete this client and all their data? This cannot be undone.')) return;
    try { await api.delete(`/clients/${id}`); setClients(c => c.filter(x => x._id !== id)); }
    catch { alert('Failed to delete client'); }
  };

  const totalPending = clients.reduce((s, c) => s + (c.pending_amount || 0), 0);
  const totalUnread  = Object.values(unreadMap).reduce((s, n) => s + n, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
            <Briefcase size={24} className="text-amber-500"/> Clients
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">Manage clients, projects, invoices and communication</p>
        </div>
        <button onClick={() => { setEditClient(null); setShowAdd(true); }}
          className="flex items-center gap-2 bg-amber-600 text-white font-bold px-4 py-2.5 rounded-xl hover:bg-amber-700 transition-colors shadow-sm">
          <Plus size={18}/> New Client
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Clients',    value: clients.length,                                               color: 'bg-slate-100 text-slate-700' },
          { label: 'Active',           value: clients.filter(c => c.status === 'active').length,            color: 'bg-emerald-100 text-emerald-700' },
          { label: 'Active Projects',  value: clients.reduce((s, c) => s + (c.active_projects || 0), 0),   color: 'bg-blue-100 text-blue-700' },
          { label: 'Pending Payments', value: fmt(totalPending),                                            color: 'bg-amber-100 text-amber-700', small: true },
        ].map(({ label, value, color, small }) => (
          <div key={label} className={`rounded-2xl p-4 text-center ${color}`}>
            <p className={`font-extrabold ${small ? 'text-base' : 'text-2xl'}`}>{value}</p>
            <p className="text-xs font-bold mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Main tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {[
          { key: 'clients',  label: 'Clients',      icon: <Building2 size={14}/> },
          { key: 'projects', label: 'All Projects',  icon: <LayoutGrid size={14}/> },
          { key: 'invoices', label: 'All Invoices',  icon: <FileText size={14}/> },
        ].map(t => (
          <button key={t.key} onClick={() => setMainTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold border-b-2 transition-colors ${
              mainTab === t.key ? 'border-amber-500 text-amber-700' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}>
            {t.icon} {t.label}
            {t.key === 'clients' && totalUnread > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">{totalUnread}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Clients tab ── */}
      {mainTab === 'clients' && (
        <>
          <div className="flex flex-wrap gap-3 items-center">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search clients…" className="border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-amber-400 w-64"/>
            <div className="flex gap-1.5">
              {['all', 'active', 'prospect', 'inactive'].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                    statusFilter === s ? 'bg-amber-600 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                  }`}>{s}</button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"/></div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl p-16 text-center border border-slate-100">
              <Building2 size={40} className="text-slate-200 mx-auto mb-3"/>
              <p className="font-bold text-slate-400">No clients found</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase">Company</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase hidden md:table-cell">Contact</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase hidden lg:table-cell">Status</th>
                    <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase hidden md:table-cell">Projects</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase hidden lg:table-cell">Pending</th>
                    <th className="text-right px-5 py-3 text-xs font-bold text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map(c => {
                    const unread = unreadMap[c._id] || 0;
                    return (
                      <tr key={c._id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="relative flex-shrink-0">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-sm font-extrabold text-white">
                                {(c.company_name || '?').charAt(0).toUpperCase()}
                              </div>
                              {unread > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center">
                                  {unread > 9 ? '9+' : unread}
                                </span>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="font-bold text-slate-800">{c.company_name}</p>
                                {c.pending_amount > 0 && (
                                  <AlertTriangle size={12} className="text-amber-500" title="Has pending payments"/>
                                )}
                              </div>
                              <p className="text-xs text-slate-400">{c.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 hidden md:table-cell">
                          <p className="text-slate-700">{c.contact_person}</p>
                          {c.phone && <p className="text-xs text-slate-400">{c.phone}</p>}
                        </td>
                        <td className="px-4 py-4 hidden lg:table-cell">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[c.status] || 'bg-slate-100 text-slate-600'}`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center hidden md:table-cell">
                          <span className="text-sm font-bold text-slate-700">{c.project_count || 0}</span>
                          {c.active_projects > 0 && <span className="text-xs text-blue-600 block">{c.active_projects} active</span>}
                        </td>
                        <td className="px-4 py-4 text-right hidden lg:table-cell">
                          {c.pending_amount > 0
                            ? <span className="text-sm font-bold text-amber-600">{fmt(c.pending_amount)}</span>
                            : <span className="text-sm text-slate-300">—</span>}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5 justify-end">
                            <button onClick={() => setViewClient(c)}
                              className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-amber-100 flex items-center justify-center text-slate-500 hover:text-amber-700 transition-colors">
                              <Eye size={14}/>
                            </button>
                            <button onClick={() => { setEditClient(c); setShowAdd(true); }}
                              className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-blue-100 flex items-center justify-center text-slate-500 hover:text-blue-600 transition-colors">
                              <Edit2 size={14}/>
                            </button>
                            <button onClick={() => deleteClient(c._id)}
                              className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-rose-100 flex items-center justify-center text-slate-500 hover:text-rose-600 transition-colors">
                              <Trash2 size={14}/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── All Projects tab ── */}
      {mainTab === 'projects' && <AllProjectsTab clients={clients} staffList={staffList}/>}

      {/* ── All Invoices tab ── */}
      {mainTab === 'invoices' && <AllInvoicesTab clients={clients}/>}

      {/* Modals */}
      {showAdd && (
        <Modal title={editClient ? `Edit — ${editClient.company_name}` : 'New Client'} onClose={() => { setShowAdd(false); setEditClient(null); }}>
          <ClientForm initial={editClient || {}} onSave={saveClient} onClose={() => { setShowAdd(false); setEditClient(null); }} loading={formLoading}/>
        </Modal>
      )}
      {viewClient && (
        <ClientDetailModal client={viewClient} staffList={staffList} onClose={() => setViewClient(null)}/>
      )}
    </div>
  );
}
