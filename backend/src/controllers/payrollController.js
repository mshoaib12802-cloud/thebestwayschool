const Payroll = require('../models/Payroll');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const StaffAdvance = require('../models/StaffAdvance');
const Transaction = require('../models/Transaction');

const getPayrolls = async (req, res) => {
  try {
    const { month, status, staff_id } = req.query;
    const filter = {};
    if (month) filter.month = month;
    if (status) filter.status = status;
    if (staff_id) filter.staff_id = staff_id;
    const payrolls = await Payroll.find(filter)
      .populate('staff_id', 'name email role salary_type salary_amount')
      .populate('processed_by', 'name')
      .sort({ month: -1, createdAt: -1 });
    res.json(payrolls);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const generatePayrolls = async (req, res) => {
  try {
    const { month } = req.body; // "2026-01"
    if (!month) return res.status(400).json({ message: 'month is required' });
    const staff = await User.find({ role: { $in: ['teacher', 'clerk', 'office_boy'] } });
    const [year, mon] = month.split('-').map(Number);
    const monthStart = new Date(year, mon - 1, 1);
    const monthEnd = new Date(year, mon, 0, 23, 59, 59);
    let created = 0, skipped = 0;
    for (const s of staff) {
      const absences = await Attendance.countDocuments({
        person_id: s._id, person_type: 'User',
        status: 'absent',
        date: { $gte: monthStart, $lte: monthEnd },
      });
      const workingDays = 26;
      const perDaySalary = s.salary_amount / workingDays;
      const absenceDeduction = Math.round(absences * perDaySalary);

      const pendingAdvances = await StaffAdvance.find({ staff_id: s._id, status: 'approved', recovered_amount: { $lt: '$amount' } }).limit(3);
      let advanceDeduction = 0;
      for (const adv of pendingAdvances) {
        const remaining = adv.amount - adv.recovered_amount;
        const monthly = Math.ceil(remaining / adv.recovery_months);
        advanceDeduction += Math.min(monthly, remaining);
      }

      const gross = s.salary_amount;
      const net = Math.max(0, gross - absenceDeduction - advanceDeduction);
      try {
        await Payroll.create({
          staff_id: s._id,
          month,
          basic_salary: s.salary_amount,
          absence_deduction: absenceDeduction,
          advance_deduction: advanceDeduction,
          gross_salary: gross,
          net_salary: net,
          processed_by: req.user._id,
        });
        created++;
      } catch (e) {
        if (e.code === 11000) skipped++;
        else throw e;
      }
    }
    res.json({ message: `Generated ${created} payroll records. ${skipped} already existed.` });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const updatePayroll = async (req, res) => {
  try {
    const payroll = await Payroll.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('staff_id', 'name email');
    res.json(payroll);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const markPayrollPaid = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id).populate('staff_id', 'name');
    if (!payroll) return res.status(404).json({ message: 'Not found' });
    if (payroll.status === 'paid') return res.status(400).json({ message: 'Already paid' });

    const tx = await Transaction.create({
      type: 'expense',
      category: 'salary',
      amount: payroll.net_salary,
      description: `Salary - ${payroll.staff_id?.name} - ${payroll.month}`,
      payment_method: req.body.payment_method || 'bank_transfer',
      staff_id: payroll.staff_id._id || payroll.staff_id,
      date: new Date(),
      recorded_by: req.user._id,
    });

    payroll.status = 'paid';
    payroll.paid_date = new Date();
    payroll.payment_method = req.body.payment_method || 'bank_transfer';
    payroll.transaction_id = tx._id;
    await payroll.save();

    // Recover advance amounts
    if (payroll.advance_deduction > 0) {
      const advances = await StaffAdvance.find({ staff_id: payroll.staff_id._id || payroll.staff_id, status: 'approved' });
      let remaining = payroll.advance_deduction;
      for (const adv of advances) {
        if (remaining <= 0) break;
        const toRecover = Math.min(remaining, adv.amount - adv.recovered_amount);
        adv.recovered_amount += toRecover;
        if (adv.recovered_amount >= adv.amount) adv.status = 'recovered';
        await adv.save();
        remaining -= toRecover;
      }
    }
    res.json(payroll);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const getMyPayrolls = async (req, res) => {
  try {
    const payrolls = await Payroll.find({ staff_id: req.user._id }).sort({ month: -1 });
    res.json(payrolls);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

module.exports = { getPayrolls, generatePayrolls, updatePayroll, markPayrollPaid, getMyPayrolls };
