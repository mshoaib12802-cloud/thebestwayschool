import { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, Clock, BarChart2, Wallet } from 'lucide-react';
import RupeeIcon from '../components/RupeeIcon';

const fmt = (n) => {
  if (!n) return '0';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000)    return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
};

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

const TooltipRs = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '10px 14px' }}>
      <p style={{ color: '#94a3b8', fontSize: 11, marginBottom: 6, fontWeight: 700 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontSize: 12, fontWeight: 700, margin: '2px 0' }}>
          {p.name}: Rs. {Number(p.value).toLocaleString()}
        </p>
      ))}
    </div>
  );
};

export default function FinancialDashboard() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/financial-dashboard')
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load financial data'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"/>
    </div>
  );

  if (!data) return null;

  const { monthly, thisMonth, feeStatus, expenseByCategory, incomeByCategory } = data;
  const profit  = thisMonth.income - thisMonth.expense;
  const feeRate = feeStatus.total > 0 ? Math.round(feeStatus.paid / feeStatus.total * 100) : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow">
          <BarChart2 className="w-5 h-5 text-white"/>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Financial Dashboard</h1>
          <p className="text-sm text-slate-500">Income, expenses & fee collection overview — amounts in Rs.</p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'This Month Income',  value: thisMonth.income,  icon: TrendingUp,   color: 'emerald', bg: 'bg-emerald-50', border: 'border-emerald-200' },
          { label: 'This Month Expense', value: thisMonth.expense, icon: TrendingDown, color: 'red',     bg: 'bg-red-50',     border: 'border-red-200' },
          { label: 'Net Profit',         value: profit,            icon: RupeeIcon,    color: profit >= 0 ? 'indigo' : 'red', bg: profit >= 0 ? 'bg-indigo-50' : 'bg-red-50', border: profit >= 0 ? 'border-indigo-200' : 'border-red-200' },
          { label: 'Fee Collection Rate',value: `${feeRate}%`,     icon: CheckCircle,  color: feeRate >= 80 ? 'emerald' : 'amber', bg: feeRate >= 80 ? 'bg-emerald-50' : 'bg-amber-50', border: feeRate >= 80 ? 'border-emerald-200' : 'border-amber-200', isPercent: true },
        ].map(card => (
          <div key={card.label} className={`${card.bg} ${card.border} border rounded-2xl p-5 flex items-center gap-4`}>
            <div className={`w-11 h-11 rounded-2xl bg-${card.color}-100 flex items-center justify-center shrink-0`}>
              <card.icon className={`w-5 h-5 text-${card.color}-600`} size={20}/>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold">{card.label}</p>
              <p className={`text-xl font-extrabold text-${card.color}-700`}>
                {card.isPercent ? card.value : `Rs. ${fmt(card.value)}`}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Fee Status */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Paid Invoices',    value: feeStatus.paid,    icon: CheckCircle, cls: 'text-emerald-600', bg: 'bg-emerald-100' },
          { label: 'Partial Payment',  value: feeStatus.partial, icon: Clock,       cls: 'text-amber-600',   bg: 'bg-amber-100' },
          { label: 'Unpaid Invoices',  value: feeStatus.unpaid,  icon: AlertCircle, cls: 'text-red-600',     bg: 'bg-red-100' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
              <s.icon className={`w-5 h-5 ${s.cls}`}/>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold">{s.label}</p>
              <p className={`text-2xl font-extrabold ${s.cls}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Income vs Expense */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="font-bold text-slate-700 mb-5 text-sm">Monthly Income vs Expense — Rs. (12 months)</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={monthly} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }}/>
            <YAxis tickFormatter={fmt} tick={{ fontSize: 11, fill: '#94a3b8' }}/>
            <Tooltip content={<TooltipRs/>}/>
            <Legend wrapperStyle={{ fontSize: 12 }}/>
            <Bar dataKey="income"  name="Income"  fill="#10b981" radius={[4,4,0,0]}/>
            <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4,4,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Net Profit trend */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="font-bold text-slate-700 mb-5 text-sm">Net Profit / Loss Trend — Rs.</h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={monthly} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }}/>
            <YAxis tickFormatter={fmt} tick={{ fontSize: 11, fill: '#94a3b8' }}/>
            <Tooltip content={<TooltipRs/>}/>
            <Line type="monotone" dataKey="profit" name="Net Profit" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, fill: '#6366f1' }}/>
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Fee collection trend */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <Wallet size={18} className="text-emerald-600"/>
          <h2 className="font-bold text-slate-700 text-sm">Fee Collection Trend — Rs. (Invoiced vs Collected)</h2>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthly} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }}/>
            <YAxis tickFormatter={fmt} tick={{ fontSize: 11, fill: '#94a3b8' }}/>
            <Tooltip content={<TooltipRs/>}/>
            <Legend wrapperStyle={{ fontSize: 12 }}/>
            <Bar dataKey="feeInvoiced"  name="Invoiced"  fill="#6366f1" radius={[4,4,0,0]}/>
            <Bar dataKey="feeCollected" name="Collected" fill="#10b981" radius={[4,4,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pie charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[
          { title: 'Income by Category — Rs.', data: incomeByCategory },
          { title: 'Expense by Category — Rs.', data: expenseByCategory },
        ].map(chart => (
          <div key={chart.title} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="font-bold text-slate-700 mb-5 text-sm">{chart.title}</h2>
            {chart.data.length === 0 ? (
              <p className="text-center text-slate-400 py-8 text-sm">No data yet</p>
            ) : (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={chart.data} dataKey="amount" nameKey="category" cx="50%" cy="50%" outerRadius={70} innerRadius={35}>
                      {chart.data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                    </Pie>
                    <Tooltip formatter={(v) => [`Rs. ${Number(v).toLocaleString()}`, '']}/>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {chart.data.slice(0, 6).map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span style={{ background: COLORS[i % COLORS.length] }} className="w-2.5 h-2.5 rounded-full shrink-0"/>
                      <span className="text-xs text-slate-600 flex-1 truncate capitalize">{item.category}</span>
                      <span className="text-xs font-bold text-slate-700">Rs. {fmt(item.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
