const Transaction = require('../models/Transaction');
const Student = require('../models/Student');
const User = require('../models/User');
const RecurringExpense = require('../models/RecurringExpense');
const { sendEmail, sendSalarySlipEmail } = require('../utils/sendEmail');
const { notifyStudent } = require('../utils/notify');

// --- 1. COLLECT FEE (With Email & Crash Fix) ---
const collectFee = async (req, res) => {
  try {
    const { student_id, amount, description, payment_method, date } = req.body;

    // Crash Fix: Check if user exists
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'User not found. Please relogin.' });
    }

    const paymentDate = date ? new Date(date) : new Date();
    const paidAmount = Number(amount);

    // 1. Transaction Save
    await Transaction.create({
      type: 'income',
      category: 'fee_collection',
      amount: paidAmount,
      description: description || 'Monthly/Installment Fee',
      payment_method: payment_method || 'cash',
      student_id,
      date: paymentDate,
      recorded_by: req.user._id
    });

    // 2. Student Info for Email + trainer commission
    const student = await Student.findById(student_id).populate('courses.trainer_id', 'name commission_percent');

    // 3. Auto-create trainer commission transaction
    const course = student?.courses?.[0];
    if (course?.trainer_id && course.trainer_commission_percent > 0) {
      const commissionAmount = parseFloat(((paidAmount * course.trainer_commission_percent) / 100).toFixed(2));
      await Transaction.create({
        type: 'expense',
        category: 'trainer_commission',
        amount: commissionAmount,
        description: `Commission (${course.trainer_commission_percent}%) on fee from ${student.full_name}`,
        payment_method: 'account',
        student_id,
        staff_id: course.trainer_id._id,
        date: paymentDate,
        recorded_by: req.user._id
      });
    }

    // 3. Calculate Total Collection till date
    const allIncome = await Transaction.aggregate([
      { $match: { type: 'income', category: 'fee_collection' } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const totalCollection = allIncome[0]?.total || 0;

    // 4. Send Email to Admin
    // (Note: sendEmail.js file backend/src/utils folder mein honi chahiye)
    try {
      const emailSubject = `💰 Payment Recieved: Rs. ${amount} - ${student.full_name}`;
      const emailBody = `
        Hello Admin,

        New Fee Payment Recorded:
        -------------------------
        Student: ${student.full_name} (${student.roll_number})
        Amount Paid: Rs. ${amount}
        Date: ${new Date().toLocaleDateString()}
        Collected By: ${req.user.name}

        -------------------------
        TOTAL REVENUE TO DATE: Rs. ${totalCollection.toLocaleString()}
        -------------------------
      `;
      
      // Apni owner email yahan likhein
      await sendEmail(process.env.ADMIN_EMAIL || 'admin@inflorescence.com', emailSubject, emailBody);
    } catch (emailError) {
      console.log("Email sending failed, but fee collected.");
    }

    // Notify student
    if (student?.user_id) {
      notifyStudent(student._id,
        'Fee Payment Received',
        `Rs. ${paidAmount.toLocaleString()} received on ${paymentDate.toLocaleDateString('en-PK')}. Thank you!`,
        'fee', '/student-portal/fees'
      );
    }

    res.status(201).json({ message: 'Fee Collected Successfully!' });
  } catch (error) {
    console.error("Fee Error:", error);
    res.status(400).json({ message: error.message });
  }
};

// --- 2. ADD EXPENSE ---
const addExpense = async (req, res) => {
  try {
    const { title, amount, category, date } = req.body;
    await Transaction.create({
      type: 'expense',
      category: category || 'maintenance',
      amount,
      description: title,
      date: date ? new Date(date) : new Date(),
      recorded_by: req.user._id
    });
    res.status(201).json({ message: 'Expense Added' });
  } catch (error) { res.status(400).json({ message: error.message }); }
};

// --- 3. PAY SALARY ---
const paySalary = async (req, res) => {
  try {
    const { staff_id, amount, month, year, commission, slipPdfBase64 } = req.body;
    await Transaction.create({
      type: 'expense',
      category: 'salary_payment',
      amount,
      description: `Salary for ${month}/${year || new Date().getFullYear()}`,
      staff_id,
      date: new Date(),
      recorded_by: req.user._id
    });

    // Send salary slip email with PDF attachment (non-blocking)
    const staff = await User.findById(staff_id).select('name email role salary_amount').lean();
    if (staff?.email) {
      sendSalarySlipEmail({
        to: staff.email,
        name: staff.name,
        month: Number(month),
        year: Number(year) || new Date().getFullYear(),
        salary: staff.salary_amount || amount,
        commission: commission || 0,
        total: amount,
        role: staff.role,
        slipPdfBase64,
      }).catch(() => {});
    }

    res.status(201).json({ message: 'Salary Paid Successfully' });
  } catch (error) { res.status(400).json({ message: error.message }); }
};

// --- 4. MONTHLY REPORT ---
const getMonthlyFinance = async (req, res) => {
  try {
    const now = new Date();
    const month = Number(req.query.month) || (now.getMonth() + 1);
    const year  = Number(req.query.year)  || now.getFullYear();
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const transactions = await Transaction.find({
      date: { $gte: startDate, $lte: endDate }
    }).populate('student_id', 'full_name roll_number');

    let totalIncome = 0;
    let totalExpense = 0;
    let finesIncome = 0;
    transactions.forEach(t => {
      if (t.type === 'income') {
        totalIncome += t.amount;
        if (t.category === 'fine_collection') finesIncome += t.amount;
      } else {
        totalExpense += t.amount;
      }
    });

    // --- Students fee report ---
    const students = await Student.find({ isActive: true }).select('full_name roll_number phone courses guardian_phone');
    const today = new Date();
    const isAfterDue = today.getDate() > 5;

    const studentReport = students.map(std => {
      const payments = transactions.filter(t =>
        t.category === 'fee_collection' &&
        (t.student_id?._id?.toString() === std._id.toString() ||
         t.student_id?.toString() === std._id.toString())
      );
      const totalPaid = payments.reduce((sum, t) => sum + t.amount, 0);
      const lastPayment = payments.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      const course = std.courses[0] || {};
      const monthlyInstallment = course.monthly_fee || 0;
      const lateFeePercent = course.late_fee_percent || 0;
      const lateFeeAmount = (payments.length === 0 && isAfterDue && lateFeePercent > 0)
        ? parseFloat(((monthlyInstallment * lateFeePercent) / 100).toFixed(2))
        : 0;
      return {
        _id: std._id,
        name: std.full_name,
        roll_no: std.roll_number,
        phone: std.phone,
        guardian_phone: std.guardian_phone,
        fee_amount: monthlyInstallment,
        late_fee_amount: lateFeeAmount,
        late_fee_percent: lateFeePercent,
        total_due: monthlyInstallment + lateFeeAmount,
        status: payments.length > 0 ? 'Paid' : 'Unpaid',
        paid_date: lastPayment ? lastPayment.date : null,
        paid_amount: totalPaid
      };
    });

    // --- Staff salary report (with commission earned this month for teachers) ---
    const staff = await User.find({ role: { $in: ['teacher', 'clerk', 'office_boy'] } }).select('name role email salary_amount commission_percent');
    const commissionTxns = transactions.filter(t => t.category === 'trainer_commission');

    const staffReport = staff.map(emp => {
      const salaryPayment = transactions.find(t =>
        t.category === 'salary_payment' &&
        t.staff_id && t.staff_id.toString() === emp._id.toString()
      );
      const commissionEarned = commissionTxns
        .filter(t => t.staff_id && t.staff_id.toString() === emp._id.toString())
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        _id: emp._id,
        name: emp.name,
        role: emp.role,
        email: emp.email || '',
        salary: emp.salary_amount || 0,
        commission_percent: emp.commission_percent || 0,
        commission_earned: commissionEarned,
        total_payout: (emp.salary_amount || 0) + commissionEarned,
        status: salaryPayment ? 'Paid' : 'Unpaid',
        paid_date: salaryPayment ? salaryPayment.date : null
      };
    });

    // --- Trainer commission summary for the month ---
    const trainerMap = {};
    commissionTxns.forEach(t => {
      const tid = t.staff_id?.toString();
      if (!tid) return;
      if (!trainerMap[tid]) {
        trainerMap[tid] = { staff_id: tid, total: 0, transactions: [] };
      }
      trainerMap[tid].total += t.amount;
      trainerMap[tid].transactions.push({
        amount: t.amount,
        description: t.description,
        date: t.date,
        student: t.student_id ? { name: t.student_id.full_name, roll_no: t.student_id.roll_number } : null
      });
    });

    // Attach trainer names from staff list
    const trainerCommissions = Object.values(trainerMap).map(tc => {
      const trainer = staff.find(s => s._id.toString() === tc.staff_id);
      return { ...tc, name: trainer?.name || 'Unknown', role: trainer?.role || 'teacher' };
    });

    // --- Misc expenses (exclude salary and commission — those have their own tabs) ---
    const expenses = transactions.filter(
      t => t.type === 'expense' && t.category !== 'salary_payment' && t.category !== 'trainer_commission'
    );

    // --- All transactions for the Transactions tab ---
    const allTransactions = transactions
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map(t => ({
        _id: t._id,
        type: t.type,
        category: t.category,
        amount: t.amount,
        description: t.description,
        payment_method: t.payment_method,
        date: t.date,
        student: t.student_id ? { name: t.student_id.full_name, roll_no: t.student_id.roll_number } : null,
      }));

    res.json({
      stats: { income: totalIncome, expense: totalExpense, profit: totalIncome - totalExpense, fines_income: finesIncome },
      students: studentReport,
      staff: staffReport,
      expenses,
      trainerCommissions,
      allTransactions
    });

  } catch (error) { res.status(500).json({ message: error.message }); }
};

// --- 5. DELETE EXPENSE ---
const deleteExpense = async (req, res) => {
  try {
    const txn = await Transaction.findById(req.params.id);
    if (!txn) return res.status(404).json({ message: 'Transaction not found' });
    if (txn.type !== 'expense' || ['salary_payment', 'trainer_commission'].includes(txn.category)) {
      return res.status(400).json({ message: 'Cannot delete this transaction type' });
    }
    await txn.deleteOne();
    res.json({ message: 'Expense deleted' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// --- 6. GET STUDENT LEDGER ---
const getStudentStatement = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await Student.findById(id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const transactions = await Transaction.find({ student_id: id, type: 'income', category: 'fee_collection' }).sort({ date: -1 });

    const course = student.courses[0] || {};
    const netPayable = (course.total_fee || 0) - (course.discount_amount || 0);
    let totalPaid = 0;
    transactions.forEach(t => totalPaid += t.amount);

    res.json({
      student: {
        name: student.full_name,
        roll_no: student.roll_number,
        course: course.course_name,
        plan: course.monthly_fee === course.total_fee ? 'One-Time' : 'Monthly'
      },
      summary: { total: netPayable, paid: totalPaid, balance: netPayable - totalPaid },
      history: transactions
    });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// --- 6. TRAINER EARNINGS ---
const getTrainerEarnings = async (req, res) => {
  try {
    const { id } = req.params;
    const trainer = await User.findById(id).select('name role commission_percent salary_amount');
    if (!trainer) return res.status(404).json({ message: 'Trainer not found' });

    const commissions = await Transaction.find({
      category: 'trainer_commission',
      staff_id: id
    }).populate('student_id', 'full_name roll_number').sort({ date: -1 });

    const totalEarned = commissions.reduce((sum, t) => sum + t.amount, 0);

    res.json({
      trainer: { name: trainer.name, role: trainer.role, commission_percent: trainer.commission_percent },
      summary: { total_earned: totalEarned, transaction_count: commissions.length },
      history: commissions
    });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// --- 8. BULK PAY ALL SALARIES ---
const payAllSalaries = async (req, res) => {
  try {
    const { month, year } = req.body;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const staff = await User.find({ role: { $in: ['teacher', 'clerk', 'office_boy'] } }).select('name email role salary_amount');
    const paidTxns = await Transaction.find({ category: 'salary_payment', date: { $gte: startDate, $lte: endDate } });
    const paidIds = new Set(paidTxns.map(t => t.staff_id?.toString()));

    const unpaid = staff.filter(s => !paidIds.has(s._id.toString()));
    if (unpaid.length === 0) return res.json({ message: 'All salaries already paid for this month', count: 0 });

    await Transaction.insertMany(unpaid.map(emp => ({
      type: 'expense',
      category: 'salary_payment',
      amount: emp.salary_amount || 0,
      description: `Salary for ${month}/${year}`,
      staff_id: emp._id,
      date: new Date(),
      recorded_by: req.user._id
    })));

    // Send salary notification emails (non-blocking, no PDF for bulk)
    unpaid.forEach(emp => {
      if (emp.email) {
        sendSalarySlipEmail({
          to: emp.email,
          name: emp.name,
          month: Number(month),
          year: Number(year),
          salary: emp.salary_amount || 0,
          commission: 0,
          total: emp.salary_amount || 0,
          role: emp.role,
          slipPdfBase64: null,
        }).catch(() => {});
      }
    });

    res.json({ message: `${unpaid.length} salaries processed successfully`, count: unpaid.length });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// --- 9. FINANCE TREND (last N months) — single aggregation ---
const getFinanceTrend = async (req, res) => {
  try {
    const months = Math.min(parseInt(req.query.months) || 6, 12);
    const now = new Date();
    const rangeStart = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

    const agg = await Transaction.aggregate([
      { $match: { date: { $gte: rangeStart } } },
      {
        $group: {
          _id: { year: { $year: '$date' }, month: { $month: '$date' }, type: '$type' },
          total: { $sum: '$amount' },
        },
      },
    ]);

    // Build a map: "YYYY-M" -> { income, expense }
    const map = {};
    agg.forEach(({ _id, total }) => {
      const key = `${_id.year}-${_id.month}`;
      if (!map[key]) map[key] = { income: 0, expense: 0 };
      map[key][_id.type] += total;
    });

    const trend = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      const { income = 0, expense = 0 } = map[key] || {};
      trend.push({
        label: d.toLocaleString('default', { month: 'short' }) + " '" + String(d.getFullYear()).slice(2),
        income,
        expense,
        profit: income - expense,
      });
    }

    res.json({ trend });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// --- 10. RECURRING EXPENSES CRUD ---
const getRecurringExpenses = async (req, res) => {
  try {
    const items = await RecurringExpense.find({ is_active: true }).sort({ createdAt: -1 });
    res.json(items);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const addRecurringExpense = async (req, res) => {
  try {
    const { title, amount, category } = req.body;
    const item = await RecurringExpense.create({ title, amount, category, created_by: req.user._id });
    res.status(201).json(item);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

const deleteRecurringExpense = async (req, res) => {
  try {
    await RecurringExpense.findByIdAndDelete(req.params.id);
    res.json({ message: 'Template removed' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const resendSalarySlip = async (req, res) => {
  try {
    const { staff_id, month, year, commission, slipPdfBase64 } = req.body;
    const staff = await User.findById(staff_id).select('name email role salary_amount').lean();
    if (!staff) return res.status(404).json({ message: 'Staff not found' });
    if (!staff.email) return res.status(400).json({ message: 'Staff has no email address' });

    await sendSalarySlipEmail({
      to: staff.email,
      name: staff.name,
      month: Number(month),
      year: Number(year),
      salary: staff.salary_amount || 0,
      commission: commission || 0,
      total: (staff.salary_amount || 0) + (commission || 0),
      role: staff.role,
      slipPdfBase64,
    });

    res.json({ message: 'Salary slip sent successfully' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

module.exports = {
  collectFee, addExpense, paySalary, deleteExpense,
  payAllSalaries, getFinanceTrend,
  getRecurringExpenses, addRecurringExpense, deleteRecurringExpense,
  getMonthlyFinance, getStudentStatement, getTrainerEarnings,
  resendSalarySlip,
};