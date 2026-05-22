const crypto = require('crypto');
const Student = require('../models/Student');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Visitor = require('../models/Visitor');
const { sendCredentialsEmail } = require('../utils/sendEmail');

const generateSecurePassword = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(8);
  return Array.from(bytes).map(b => chars[b % chars.length]).join('');
};

// 1. Add New Student — uses student's real Gmail for login
const addStudent = async (req, res) => {
  try {
    const {
      full_name, father_name, phone, guardian_phone,
      course_name, duration, shift, total_fee, monthly_fee,
      admission_date, trainer_id, visitor_id,
      email,           // student's real Gmail address (required)
    } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Student Gmail address is required for account creation.' });
    }

    // Check if this Gmail is already used as a login
    const emailExists = await User.findOne({ email: email.toLowerCase().trim() });
    if (emailExists) {
      return res.status(400).json({ message: 'This email address is already registered.' });
    }

    // Use a DB transaction-safe roll number (retry on duplicate)
    let roll_number;
    let retries = 0;
    while (retries < 5) {
      const count = await Student.countDocuments();
      roll_number = `STD-${new Date().getFullYear()}-${String(count + 1 + retries).padStart(3, '0')}`;
      const exists = await Student.findOne({ roll_number });
      if (!exists) break;
      retries++;
    }

    let trainer_commission_percent = 0;
    if (trainer_id) {
      const trainer = await User.findById(trainer_id).select('commission_percent');
      if (trainer) trainer_commission_percent = trainer.commission_percent || 0;
    }

    const student = await Student.create({
      full_name,
      father_name,
      phone,
      guardian_phone,
      email: email.toLowerCase().trim(),
      roll_number,
      courses: [{
        course_name,
        duration,
        shift,
        total_fee: Number(total_fee),
        monthly_fee: Number(monthly_fee),
        admission_date: admission_date || new Date(),
        trainer_id: trainer_id || null,
        trainer_commission_percent,
      }],
      qr_code: roll_number,
    });

    const plainPassword = generateSecurePassword();

    const userAccount = await User.create({
      name: full_name,
      email: email.toLowerCase().trim(),
      password: plainPassword,
      role: 'student',
      student_id: student._id,
    });

    await Student.findByIdAndUpdate(student._id, { user_id: userAccount._id });

    if (visitor_id) {
      await Visitor.findByIdAndUpdate(visitor_id, { status: 'converted' });
    }

    // Send credentials to student's Gmail (non-blocking)
    sendCredentialsEmail({
      to: email.toLowerCase().trim(),
      name: full_name,
      role: 'student',
      email: email.toLowerCase().trim(),
      password: plainPassword,
    }).catch(() => {});

    res.status(201).json({
      student,
      credentials: { email: email.toLowerCase().trim(), password: plainPassword, roll_number },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Roll number or email conflict — please try again.' });
    }
    res.status(400).json({ message: error.message });
  }
};

// 2. Get All Students
const getStudents = async (req, res) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 })
      .populate('courses.batch_id', 'name shift start_date end_date course_name capacity');

    const payments = await Transaction.aggregate([
      { $match: { type: 'income', category: 'fee_collection' } },
      { $group: { _id: '$student_id', total_paid: { $sum: '$amount' } } },
    ]);
    const paymentMap = {};
    payments.forEach(p => { if (p._id) paymentMap[p._id.toString()] = p.total_paid; });

    const result = students.map(s => ({
      ...s.toObject(),
      total_paid: paymentMap[s._id.toString()] || 0,
    }));

    res.json(result);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// 3. Update Student — only allow safe fields (no mass assignment)
const ALLOWED_UPDATE_FIELDS = [
  'full_name', 'father_name', 'phone', 'guardian_phone', 'email',
  'address', 'cnic', 'absence_fine_amount',
];

const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const update = {};
    ALLOWED_UPDATE_FIELDS.forEach(field => {
      if (req.body[field] !== undefined) update[field] = req.body[field];
    });

    // Allow updating course fields safely
    if (req.body.courses) {
      update.courses = req.body.courses;
    }

    const updatedStudent = await Student.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    if (!updatedStudent) return res.status(404).json({ message: 'Student not found' });
    res.json(updatedStudent);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

// 4. Delete Student
const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await Student.findById(id);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    if (student.user_id) {
      await User.findByIdAndDelete(student.user_id);
    }
    await Student.findByIdAndDelete(id);
    res.json({ message: 'Student deleted successfully' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// 5. Graduate Student
const graduateStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    student.isActive = false;
    if (student.courses[0]) student.courses[0].completion_date = new Date();
    await student.save();
    res.json({ message: 'Student graduated successfully' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// 6. Reset student credentials — generates new password and re-sends to Gmail
const getStudentCredentials = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const userAccount = await User.findById(student.user_id);
    if (!userAccount) return res.status(404).json({ message: 'No login account found for this student' });

    const newPassword = generateSecurePassword();
    userAccount.password = newPassword;
    await userAccount.save();

    // Re-send to student's Gmail
    sendCredentialsEmail({
      to: userAccount.email,
      name: student.full_name,
      role: 'student',
      email: userAccount.email,
      password: newPassword,
    }).catch(() => {});

    res.json({ email: userAccount.email, password: newPassword, roll_number: student.roll_number });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// 7. Set installment plan
const setInstallments = async (req, res) => {
  try {
    const { id } = req.params;
    const { installments } = req.body;
    const student = await Student.findById(id);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    if (!student.courses[0]) return res.status(400).json({ message: 'No course enrolled' });
    student.courses[0].installments = installments;
    await student.save();
    res.json({ message: 'Installment plan saved', installments: student.courses[0].installments });
  } catch (error) { res.status(400).json({ message: error.message }); }
};

module.exports = { addStudent, getStudents, updateStudent, deleteStudent, graduateStudent, getStudentCredentials, setInstallments };
