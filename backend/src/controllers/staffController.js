const crypto = require('crypto');
const User = require('../models/User');
const { sendCredentialsEmail } = require('../utils/sendEmail');

const generateSecurePassword = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(8);
  return Array.from(bytes).map(b => chars[b % chars.length]).join('');
};

// 1. Add Staff — sends credentials to their Gmail
const addStaff = async (req, res) => {
  try {
    const { name, email, phone, role, salary_type, salary_amount, joining_date, commission_percent, assigned_courses } = req.body;

    if (!email) return res.status(400).json({ message: 'Email is required' });

    const userExists = await User.findOne({ email: email.toLowerCase().trim() });
    if (userExists) return res.status(400).json({ message: 'Email already registered' });

    const plainPassword = generateSecurePassword();

    const user = await User.create({
      name,
      email: email.toLowerCase().trim(),
      role,
      password: plainPassword,
      salary_type: salary_type || 'monthly',
      salary_amount: Number(salary_amount) || 0,
      commission_percent: Number(commission_percent) || 0,
      joining_date: joining_date || new Date(),
      qr_code: `STAFF-${Math.floor(1000 + Math.random() * 9000)}`,
      assigned_courses: Array.isArray(assigned_courses) ? assigned_courses : [],
    });

    // Send credentials to staff Gmail
    sendCredentialsEmail({
      to: email.toLowerCase().trim(),
      name,
      role,
      email: email.toLowerCase().trim(),
      password: plainPassword,
    }).catch(() => {});

    const userObj = user.toObject();
    delete userObj.password;
    res.status(201).json({ staff: userObj, credentials: { email: user.email, password: plainPassword } });
  } catch (error) { res.status(400).json({ message: error.message }); }
};

// 2. Get All Staff
const getAllStaff = async (req, res) => {
  try {
    const staff = await User.find({ role: { $in: ['teacher', 'clerk', 'office_boy'] } }).select('-password');
    res.json(staff);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// 3. Delete Staff
const deleteStaff = async (req, res) => {
  try {
    const staff = await User.findById(req.params.id);
    if (!staff) return res.status(404).json({ message: 'Staff not found' });
    if (staff.role === 'admin') return res.status(403).json({ message: 'System admin cannot be deleted' });
    if (staff.role === 'student') return res.status(400).json({ message: 'Use the Students section to remove students' });
    await staff.deleteOne();
    res.json({ message: 'Staff member removed' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// 4. Get Trainers (for enrollment dropdown)
const getTrainers = async (req, res) => {
  try {
    const trainers = await User.find({ role: 'teacher' }).select('name commission_percent qr_code assigned_courses');
    res.json(trainers);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// 5. Reset staff credentials — generates new password and emails them
const resetStaffCredentials = async (req, res) => {
  try {
    const staff = await User.findById(req.params.id);
    if (!staff) return res.status(404).json({ message: 'Staff not found' });
    if (staff.role === 'admin') return res.status(403).json({ message: 'Cannot reset admin credentials here' });

    const plainPassword = generateSecurePassword();
    staff.password = plainPassword;
    await staff.save();

    sendCredentialsEmail({
      to: staff.email,
      name: staff.name,
      role: staff.role,
      email: staff.email,
      password: plainPassword,
    }).catch(() => {});

    res.json({ credentials: { email: staff.email, password: plainPassword } });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// 6. Update assigned courses
const updateStaffCourses = async (req, res) => {
  try {
    const { assigned_courses } = req.body;
    const staff = await User.findByIdAndUpdate(
      req.params.id,
      { assigned_courses: Array.isArray(assigned_courses) ? assigned_courses : [] },
      { new: true }
    ).select('-password');
    if (!staff) return res.status(404).json({ message: 'Staff not found' });
    res.json(staff);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

module.exports = { addStaff, getAllStaff, deleteStaff, getTrainers, resetStaffCredentials, updateStaffCourses };
