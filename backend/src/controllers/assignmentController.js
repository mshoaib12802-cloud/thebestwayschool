const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const Student = require('../models/Student');

// ─── TEACHER / ADMIN ─────────────────────────────────────────────────────────
const getAssignments = async (req, res) => {
  try {
    const { class_id, subject_id, teacher_id } = req.query;
    const filter = {};
    if (class_id) filter.class_id = class_id;
    if (subject_id) filter.subject_id = subject_id;
    if (teacher_id) filter.teacher_id = teacher_id;
    if (req.user.role === 'teacher') filter.teacher_id = req.user._id;
    const assignments = await Assignment.find(filter)
      .populate('class_id', 'grade section')
      .populate('subject_id', 'name code')
      .populate('teacher_id', 'name')
      .sort({ due_date: -1 });
    res.json(assignments);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const createAssignment = async (req, res) => {
  try {
    const data = { ...req.body, teacher_id: req.user.role === 'teacher' ? req.user._id : req.body.teacher_id };
    const assignment = await Assignment.create(data);
    await assignment.populate('class_id', 'grade section');
    await assignment.populate('subject_id', 'name code');
    res.status(201).json(assignment);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const updateAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(assignment);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const deleteAssignment = async (req, res) => {
  try {
    await Assignment.findByIdAndDelete(req.params.id);
    await AssignmentSubmission.deleteMany({ assignment_id: req.params.id });
    res.json({ message: 'Deleted' });
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const getSubmissions = async (req, res) => {
  try {
    const submissions = await AssignmentSubmission.find({ assignment_id: req.params.id })
      .populate('student_id', 'full_name roll_number');
    res.json(submissions);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const gradeSubmission = async (req, res) => {
  try {
    const { obtained_marks, feedback, status } = req.body;
    const sub = await AssignmentSubmission.findByIdAndUpdate(
      req.params.submissionId,
      { obtained_marks, feedback, status: status || 'graded', graded_by: req.user._id, graded_at: new Date() },
      { new: true }
    ).populate('student_id', 'full_name roll_number');
    res.json(sub);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

// ─── STUDENT PORTAL ──────────────────────────────────────────────────────────
const getMyAssignments = async (req, res) => {
  try {
    const student = await Student.findOne({ user_id: req.user._id });
    if (!student) return res.status(404).json({ message: 'Student not found' });
    const assignments = await Assignment.find({ class_id: student.school_class_id, status: 'active' })
      .populate('subject_id', 'name code')
      .populate('teacher_id', 'name')
      .sort({ due_date: 1 });
    const submittedIds = (await AssignmentSubmission.find({ student_id: student._id }, 'assignment_id')).map(s => String(s.assignment_id));
    const result = assignments.map(a => ({ ...a.toObject(), submitted: submittedIds.includes(String(a._id)) }));
    res.json(result);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const submitAssignment = async (req, res) => {
  try {
    const student = await Student.findOne({ user_id: req.user._id });
    if (!student) return res.status(404).json({ message: 'Student not found' });
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
    const isLate = new Date() > new Date(assignment.due_date);
    const sub = await AssignmentSubmission.findOneAndUpdate(
      { assignment_id: req.params.id, student_id: student._id },
      { ...req.body, student_id: student._id, assignment_id: req.params.id, is_late: isLate, submitted_at: new Date() },
      { upsert: true, new: true }
    );
    res.json(sub);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const getMySubmission = async (req, res) => {
  try {
    const student = await Student.findOne({ user_id: req.user._id });
    const sub = await AssignmentSubmission.findOne({ assignment_id: req.params.id, student_id: student?._id });
    res.json(sub || null);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

// ─── PARENT PORTAL ────────────────────────────────────────────────────────────
const getChildAssignments = async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await Student.findById(studentId);
    if (!student || String(student.parent_id) !== String(req.user._id))
      return res.status(403).json({ message: 'Access denied' });
    const assignments = await Assignment.find({ class_id: student.school_class_id })
      .populate('subject_id', 'name').populate('teacher_id', 'name').sort({ due_date: -1 });
    const subs = await AssignmentSubmission.find({ student_id: studentId });
    const subMap = {};
    subs.forEach(s => { subMap[String(s.assignment_id)] = s; });
    const result = assignments.map(a => ({ ...a.toObject(), submission: subMap[String(a._id)] || null }));
    res.json(result);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

module.exports = {
  getAssignments, createAssignment, updateAssignment, deleteAssignment,
  getSubmissions, gradeSubmission,
  getMyAssignments, submitAssignment, getMySubmission,
  getChildAssignments,
};
