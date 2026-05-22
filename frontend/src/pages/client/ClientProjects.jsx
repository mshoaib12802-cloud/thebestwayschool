import { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  Briefcase, CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp,
  User, Calendar, Circle, AlertTriangle, ThumbsUp,
} from 'lucide-react';

const STATUS_COLORS = {
  planning:    { bg: 'bg-slate-100',   text: 'text-slate-600',   dot: '#94a3b8' },
  in_progress: { bg: 'bg-blue-100',    text: 'text-blue-700',    dot: '#3b82f6' },
  review:      { bg: 'bg-violet-100',  text: 'text-violet-700',  dot: '#7c3aed' },
  completed:   { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: '#10b981' },
  on_hold:     { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: '#f59e0b' },
};

const PRIORITY_COLORS = {
  low:    'text-slate-400',
  medium: 'text-blue-500',
  high:   'text-amber-500',
  urgent: 'text-rose-500',
};

const MILESTONE_COLORS = {
  pending:     { bg: 'bg-slate-100', text: 'text-slate-500', icon: Circle },
  in_progress: { bg: 'bg-blue-100',  text: 'text-blue-600',  icon: Clock },
  completed:   { bg: 'bg-emerald-100', text: 'text-emerald-600', icon: CheckCircle2 },
};

const fmt = (date) => date ? new Date(date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const daysUntil = (d) => {
  if (!d) return null;
  return Math.ceil((new Date(d) - new Date()) / (1000 * 60 * 60 * 24));
};

function ProjectCard({ project, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [approving, setApproving] = useState(null);
  const st = STATUS_COLORS[project.status] || STATUS_COLORS.planning;
  const pct = project.progress_pct || 0;
  const days = daysUntil(project.deadline);
  const deadlineWarn = days !== null && days >= 0 && days <= 7 && project.status !== 'completed';
  const deadlineOverdue = days !== null && days < 0 && project.status !== 'completed';

  const handleApprove = async (msId) => {
    setApproving(msId);
    try {
      const res = await api.put(`/client-portal/projects/${project._id}/milestones/${msId}/approve`);
      onUpdate(res.data);
    } catch { /* silent */ } finally { setApproving(null); }
  };

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${deadlineWarn || deadlineOverdue ? 'border-amber-300' : 'border-slate-100'}`}>
      {/* Deadline warning banner */}
      {(deadlineWarn || deadlineOverdue) && (
        <div className={`px-5 py-2 text-xs font-bold flex items-center gap-2 ${deadlineOverdue ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
          <AlertTriangle size={13}/>
          {deadlineOverdue
            ? `Deadline passed ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} ago`
            : `Deadline in ${days} day${days !== 1 ? 's' : ''}`}
        </div>
      )}

      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${st.bg} ${st.text}`}>
                {project.status?.replace('_', ' ')}
              </span>
              <span className={`text-xs font-bold capitalize ${PRIORITY_COLORS[project.priority]}`}>
                {project.priority} priority
              </span>
            </div>
            <h3 className="text-lg font-extrabold text-slate-800">{project.title}</h3>
            {project.service_type && (
              <p className="text-xs text-slate-400 font-semibold mt-0.5">{project.service_type}</p>
            )}
          </div>
          <span className="text-2xl font-extrabold text-amber-600 flex-shrink-0">{pct}%</span>
        </div>

        {project.description && (
          <p className="text-sm text-slate-500 mb-3 leading-relaxed">{project.description}</p>
        )}

        {/* Progress bar */}
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-3">
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: pct === 100 ? '#10b981' : 'linear-gradient(90deg,#f59e0b,#d97706)' }}/>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
          {project.start_date && (
            <span className="flex items-center gap-1"><Calendar size={11}/> Started: {fmt(project.start_date)}</span>
          )}
          {project.deadline && (
            <span className={`flex items-center gap-1 ${deadlineWarn ? 'text-amber-600 font-bold' : deadlineOverdue ? 'text-rose-600 font-bold' : ''}`}>
              <Clock size={11}/> Deadline: {fmt(project.deadline)}
            </span>
          )}
          {project.assigned_to?.length > 0 && (
            <span className="flex items-center gap-1">
              <User size={11}/> {project.assigned_to.map(u => u.name).join(', ')}
            </span>
          )}
        </div>

        {/* Client notes */}
        {project.client_notes && (
          <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl p-3">
            <p className="text-xs font-bold text-amber-700 mb-1">Note from Team</p>
            <p className="text-xs text-amber-900 leading-relaxed">{project.client_notes}</p>
          </div>
        )}

        {/* Milestones toggle */}
        {project.milestones?.length > 0 && (
          <button onClick={() => setExpanded(v => !v)}
            className="mt-4 w-full flex items-center justify-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl py-2 hover:bg-slate-50 transition-colors">
            {expanded ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}
            {expanded ? 'Hide' : 'Show'} Milestones ({project.milestones.length})
            {project.milestones.some(m => m.status === 'completed' && !m.client_approved) && (
              <span className="ml-1 bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
                Approval needed
              </span>
            )}
          </button>
        )}
      </div>

      {/* Milestones timeline */}
      {expanded && project.milestones?.length > 0 && (
        <div className="border-t border-slate-100 px-5 py-4 space-y-3 bg-slate-50">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Project Milestones</p>
          {project.milestones.map((ms, i) => {
            const mst = MILESTONE_COLORS[ms.status] || MILESTONE_COLORS.pending;
            const Icon = mst.icon;
            const needsApproval = ms.status === 'completed' && !ms.client_approved;
            return (
              <div key={ms._id || i} className={`flex items-start gap-3 rounded-xl p-2 transition-colors ${needsApproval ? 'bg-amber-50 border border-amber-200' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${mst.bg}`}>
                  <Icon size={14} className={mst.text}/>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className={`text-sm font-bold ${ms.status === 'completed' ? 'text-slate-600' : 'text-slate-800'}`}>
                      {ms.title}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize flex-shrink-0 ${mst.bg} ${mst.text}`}>
                        {ms.status?.replace('_', ' ')}
                      </span>
                      {ms.client_approved && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1 flex-shrink-0">
                          <ThumbsUp size={10}/> Approved
                        </span>
                      )}
                    </div>
                  </div>
                  {ms.description && <p className="text-xs text-slate-400 mt-0.5">{ms.description}</p>}
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-400">
                    {ms.due_date && <span>Due: {fmt(ms.due_date)}</span>}
                    {ms.completed_date && <span className="text-emerald-600">✓ Completed: {fmt(ms.completed_date)}</span>}
                    {ms.client_approved_at && <span className="text-emerald-600">✓ Approved: {fmt(ms.client_approved_at)}</span>}
                  </div>
                  {needsApproval && (
                    <button
                      onClick={() => handleApprove(ms._id)}
                      disabled={approving === ms._id}
                      className="mt-2 flex items-center gap-1.5 text-xs font-bold bg-emerald-600 text-white px-3 py-1.5 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50">
                      <ThumbsUp size={12}/>
                      {approving === ms._id ? 'Approving…' : 'Approve & Sign Off'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ClientProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('all');

  useEffect(() => {
    api.get('/client-portal/projects')
      .then(r => setProjects(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statuses = ['all', 'planning', 'in_progress', 'review', 'completed', 'on_hold'];
  const filtered = filter === 'all' ? projects : projects.filter(p => p.status === filter);

  const handleUpdate = (updated) => {
    setProjects(prev => prev.map(p => p._id === updated._id ? updated : p));
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  const pendingApprovals = projects.reduce((sum, p) =>
    sum + (p.milestones || []).filter(m => m.status === 'completed' && !m.client_approved).length, 0);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
          <Briefcase size={24} className="text-amber-500"/> My Projects
        </h2>
        <p className="text-slate-500 text-sm mt-0.5">Track progress and milestones for all your projects</p>
      </div>

      {/* Pending approvals banner */}
      {pendingApprovals > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 flex items-center gap-3">
          <AlertCircle size={18} className="text-amber-600 flex-shrink-0"/>
          <p className="text-sm font-bold text-amber-800">
            {pendingApprovals} milestone{pendingApprovals !== 1 ? 's' : ''} waiting for your approval — expand a project to review
          </p>
        </div>
      )}

      {/* Summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total',     count: projects.length,                                       color: 'bg-slate-100 text-slate-700' },
          { label: 'Active',    count: projects.filter(p => p.status === 'in_progress').length, color: 'bg-blue-100 text-blue-700' },
          { label: 'Completed', count: projects.filter(p => p.status === 'completed').length, color: 'bg-emerald-100 text-emerald-700' },
          { label: 'On Hold',   count: projects.filter(p => p.status === 'on_hold').length,   color: 'bg-amber-100 text-amber-700' },
        ].map(({ label, count, color }) => (
          <div key={label} className={`rounded-2xl p-3 text-center ${color}`}>
            <p className="text-2xl font-extrabold">{count}</p>
            <p className="text-xs font-bold">{label}</p>
          </div>
        ))}
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {statuses.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
              filter === s ? 'bg-amber-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
            }`}>
            {s === 'all' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Projects */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
          <Briefcase size={40} className="text-slate-200 mx-auto mb-3"/>
          <p className="font-bold text-slate-400">No projects found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(p => <ProjectCard key={p._id} project={p} onUpdate={handleUpdate}/>)}
        </div>
      )}
    </div>
  );
}
