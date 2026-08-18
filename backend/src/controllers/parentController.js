const crypto = require('crypto');
const User = require('../models/User');
const Student = require('../models/Student');

const generateSecurePassword = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(8);
  return Array.from(bytes).map(b => chars[b % chars.length]).join('');
};

const getParents = async (req, res) => {
  try {
    const parents = await User.find({ role: 'parent' })
      .select('-password')
      .populate('student_ids', 'full_name roll_number school_class_id')
      .sort({ createdAt: -1 });
    res.json(parents);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Find extra students by phone number (used in add/update)
const findStudentsByPhone = async (phone) => {
  if (!phone || phone.length < 7) return [];
  const clean = phone.replace(/[^0-9]/g, '');
  const tail  = clean.slice(-8);
  const re    = new RegExp(tail.split('').join('[^0-9]?'));
  return Student.find({
    isActive: true,
    $or: [
      { father_phone:   { $regex: re } },
      { mother_phone:   { $regex: re } },
      { guardian_phone: { $regex: re } },
    ],
  }).select('_id').lean();
};

const addParent = async (req, res) => {
  try {
    const { name, email, student_ids, phone } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) return res.status(400).json({ message: 'This email is already registered' });

    // Merge explicitly selected + phone-matched students
    const phoneStudents = await findStudentsByPhone(phone);
    const phoneStuIds   = phoneStudents.map(s => s._id.toString());
    const explicit      = (student_ids || []).map(id => id.toString());
    const allIds        = [...new Set([...explicit, ...phoneStuIds])];

    const password = generateSecurePassword();
    const parent = await User.create({
      name,
      email: email.toLowerCase().trim(),
      password,
      role: 'parent',
      phone: phone || '',
      student_ids: allIds,
      joining_date: new Date(),
    });

    if (allIds.length) {
      await Student.updateMany({ _id: { $in: allIds } }, { parent_id: parent._id });
    }

    res.status(201).json({
      parent: { _id: parent._id, name: parent.name, email: parent.email, phone: parent.phone, student_ids: allIds },
      password,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const updateParent = async (req, res) => {
  try {
    const { name, student_ids, phone } = req.body;
    const parent = await User.findById(req.params.id);
    if (!parent || parent.role !== 'parent') {
      return res.status(404).json({ message: 'Parent not found' });
    }

    // Unlink previous students
    if (parent.student_ids?.length) {
      await Student.updateMany({ parent_id: parent._id }, { parent_id: null });
    }

    if (name) parent.name = name;
    if (phone !== undefined) parent.phone = phone;

    // Merge explicit + phone-matched
    const phoneStudents = await findStudentsByPhone(phone ?? parent.phone);
    const phoneStuIds   = phoneStudents.map(s => s._id.toString());
    const explicit      = (student_ids !== undefined ? student_ids : parent.student_ids).map(id => id.toString());
    const allIds        = [...new Set([...explicit, ...phoneStuIds])];

    parent.student_ids = allIds;
    if (allIds.length) {
      await Student.updateMany({ _id: { $in: allIds } }, { parent_id: parent._id });
    }
    await parent.save();

    const updated = await User.findById(parent._id)
      .select('-password')
      .populate('student_ids', 'full_name roll_number school_class_id');
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const deleteParent = async (req, res) => {
  try {
    const parent = await User.findById(req.params.id);
    if (!parent || parent.role !== 'parent') {
      return res.status(404).json({ message: 'Parent not found' });
    }
    await Student.updateMany({ parent_id: parent._id }, { parent_id: null });
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Parent account deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getParentCredentials = async (req, res) => {
  try {
    const parent = await User.findById(req.params.id).select('name email role');
    if (!parent || parent.role !== 'parent') {
      return res.status(404).json({ message: 'Parent not found' });
    }
    res.json({ name: parent.name, email: parent.email });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getParents, addParent, updateParent, deleteParent, getParentCredentials };
