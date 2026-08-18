const HomeworkDiary = require('../models/HomeworkDiary');
const Student       = require('../models/Student');
const audit         = require('../utils/auditLogger');

const getHomework = async (req, res) => {
  try {
    const { class_id, date, from, to, teacher_id, subject_id } = req.query;
    const filter = {};
    if (class_id)   filter.class_id   = class_id;
    if (teacher_id) filter.teacher_id = teacher_id;
    if (subject_id) filter.subject_id = subject_id;
    if (date) {
      const d = new Date(date);
      filter.date = { $gte: new Date(d.setHours(0,0,0,0)), $lte: new Date(d.setHours(23,59,59,999)) };
    } else if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to)   filter.date.$lte = new Date(to);
    }

    const hw = await HomeworkDiary.find(filter)
      .populate('class_id',   'name section')
      .populate('subject_id', 'name')
      .populate('teacher_id', 'name')
      .sort({ date: -1 });
    res.json(hw);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// For student portal — get homework for their class
const getForStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.user.student_id || req.params.studentId).select('school_class_id');
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const from = req.query.from || new Date(Date.now() - 14 * 86400000).toISOString();
    const to   = req.query.to   || new Date().toISOString();

    const hw = await HomeworkDiary.find({
      class_id: student.school_class_id,
      date: { $gte: new Date(from), $lte: new Date(to) },
    })
      .populate('subject_id', 'name')
      .populate('teacher_id', 'name')
      .sort({ date: -1 });
    res.json(hw);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const create = async (req, res) => {
  try {
    const { class_id, subject_id, academic_year_id, date, title, description, due_date, type, is_important } = req.body;
    if (!class_id || !subject_id || !date || !title) return res.status(400).json({ message: 'class_id, subject_id, date and title are required' });

    const hw = await HomeworkDiary.create({
      class_id, subject_id, academic_year_id,
      teacher_id: req.user._id,
      date: new Date(date),
      title, description: description || '', due_date, type: type || 'homework',
      is_important: !!is_important,
    });

    await audit({ req, action: 'create', module: 'Homework', entity_id: hw._id, entity_label: title, description: `Homework added: ${title}` });
    const populated = await hw.populate(['class_id', 'subject_id', 'teacher_id']);
    res.status(201).json(populated);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const update = async (req, res) => {
  try {
    const hw = await HomeworkDiary.findById(req.params.id);
    if (!hw) return res.status(404).json({ message: 'Not found' });
    const fields = ['title','description','due_date','type','is_important'];
    fields.forEach(f => { if (req.body[f] !== undefined) hw[f] = req.body[f]; });
    await hw.save();
    await audit({ req, action: 'update', module: 'Homework', entity_id: hw._id, entity_label: hw.title });
    res.json(hw);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const remove = async (req, res) => {
  try {
    const hw = await HomeworkDiary.findByIdAndDelete(req.params.id);
    if (!hw) return res.status(404).json({ message: 'Not found' });
    await audit({ req, action: 'delete', module: 'Homework', entity_label: hw.title });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { getHomework, getForStudent, create, update, remove };
