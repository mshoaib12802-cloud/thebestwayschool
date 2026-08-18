import { useState, useEffect } from 'react';
import api from '../../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Wallet, Download, CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react';
import { loadLogo, drawHeader, drawFooter, drawSection, drawInfoGrid, drawSummaryBox, TABLE_STYLES, C, fmtRs, fmtDate } from '../../utils/pdfKit';

const StudentFees = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/student-portal/fees')
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const downloadPDF = async () => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = 210, pageH = 297;
    const logoB64 = await loadLogo();
    const today = fmtDate(new Date());

    let y = drawHeader(doc, {
      logoB64,
      docType: 'Fee Statement',
      docRef: `Roll: ${data.student.roll_no}`,
      date: today,
      pageW,
    });

    y += 6;
    y = drawSection(doc, 'Student Information', y, { pageW });
    y = drawInfoGrid(doc, [
      ['Student Name', data.student.name],
      ['Roll Number',  data.student.roll_no],
      ['Course',       data.student.course || '—'],
      ['Generated',    today],
    ], y, { colW: 92 });

    y += 4;
    y = drawSection(doc, 'Payment History', y, { pageW });

    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      head: [['#', 'Date', 'Description', 'Method', 'Amount (Rs.)']],
      body: data.history.map((t, i) => [
        i + 1,
        fmtDate(t.date),
        t.description || 'Fee Payment',
        (t.payment_method || 'Cash').replace('_', ' '),
        { content: fmtRs(t.amount), styles: { halign: 'right', textColor: C.green } },
      ]),
      ...TABLE_STYLES,
      columnStyles: { 4: { halign: 'right' } },
    });

    y = doc.lastAutoTable.finalY + 8;
    drawSummaryBox(doc, [
      { label: 'Total Payable',   value: fmtRs(data.summary.total) },
      { label: 'Total Paid',      value: fmtRs(data.summary.paid),    color: C.green, bold: true },
      { label: 'Balance Due',     value: fmtRs(data.summary.balance), color: data.summary.balance > 0 ? C.red : C.green, bold: true, large: true },
    ], y, { pageW });

    drawFooter(doc, { pageNum: 1, totalPages: 1, pageW, pageH });
    doc.save(`FeeStatement_${data.student.name}_${new Date().getFullYear()}.pdf`);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  if (!data) return <p className="text-slate-500">Failed to load fee data.</p>;

  const pct = data.summary.total > 0 ? Math.round((data.summary.paid / data.summary.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800">Fee Ledger</h2>
          <p className="text-slate-500 mt-1">{data.student.course}</p>
        </div>
        <button onClick={downloadPDF}
          className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors">
          <Download size={18}/> Download PDF
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Payable', value: `Rs. ${data.summary.total.toLocaleString()}`, color: '#475569', bg: '#f8fafc' },
          { label: 'Total Paid', value: `Rs. ${data.summary.paid.toLocaleString()}`, color: '#16a34a', bg: '#f0fdf4' },
          { label: 'Balance Due', value: `Rs. ${data.summary.balance.toLocaleString()}`, color: data.summary.balance > 0 ? '#dc2626' : '#16a34a', bg: data.summary.balance > 0 ? '#fef2f2' : '#f0fdf4' },
        ].map(c => (
          <div key={c.label} className="rounded-2xl p-5 border" style={{ background: c.bg, borderColor: '#e2e8f0' }}>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{c.label}</p>
            <p className="text-2xl font-extrabold" style={{ color: c.color }}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-bold text-slate-600 flex items-center gap-1"><TrendingUp size={16} className="text-indigo-500"/> Payment Progress</span>
          <span className="text-sm font-bold text-indigo-600">{pct}%</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-3">
          <div className="h-3 rounded-full transition-all" style={{
            width: `${pct}%`,
            background: pct === 100 ? '#16a34a' : pct > 50 ? '#4f46e5' : '#f59e0b'
          }}/>
        </div>
        {data.summary.balance === 0 ? (
          <p className="text-sm text-green-600 font-semibold mt-2 flex items-center gap-1"><CheckCircle2 size={14}/> All fees cleared!</p>
        ) : (
          <p className="text-sm text-amber-600 font-semibold mt-2 flex items-center gap-1"><AlertCircle size={14}/> Rs. {data.summary.balance.toLocaleString()} remaining</p>
        )}
      </div>

      {/* Discount info */}
      {data.student.discount > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-sm text-green-700 font-medium">
          ✓ Discount Applied: Rs. {data.student.discount.toLocaleString()} off your total fee
        </div>
      )}

      {/* Payment history */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-700">Payment History</h3>
        </div>
        {data.history.length === 0 ? (
          <div className="p-10 text-center text-slate-400">No payments recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="text-left p-4">#</th>
                <th className="text-left p-4">Date</th>
                <th className="text-left p-4">Amount</th>
                <th className="text-left p-4">Method</th>
                <th className="text-left p-4">Description</th>
              </tr>
            </thead>
            <tbody>
              {data.history.map((t, i) => (
                <tr key={t._id} className="border-t border-slate-50 hover:bg-slate-50">
                  <td className="p-4 text-slate-400 font-mono">{i + 1}</td>
                  <td className="p-4 font-medium text-slate-700">{new Date(t.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td className="p-4 font-bold text-green-600">Rs. {t.amount.toLocaleString()}</td>
                  <td className="p-4 capitalize text-slate-600">{t.payment_method || 'cash'}</td>
                  <td className="p-4 text-slate-500">{t.description || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentFees;
