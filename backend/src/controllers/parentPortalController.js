const User = require('../models/User');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const ReportCard = require('../models/ReportCard');
const Transaction = require('../models/Transaction');
const Fine = require('../models/Fine');
const HomeworkDiary = require('../models/HomeworkDiary');

const isChildOf = (parent, studentId) =>
  parent.student_ids.map(id => id.toString()).includes(studentId.toString());

const getChildren = async (req, res) => {
  try {
    const parent = await User.findById(req.user._id)
      .populate({
        path: 'student_ids',
        populate: { path: 'school_class_id', select: 'name section grade_level' },
      });

    // Start with explicitly linked students
    const linked = parent?.student_ids || [];
    const linkedIds = new Set(linked.map(s => s._id.toString()));

    // Also find by parent phone (covers siblings added later without re-linking)
    let byPhone = [];
    const phone = parent?.phone;
    if (phone && phone.length >= 7) {
      const clean   = phone.replace(/[^0-9]/g, '');
      const tail    = clean.slice(-8);
      const re      = new RegExp(tail.split('').join('[^0-9]?'));
      byPhone = await Student.find({
        isActive: true,
        $or: [
          { father_phone:   { $regex: re } },
          { mother_phone:   { $regex: re } },
          { guardian_phone: { $regex: re } },
        ],
      }).populate('school_class_id', 'name section grade_level').lean();
    }

    // Merge, deduplicate
    const extra = byPhone.filter(s => !linkedIds.has(s._id.toString()));
    const all   = [...linked.map(s => s.toObject ? s.toObject() : s), ...extra];

    // Auto-link any new phone-matched students so future requests are fast
    const newIds = extra.map(s => s._id);
    if (newIds.length) {
      await User.updateOne({ _id: parent._id }, { $addToSet: { student_ids: { $each: newIds } } });
      await Student.updateMany({ _id: { $in: newIds } }, { parent_id: parent._id });
    }

    res.json(all);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getChildAttendance = async (req, res) => {
  try {
    const parent = await User.findById(req.user._id);
    if (!isChildOf(parent, req.params.studentId)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const records = await Attendance.find({
      person_id: req.params.studentId,
      person_type: 'Student',
    }).sort({ date: -1 }).limit(120);
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getChildReportCards = async (req, res) => {
  try {
    const parent = await User.findById(req.user._id);
    if (!isChildOf(parent, req.params.studentId)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const cards = await ReportCard.find({ student_id: req.params.studentId })
      .populate('class_id', 'name section grade_level')
      .populate('academic_year_id', 'label')
      .sort({ createdAt: -1 });
    res.json(cards);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getChildFees = async (req, res) => {
  try {
    const parent = await User.findById(req.user._id);
    if (!isChildOf(parent, req.params.studentId)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const txns = await Transaction.find({ student_id: req.params.studentId }).sort({ date: -1 });
    res.json(txns);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getChildFines = async (req, res) => {
  try {
    const parent = await User.findById(req.user._id);
    if (!isChildOf(parent, req.params.studentId)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const fines = await Fine.find({ student_id: req.params.studentId }).sort({ createdAt: -1 });
    res.json(fines);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getParentProfile = async (req, res) => {
  try {
    const parent = await User.findById(req.user._id)
      .select('-password')
      .populate({
        path: 'student_ids',
        select: 'full_name roll_number phone email school_class_id isActive',
        populate: { path: 'school_class_id', select: 'name section grade_level' },
      });
    res.json(parent);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getChildrenHomework = async (req, res) => {
  try {
    const parent = await User.findById(req.user._id).populate('student_ids', 'school_class_id');
    const classIds = (parent?.student_ids || []).map(s => s.school_class_id).filter(Boolean);
    if (!classIds.length) return res.json([]);
    const from = req.query.from || new Date(Date.now() - 14 * 86400000).toISOString();
    const to   = req.query.to   || new Date().toISOString();
    const hw = await HomeworkDiary.find({
      class_id: { $in: classIds },
      date: { $gte: new Date(from), $lte: new Date(to) },
    }).populate('class_id', 'name section').populate('subject_id', 'name').sort({ date: -1 });
    res.json(hw);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = {
  getChildren,
  getChildAttendance,
  getChildReportCards,
  getChildFees,
  getChildFines,
  getParentProfile,
  getChildrenHomework,
};
