import { useState, useEffect } from 'react';
import api from '../../services/api';
import { FileText, CheckCircle2, AlertCircle, Clock, Download, AlertTriangle, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const STATUS_COLORS = {
  draft:   'bg-slate-100 text-slate-600',
  sent:    'bg-blue-100 text-blue-700',
  partial: 'bg-amber-100 text-amber-700',
  paid:    'bg-emerald-100 text-emerald-700',
  overdue: 'bg-rose-100 text-rose-700',
};

const STATUS_ICONS = {
  draft:   Clock,
  sent:    FileText,
  partial: AlertCircle,
  paid:    CheckCircle2,
  overdue: AlertTriangle,
};

const fmt = (n) => `Rs. ${Number(n || 0).toLocaleString()}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const downloadInvoicePdf = (inv, clientName) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;

  doc.setFillColor(180, 83, 9);
  doc.rect(0, 0, W, 38, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('INFLORESCENCE ADVANCE SKILLS', 14, 14);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Services Invoice', 14, 22);

  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(inv.invoice_no || 'INVOICE', W - 14, 22, { align: 'right' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Issued: ${fmtDate(inv.issue_date)}`, W - 14, 30, { align: 'right' });
  doc.text(`Due: ${fmtDate(inv.due_date)}`, W - 14, 36, { align: 'right' });

  doc.setTextColor(30, 30, 30);
  doc.setFillColor(248, 250, 252);
  doc.rect(14, 46, 80, 24, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 100);
  doc.text('BILLED TO', 18, 53);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(11);
  doc.text(clientName || 'Client', 18, 60);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(inv.title || '', 18, 67);

  const statusColor = inv.status === 'paid' ? [16, 185, 129] : inv.status === 'overdue' ? [239, 68, 68] : [180, 83, 9];
  doc.setFillColor(...statusColor);
  doc.roundedRect(W - 14 - 35, 46, 35, 12, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text((inv.status || '').toUpperCase(), W - 14 - 17.5, 54, { align: 'center' });

  autoTable(doc, {
    startY: 78,
    head: [['#', 'Description', 'Qty', 'Unit Price', 'Total']],
    body: (inv.items || []).map((item, i) => [
      i + 1, item.description, item.quantity,
      `Rs. ${Number(item.unit_price).toLocaleString()}`,
      `Rs. ${Number(item.total).toLocaleString()}`,
    ]),
    headStyles: { fillColor: [180, 83, 9], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    columnStyles: { 0: { cellWidth: 10 }, 2: { halign: 'center' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
    margin: { left: 14, right: 14 },
  });

  const finalY = doc.lastAutoTable.finalY + 8;
  const rightX = W - 14;

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Subtotal:', rightX - 60, finalY); doc.text(`Rs. ${Number(inv.subtotal).toLocaleString()}`, rightX, finalY, { align: 'right' });
  if (inv.tax_pct > 0) {
    doc.text(`Tax (${inv.tax_pct}%):`, rightX - 60, finalY + 6); doc.text(`Rs. ${Number(inv.tax_amount).toLocaleString()}`, rightX, finalY + 6, { align: 'right' });
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text('Total:', rightX - 60, finalY + 14); doc.text(`Rs. ${Number(inv.total).toLocaleString()}`, rightX, finalY + 14, { align: 'right' });
  if (inv.paid_amount > 0) {
    doc.setTextColor(16, 185, 129);
    doc.text('Paid:', rightX - 60, finalY + 21); doc.text(`Rs. ${Number(inv.paid_amount).toLocaleString()}`, rightX, finalY + 21, { align: 'right' });
    const balance = inv.total - inv.paid_amount;
    doc.setTextColor(balance > 0 ? 239 : 16, balance > 0 ? 68 : 185, balance > 0 ? 68 : 129);
    doc.text('Balance Due:', rightX - 60, finalY + 28); doc.text(`Rs. ${Number(balance).toLocaleString()}`, rightX, finalY + 28, { align: 'right' });
  }

  if (inv.notes) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('Note: ' + inv.notes, 14, finalY + 14);
  }

  doc.save(`${inv.invoice_no || 'Invoice'}.pdf`);
};

function InvoiceCard({ inv, clientName }) {
  const [expanded, setExpanded] = useState(false);
  const StatusIcon = STATUS_ICONS[inv.status] || FileText;
  const balance = (inv.total || 0) - (inv.paid_amount || 0);
  const isOverdue = inv.status === 'overdue';

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${isOverdue ? 'border-rose-300' : 'border-slate-100'}`}>
      <div className="p-5 cursor-pointer" onClick={() => setExpanded(v => !v)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${STATUS_COLORS[inv.status] || 'bg-slate-100 text-slate-600'}`}>
              <StatusIcon size={18}/>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-extrabold text-slate-800 text-sm">{inv.invoice_no}</p>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[inv.status]}`}>
                  {inv.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{inv.title}</p>
              {inv.project_id && <p className="text-xs text-slate-400">Project: {inv.project_id.title}</p>}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-extrabold text-slate-800">{fmt(inv.total)}</p>
            {inv.paid_amount > 0 && inv.status !== 'paid' && (
              <p className="text-xs text-amber-600 font-bold">Balance: {fmt(balance)}</p>
            )}
            <p className="text-xs text-slate-400 mt-0.5">Due: {fmtDate(inv.due_date)}</p>
          </div>
        </div>

        {/* Overdue payment prompt */}
        {isOverdue && (
          <div className="mt-3 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-rose-600 flex-shrink-0"/>
              <p className="text-xs font-bold text-rose-700">Payment overdue — please contact us to arrange payment</p>
            </div>
            <Link to="/client-portal/messages" onClick={e => e.stopPropagation()}
              className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-800 whitespace-nowrap border border-rose-300 rounded-lg px-2 py-1 hover:bg-rose-100">
              <MessageCircle size={11}/> Message Team
            </Link>
          </div>
        )}
      </div>

      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 text-xs font-bold text-slate-500 uppercase">Description</th>
                  <th className="text-center py-2 text-xs font-bold text-slate-500 uppercase">Qty</th>
                  <th className="text-right py-2 text-xs font-bold text-slate-500 uppercase">Unit Price</th>
                  <th className="text-right py-2 text-xs font-bold text-slate-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody>
                {(inv.items || []).map((item, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-2 text-slate-700">{item.description}</td>
                    <td className="py-2 text-center text-slate-500">{item.quantity}</td>
                    <td className="py-2 text-right text-slate-600">{fmt(item.unit_price)}</td>
                    <td className="py-2 text-right font-bold text-slate-800">{fmt(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-end">
            <div className="text-xs text-slate-400 space-y-0.5">
              {inv.notes && <p>Note: {inv.notes}</p>}
              <p>Issued: {fmtDate(inv.issue_date)}</p>
            </div>
            <div className="text-right text-sm space-y-0.5">
              <p className="text-slate-500">Subtotal: <span className="font-bold text-slate-700">{fmt(inv.subtotal)}</span></p>
              {inv.tax_pct > 0 && <p className="text-slate-500">Tax ({inv.tax_pct}%): <span className="font-bold text-slate-700">{fmt(inv.tax_amount)}</span></p>}
              <p className="font-extrabold text-slate-800 text-base">Total: {fmt(inv.total)}</p>
              {inv.paid_amount > 0 && <p className="text-emerald-600 font-bold">Paid: {fmt(inv.paid_amount)}</p>}
              {balance > 0 && <p className="text-rose-600 font-extrabold">Balance Due: {fmt(balance)}</p>}
            </div>
          </div>

          <button onClick={() => downloadInvoicePdf(inv, clientName)}
            className="mt-4 flex items-center gap-2 bg-amber-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-amber-700 transition-colors">
            <Download size={15}/> Download PDF
          </button>
        </div>
      )}
    </div>
  );
}

export default function ClientInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [profile, setProfile]   = useState(null);
  const [filter, setFilter]     = useState('all');

  useEffect(() => {
    Promise.all([
      api.get('/client-portal/invoices'),
      api.get('/client-portal/profile'),
    ]).then(([inv, prof]) => {
      setInvoices(inv.data);
      setProfile(prof.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const statuses = ['all', 'draft', 'sent', 'partial', 'paid', 'overdue'];
  const filtered = filter === 'all' ? invoices : invoices.filter(i => i.status === filter);

  const totalBilled = invoices.reduce((s, i) => s + (i.total || 0), 0);
  const totalPaid   = invoices.reduce((s, i) => s + (i.paid_amount || 0), 0);
  const totalDue    = totalBilled - totalPaid;
  const overdueCount = invoices.filter(i => i.status === 'overdue').length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
          <FileText size={24} className="text-amber-500"/> My Invoices
        </h2>
        <p className="text-slate-500 text-sm mt-0.5">View and download all your invoices</p>
      </div>

      {/* Overdue alert */}
      {overdueCount > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl px-5 py-3 flex items-center gap-3">
          <AlertTriangle size={18} className="text-rose-600 flex-shrink-0"/>
          <div>
            <p className="text-sm font-extrabold text-rose-800">{overdueCount} overdue invoice{overdueCount !== 1 ? 's' : ''}</p>
            <p className="text-xs text-rose-600">Please contact our team to arrange payment and avoid service interruption.</p>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm text-center">
          <p className="text-xl font-extrabold text-slate-800">{fmt(totalBilled)}</p>
          <p className="text-xs text-slate-400 font-bold mt-0.5">Total Billed</p>
        </div>
        <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 shadow-sm text-center">
          <p className="text-xl font-extrabold text-emerald-700">{fmt(totalPaid)}</p>
          <p className="text-xs text-emerald-600 font-bold mt-0.5">Total Paid</p>
        </div>
        <div className={`rounded-2xl p-4 border shadow-sm text-center ${totalDue > 0 ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
          <p className={`text-xl font-extrabold ${totalDue > 0 ? 'text-amber-700' : 'text-slate-400'}`}>{fmt(totalDue)}</p>
          <p className={`text-xs font-bold mt-0.5 ${totalDue > 0 ? 'text-amber-600' : 'text-slate-400'}`}>Balance Due</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {statuses.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
              filter === s ? 'bg-amber-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
            }`}>
            {s === 'all' ? 'All' : s}
            {s !== 'all' && <span className="ml-1 opacity-70">({invoices.filter(i => i.status === s).length})</span>}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
          <FileText size={40} className="text-slate-200 mx-auto mb-3"/>
          <p className="font-bold text-slate-400">No invoices found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(inv => (
            <InvoiceCard key={inv._id} inv={inv} clientName={profile?.company_name}/>
          ))}
        </div>
      )}
    </div>
  );
}
