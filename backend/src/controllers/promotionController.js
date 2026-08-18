const Promotion = require('../models/Promotion');
const Student = require('../models/Student');

const getPromotions = async (req, res) => {
  try {
    const filter = {};
    if (req.query.academic_year_id) filter.academic_year_id = req.query.academic_year_id;
    if (req.query.class_id) filter.from_class_id = req.query.class_id;
    const promotions = await Promotion.find(filter)
      .populate('student_id', 'full_name roll_number')
      .populate('from_class_id', 'name section grade_level')
      .populate('to_class_id', 'name section grade_level')
      .populate('academic_year_id', 'label')
      .populate('promoted_by', 'name')
      .sort({ createdAt: -1 });
    res.json(promotions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const promoteStudent = async (req, res) => {
  try {
    const { student_id, to_class_id, academic_year_id, status, remarks } = req.body;
    const student = await Student.findById(student_id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const from_class_id = student.school_class_id;

    const promotion = await Promotion.create({
      student_id,
      from_class_id: from_class_id || null,
      to_class_id: status === 'graduated' ? null : to_class_id,
      academic_year_id,
      status: status || 'promoted',
      remarks: remarks || '',
      promoted_by: req.user._id,
    });

    if (status === 'graduated') {
      student.isActive = false;
    } else {
      student.school_class_id = to_class_id;
      student.academic_year_id = academic_year_id;
    }
    await student.save();

    const populated = await Promotion.findById(promotion._id)
      .populate('student_id', 'full_name roll_number')
      .populate('from_class_id', 'name section')
      .populate('to_class_id', 'name section')
      .populate('academic_year_id', 'label')
      .populate('promoted_by', 'name');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const promoteClass = async (req, res) => {
  try {
    const { class_id, to_class_id, academic_year_id, student_ids } = req.body;
    const students = await Student.find({
      _id: { $in: student_ids },
      school_class_id: class_id,
    });

    const results = [];
    for (const student of students) {
      const p = await Promotion.create({
        student_id: student._id,
        from_class_id: class_id,
        to_class_id,
        academic_year_id,
        status: 'promoted',
        promoted_by: req.user._id,
      });
      student.school_class_id = to_class_id;
      student.academic_year_id = academic_year_id;
      await student.save();
      results.push(p);
    }
    res.status(201).json({ promoted: results.length, promotions: results });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

module.exports = { getPromotions, promoteStudent, promoteClass };
