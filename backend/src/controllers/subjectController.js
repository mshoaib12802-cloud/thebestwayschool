const Subject = require('../models/Subject');

const getSubjects = async (req, res) => {
  try {
    const filter = {};
    if (req.query.class_id) filter.class_id = req.query.class_id;
    if (req.query.active !== undefined) filter.is_active = req.query.active === 'true';
    const subjects = await Subject.find(filter)
      .populate('class_id', 'name section grade_level')
      .populate('teacher_id', 'name email')
      .sort({ name: 1 });
    res.json(subjects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const addSubject = async (req, res) => {
  try {
    const subject = await Subject.create(req.body);
    const populated = await Subject.findById(subject._id)
      .populate('class_id', 'name section grade_level')
      .populate('teacher_id', 'name email');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const updateSubject = async (req, res) => {
  try {
    const subject = await Subject.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('class_id', 'name section grade_level')
      .populate('teacher_id', 'name email');
    if (!subject) return res.status(404).json({ message: 'Subject not found' });
    res.json(subject);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findByIdAndDelete(req.params.id);
    if (!subject) return res.status(404).json({ message: 'Subject not found' });
    res.json({ message: 'Subject deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getSubjects, addSubject, updateSubject, deleteSubject };
