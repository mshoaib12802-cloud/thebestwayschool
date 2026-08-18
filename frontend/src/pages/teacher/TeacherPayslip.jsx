import { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { Banknote, Download, CheckCircle2, FileText } from 'lucide-react';
import { loadLogo, drawHeader, drawFooter, drawSection, drawInfoGrid, drawSummaryBox, C, fmtRs, fmtDate } from '../../utils/pdfKit';

const fmt = (d) => fmtDate(d);
const money = (n) => fmtRs(n);

const STATUS_STYLES = {
  paid:    { bg: 'bg-green-100', text: 'text-green-700',  label: 'Paid'  },
  draft:   { bg: 'bg-amber-100', text: 'text-amber-700',  label: 'Draft' },
  pending: { bg: 'bg-slate-100', text: 'text-slate-600',  label: 'Pending' },
};

export default function TeacherPayslip() {
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teacher, setTeacher] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/teacher-portal/payroll/my'),
      api.get('/teacher-portal/profile').catch(() => ({ data: null })),
    ]).then(([pay, prof]) => {
      setPayslips(pay.data);
      setTeacher(prof.data);
    }).catch(() => toast.error('Failed to load payslips'))
      .finally(() => setLoading(false));
  }, []);

  const printPDF = async (slip) => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc  = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageW = 210, pageH = 297;
      const logoB64 = await loadLogo();
      const period  = slip.month || slip.period || '—';
      const refNo   = `PAY-${period.replace(/[^0-9]/g,'')}`;

      let y = drawHeader(doc, { logoB64, docType: 'Payslip', docRef: refNo, date: fmtDate(new Date()), pageW });
      y += 6;

      // Employee info
      y = drawSection(doc, 'Employee Details', y, { pageW });
      y = drawInfoGrid(doc, [
        ['Name',        teacher?.name        || '—'],
        ['Period',      period],
        ['Designation', teacher?.designation || '—'],
        ['Department',  teacher?.department  || '—'],
        ['CNIC',        teacher?.cnic        || '—'],
        ['Status',      (slip.status || 'draft').toUpperCase()],
      ], y, { colW: 90 });

      y += 4;

      // Earnings table
      y = drawSection(doc, 'Earnings', y, { pageW });
      const { default: autoTable } = await import('jspdf-autotable');
      const gross = Number(slip.basic_salary || 0) + Number(slip.allowances || 0);
      autoTable(doc, {
        startY: y,
        margin: { left: 14, right: 14 },
        head: [['Earnings Head', 'Amount (Rs.)']],
        body: [
          ['Basic Salary',            { content: fmtRs(slip.basic_salary), styles: { halign: 'right' } }],
          ...(slip.allowances > 0 ? [['Allowances / Incentives', { content: fmtRs(slip.allowances), styles: { halign: 'right' } }]] : []),
          [{ content: 'Gross Salary', styles: { fontStyle: 'bold' } }, { content: fmtRs(gross), styles: { halign: 'right', fontStyle: 'bold', textColor: C.green } }],
        ],
        headStyles: { fillColor: C.navyMid, textColor: C.white, fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        columnStyles: { 1: { halign: 'right' } },
        tableLineWidth: 0.2, tableLineColor: [220, 225, 235],
      });

      y = doc.lastAutoTable.finalY + 6;

      // Deductions
      const totalDed = Number(slip.absence_deduction || 0) + Number(slip.advance_deduction || 0) + Number(slip.other_deductions || 0);
      if (totalDed > 0) {
        y = drawSection(doc, 'Deductions', y, { pageW });
        autoTable(doc, {
          startY: y,
          margin: { left: 14, right: 14 },
          head: [['Deduction Head', 'Amount (Rs.)']],
          body: [
            ...(slip.absence_deduction > 0 ? [['Absence Deduction', { content: fmtRs(slip.absence_deduction), styles: { halign: 'right', textColor: C.red } }]] : []),
            ...(slip.advance_deduction > 0 ? [['Advance Recovery',   { content: fmtRs(slip.advance_deduction), styles: { halign: 'right', textColor: C.red } }]] : []),
            [{ content: 'Total Deductions', styles: { fontStyle: 'bold' } }, { content: fmtRs(totalDed), styles: { halign: 'right', fontStyle: 'bold', textColor: C.red } }],
          ],
          headStyles: { fillColor: [120, 30, 30], textColor: C.white, fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          columnStyles: { 1: { halign: 'right' } },
          tableLineWidth: 0.2, tableLineColor: [220, 225, 235],
        });
        y = doc.lastAutoTable.finalY + 6;
      }

      // Net pay summary
      drawSummaryBox(doc, [
        { label: 'Gross Salary',      value: fmtRs(gross) },
        ...(totalDed > 0 ? [{ label: 'Total Deductions', value: `− ${fmtRs(totalDed)}`, color: C.red }] : []),
        { label: 'NET SALARY',        value: fmtRs(slip.net_salary), bold: true, large: true, color: C.green },
        ...(slip.paid_date ? [{ label: 'Paid On', value: fmt(slip.paid_date) }] : []),
      ], y, { pageW });

      drawFooter(doc, { pageNum: 1, totalPages: 1, pageW, pageH });
      doc.save(`Payslip_${teacher?.name || 'Teacher'}_${period}.pdf`);
      toast.success('Payslip downloaded');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-700" />
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
          <Banknote size={20} className="text-slate-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My Payslips</h1>
          <p className="text-slate-500 text-sm">View and download your monthly payslips</p>
        </div>
      </div>

      {payslips.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">
          <Banknote size={48} className="mx-auto mb-3 opacity-30" />
          <p>No payslips available yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {payslips.map(slip => {
            const st = STATUS_STYLES[slip.status?.toLowerCase()] || STATUS_STYLES.draft;
            const totalDeductions = Number(slip.absence_deduction || 0) + Number(slip.advance_deduction || 0) + Number(slip.other_deductions || 0);
            return (
              <div key={slip._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="font-bold text-slate-800 text-lg">{slip.month || slip.period || 'Payslip'}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${st.bg} ${st.text}`}>{st.label}</span>
                      {slip.status === 'paid' && slip.paid_date && (
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle2 size={12} /> Paid on {fmt(slip.paid_date)}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3">
                      <div>
                        <p className="text-xs text-slate-500">Basic Salary</p>
                        <p className="font-bold text-slate-800 text-sm mt-0.5">{money(slip.basic_salary)}</p>
                      </div>
                      {slip.allowances > 0 && (
                        <div>
                          <p className="text-xs text-slate-500">Allowances</p>
                          <p className="font-bold text-green-600 text-sm mt-0.5">+{money(slip.allowances)}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-slate-500">Deductions</p>
                        <p className="font-bold text-red-500 text-sm mt-0.5">-{money(totalDeductions)}</p>
                        {slip.absence_deduction > 0 && <p className="text-[11px] text-slate-400">Absence: {money(slip.absence_deduction)}</p>}
                        {slip.advance_deduction > 0 && <p className="text-[11px] text-slate-400">Advance: {money(slip.advance_deduction)}</p>}
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Net Salary</p>
                        <p className="font-bold text-slate-900 text-lg mt-0.5">{money(slip.net_salary)}</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => printPDF(slip)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition shrink-0"
                  >
                    <Download size={15} /> Download PDF
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
