const Conduct = require('../models/Conduct');
const Student = require('../models/Student');

const getConductRecords = async (req, res) => {
  try {
    const { student_id, type, class_id } = req.query;
    const filter = {};
    if (student_id) filter.student_id = student_id;
    if (type) filter.type = type;
    if (class_id) {
      const students = await Student.find({ school_class_id: class_id }, '_id');
      filter.student_id = { $in: students.map(s => s._id) };
    }
    const records = await Conduct.find(filter)
      .populate({ path: 'student_id', select: 'full_name roll_number school_class_id', populate: { path: 'school_class_id', select: 'name' } })
      .populate('reported_by', 'name role')
      .sort({ incident_date: -1 });
    res.json(records);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const addConductRecord = async (req, res) => {
  try {
    const record = await Conduct.create({ ...req.body, reported_by: req.user._id });
    await record.populate('student_id', 'full_name roll_number');
    await record.populate('reported_by', 'name');
    res.status(201).json(record);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const updateConductRecord = async (req, res) => {
  try {
    const record = await Conduct.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('student_id', 'full_name roll_number').populate('reported_by', 'name');
    res.json(record);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const deleteConductRecord = async (req, res) => {
  try {
    await Conduct.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const getStudentConduct = async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await Student.findById(studentId);
    if (!student || String(student.parent_id) !== String(req.user._id))
      return res.status(403).json({ message: 'Access denied' });
    const records = await Conduct.find({ student_id: studentId })
      .populate('reported_by', 'name').sort({ incident_date: -1 });
    res.json(records);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

module.exports = { getConductRecords, addConductRecord, updateConductRecord, deleteConductRecord, getStudentConduct };
