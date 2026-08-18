const Concession = require('../models/Concession');
const Student    = require('../models/Student');
const audit      = require('../utils/auditLogger');

const getAll = async (req, res) => {
  try {
    const filter = {};
    if (req.query.student_id)      filter.student_id = req.query.student_id;
    if (req.query.academic_year_id) filter.academic_year_id = req.query.academic_year_id;
    if (req.query.is_active !== undefined) filter.is_active = req.query.is_active === 'true';

    const concessions = await Concession.find(filter)
      .populate('student_id', 'full_name roll_number school_class_id')
      .populate('student_id.school_class_id', 'name section')
      .populate('academic_year_id', 'label')
      .populate('approved_by', 'name')
      .sort({ createdAt: -1 });
    res.json(concessions);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getByStudent = async (req, res) => {
  try {
    const concessions = await Concession.find({ student_id: req.params.studentId, is_active: true })
      .populate('academic_year_id', 'label')
      .populate('approved_by', 'name');
    res.json(concessions);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const create = async (req, res) => {
  try {
    const { student_id, type, label, discount_type, discount_value, applicable_heads, valid_from, valid_to, academic_year_id, notes } = req.body;
    if (!student_id || !type || !label || !discount_value) return res.status(400).json({ message: 'student_id, type, label and discount_value are required' });

    const student = await Student.findById(student_id).select('full_name');
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const concession = await Concession.create({
      student_id, type, label, discount_type: discount_type || 'percentage', discount_value,
      applicable_heads: applicable_heads || [],
      valid_from, valid_to, academic_year_id,
      notes: notes || '',
      approved_by: req.user._id,
      created_by:  req.user._id,
    });

    await audit({ req, action: 'create', module: 'Concession', entity_id: concession._id, entity_label: `${label} for ${student.full_name}`, description: `Concession created: ${label} (${discount_value}${discount_type === 'percentage' ? '%' : ' Rs.'})` });
    res.status(201).json(concession);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const update = async (req, res) => {
  try {
    const c = await Concession.findById(req.params.id);
    if (!c) return res.status(404).json({ message: 'Concession not found' });
    const fields = ['type','label','discount_type','discount_value','applicable_heads','valid_from','valid_to','academic_year_id','notes','is_active'];
    fields.forEach(f => { if (req.body[f] !== undefined) c[f] = req.body[f]; });
    await c.save();
    await audit({ req, action: 'update', module: 'Concession', entity_id: c._id, entity_label: c.label });
    res.json(c);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const remove = async (req, res) => {
  try {
    const c = await Concession.findByIdAndDelete(req.params.id);
    if (!c) return res.status(404).json({ message: 'Not found' });
    await audit({ req, action: 'delete', module: 'Concession', entity_label: c.label });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// Calculate effective fee after concession for a student
const calculateEffective = async (req, res) => {
  try {
    const { student_id, fee_head_name, base_amount } = req.query;
    const concessions = await Concession.find({ student_id, is_active: true });
    let amount = parseFloat(base_amount) || 0;
    let applied = [];

    concessions.forEach(c => {
      const appliesToHead = !c.applicable_heads?.length || c.applicable_heads.includes(fee_head_name);
      if (!appliesToHead) return;
      const now = new Date();
      if (c.valid_from && new Date(c.valid_from) > now) return;
      if (c.valid_to   && new Date(c.valid_to)   < now) return;

      const discount = c.discount_type === 'percentage'
        ? amount * (c.discount_value / 100)
        : Math.min(c.discount_value, amount);
      amount -= discount;
      applied.push({ label: c.label, discount_type: c.discount_type, discount_value: c.discount_value, discount_amount: discount });
    });

    res.json({ original: parseFloat(base_amount), effective: Math.max(0, amount), applied });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { getAll, getByStudent, create, update, remove, calculateEffective };
