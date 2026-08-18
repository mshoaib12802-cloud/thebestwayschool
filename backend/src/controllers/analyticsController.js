const Student     = require('../models/Student');
const User        = require('../models/User');
const Attendance  = require('../models/Attendance');
const FeeInvoice  = require('../models/FeeInvoice');
const ReportCard  = require('../models/ReportCard');
const Transaction = require('../models/Transaction');
const SchoolClass= require('../models/SchoolClass');

// ── OVERVIEW ──────────────────────────────────────────────────────────────────
const getOverview = async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today); todayEnd.setHours(23, 59, 59, 999);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [totalStudents, totalStaff, totalClasses, todayPresent, todayMarked] = await Promise.all([
      Student.countDocuments({ isActive: true }),
      User.countDocuments({ role: { $in: ['teacher', 'admin', 'clerk', 'accountant'] } }),
      SchoolClass.countDocuments(),
      Attendance.countDocuments({ person_type: 'Student', date: { $gte: today, $lte: todayEnd }, status: { $in: ['present', 'late'] } }),
      Attendance.countDocuments({ person_type: 'Student', date: { $gte: today, $lte: todayEnd } }),
    ]);

    // Month fee collection
    const feeAgg = await FeeInvoice.aggregate([
      { $match: { createdAt: { $gte: monthStart } } },
      { $group: { _id: null, collected: { $sum: '$paid_amount' }, invoiced: { $sum: '$total_amount' } } },
    ]);
    const feeData = feeAgg[0] || { collected: 0, invoiced: 0 };

    // Academic average
    const rcAgg = await ReportCard.aggregate([
      { $group: { _id: null, avg: { $avg: '$percentage' }, total: { $sum: 1 } } },
    ]);
    const rcData = rcAgg[0] || { avg: 0, total: 0 };

    // Unpaid invoices count
    const unpaidCount = await FeeInvoice.countDocuments({ status: { $in: ['unpaid', 'partial'] } });

    res.json({
      totalStudents,
      totalStaff,
      totalClasses,
      todayAttendance: todayMarked > 0 ? Math.round(todayPresent / todayMarked * 100) : null,
      todayPresent,
      todayMarked,
      feeCollected: feeData.collected,
      feeInvoiced:  feeData.invoiced,
      feeRate: feeData.invoiced > 0 ? Math.round(feeData.collected / feeData.invoiced * 100) : 0,
      avgAcademic: rcData.total > 0 ? Math.round(rcData.avg * 10) / 10 : null,
      totalReportCards: rcData.total,
      unpaidInvoices: unpaidCount,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── ATTENDANCE TRENDS ─────────────────────────────────────────────────────────
const getAttendanceTrends = async (req, res) => {
  try {
    const months = Math.min(parseInt(req.query.months) || 6, 12);
    const now = new Date();
    const result = [];

    for (let i = months - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end   = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

      const [present, total] = await Promise.all([
        Attendance.countDocuments({ person_type: 'Student', date: { $gte: start, $lte: end }, status: { $in: ['present', 'late'] } }),
        Attendance.countDocuments({ person_type: 'Student', date: { $gte: start, $lte: end } }),
      ]);

      result.push({
        label:   start.toLocaleString('en', { month: 'short', year: '2-digit' }),
        month:   start.toLocaleString('en', { month: 'short' }),
        present,
        absent:  total - present,
        total,
        rate:    total > 0 ? Math.round(present / total * 100) : 0,
      });
    }
    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── FEE TRENDS ────────────────────────────────────────────────────────────────
const getFeeTrends = async (req, res) => {
  try {
    const months = Math.min(parseInt(req.query.months) || 6, 12);
    const now = new Date();
    const result = [];

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      const agg = await FeeInvoice.aggregate([
        { $match: { month: monthStr } },
        { $group: { _id: null, invoiced: { $sum: '$total_amount' }, collected: { $sum: '$paid_amount' }, count: { $sum: 1 } } },
      ]);
      const data = agg[0] || { invoiced: 0, collected: 0, count: 0 };

      result.push({
        label:     d.toLocaleString('en', { month: 'short', year: '2-digit' }),
        month:     d.toLocaleString('en', { month: 'short' }),
        invoiced:  data.invoiced,
        collected: data.collected,
        pending:   data.invoiced - data.collected,
        rate:      data.invoiced > 0 ? Math.round(data.collected / data.invoiced * 100) : 0,
        count:     data.count,
      });
    }
    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── ACADEMIC PERFORMANCE ──────────────────────────────────────────────────────
const getAcademicPerformance = async (req, res) => {
  try {
    const [gradeAgg, classAgg, termAgg] = await Promise.all([
      ReportCard.aggregate([
        { $group: { _id: '$grade', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      ReportCard.aggregate([
        { $group: { _id: '$class_id', avg: { $avg: '$percentage' }, count: { $sum: 1 }, passCount: { $sum: { $cond: [{ $ne: ['$grade', 'F'] }, 1, 0] } } } },
        { $lookup: { from: 'schoolclasses', localField: '_id', foreignField: '_id', as: 'cls' } },
        { $unwind: { path: '$cls', preserveNullAndEmptyArrays: true } },
        { $project: { name: { $concat: [{ $ifNull: ['$cls.name', '?'] }, ' ', { $ifNull: ['$cls.section', ''] }] }, avg: { $round: ['$avg', 1] }, count: 1, passCount: 1 } },
        { $sort: { avg: -1 } },
      ]),
      ReportCard.aggregate([
        { $group: { _id: '$term', count: { $sum: 1 }, avg: { $avg: '$percentage' } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const GRADE_ORDER = ['A+', 'A', 'B', 'C', 'D', 'F'];
    const gradeMap = {};
    gradeAgg.forEach(g => { gradeMap[g._id] = g.count; });

    res.json({
      gradeDistribution: GRADE_ORDER.map(g => ({ grade: g, count: gradeMap[g] || 0 })),
      classPerformance:  classAgg.map(c => ({ name: c.name.trim(), avg: c.avg, count: c.count, passRate: c.count > 0 ? Math.round(c.passCount / c.count * 100) : 0 })),
      termData:          termAgg.map(t => ({ term: t._id, count: t.count, avg: Math.round(t.avg * 10) / 10 })),
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── AT-RISK STUDENTS ──────────────────────────────────────────────────────────
const getAtRiskStudents = async (req, res) => {
  try {
    const attThreshold  = parseInt(req.query.attendance_threshold) || 75;
    const since = new Date(); since.setDate(since.getDate() - 30); since.setHours(0,0,0,0);

    const students = await Student.find({ isActive: true })
      .select('_id full_name roll_number school_class_id')
      .populate('school_class_id', 'name section')
      .lean();

    const atRisk = [];

    for (const s of students) {
      const [total, present] = await Promise.all([
        Attendance.countDocuments({ person_id: s._id, person_type: 'Student', date: { $gte: since } }),
        Attendance.countDocuments({ person_id: s._id, person_type: 'Student', date: { $gte: since }, status: { $in: ['present', 'late'] } }),
      ]);

      const attRate   = total > 0 ? Math.round(present / total * 100) : null;
      const latestCard= await ReportCard.findOne({ student_id: s._id }).sort({ createdAt: -1 }).select('grade percentage term').lean();

      const lowAtt    = attRate !== null && attRate < attThreshold;
      const lowGrade  = latestCard && (latestCard.grade === 'F' || latestCard.percentage < 50);

      if (lowAtt || lowGrade) {
        atRisk.push({
          _id:            s._id,
          full_name:      s.full_name,
          roll_number:    s.roll_number,
          class:          s.school_class_id ? `${s.school_class_id.name} ${s.school_class_id.section || ''}`.trim() : '—',
          attendanceRate: attRate,
          attendanceDays: total,
          grade:          latestCard?.grade       || null,
          percentage:     latestCard?.percentage  || null,
          term:           latestCard?.term        || null,
          risk:           (lowAtt && lowGrade) ? 'high' : 'medium',
          flags: [
            ...(lowAtt   ? [`Attendance: ${attRate}%`]                        : []),
            ...(lowGrade ? [`Grade: ${latestCard.grade} (${latestCard.percentage}%)`] : []),
          ],
        });
      }
    }

    atRisk.sort((a, b) => {
      if (a.risk !== b.risk) return a.risk === 'high' ? -1 : 1;
      return (a.attendanceRate ?? 100) - (b.attendanceRate ?? 100);
    });

    res.json(atRisk.slice(0, 60));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── ENROLLMENT ────────────────────────────────────────────────────────────────
const getEnrollment = async (req, res) => {
  try {
    const classes = await SchoolClass.find().select('name section grade_level').lean();
    const result  = [];

    for (const cls of classes) {
      const [total, male, female] = await Promise.all([
        Student.countDocuments({ school_class_id: cls._id, isActive: true }),
        Student.countDocuments({ school_class_id: cls._id, isActive: true, gender: 'male' }),
        Student.countDocuments({ school_class_id: cls._id, isActive: true, gender: 'female' }),
      ]);
      if (total > 0)
        result.push({ name: `${cls.name} ${cls.section || ''}`.trim(), total, male, female });
    }

    result.sort((a, b) => b.total - a.total);
    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── FINANCIAL DASHBOARD ───────────────────────────────────────────────────────
const getFinancialDashboard = async (req, res) => {
  try {
    const months = 12;
    const now = new Date();
    const monthly = [];

    for (let i = months - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end   = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const label = start.toLocaleString('en', { month: 'short', year: '2-digit' });

      const [incAgg, expAgg] = await Promise.all([
        Transaction.aggregate([
          { $match: { type: 'income', date: { $gte: start, $lte: end } } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Transaction.aggregate([
          { $match: { type: 'expense', date: { $gte: start, $lte: end } } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
      ]);

      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const feeAgg = await FeeInvoice.aggregate([
        { $match: { month: monthStr } },
        { $group: { _id: null, invoiced: { $sum: '$total_amount' }, collected: { $sum: '$paid_amount' } } },
      ]);
      const fee = feeAgg[0] || { invoiced: 0, collected: 0 };
      const income  = incAgg[0]?.total  || 0;
      const expense = expAgg[0]?.total  || 0;

      monthly.push({ label, income, expense, profit: income - expense, feeInvoiced: fee.invoiced, feeCollected: fee.collected });
    }

    // This month totals
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [thisInc, thisExp, unpaid, partial, paid] = await Promise.all([
      Transaction.aggregate([{ $match: { type: 'income',  date: { $gte: thisMonthStart } } }, { $group: { _id: null, t: { $sum: '$amount' } } }]),
      Transaction.aggregate([{ $match: { type: 'expense', date: { $gte: thisMonthStart } } }, { $group: { _id: null, t: { $sum: '$amount' } } }]),
      FeeInvoice.countDocuments({ status: 'unpaid' }),
      FeeInvoice.countDocuments({ status: 'partial' }),
      FeeInvoice.countDocuments({ status: 'paid' }),
    ]);

    // Expense breakdown by category (all time, top 8)
    const catAgg = await Transaction.aggregate([
      { $match: { type: 'expense' } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
      { $limit: 8 },
    ]);

    // Income breakdown by category (all time, top 8)
    const incCatAgg = await Transaction.aggregate([
      { $match: { type: 'income' } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
      { $limit: 8 },
    ]);

    res.json({
      monthly,
      thisMonth: {
        income:  thisInc[0]?.t  || 0,
        expense: thisExp[0]?.t  || 0,
      },
      feeStatus: { unpaid, partial, paid, total: unpaid + partial + paid },
      expenseByCategory: catAgg.map(c => ({ category: c._id || 'Other', amount: c.total })),
      incomeByCategory:  incCatAgg.map(c => ({ category: c._id || 'Other', amount: c.total })),
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { getOverview, getAttendanceTrends, getFeeTrends, getAcademicPerformance, getAtRiskStudents, getEnrollment, getFinancialDashboard };
