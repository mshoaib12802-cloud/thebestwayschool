const MarksEntry = require('../models/MarksEntry');
const Student = require('../models/Student');
const Subject = require('../models/Subject');

const getMarksEntries = async (req, res) => {
  try {
    const { class_id, subject_id, academic_year_id, term } = req.query;
    const filter = {};
    if (class_id) filter.class_id = class_id;
    if (subject_id) filter.subject_id = subject_id;
    if (academic_year_id) filter.academic_year_id = academic_year_id;
    if (term) filter.term = term;
    if (req.user.role === 'teacher') {
      const teacherSubjects = await Subject.find({ teacher_id: req.user._id }, '_id');
      filter.subject_id = { $in: teacherSubjects.map(s => s._id) };
    }
    const entries = await MarksEntry.find(filter)
      .populate('class_id', 'grade section')
      .populate('subject_id', 'name code')
      .populate('academic_year_id', 'label')
      .populate('entered_by', 'name')
      .sort({ createdAt: -1 });
    res.json(entries);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const getMarksEntry = async (req, res) => {
  try {
    const entry = await MarksEntry.findById(req.params.id)
      .populate('class_id', 'grade section')
      .populate('subject_id', 'name code total_marks passing_marks')
      .populate('academic_year_id', 'label')
      .populate('student_marks.student_id', 'full_name roll_number');
    if (!entry) return res.status(404).json({ message: 'Not found' });
    res.json(entry);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const createOrUpdateMarksEntry = async (req, res) => {
  try {
    const { class_id, subject_id, academic_year_id, term, exam_label, total_marks, passing_marks, exam_date, student_marks } = req.body;

    const key = { class_id, subject_id, academic_year_id, term, exam_label };
    const existing = await MarksEntry.findOne(key);

    // Explicit input wins. Otherwise keep whatever is already entered — reopening a
    // sheet must never wipe saved marks — and only build a blank roster for a new
    // sheet. Students who joined the class since then are appended, not substituted.
    let marks = student_marks;
    if (!marks || !marks.length) {
      const students = await Student.find({ school_class_id: class_id, academic_year_id, isActive: true });
      const blankRow = s => ({ student_id: s._id, student_name: s.full_name, roll_number: s.roll_number, obtained_marks: null });

      if (existing && existing.student_marks?.length) {
        const seen = new Set(existing.student_marks.map(m => (m.student_id?._id || m.student_id).toString()));
        marks = [...existing.student_marks, ...students.filter(s => !seen.has(s._id.toString())).map(blankRow)];
      } else {
        marks = students.map(blankRow);
      }
    }

    const entry = await MarksEntry.findOneAndUpdate(
      key,
      {
        total_marks, passing_marks, exam_date,
        student_marks: marks,
        entered_by: req.user._id,
        // Don't silently un-finalize a sheet that was already locked
        is_finalized: existing?.is_finalized || false,
      },
      { upsert: true, new: true }
    ).populate('class_id', 'grade section').populate('subject_id', 'name code').populate('student_marks.student_id', 'full_name roll_number');
    res.json(entry);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const saveMarks = async (req, res) => {
  try {
    const { student_marks, is_finalized } = req.body;
    const entry = await MarksEntry.findByIdAndUpdate(
      req.params.id,
      { student_marks, is_finalized: is_finalized || false },
      { new: true }
    ).populate('class_id', 'grade section').populate('subject_id', 'name code').populate('student_marks.student_id', 'full_name roll_number');
    res.json(entry);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const deleteMarksEntry = async (req, res) => {
  try {
    await MarksEntry.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch { res.status(500).json({ message: 'Server error' }); }
};

module.exports = { getMarksEntries, getMarksEntry, createOrUpdateMarksEntry, saveMarks, deleteMarksEntry };
