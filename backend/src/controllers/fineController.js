const Fine = require('../models/Fine');
const Transaction = require('../models/Transaction');
const Student = require('../models/Student');
const User = require('../models/User');
const { notifyStudent } = require('../utils/notify');

// GET /api/fines — list with optional filters: target_type, status, month, year
const getFines = async (req, res) => {
  try {
    const { target_type, status, month, year } = req.query;
    const filter = {};

    if (target_type) filter.target_type = target_type;
    if (status) filter.status = status;
    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 1);
      filter.issued_date = { $gte: start, $lt: end };
    }

    const fines = await Fine.find(filter)
      .populate('student_id', 'full_name roll_number phone')
      .populate('staff_id', 'name role phone')
      .populate('issued_by', 'name')
      .sort({ issued_date: -1 });

    res.json(fines);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/fines/student/:studentId
const getStudentFines = async (req, res) => {
  try {
    const fines = await Fine.find({ student_id: req.params.studentId })
      .populate('issued_by', 'name')
      .sort({ issued_date: -1 });
    res.json(fines);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/fines/staff/:staffId
const getStaffFines = async (req, res) => {
  try {
    const fines = await Fine.find({ staff_id: req.params.staffId })
      .populate('issued_by', 'name')
      .sort({ issued_date: -1 });
    res.json(fines);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/fines — issue new fine
const issueFine = async (req, res) => {
  try {
    const { target_type, target_id, category, reason, amount, issued_date, notes } = req.body;

    if (!target_type || !target_id || !category || !reason || !amount) {
      return res.status(400).json({ message: 'All required fields must be provided.' });
    }

    const fineData = {
      target_type,
      category,
      reason,
      amount,
      notes,
      issued_by: req.user._id,
    };

    if (issued_date) fineData.issued_date = new Date(issued_date);

    if (target_type === 'student') {
      const student = await Student.findById(target_id);
      if (!student) return res.status(404).json({ message: 'Student not found.' });
      fineData.student_id = target_id;
    } else {
      const staff = await User.findById(target_id);
      if (!staff) return res.status(404).json({ message: 'Staff member not found.' });
      fineData.staff_id = target_id;
    }

    const fine = await Fine.create(fineData);
    const populated = await Fine.findById(fine._id)
      .populate('student_id', 'full_name roll_number phone')
      .populate('staff_id', 'name role phone')
      .populate('issued_by', 'name');

    if (target_type === 'student') {
      notifyStudent(target_id,
        'Fine Issued',
        `A fine of Rs. ${amount} has been issued for: ${reason}`,
        'fine', '/student-portal/fines'
      );
    }
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/fines/:id/pay — mark paid + create income Transaction
const payFine = async (req, res) => {
  try {
    const fine = await Fine.findById(req.params.id);
    if (!fine) return res.status(404).json({ message: 'Fine not found.' });
    if (fine.status !== 'pending') {
      return res.status(400).json({ message: `Fine is already ${fine.status}.` });
    }

    fine.status = 'paid';
    fine.paid_date = new Date();
    await fine.save();

    // Record as income transaction
    const desc = `Fine collected — ${fine.category.replace(/_/g, ' ')} — ${fine.reason}`;
    await Transaction.create({
      type: 'income',
      category: 'fine_collection',
      amount: fine.amount,
      description: desc,
      payment_method: req.body.payment_method || 'cash',
      date: fine.paid_date,
      student_id: fine.student_id || null,
      staff_id: fine.staff_id || null,
      recorded_by: req.user._id,
    });

    const populated = await Fine.findById(fine._id)
      .populate('student_id', 'full_name roll_number phone')
      .populate('staff_id', 'name role phone')
      .populate('issued_by', 'name');

    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/fines/:id/waive — waive a fine
const waiveFine = async (req, res) => {
  try {
    const fine = await Fine.findById(req.params.id);
    if (!fine) return res.status(404).json({ message: 'Fine not found.' });
    if (fine.status !== 'pending') {
      return res.status(400).json({ message: `Fine is already ${fine.status}.` });
    }

    fine.status = 'waived';
    if (req.body.notes) fine.notes = req.body.notes;
    await fine.save();

    const populated = await Fine.findById(fine._id)
      .populate('student_id', 'full_name roll_number phone')
      .populate('staff_id', 'name role phone')
      .populate('issued_by', 'name');

    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/fines/:id
const deleteFine = async (req, res) => {
  try {
    const fine = await Fine.findById(req.params.id);
    if (!fine) return res.status(404).json({ message: 'Fine not found.' });

    // If fine was already paid, reverse the income transaction it created
    if (fine.status === 'paid') {
      const desc = `Fine collected — ${fine.category.replace(/_/g, ' ')} — ${fine.reason}`;
      await Transaction.findOneAndDelete({
        category: 'fine_collection',
        amount: fine.amount,
        description: desc,
        ...(fine.student_id && { student_id: fine.student_id }),
        ...(fine.staff_id && { staff_id: fine.staff_id }),
      });
    }

    await fine.deleteOne();
    res.json({ message: 'Fine deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/fines/summary — totals for dashboard
const getFineSummary = async (req, res) => {
  try {
    const [studentPending, staffPending, studentPaid, staffPaid, studentWaived, staffWaived] = await Promise.all([
      Fine.aggregate([
        { $match: { target_type: 'student', status: 'pending' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Fine.aggregate([
        { $match: { target_type: 'staff', status: 'pending' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Fine.aggregate([
        { $match: { target_type: 'student', status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Fine.aggregate([
        { $match: { target_type: 'staff', status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Fine.aggregate([
        { $match: { target_type: 'student', status: 'waived' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Fine.aggregate([
        { $match: { target_type: 'staff', status: 'waived' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
    ]);

    res.json({
      student_pending_amount: studentPending[0]?.total || 0,
      student_pending_count: studentPending[0]?.count || 0,
      staff_pending_amount: staffPending[0]?.total || 0,
      staff_pending_count: staffPending[0]?.count || 0,
      student_collected: studentPaid[0]?.total || 0,
      staff_collected: staffPaid[0]?.total || 0,
      student_waived: studentWaived[0]?.total || 0,
      staff_waived: staffWaived[0]?.total || 0,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getFines,
  getStudentFines,
  getStaffFines,
  issueFine,
  payFine,
  waiveFine,
  deleteFine,
  getFineSummary,
};
