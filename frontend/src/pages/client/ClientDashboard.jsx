import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  Briefcase, CheckCircle2, Clock, FileText,
  MessageCircle, AlertCircle, ChevronRight, AlertTriangle, Calendar,
} from 'lucide-react';

const STATUS_COLORS = {
  planning:    'bg-slate-100 text-slate-600',
  in_progress: 'bg-blue-100 text-blue-700',
  review:      'bg-violet-100 text-violet-700',
  completed:   'bg-emerald-100 text-emerald-700',
  on_hold:     'bg-amber-100 text-amber-700',
};

const INVOICE_COLORS = {
  draft:    'bg-slate-100 text-slate-600',
  sent:     'bg-blue-100 text-blue-700',
  partial:  'bg-amber-100 text-amber-700',
  paid:     'bg-emerald-100 text-emerald-700',
  overdue:  'bg-rose-100 text-rose-700',
};

const fmt = (n) => `Rs. ${Number(n || 0).toLocaleString()}`;

const daysUntil = (d) => {
  if (!d) return null;
  const diff = new Date(d) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export default function ClientDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/client-portal/dashboard')
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  if (!data) return (
    <div className="text-center py-16 text-slate-400">Failed to load dashboard. Please refresh.</div>
  );

  const { stats, recent_projects, recent_invoices } = data;

  const overdueInvoices = recent_invoices.filter(i => i.status === 'overdue');
  const upcomingDeadlines = recent_projects.filter(p => {
    const d = daysUntil(p.deadline);
    return d !== null && d >= 0 && d <= 7 && p.status !== 'completed';
  });

  const statCards = [
    { label: 'Active Projects',  value: stats.active_projects,    icon: Briefcase,    color: 'from-blue-500 to-indigo-500' },
    { label: 'Completed',        value: stats.completed_projects, icon: CheckCircle2, color: 'from-emerald-500 to-teal-500' },
    { label: 'Pending Payment',  value: fmt(stats.pending_amount),icon: AlertCircle,  color: 'from-amber-500 to-orange-500', small: true },
    { label: 'New Messages',     value: stats.unread_messages,    icon: MessageCircle,color: 'from-violet-500 to-purple-500' },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800">Dashboard</h2>
        <p className="text-slate-500 text-sm mt-0.5">Welcome back! Here's an overview of your account.</p>
      </div>

      {/* Overdue invoice alert */}
      {overdueInvoices.length > 0 && (
        <Link to="/client-portal/invoices"
          className="flex items-center justify-between gap-3 bg-rose-50 border border-rose-200 rounded-2xl px-5 py-3 hover:bg-rose-100 transition-colors">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-rose-600 flex-shrink-0"/>
            <span className="text-sm font-bold text-rose-800">
              {overdueInvoices.length} overdue invoice{overdueInvoices.length !== 1 ? 's' : ''} — payment required
            </span>
          </div>
          <ChevronRight size={16} className="text-rose-400 flex-shrink-0"/>
        </Link>
      )}

      {/* Deadline approaching alert */}
      {upcomingDeadlines.length > 0 && (
        <Link to="/client-portal/projects"
          className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 hover:bg-amber-100 transition-colors">
          <div className="flex items-center gap-3">
            <Calendar size={20} className="text-amber-600 flex-shrink-0"/>
            <span className="text-sm font-bold text-amber-800">
              {upcomingDeadlines.length} project deadline{upcomingDeadlines.length !== 1 ? 's' : ''} within 7 days
            </span>
          </div>
          <ChevronRight size={16} className="text-amber-400 flex-shrink-0"/>
        </Link>
      )}

      {/* Unread messages banner */}
      {stats.unread_messages > 0 && (
        <Link to="/client-portal/messages"
          className="flex items-center justify-between gap-3 bg-violet-50 border border-violet-200 rounded-2xl px-5 py-3 hover:bg-violet-100 transition-colors">
          <div className="flex items-center gap-3">
            <MessageCircle size={20} className="text-violet-600"/>
            <span className="text-sm font-bold text-violet-800">
              {stats.unread_messages} new message{stats.unread_messages !== 1 ? 's' : ''} from our team
            </span>
          </div>
          <ChevronRight size={16} className="text-violet-400"/>
        </Link>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, small }) => (
          <div key={label} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3`}>
              <Icon size={20} className="text-white"/>
            </div>
            <p className={`font-extrabold text-slate-800 ${small ? 'text-lg' : 'text-2xl'}`}>{value}</p>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Recent Projects */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-extrabold text-slate-700 flex items-center gap-2">
            <Briefcase size={16} className="text-amber-500"/> Recent Projects
          </h3>
          <Link to="/client-portal/projects" className="text-xs text-amber-600 font-bold hover:text-amber-700">
            View All →
          </Link>
        </div>
        {recent_projects.length === 0 ? (
          <p className="text-center text-slate-400 py-8 text-sm">No projects yet</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {recent_projects.map(p => {
              const days = daysUntil(p.deadline);
              const deadlineWarn = days !== null && days >= 0 && days <= 7 && p.status !== 'completed';
              return (
                <div key={p._id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{p.title}</p>
                      {p.service_type && <p className="text-xs text-slate-400">{p.service_type}</p>}
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize flex-shrink-0 ${STATUS_COLORS[p.status] || 'bg-slate-100 text-slate-600'}`}>
                      {p.status?.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${p.progress_pct}%`, background: p.progress_pct === 100 ? '#10b981' : '#f59e0b' }}/>
                    </div>
                    <span className="text-xs font-bold text-slate-500">{p.progress_pct}%</span>
                  </div>
                  {p.deadline && (
                    <p className={`text-xs mt-1 flex items-center gap-1 ${deadlineWarn ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
                      <Clock size={10}/>
                      {deadlineWarn ? `⚠ Due in ${days} day${days !== 1 ? 's' : ''}` : `Due: ${new Date(p.deadline).toLocaleDateString('en-PK')}`}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Invoices */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-extrabold text-slate-700 flex items-center gap-2">
            <FileText size={16} className="text-amber-500"/> Recent Invoices
          </h3>
          <Link to="/client-portal/invoices" className="text-xs text-amber-600 font-bold hover:text-amber-700">
            View All →
          </Link>
        </div>
        {recent_invoices.length === 0 ? (
          <p className="text-center text-slate-400 py-8 text-sm">No invoices yet</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {recent_invoices.map(inv => (
              <div key={inv._id} className={`px-5 py-4 flex items-center justify-between gap-3 ${inv.status === 'overdue' ? 'bg-rose-50/50' : ''}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-800 text-sm">{inv.invoice_no}</p>
                    {inv.status === 'overdue' && <AlertTriangle size={13} className="text-rose-500"/>}
                  </div>
                  <p className="text-xs text-slate-400">{inv.title}</p>
                </div>
                <div className="text-right">
                  <p className="font-extrabold text-slate-800 text-sm">{fmt(inv.total)}</p>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${INVOICE_COLORS[inv.status]}`}>
                    {inv.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-4">
        <Link to="/client-portal/projects"
          className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 hover:shadow-md transition-all group">
          <Briefcase size={22} className="text-amber-600 mb-2 group-hover:scale-110 transition-transform"/>
          <p className="font-extrabold text-slate-800">My Projects</p>
          <p className="text-xs text-slate-500 mt-0.5">View milestones & progress</p>
        </Link>
        <Link to="/client-portal/messages"
          className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200 rounded-2xl p-5 hover:shadow-md transition-all group">
          <MessageCircle size={22} className="text-violet-600 mb-2 group-hover:scale-110 transition-transform"/>
          <p className="font-extrabold text-slate-800">Messages</p>
          <p className="text-xs text-slate-500 mt-0.5">Chat with our team</p>
        </Link>
      </div>
    </div>
  );
}
