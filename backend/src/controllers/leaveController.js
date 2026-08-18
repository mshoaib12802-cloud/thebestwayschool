const Leave = require('../models/Leave');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');

const differenceInDays = (from, to) => {
  const d1 = new Date(from); const d2 = new Date(to);
  return Math.max(1, Math.round((d2 - d1) / 86400000) + 1);
};

// ─── ADMIN ───────────────────────────────────────────────────────────────────
const getLeaves = async (req, res) => {
  try {
    const { status, applicant_type } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (applicant_type) filter.applicant_type = applicant_type;
    const leaves = await Leave.find(filter)
      .populate('staff_id', 'name email role')
      .populate('student_id', 'full_name roll_number')
      .populate('reviewed_by', 'name')
      .populate('applied_by', 'name')
      .sort({ createdAt: -1 });
    res.json(leaves);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const reviewLeave = async (req, res) => {
  try {
    const { status, rejection_reason } = req.body;
    if (!['approved', 'rejected'].includes(status))
      return res.status(400).json({ message: 'Invalid status' });
    const leave = await Leave.findByIdAndUpdate(req.params.id, {
      status, rejection_reason: rejection_reason || '',
      reviewed_by: req.user._id, reviewed_at: new Date(),
    }, { new: true }).populate('staff_id', 'name').populate('student_id', 'full_name');

    if (status === 'approved' && leave.applicant_type === 'student' && leave.student_id) {
      const from = new Date(leave.from_date);
      const to = new Date(leave.to_date);
      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        const day = new Date(d); day.setHours(0, 0, 0, 0);
        await Attendance.findOneAndUpdate(
          { person_id: leave.student_id._id || leave.student_id, date: { $gte: day, $lt: new Date(day.getTime() + 86400000) } },
          { person_id: leave.student_id._id || leave.student_id, person_type: 'Student', date: day, status: 'leave' },
          { upsert: true }
        );
      }
    }
    res.json(leave);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const deleteLeave = async (req, res) => {
  try {
    await Leave.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch { res.status(500).json({ message: 'Server error' }); }
};

// ─── STAFF (self) ────────────────────────────────────────────────────────────
const applyLeave = async (req, res) => {
  try {
    const { leave_type, from_date, to_date, reason } = req.body;
    const total_days = differenceInDays(from_date, to_date);
    const leave = await Leave.create({
      applicant_type: 'staff',
      staff_id: req.user._id,
      leave_type, from_date, to_date, total_days, reason,
      applied_by: req.user._id,
    });
    res.status(201).json(leave);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const getMyLeaves = async (req, res) => {
  try {
    const leaves = await Leave.find({ staff_id: req.user._id }).sort({ createdAt: -1 });
    res.json(leaves);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

// ─── PARENT (apply for child) ────────────────────────────────────────────────
const applyStudentLeave = async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await Student.findById(studentId);
    if (!student || String(student.parent_id) !== String(req.user._id))
      return res.status(403).json({ message: 'Access denied' });
    const { leave_type, from_date, to_date, reason } = req.body;
    const total_days = differenceInDays(from_date, to_date);
    const leave = await Leave.create({
      applicant_type: 'student', student_id: studentId,
      leave_type, from_date, to_date, total_days, reason,
      applied_by: req.user._id,
    });
    res.status(201).json(leave);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const getChildLeaves = async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await Student.findById(studentId);
    if (!student || String(student.parent_id) !== String(req.user._id))
      return res.status(403).json({ message: 'Access denied' });
    const leaves = await Leave.find({ student_id: studentId }).sort({ createdAt: -1 });
    res.json(leaves);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

module.exports = { getLeaves, reviewLeave, deleteLeave, applyLeave, getMyLeaves, applyStudentLeave, getChildLeaves };
