const Student    = require('../models/Student');
const User       = require('../models/User');
const Attendance = require('../models/Attendance');
const FeeInvoice = require('../models/FeeInvoice');
const MarksEntry = require('../models/MarksEntry');
const ReportCard = require('../models/ReportCard');
const Fine       = require('../models/Fine');
const Leave      = require('../models/Leave');
const Conduct    = require('../models/Conduct');
const Payroll    = require('../models/Payroll');
const StaffAdvance = require('../models/StaffAdvance');
const mongoose   = require('mongoose');

// GET /api/reports/people — list all students + staff
const getPeople = async (req, res) => {
  try {
    const [students, staff] = await Promise.all([
      Student.find({ isActive: true })
        .populate('school_class_id', 'name section')
        .populate('academic_year_id', 'label')
        .select('full_name photo roll_number gender school_class_id academic_year_id admission_date section')
        .sort({ full_name: 1 })
        .lean(),
      User.find({ role: { $in: ['teacher', 'admin', 'clerk', 'office_boy'] } })
        .select('name email role joining_date salary_amount salary_type')
        .sort({ name: 1 })
        .lean(),
    ]);

    const studentIds = students.map(s => s._id);
    const staffIds   = staff.map(s => s._id);

    // Bulk attendance stats (current month)
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [studentAtt, staffAtt] = await Promise.all([
      Attendance.aggregate([
        { $match: { person_type: 'Student', person_id: { $in: studentIds }, date: { $gte: monthStart } } },
        { $group: { _id: '$person_id', present: { $sum: { $cond: [{ $in: ['$status', ['present', 'late', 'half_day']] }, 1, 0] } }, total: { $sum: 1 } } },
      ]),
      Attendance.aggregate([
        { $match: { person_type: 'User', person_id: { $in: staffIds }, date: { $gte: monthStart } } },
        { $group: { _id: '$person_id', present: { $sum: { $cond: [{ $in: ['$status', ['present', 'late', 'half_day']] }, 1, 0] } }, total: { $sum: 1 } } },
      ]),
    ]);

    const attMap = {};
    [...studentAtt, ...staffAtt].forEach(a => {
      attMap[a._id.toString()] = a.total > 0 ? Math.round((a.present / a.total) * 100) : null;
    });

    // Bulk fee balances for students
    const feeBalances = await FeeInvoice.aggregate([
      { $match: { student_id: { $in: studentIds }, status: { $in: ['unpaid', 'partial'] } } },
      { $group: { _id: '$student_id', balance: { $sum: '$balance' } } },
    ]);
    const feeMap = {};
    feeBalances.forEach(f => { feeMap[f._id.toString()] = f.balance; });

    const studentList = students.map(s => ({
      _id: s._id,
      type: 'student',
      name: s.full_name,
      photo: s.photo,
      sub: [s.school_class_id?.name, s.school_class_id?.section, s.section].filter(Boolean).join(' – '),
      roll_number: s.roll_number,
      academic_year: s.academic_year_id?.label,
      gender: s.gender,
      admission_date: s.admission_date,
      attendance_pct: attMap[s._id.toString()] ?? null,
      fee_balance: feeMap[s._id.toString()] ?? 0,
    }));

    const staffList = staff.map(u => ({
      _id: u._id,
      type: 'staff',
      name: u.name,
      photo: null,
      sub: u.role.replace('_', ' '),
      email: u.email,
      joining_date: u.joining_date,
      salary_amount: u.salary_amount,
      attendance_pct: attMap[u._id.toString()] ?? null,
    }));

    res.json({ students: studentList, staff: staffList });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/reports/student/:id
const getStudentReport = async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid ID' });

    const student = await Student.findById(id)
      .populate('school_class_id', 'name section grade_level class_teacher')
      .populate('academic_year_id', 'label start_date end_date')
      .lean();
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const sid = new mongoose.Types.ObjectId(id);

    const [
      attendanceAll,
      invoicesAll,
      marksAll,
      reportCardsAll,
      finesAll,
      leavesAll,
      conductAll,
    ] = await Promise.all([
      Attendance.find({ person_id: sid, person_type: 'Student' }).sort({ date: -1 }).lean(),
      FeeInvoice.find({ student_id: sid }).sort({ month: -1 }).lean(),
      MarksEntry.find({ 'student_marks.student_id': sid })
        .populate('subject_id', 'name code')
        .sort({ exam_date: -1 })
        .lean(),
      ReportCard.find({ student_id: sid })
        .populate('subject_marks.subject_id', 'name code')
        .populate('academic_year_id', 'label')
        .sort({ createdAt: -1 })
        .lean(),
      Fine.find({ student_id: sid, target_type: 'student' }).sort({ issued_date: -1 }).lean(),
      Leave.find({ student_id: sid, applicant_type: 'student' }).sort({ from_date: -1 }).lean(),
      Conduct.find({ student_id: sid }).sort({ incident_date: -1 }).lean(),
    ]);

    // --- Attendance ---
    const attCounts = { present: 0, absent: 0, late: 0, leave: 0, half_day: 0 };
    attendanceAll.forEach(a => { if (attCounts[a.status] !== undefined) attCounts[a.status]++; });
    const attTotal   = attendanceAll.length;
    const attPresent = attCounts.present + attCounts.late + attCounts.half_day;
    const attPct     = attTotal > 0 ? Math.round((attPresent / attTotal) * 100) : 0;

    // Monthly breakdown
    const attMonthMap = {};
    attendanceAll.forEach(a => {
      const d = new Date(a.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!attMonthMap[key]) attMonthMap[key] = { month: key, present: 0, absent: 0, late: 0, leave: 0, total: 0 };
      attMonthMap[key].total++;
      if (['present', 'half_day'].includes(a.status)) attMonthMap[key].present++;
      else if (a.status === 'late') { attMonthMap[key].present++; attMonthMap[key].late++; }
      else if (a.status === 'absent') attMonthMap[key].absent++;
      else if (a.status === 'leave')  attMonthMap[key].leave++;
    });

    // --- Academic / Marks ---
    const termMap = {};
    marksAll.forEach(entry => {
      const sm = entry.student_marks?.find(m => m.student_id?.toString() === id);
      if (!sm) return;
      const key = entry.term || 'General';
      if (!termMap[key]) termMap[key] = { term: key, entries: [] };
      termMap[key].entries.push({
        subject: entry.subject_id?.name || 'Unknown',
        exam_label: entry.exam_label || entry.term,
        obtained: sm.is_absent ? null : sm.obtained_marks,
        total: entry.total_marks,
        passing: entry.passing_marks,
        is_absent: sm.is_absent,
        remarks: sm.remarks,
        exam_date: entry.exam_date,
      });
    });

    // --- Fees ---
    let feeTotal = 0, feePaid = 0, feeBalance = 0, overdueCount = 0;
    invoicesAll.forEach(inv => {
      feeTotal   += inv.total_amount || 0;
      feePaid    += inv.paid_amount  || 0;
      feeBalance += inv.balance      || 0;
      if (inv.status !== 'paid' && inv.due_date && new Date(inv.due_date) < new Date()) overdueCount++;
    });

    // --- Fines ---
    let fineIssued = 0, finePaid = 0, finePending = 0, fineWaived = 0;
    finesAll.forEach(f => {
      fineIssued += f.amount || 0;
      if (f.status === 'paid')   finePaid   += f.amount || 0;
      if (f.status === 'pending') finePending += f.amount || 0;
      if (f.status === 'waived') fineWaived += f.amount || 0;
    });

    // --- Leave ---
    let leaveApproved = 0, leavePending = 0, leaveRejected = 0, leaveTotalDays = 0;
    leavesAll.forEach(l => {
      if (l.status === 'approved') { leaveApproved++; leaveTotalDays += l.total_days || 0; }
      if (l.status === 'pending')  leavePending++;
      if (l.status === 'rejected') leaveRejected++;
    });

    // --- Conduct ---
    let meritPoints = 0, demeritPoints = 0;
    conductAll.forEach(c => {
      if (c.type === 'positive') meritPoints   += c.points || 0;
      else                       demeritPoints += c.points || 0;
    });

    res.json({
      profile: student,
      attendance: {
        summary: { ...attCounts, total: attTotal, present_effective: attPresent, percentage: attPct },
        monthly: Object.values(attMonthMap).sort((a, b) => a.month.localeCompare(b.month)),
        recent: attendanceAll.slice(0, 30),
      },
      academic: {
        by_term: termMap,
        report_cards: reportCardsAll,
        raw_entries_count: marksAll.length,
      },
      fees: {
        summary: { total: feeTotal, paid: feePaid, balance: feeBalance, overdue_count: overdueCount, invoice_count: invoicesAll.length },
        invoices: invoicesAll,
      },
      fines: {
        summary: { issued: fineIssued, paid: finePaid, pending: finePending, waived: fineWaived, count: finesAll.length },
        records: finesAll,
      },
      leave: {
        summary: { approved: leaveApproved, pending: leavePending, rejected: leaveRejected, total_days_taken: leaveTotalDays },
        records: leavesAll,
      },
      conduct: {
        summary: { merit: meritPoints, demerit: demeritPoints, net: meritPoints - demeritPoints, count: conductAll.length },
        records: conductAll,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/reports/staff/:id
const getStaffReport = async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid ID' });

    const user = await User.findById(id).select('-password').lean();
    if (!user) return res.status(404).json({ message: 'Staff not found' });

    const uid = new mongoose.Types.ObjectId(id);

    const [attendanceAll, payrollAll, leavesAll, finesAll, advancesAll] = await Promise.all([
      Attendance.find({ person_id: uid, person_type: 'User' }).sort({ date: -1 }).lean(),
      Payroll.find({ staff_id: uid }).sort({ month: -1 }).lean().catch(() => []),
      Leave.find({ staff_id: uid, applicant_type: 'staff' }).sort({ from_date: -1 }).lean(),
      Fine.find({ staff_id: uid, target_type: 'staff' }).sort({ issued_date: -1 }).lean(),
      StaffAdvance.find({ staff_id: uid }).sort({ date: -1 }).lean().catch(() => []),
    ]);

    // Attendance
    const attCounts = { present: 0, absent: 0, late: 0, leave: 0, half_day: 0 };
    attendanceAll.forEach(a => { if (attCounts[a.status] !== undefined) attCounts[a.status]++; });
    const attTotal   = attendanceAll.length;
    const attPresent = attCounts.present + attCounts.late + attCounts.half_day;

    const attMonthMap = {};
    attendanceAll.forEach(a => {
      const d = new Date(a.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!attMonthMap[key]) attMonthMap[key] = { month: key, present: 0, absent: 0, late: 0, total: 0 };
      attMonthMap[key].total++;
      if (['present', 'half_day'].includes(a.status)) attMonthMap[key].present++;
      else if (a.status === 'late') { attMonthMap[key].present++; attMonthMap[key].late++; }
      else if (a.status === 'absent') attMonthMap[key].absent++;
    });

    // Payroll
    let totalSalaryPaid = 0, totalDeductions = 0;
    payrollAll.forEach(p => {
      totalSalaryPaid += p.net_salary || p.amount || 0;
      totalDeductions += p.deductions || 0;
    });

    // Leave
    let leaveApproved = 0, leavePending = 0, leaveRejected = 0, leaveTotalDays = 0;
    leavesAll.forEach(l => {
      if (l.status === 'approved') { leaveApproved++; leaveTotalDays += l.total_days || 0; }
      if (l.status === 'pending')  leavePending++;
      if (l.status === 'rejected') leaveRejected++;
    });

    // Fines
    let fineIssued = 0, finePaid = 0, finePending = 0;
    finesAll.forEach(f => {
      fineIssued += f.amount || 0;
      if (f.status === 'paid')    finePaid    += f.amount || 0;
      if (f.status === 'pending') finePending += f.amount || 0;
    });

    // Advances
    let advTotal = 0, advRecovered = 0;
    advancesAll.forEach(a => {
      advTotal     += a.amount          || 0;
      advRecovered += a.recovered_amount || 0;
    });

    res.json({
      profile: user,
      attendance: {
        summary: { ...attCounts, total: attTotal, present_effective: attPresent, percentage: attTotal > 0 ? Math.round((attPresent / attTotal) * 100) : 0 },
        monthly: Object.values(attMonthMap).sort((a, b) => a.month.localeCompare(b.month)),
        recent: attendanceAll.slice(0, 30),
      },
      payroll: {
        summary: { total_paid: totalSalaryPaid, total_deductions: totalDeductions, months_count: payrollAll.length },
        records: payrollAll,
      },
      leave: {
        summary: { approved: leaveApproved, pending: leavePending, rejected: leaveRejected, total_days_taken: leaveTotalDays },
        records: leavesAll,
      },
      fines: {
        summary: { issued: fineIssued, paid: finePaid, pending: finePending, count: finesAll.length },
        records: finesAll,
      },
      advances: {
        summary: { total: advTotal, recovered: advRecovered, outstanding: advTotal - advRecovered, count: advancesAll.length },
        records: advancesAll,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getPeople, getStudentReport, getStaffReport };
