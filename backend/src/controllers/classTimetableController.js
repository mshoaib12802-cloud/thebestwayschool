const ClassTimetable = require('../models/ClassTimetable');
const Student = require('../models/Student');

const getClassTimetable = async (req, res) => {
  try {
    const { class_id, academic_year_id } = req.query;
    if (!class_id || !academic_year_id) {
      return res.status(400).json({ message: 'class_id and academic_year_id are required' });
    }
    const entries = await ClassTimetable.find({ class_id, academic_year_id })
      .populate('period_id')
      .populate('subject_id', 'name code')
      .populate('teacher_id', 'name email');
    res.json(entries);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const setTimetableEntry = async (req, res) => {
  try {
    const { class_id, academic_year_id, day_of_week, period_id, subject_id, teacher_id, room } = req.body;
    const entry = await ClassTimetable.findOneAndUpdate(
      { class_id, academic_year_id, day_of_week, period_id },
      { subject_id: subject_id || null, teacher_id: teacher_id || null, room: room || '' },
      { upsert: true, new: true }
    )
      .populate('period_id')
      .populate('subject_id', 'name code')
      .populate('teacher_id', 'name email');
    res.json(entry);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

const clearTimetableEntry = async (req, res) => {
  try {
    const { class_id, academic_year_id, day_of_week, period_id } = req.body;
    await ClassTimetable.findOneAndDelete({ class_id, academic_year_id, day_of_week, period_id });
    res.json({ message: 'Entry cleared' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getTeacherSchoolTimetable = async (req, res) => {
  try {
    const teacher_id = req.user._id;
    const academic_year_id = req.query.academic_year_id;
    const filter = { teacher_id };
    if (academic_year_id) filter.academic_year_id = academic_year_id;
    const entries = await ClassTimetable.find(filter)
      .populate('class_id', 'name section grade_level')
      .populate('academic_year_id', 'label')
      .populate('period_id')
      .populate('subject_id', 'name code')
      .sort({ day_of_week: 1 });
    res.json(entries);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getStudentSchoolTimetable = async (req, res) => {
  try {
    const student = await Student.findById(req.user.student_id);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    if (!student.school_class_id || !student.academic_year_id) {
      return res.json([]);
    }
    const entries = await ClassTimetable.find({
      class_id: student.school_class_id,
      academic_year_id: student.academic_year_id,
    })
      .populate('period_id')
      .populate('subject_id', 'name code')
      .populate('teacher_id', 'name')
      .sort({ day_of_week: 1 });
    res.json(entries);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getChildSchoolTimetable = async (req, res) => {
  try {
    const student = await Student.findById(req.params.studentId);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    if (!student.school_class_id || !student.academic_year_id) return res.json([]);
    const entries = await ClassTimetable.find({
      class_id: student.school_class_id,
      academic_year_id: student.academic_year_id,
    })
      .populate('period_id')
      .populate('subject_id', 'name code')
      .populate('teacher_id', 'name')
      .sort({ day_of_week: 1 });
    res.json(entries);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = {
  getClassTimetable, setTimetableEntry, clearTimetableEntry,
  getTeacherSchoolTimetable, getStudentSchoolTimetable, getChildSchoolTimetable,
};
