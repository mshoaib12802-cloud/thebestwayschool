const SchoolClass = require('../models/SchoolClass');
const Student = require('../models/Student');

const getClasses = async (req, res) => {
  try {
    const filter = {};
    if (req.query.academic_year) filter.academic_year = req.query.academic_year;
    if (req.query.active !== undefined) filter.is_active = req.query.active === 'true';
    const classes = await SchoolClass.find(filter)
      .populate('class_teacher', 'name email')
      .populate('academic_year', 'label')
      .sort({ grade_level: 1, section: 1 });
    res.json(classes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const addClass = async (req, res) => {
  try {
    const cls = await SchoolClass.create(req.body);
    const populated = await SchoolClass.findById(cls._id)
      .populate('class_teacher', 'name email')
      .populate('academic_year', 'label');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const updateClass = async (req, res) => {
  try {
    const cls = await SchoolClass.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('class_teacher', 'name email')
      .populate('academic_year', 'label');
    if (!cls) return res.status(404).json({ message: 'Class not found' });
    res.json(cls);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const deleteClass = async (req, res) => {
  try {
    const cls = await SchoolClass.findByIdAndDelete(req.params.id);
    if (!cls) return res.status(404).json({ message: 'Class not found' });
    res.json({ message: 'Class deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getClassStudents = async (req, res) => {
  try {
    const students = await Student.find({ school_class_id: req.params.id, isActive: true })
      .select('full_name roll_number father_name phone section email');
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getClasses, addClass, updateClass, deleteClass, getClassStudents };
