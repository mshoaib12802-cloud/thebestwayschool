const crypto = require('crypto');
const Visitor = require('../models/Visitor');
const Student = require('../models/Student');
const User    = require('../models/User');
const { sendCredentialsEmail } = require('../utils/sendEmail');

const generateSecurePassword = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(8);
  return Array.from(bytes).map(b => chars[b % chars.length]).join('');
};

// 1. Add New Inquiry
const addVisitor = async (req, res) => {
  try {
    const visitor = await Visitor.create(req.body);
    res.status(201).json(visitor);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

// 2. Get All Inquiries (Sorted by Priority & Date)
const getVisitors = async (req, res) => {
  try {
    const visitors = await Visitor.find().sort({ priority: 1, createdAt: -1 });
    res.json(visitors);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// 3. Update Status / Add Remark
const updateVisitor = async (req, res) => {
  try {
    const { status, follow_up_date, new_remark, priority } = req.body;
    
    const visitor = await Visitor.findById(req.params.id);
    if(!visitor) return res.status(404).json({message: 'Visitor not found'});

    if(status) visitor.status = status;
    if(priority) visitor.priority = priority;
    if(follow_up_date) visitor.follow_up_date = follow_up_date;
    if(new_remark) visitor.remarks.push({ note: new_remark });

    await visitor.save();
    res.json(visitor);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

// 4. Delete
const deleteVisitor = async (req, res) => {
  try {
    await Visitor.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// 5. Get online admission requests (source = 'Online Form')
const getAdmissionRequests = async (req, res) => {
  try {
    const requests = await Visitor.find({ source: 'Online Form' })
      .sort({ createdAt: -1 })
      .populate('enrolled_student_id', 'full_name roll_number');
    res.json(requests);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// 6. Approve admission request → create student + send credentials
const approveAdmissionRequest = async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) return res.status(404).json({ message: 'Admission request not found' });
    if (visitor.admission_status === 'approved') {
      return res.status(400).json({ message: 'This request is already approved' });
    }

    const {
      full_name, father_name, phone, guardian_phone,
      email, course_name, course_id, duration, shift,
      total_fee, monthly_fee, admission_date, trainer_id,
    } = req.body;

    if (!email) return res.status(400).json({ message: 'Student email is required' });

    const emailExists = await User.findOne({ email: email.toLowerCase().trim() });
    if (emailExists) return res.status(400).json({ message: 'This email is already registered' });

    // Generate roll number
    let roll_number, retries = 0;
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
      full_name, father_name, phone,
      guardian_phone: guardian_phone || phone,
      email: email.toLowerCase().trim(),
      roll_number,
      courses: [{
        course_name, course_id: course_id || null,
        duration, shift,
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

    // Mark visitor as approved
    visitor.admission_status = 'approved';
    visitor.status = 'converted';
    visitor.approved_at = new Date();
    visitor.enrolled_student_id = student._id;
    await visitor.save();

    // Send credentials email (non-blocking)
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
      return res.status(400).json({ message: 'Email or roll number conflict — please try again.' });
    }
    res.status(400).json({ message: error.message });
  }
};

// 7. Reject admission request
const rejectAdmissionRequest = async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) return res.status(404).json({ message: 'Admission request not found' });
    visitor.admission_status = 'rejected';
    visitor.status = 'lost';
    visitor.rejection_reason = req.body.reason || '';
    await visitor.save();
    res.json({ message: 'Application rejected' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

module.exports = {
  addVisitor, getVisitors, updateVisitor, deleteVisitor,
  getAdmissionRequests, approveAdmissionRequest, rejectAdmissionRequest,
};