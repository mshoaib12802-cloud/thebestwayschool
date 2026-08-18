const Student      = require('../models/Student');
const User         = require('../models/User');
const Visitor      = require('../models/Visitor');
const Transaction  = require('../models/Transaction');
const Attendance   = require('../models/Attendance');
const Fine         = require('../models/Fine');
const Course       = require('../models/Course');
const CourseModule = require('../models/CourseModule');
const Result       = require('../models/Result');
const FeeInvoice   = require('../models/FeeInvoice');
const SchoolClass  = require('../models/SchoolClass');

const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear  = now.getFullYear();
    const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const monthStart = new Date(currentYear, currentMonth, 1);
    const monthEnd   = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

    // ── 1. COUNTS ──────────────────────────────────────────────────
    const [totalStudents, totalStaff, totalLeads, pendingFollowUps, newStudentsThisMonth, totalClasses] = await Promise.all([
      Student.countDocuments({ isActive: true }),
      User.countDocuments({ role: { $in: ['teacher', 'clerk', 'office_boy'] } }),
      Visitor.countDocuments(),
      Visitor.countDocuments({ follow_up_date: { $lte: now }, status: { $nin: ['converted', 'lost'] } }),
      Student.countDocuments({
        createdAt: { $gte: monthStart, $lte: monthEnd }
      }),
      SchoolClass.countDocuments({ is_active: true }),
    ]);

    // ── 2. ALL-TIME FINANCE TOTALS (from Transaction) ──────────────
    const financeStats = await Transaction.aggregate([
      { $group: { _id: '$type', total: { $sum: '$amount' } } }
    ]);
    let allTimeIncome = 0, allTimeExpense = 0;
    financeStats.forEach(s => {
      if (s._id === 'income')  allTimeIncome  = s.total;
      if (s._id === 'expense') allTimeExpense = s.total;
    });

    // ── 3. CURRENT MONTH FINANCE (from Transaction) ─────────────────
    const monthTxns = await Transaction.find({ date: { $gte: monthStart, $lte: monthEnd } });
    let monthIncome = 0, monthExpense = 0, monthCommissions = 0;
    monthTxns.forEach(t => {
      if (t.type === 'income') monthIncome += t.amount;
      else if (t.type === 'expense') {
        monthExpense += t.amount;
        if (t.category === 'trainer_commission') monthCommissions += t.amount;
      }
    });

    // ── 4. FEE STATS FROM FeeInvoice (current month) ───────────────
    const feeAgg = await FeeInvoice.aggregate([
      { $match: { month: monthStr } },
      {
        $group: {
          _id: null,
          total_billed:    { $sum: '$total_amount' },
          total_collected: { $sum: '$paid_amount' },
          total_pending:   { $sum: '$balance' },
          unpaid_count:    { $sum: { $cond: [{ $eq: ['$status', 'unpaid']  }, 1, 0] } },
          partial_count:   { $sum: { $cond: [{ $eq: ['$status', 'partial'] }, 1, 0] } },
          paid_count:      { $sum: { $cond: [{ $eq: ['$status', 'paid']    }, 1, 0] } },
        }
      }
    ]);
    const fee = feeAgg[0] || { total_billed: 0, total_collected: 0, total_pending: 0, unpaid_count: 0, partial_count: 0, paid_count: 0 };

    // ── 5. ALL-TIME FEE STATS FROM FeeInvoice ─────────────────────
    const allFeeAgg = await FeeInvoice.aggregate([
      {
        $group: {
          _id: null,
          total_billed:    { $sum: '$total_amount' },
          total_collected: { $sum: '$paid_amount' },
          total_pending:   { $sum: '$balance' },
        }
      }
    ]);
    const allFee = allFeeAgg[0] || { total_billed: 0, total_collected: 0, total_pending: 0 };

    // ── 6. LAST 6 MONTHS REVENUE TREND ────────────────────────────
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d       = new Date(currentYear, currentMonth - i, 1);
      const start   = new Date(d.getFullYear(), d.getMonth(), 1);
      const end     = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const mStr    = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      const [txnAgg, mFeeAgg] = await Promise.all([
        Transaction.aggregate([
          { $match: { date: { $gte: start, $lte: end } } },
          { $group: { _id: '$type', total: { $sum: '$amount' } } }
        ]),
        FeeInvoice.aggregate([
          { $match: { month: mStr } },
          { $group: { _id: null, billed: { $sum: '$total_amount' }, collected: { $sum: '$paid_amount' } } }
        ]),
      ]);

      let mIncome = 0, mExpense = 0;
      txnAgg.forEach(t => {
        if (t._id === 'income')  mIncome  = t.total;
        if (t._id === 'expense') mExpense = t.total;
      });

      const mFee = mFeeAgg[0] || { billed: 0, collected: 0 };

      monthlyTrend.push({
        month: d.toLocaleString('default', { month: 'short' }),
        income:    mFee.collected || mIncome,
        expense:   mExpense,
        profit:    (mFee.collected || mIncome) - mExpense,
        feeInvoiced:  mFee.billed,
        feeCollected: mFee.collected,
      });
    }

    // ── 7. FINES DATA ──────────────────────────────────────────────
    const [studentFinesPending, staffFinesPending, fineCategoryBreakdown, finesCollectedThisMonth] = await Promise.all([
      Fine.aggregate([
        { $match: { target_type: 'student', status: 'pending' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Fine.aggregate([
        { $match: { target_type: 'staff', status: 'pending' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Fine.aggregate([
        { $match: { status: { $in: ['pending', 'paid'] } } },
        { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Fine.aggregate([
        { $match: { status: 'paid', paid_date: { $gte: monthStart, $lte: monthEnd } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
    ]);

    const finesData = {
      student_pending_amount: studentFinesPending[0]?.total || 0,
      student_pending_count:  studentFinesPending[0]?.count || 0,
      staff_pending_amount:   staffFinesPending[0]?.total   || 0,
      staff_pending_count:    staffFinesPending[0]?.count   || 0,
      total_pending: (studentFinesPending[0]?.total || 0) + (staffFinesPending[0]?.total || 0),
      collected_this_month: finesCollectedThisMonth[0]?.total || 0,
      category_breakdown: fineCategoryBreakdown.map(c => ({
        category: c._id,
        amount: c.total,
        count: c.count,
      })),
    };

    // ── 8. RECENT ADMISSIONS ───────────────────────────────────────
    const recentStudents = await Student.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(6)
      .select('full_name roll_number school_class_id createdAt')
      .populate('school_class_id', 'name section');

    res.json({
      counts: {
        students:         totalStudents,
        staff:            totalStaff,
        leads:            totalLeads,
        pending_followups: pendingFollowUps,
        new_this_month:   newStudentsThisMonth,
        classes:          totalClasses,
      },
      finance: {
        income:  allTimeIncome,
        expense: allTimeExpense,
        profit:  allTimeIncome - allTimeExpense,
      },
      thisMonth: {
        income:           monthIncome,
        expense:          monthExpense,
        commissions:      monthCommissions,
        profit:           monthIncome - monthExpense,
        // FeeInvoice-based fee stats (most accurate)
        fee_collected:    fee.total_collected,
        fee_billed:       fee.total_billed,
        fee_pending:      fee.total_pending,
        unpaid_count:     fee.unpaid_count + fee.partial_count,
        unpaid_amount:    fee.total_pending,
      },
      allTimeFee: {
        billed:    allFee.total_billed,
        collected: allFee.total_collected,
        pending:   allFee.total_pending,
      },
      monthlyTrend,
      recentStudents,
      fines: finesData,
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getAtRiskStudents = async (req, res) => {
  try {
    const now = new Date();
    const monthStart  = new Date(now.getFullYear(), now.getMonth(), 1);
    const daysPassed  = now.getDate();

    const students = await Student.find({ isActive: true })
      .select('full_name roll_number phone school_class_id admission_date')
      .populate('school_class_id', 'name section')
      .lean();

    const studentIds = students.map(s => s._id);

    // ── Attendance this month ──────────────────────────────────────
    const attAgg = await Attendance.aggregate([
      { $match: { person_type: 'Student', person_id: { $in: studentIds }, date: { $gte: monthStart, $lte: now } } },
      { $group: {
        _id: '$person_id',
        present: { $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] } },
        total:   { $sum: 1 }
      }}
    ]);
    const attMap = {};
    attAgg.forEach(a => { attMap[a._id.toString()] = a; });

    // ── Unpaid fee balance from FeeInvoice ────────────────────────
    const feeAgg = await FeeInvoice.aggregate([
      { $match: { student_id: { $in: studentIds }, status: { $in: ['unpaid', 'partial'] } } },
      { $group: { _id: '$student_id', balance: { $sum: '$balance' }, count: { $sum: 1 } } }
    ]);
    const feeMap = {};
    feeAgg.forEach(f => { if (f._id) feeMap[f._id.toString()] = f; });

    // ── Failed results ─────────────────────────────────────────────
    const failAgg = await Result.aggregate([
      { $match: { student_id: { $in: studentIds }, grade: 'F' } },
      { $group: { _id: '$student_id', count: { $sum: 1 } } }
    ]);
    const failMap = {};
    failAgg.forEach(f => { if (f._id) failMap[f._id.toString()] = f.count; });

    // ── Evaluate each student ──────────────────────────────────────
    const atRisk = [];

    for (const s of students) {
      const id      = s._id.toString();
      const reasons = [];
      const clsName = s.school_class_id ? `${s.school_class_id.name}-${s.school_class_id.section}` : '—';

      // 1. Low attendance
      const att = attMap[id];
      if (att && att.total > 0) {
        const pct = Math.round((att.present / att.total) * 100);
        if (pct < 70) reasons.push({ type: 'attendance', label: `Attendance ${pct}%`, pct });
      } else if (daysPassed >= 7) {
        reasons.push({ type: 'attendance', label: 'Not tracked', pct: 0 });
      }

      // 2. Unpaid fee balance (from FeeInvoice)
      const feeInfo = feeMap[id];
      if (feeInfo && feeInfo.balance > 0) {
        const admitDate  = new Date(s.admission_date || 0);
        const daysSince  = Math.floor((now - admitDate) / 86400000);
        if (daysSince >= 30 || feeInfo.count > 1) {
          reasons.push({ type: 'fee', label: `Rs.${feeInfo.balance.toLocaleString()} due`, balance: feeInfo.balance });
        }
      }

      // 3. Failed results
      const failCount = failMap[id] || 0;
      if (failCount > 0) {
        reasons.push({ type: 'result', label: `${failCount} failed exam${failCount > 1 ? 's' : ''}`, count: failCount });
      }

      if (reasons.length > 0) {
        atRisk.push({
          _id:         s._id,
          full_name:   s.full_name,
          roll_number: s.roll_number,
          phone:       s.phone,
          class_name:  clsName,
          reasons,
          risk_level:  reasons.length >= 2 ? 'high' : 'medium',
        });
      }
    }

    atRisk.sort((a, b) => {
      if (a.risk_level !== b.risk_level) return a.risk_level === 'high' ? -1 : 1;
      return b.reasons.length - a.reasons.length;
    });

    res.json(atRisk.slice(0, 30));
  } catch (error) {
    console.error('At-risk error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getDashboardStats, getAtRiskStudents };
