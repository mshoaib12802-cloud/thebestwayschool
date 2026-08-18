import { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import {
  Megaphone, Plus, Edit2, Trash2, X, Search,
  Pin, CheckCircle2, XCircle, Calendar, Filter
} from 'lucide-react';

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-violet-400 focus:bg-white transition-colors';
const labelCls = 'block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1';

const AUDIENCES = ['all', 'students', 'parents', 'teachers', 'staff'];
const AUDIENCE_COLORS = {
  all: 'bg-violet-100 text-violet-700',
  students: 'bg-sky-100 text-sky-700',
  parents: 'bg-pink-100 text-pink-700',
  teachers: 'bg-amber-100 text-amber-700',
  staff: 'bg-emerald-100 text-emerald-700',
};

const initialForm = {
  title: '', body: '', audience: ['all'], is_pinned: false,
  expires_at: '', is_active: true,
};

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterAudience, setFilterAudience] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchAnnouncements(); }, []);
  useEffect(() => {
    document.body.style.overflow = showModal ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showModal]);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/announcements');
      setAnnouncements(data);
    } catch { toast.error('Failed to load announcements'); }
    finally { setLoading(false); }
  };

  const openAdd = () => { setEditId(null); setForm(initialForm); setShowModal(true); };
  const openEdit = (a) => {
    setEditId(a._id);
    setForm({
      title: a.title, body: a.body, audience: a.audience || ['all'],
      is_pinned: a.is_pinned || false,
      expires_at: a.expires_at ? a.expires_at.split('T')[0] : '',
      is_active: a.is_active !== false,
    });
    setShowModal(true);
  };

  const toggleAudience = (aud) => {
    setForm(prev => {
      const has = prev.audience.includes(aud);
      const next = has ? prev.audience.filter(a => a !== aud) : [...prev.audience, aud];
      return { ...prev, audience: next.length === 0 ? ['all'] : next };
    });
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, expires_at: form.expires_at || null };
      if (editId) {
        await api.put(`/announcements/${editId}`, payload);
        toast.success('Announcement updated');
      } else {
        await api.post('/announcements', payload);
        toast.success('Announcement published');
      }
      setShowModal(false);
      fetchAnnouncements();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const deleteAnn = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await api.delete(`/announcements/${id}`);
      toast.success('Deleted');
      fetchAnnouncements();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to delete'); }
  };

  const filtered = announcements.filter(a => {
    const matchSearch = !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.body?.toLowerCase().includes(search.toLowerCase());
    const matchAud = filterAudience === 'all' || (a.audience || []).includes(filterAudience);
    return matchSearch && matchAud;
  }).sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0));

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-violet-600 flex items-center justify-center shadow">
            <Megaphone className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Announcements</h1>
            <p className="text-sm text-slate-500">Notice board for students, parents & staff</p>
          </div>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-violet-700 text-sm shadow">
          <Plus className="w-4 h-4" /> New Announcement
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 flex-1 max-w-xs border border-slate-200">
          <Search className="w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search announcements…"
            className="bg-transparent outline-none text-sm text-slate-700 flex-1" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', ...AUDIENCES.filter(a => a !== 'all')].map(aud => (
            <button key={aud} onClick={() => setFilterAudience(aud)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${filterAudience === aud ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
              {aud}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-100">No announcements found.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(a => {
            const isExpired = a.expires_at && new Date(a.expires_at) < new Date();
            return (
              <div key={a._id} className={`bg-white rounded-2xl border shadow-sm p-5 transition-all ${a.is_pinned ? 'border-violet-200' : 'border-slate-100'} ${!a.is_active || isExpired ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {a.is_pinned && <span className="inline-flex items-center gap-1 bg-violet-100 text-violet-700 text-xs font-bold px-2 py-0.5 rounded-full"><Pin className="w-2.5 h-2.5" /> Pinned</span>}
                      {!a.is_active && <span className="bg-slate-100 text-slate-400 text-xs font-bold px-2 py-0.5 rounded-full">Inactive</span>}
                      {isExpired && <span className="bg-red-100 text-red-500 text-xs font-bold px-2 py-0.5 rounded-full">Expired</span>}
                      {(a.audience || []).map(aud => (
                        <span key={aud} className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${AUDIENCE_COLORS[aud] || 'bg-slate-100 text-slate-500'}`}>{aud}</span>
                      ))}
                    </div>
                    <h3 className="font-bold text-slate-800 text-base">{a.title}</h3>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">{a.body}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {new Date(a.createdAt || a.created_at).toLocaleDateString()}
                      </span>
                      {a.expires_at && (
                        <span className="text-xs text-slate-400">Expires: {new Date(a.expires_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(a)} className="p-1.5 hover:bg-violet-50 rounded-lg text-violet-600"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => deleteAnn(a._id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">{editId ? 'Edit Announcement' : 'New Announcement'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <form onSubmit={save} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div>
                  <label className={labelCls}>Title *</label>
                  <input required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className={inputCls} placeholder="Announcement title" />
                </div>
                <div>
                  <label className={labelCls}>Body *</label>
                  <textarea required value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} rows={5} className={inputCls} placeholder="Write your announcement here…" />
                </div>
                <div>
                  <label className={labelCls}>Audience</label>
                  <div className="flex flex-wrap gap-2">
                    {AUDIENCES.map(aud => (
                      <button key={aud} type="button" onClick={() => toggleAudience(aud)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize border transition-all ${form.audience.includes(aud) ? 'bg-violet-600 text-white border-violet-600' : 'border-slate-200 text-slate-500 hover:border-violet-300'}`}>
                        {aud}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Expires At</label>
                  <input type="date" value={form.expires_at} onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))} className={inputCls} />
                </div>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={form.is_pinned} onChange={e => setForm(p => ({ ...p, is_pinned: e.target.checked }))} className="rounded" />
                    <Pin className="w-4 h-4 text-violet-500" /> Pin to top
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} className="rounded" />
                    Active
                  </label>
                </div>
              </div>
              <div className="p-5 border-t border-slate-100 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-violet-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-violet-700 text-sm disabled:opacity-60">
                  {saving ? 'Publishing…' : editId ? 'Update' : 'Publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
