const PTM = require('../models/PTM');
const Student = require('../models/Student');

const getPTMs = async (req, res) => {
  try {
    const { class_id, teacher_id, status } = req.query;
    const filter = {};
    if (class_id) filter.class_id = class_id;
    if (teacher_id) filter.teacher_id = teacher_id;
    if (status) filter.status = status;
    if (req.user.role === 'teacher') filter.teacher_id = req.user._id;
    const ptms = await PTM.find(filter)
      .populate('class_id', 'grade section').populate('teacher_id', 'name').populate('academic_year_id', 'label')
      .sort({ date: -1 });
    res.json(ptms);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const createPTM = async (req, res) => {
  try {
    const { title, date, class_id, teacher_id, academic_year_id, slot_duration_minutes, venue, notes, slot_times } = req.body;
    const slots = (slot_times || []).map(t => ({ time: t, is_booked: false }));
    const ptm = await PTM.create({ title, date, class_id, teacher_id: teacher_id || req.user._id, academic_year_id, slot_duration_minutes, venue, notes, slots, created_by: req.user._id });
    await ptm.populate('class_id', 'grade section').then(() => {}).catch(() => {});
    res.status(201).json(ptm);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const updatePTM = async (req, res) => {
  try {
    const ptm = await PTM.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(ptm);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const deletePTM = async (req, res) => {
  try {
    await PTM.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const bookSlot = async (req, res) => {
  try {
    const { ptm_id, slot_id, student_id } = req.body;
    const student = await Student.findById(student_id);
    if (!student || String(student.parent_id) !== String(req.user._id))
      return res.status(403).json({ message: 'Access denied' });
    const ptm = await PTM.findById(ptm_id);
    if (!ptm) return res.status(404).json({ message: 'PTM not found' });
    const slot = ptm.slots.id(slot_id);
    if (!slot) return res.status(404).json({ message: 'Slot not found' });
    if (slot.is_booked) return res.status(400).json({ message: 'Slot already booked' });
    slot.is_booked = true;
    slot.parent_id = req.user._id;
    slot.student_id = student_id;
    await ptm.save();
    res.json(ptm);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const getParentPTMs = async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await Student.findById(studentId);
    if (!student || String(student.parent_id) !== String(req.user._id))
      return res.status(403).json({ message: 'Access denied' });
    const ptms = await PTM.find({ class_id: student.school_class_id, status: 'scheduled' })
      .populate('teacher_id', 'name').populate('class_id', 'grade section').sort({ date: 1 });
    res.json(ptms);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

module.exports = { getPTMs, createPTM, updatePTM, deletePTM, bookSlot, getParentPTMs };
