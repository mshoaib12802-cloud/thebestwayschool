const Student = require('../models/Student');
const User = require('../models/User');
const Visitor = require('../models/Visitor');
const Transaction = require('../models/Transaction');
const Attendance = require('../models/Attendance');
const Fine = require('../models/Fine');
const Course = require('../models/Course');
const CourseModule = require('../models/CourseModule');
const Result = require('../models/Result');

const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // ── 1. COUNTS ──────────────────────────────────────────────
    const [totalStudents, totalStaff, totalLeads, pendingFollowUps, newStudentsThisMonth] = await Promise.all([
      Student.countDocuments({ isActive: true }),
      User.countDocuments({ role: { $in: ['teacher', 'clerk', 'office_boy'] } }),
      Visitor.countDocuments(),
      Visitor.countDocuments({
        follow_up_date: { $lte: now },
        status: { $nin: ['converted', 'lost'] }
      }),
      Student.countDocuments({
        createdAt: {
          $gte: new Date(currentYear, currentMonth, 1),
          $lte: new Date(currentYear, currentMonth + 1, 0, 23, 59, 59)
        }
      })
    ]);

    // ── 2. ALL-TIME FINANCE TOTALS ──────────────────────────────
    const financeStats = await Transaction.aggregate([
      { $group: { _id: '$type', total: { $sum: '$amount' } } }
    ]);
    let income = 0, expense = 0;
    financeStats.forEach(s => {
      if (s._id === 'income') income = s.total;
      if (s._id === 'expense') expense = s.total;
    });

    // ── 3. CURRENT MONTH SUMMARY ────────────────────────────────
    const monthStart = new Date(currentYear, currentMonth, 1);
    const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

    const monthTxns = await Transaction.find({ date: { $gte: monthStart, $lte: monthEnd } });
    let monthIncome = 0, monthExpense = 0, monthCommissions = 0;
    monthTxns.forEach(t => {
      if (t.type === 'income') monthIncome += t.amount;
      else if (t.type === 'expense') {
        monthExpense += t.amount;
        if (t.category === 'trainer_commission') monthCommissions += t.amount;
      }
    });

    // Unpaid students this month
    const activeStudents = await Student.find({ isActive: true }).select('_id courses');
    const paidStudentIds = new Set(
      monthTxns
        .filter(t => t.category === 'fee_collection' && t.student_id)
        .map(t => t.student_id.toString())
    );
    const unpaidCount = activeStudents.filter(s => !paidStudentIds.has(s._id.toString())).length;
    const unpaidAmount = activeStudents
      .filter(s => !paidStudentIds.has(s._id.toString()))
      .reduce((sum, s) => sum + (s.courses[0]?.monthly_fee || 0), 0);

    // ── 4. LAST 6 MONTHS REVENUE TREND ─────────────────────────
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      const txns = await Transaction.aggregate([
        { $match: { date: { $gte: start, $lte: end } } },
        { $group: { _id: '$type', total: { $sum: '$amount' } } }
      ]);

      let mIncome = 0, mExpense = 0;
      txns.forEach(t => {
        if (t._id === 'income') mIncome = t.total;
        if (t._id === 'expense') mExpense = t.total;
      });

      monthlyTrend.push({
        month: d.toLocaleString('default', { month: 'short' }),
        income: mIncome,
        expense: mExpense,
        profit: mIncome - mExpense
      });
    }

    // ── 5. TODAY'S ATTENDANCE ───────────────────────────────────
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayAttendance = await Attendance.countDocuments({
      date: { $gte: today, $lte: todayEnd },
      status: 'present'
    });

    // ── 6. FINES DATA ───────────────────────────────────────────
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
      student_pending_count: studentFinesPending[0]?.count || 0,
      staff_pending_amount: staffFinesPending[0]?.total || 0,
      staff_pending_count: staffFinesPending[0]?.count || 0,
      total_pending: (studentFinesPending[0]?.total || 0) + (staffFinesPending[0]?.total || 0),
      collected_this_month: finesCollectedThisMonth[0]?.total || 0,
      category_breakdown: fineCategoryBreakdown.map(c => ({
        category: c._id,
        amount: c.total,
        count: c.count,
      })),
    };

    // ── 7. COURSE MODULE STATS ─────────────────────────────────
    const [modAgg, allCourses, perCourseModAgg, enrollAgg] = await Promise.all([
      CourseModule.aggregate([
        { $group: {
          _id: null,
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          in_progress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } }
        }}
      ]),
      Course.find().lean(),
      CourseModule.aggregate([
        { $group: {
          _id: '$course_id',
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          in_progress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } }
        }}
      ]),
      Student.aggregate([
        { $match: { isActive: true } },
        { $unwind: '$courses' },
        { $group: { _id: '$courses.course_name', count: { $sum: 1 } } }
      ])
    ]);
    const modRaw = modAgg[0] || { total: 0, completed: 0, in_progress: 0 };
    const moduleData = {
      total: modRaw.total,
      completed: modRaw.completed,
      in_progress: modRaw.in_progress,
      upcoming: modRaw.total - modRaw.completed - modRaw.in_progress,
      progress_pct: modRaw.total > 0 ? Math.round((modRaw.completed / modRaw.total) * 100) : 0
    };

    const perCourseModMap = {};
    perCourseModAgg.forEach(m => { perCourseModMap[m._id?.toString()] = m; });
    const enrollMap = {};
    enrollAgg.forEach(e => { enrollMap[e._id] = e.count; });
    const courseProgress = allCourses.map(c => {
      const m = perCourseModMap[c._id.toString()] || { total: 0, completed: 0, in_progress: 0 };
      return {
        course_id: c._id,
        course_name: c.name,
        student_count: enrollMap[c.name] || 0,
        total: m.total,
        completed: m.completed,
        in_progress: m.in_progress,
        upcoming: m.total - m.completed - m.in_progress,
        progress_pct: m.total > 0 ? Math.round((m.completed / m.total) * 100) : 0
      };
    });

    // ── 8. RECENT ADMISSIONS ────────────────────────────────────
    const recentStudents = await Student.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(6)
      .select('full_name roll_number courses createdAt');

    // ── 9. CHART DATA (Income vs Expense — simple 2-bar) ────────
    const chartData = [
      { name: 'Income', amount: income },
      { name: 'Expense', amount: expense }
    ];

    res.json({
      counts: {
        students: totalStudents,
        staff: totalStaff,
        leads: totalLeads,
        pending_followups: pendingFollowUps,
        new_this_month: newStudentsThisMonth,
        today_present: todayAttendance
      },
      finance: {
        income,
        expense,
        profit: income - expense
      },
      thisMonth: {
        income: monthIncome,
        expense: monthExpense,
        commissions: monthCommissions,
        profit: monthIncome - monthExpense,
        unpaid_count: unpaidCount,
        unpaid_amount: unpaidAmount
      },
      monthlyTrend,
      recentStudents,
      chartData,
      fines: finesData,
      modules: moduleData,
      courseProgress
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getAtRiskStudents = async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const daysPassed = now.getDate();

    const students = await Student.find({ isActive: true })
      .select('full_name roll_number phone courses admission_date')
      .lean();

    const studentIds = students.map(s => s._id);

    // ── Attendance this month (per student) ──────────────────────
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

    // ── Fee payments per student (all-time) ──────────────────────
    const feeAgg = await Transaction.aggregate([
      { $match: { type: 'income', category: 'fee_collection', student_id: { $in: studentIds } } },
      { $group: { _id: '$student_id', paid: { $sum: '$amount' } } }
    ]);
    const feeMap = {};
    feeAgg.forEach(f => { if (f._id) feeMap[f._id.toString()] = f.paid; });

    // ── Failed results (grade F) per student ─────────────────────
    const failAgg = await Result.aggregate([
      { $match: { student_id: { $in: studentIds }, grade: 'F' } },
      { $group: { _id: '$student_id', count: { $sum: 1 } } }
    ]);
    const failMap = {};
    failAgg.forEach(f => { if (f._id) failMap[f._id.toString()] = f.count; });

    // ── Evaluate each student ────────────────────────────────────
    const atRisk = [];

    for (const s of students) {
      const id = s._id.toString();
      const course = s.courses?.[0] || {};
      const reasons = [];

      // 1. Low attendance (< 70% of days marked so far this month)
      const att = attMap[id];
      if (att && att.total > 0) {
        const pct = Math.round((att.present / att.total) * 100);
        if (pct < 70) reasons.push({ type: 'attendance', label: `Attendance ${pct}%`, pct });
      } else if (daysPassed >= 7) {
        // 7+ days into the month and zero records → completely untracked
        reasons.push({ type: 'attendance', label: 'Not tracked', pct: 0 });
      }

      // 2. Outstanding fee balance
      const netPayable = (course.total_fee || 0) - (course.discount_amount || 0);
      const paid = feeMap[id] || 0;
      const balance = netPayable - paid;
      if (balance > 0) {
        // Only flag if admitted more than 30 days ago
        const admitDate = course.admission_date ? new Date(course.admission_date) : new Date(s.admission_date || 0);
        const daysSinceAdmit = Math.floor((now - admitDate) / (1000 * 60 * 60 * 24));
        if (daysSinceAdmit >= 30) {
          reasons.push({ type: 'fee', label: `Rs.${balance.toLocaleString()} due`, balance });
        }
      }

      // 3. Failing exam result
      const failCount = failMap[id] || 0;
      if (failCount > 0) {
        reasons.push({ type: 'result', label: `${failCount} failed exam${failCount > 1 ? 's' : ''}`, count: failCount });
      }

      if (reasons.length > 0) {
        atRisk.push({
          _id: s._id,
          full_name: s.full_name,
          roll_number: s.roll_number,
          phone: s.phone,
          course_name: course.course_name || '—',
          reasons,
          risk_level: reasons.length >= 2 ? 'high' : 'medium',
        });
      }
    }

    // Sort: high risk first, then by number of reasons desc
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
