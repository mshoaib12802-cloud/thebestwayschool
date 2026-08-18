const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
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

const generateRollNumber = async () => {
  const year = new Date().getFullYear();
  let retries = 0;
  while (retries < 10) {
    const count = await Student.countDocuments();
    const roll = `${year}-${String(count + 1 + retries).padStart(4, '0')}`;
    const exists = await Student.findOne({ roll_number: roll });
    if (!exists) return roll;
    retries++;
  }
  throw new Error('Could not generate unique roll number');
};

// ── 1. Enroll New Student ──────────────────────────────────────────────────
const addStudent = async (req, res) => {
  try {
    const body = req.body;

    // Build login email: use provided email or generate a system one
    const admissionEmail = body.email
      ? body.email.toLowerCase().trim()
      : null;  // will be set after roll_number is generated

    if (admissionEmail) {
      const emailExists = await User.findOne({ email: admissionEmail });
      if (emailExists) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: 'This email address is already registered.' });
      }
    }

    const roll_number = await generateRollNumber();
    const loginEmail = admissionEmail || `${roll_number.toLowerCase().replace('/', '-')}@school.erp`;

    const student = await Student.create({
      full_name:       body.full_name,
      full_name_urdu:  body.full_name_urdu  || '',
      photo:           req.file ? req.file.filename : '',
      dob:             body.dob             || null,
      place_of_birth:  body.place_of_birth  || '',
      gender:          body.gender          || 'male',
      religion:        body.religion        || 'Islam',
      nationality:     body.nationality     || 'Pakistani',
      domicile:        body.domicile        || '',
      blood_group:     body.blood_group     || 'Unknown',
      b_form_no:       body.b_form_no       || '',
      cnic:            body.b_form_no       || '',

      father_name:       body.father_name       || '',
      father_cnic:       body.father_cnic       || '',
      father_phone:      body.father_phone      || '',
      father_occupation: body.father_occupation || '',
      father_employer:   body.father_employer   || '',
      mother_name:       body.mother_name       || '',
      mother_cnic:       body.mother_cnic       || '',
      mother_phone:      body.mother_phone      || '',
      mother_occupation: body.mother_occupation || '',
      guardian_name:     body.guardian_name     || '',
      guardian_phone:    body.guardian_phone    || '',
      guardian_relation: body.guardian_relation || '',

      phone:   body.father_phone || body.guardian_phone || '',
      email:   admissionEmail || '',
      address: body.address || '',
      city:    body.city    || '',

      emergency_contact_name:     body.emergency_contact_name     || '',
      emergency_contact_phone:    body.emergency_contact_phone    || '',
      emergency_contact_relation: body.emergency_contact_relation || '',

      roll_number,
      school_class_id:  body.school_class_id  || null,
      section:          body.section          || '',
      academic_year_id: body.academic_year_id || null,
      medium:           body.medium           || 'English',
      subject_group:    body.subject_group    || 'None',
      admission_date:   body.admission_date   || new Date(),
      siblings_in_school: Number(body.siblings_in_school) || 0,

      previous_school:        body.previous_school        || '',
      previous_class:         body.previous_class         || '',
      leaving_certificate_no: body.leaving_certificate_no || '',
      transfer_reason:        body.transfer_reason        || '',

      disability: body.disability || '',
      allergies:  body.allergies  || '',
      transport_required: body.transport_required === 'true' || body.transport_required === true,

      qr_code: roll_number,
    });

    const plainPassword = generateSecurePassword();
    const userAccount = await User.create({
      name:  body.full_name,
      email: loginEmail,
      password: plainPassword,
      role: 'student',
      student_id: student._id,
      qr_code: roll_number,
    });

    await Student.findByIdAndUpdate(student._id, { user_id: userAccount._id });

    if (body.visitor_id) {
      await Visitor.findByIdAndUpdate(body.visitor_id, { status: 'converted' }).catch(() => {});
    }

    if (admissionEmail) {
      sendCredentialsEmail({
        to: admissionEmail,
        name: body.full_name,
        role: 'student',
        email: loginEmail,
        password: plainPassword,
      }).catch(() => {});
    }

    res.status(201).json({
      student: await Student.findById(student._id)
        .populate('school_class_id', 'name grade')
        .populate('academic_year_id', 'label'),
      credentials: { email: loginEmail, password: plainPassword, roll_number },
    });
  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path).catch?.(() => {});
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Duplicate roll number or email — please retry.' });
    }
    res.status(400).json({ message: error.message });
  }
};

// ── 2. Get All Students ───────────────────────────────────────────────────
const getStudents = async (req, res) => {
  try {
    const filter = {};
    if (req.query.class_id)        filter.school_class_id  = req.query.class_id;
    if (req.query.academic_year_id) filter.academic_year_id = req.query.academic_year_id;
    if (req.query.active === 'true') filter.isActive = true;
    if (req.query.search) {
      const re = new RegExp(req.query.search, 'i');
      filter.$or = [{ full_name: re }, { roll_number: re }];
    }

    const students = await Student.find(filter)
      .sort({ createdAt: -1 })
      .populate('school_class_id', 'name grade_level section')
      .populate('academic_year_id', 'label')
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

// ── 3. Update Student ─────────────────────────────────────────────────────
const SCHOOL_UPDATE_FIELDS = [
  'full_name', 'full_name_urdu', 'dob', 'place_of_birth', 'gender', 'religion',
  'nationality', 'domicile', 'blood_group', 'b_form_no', 'cnic',
  'father_name', 'father_cnic', 'father_phone', 'father_occupation', 'father_employer',
  'mother_name', 'mother_cnic', 'mother_phone', 'mother_occupation',
  'guardian_name', 'guardian_phone', 'guardian_relation',
  'phone', 'email', 'address', 'city',
  'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation',
  'school_class_id', 'section', 'academic_year_id', 'medium', 'subject_group', 'admission_date',
  'siblings_in_school', 'previous_school', 'previous_class', 'leaving_certificate_no',
  'transfer_reason', 'disability', 'allergies', 'transport_required',
  'absence_fine_amount',
];

const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const update = {};

    SCHOOL_UPDATE_FIELDS.forEach(field => {
      if (req.body[field] !== undefined) update[field] = req.body[field];
    });

    // Photo update: new file uploaded
    if (req.file) {
      const existing = await Student.findById(id).select('photo');
      if (existing?.photo) {
        const oldPath = path.join(__dirname, '../../uploads/students', existing.photo);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      update.photo = req.file.filename;
    }

    if (req.body.courses) update.courses = req.body.courses;

    const updated = await Student.findByIdAndUpdate(id, update, { new: true, runValidators: true })
      .populate('school_class_id', 'name grade')
      .populate('academic_year_id', 'label');

    if (!updated) return res.status(404).json({ message: 'Student not found' });
    res.json(updated);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

// ── 4. Delete Student ─────────────────────────────────────────────────────
const deleteStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    if (student.photo) {
      const photoPath = path.join(__dirname, '../../uploads/students', student.photo);
      if (fs.existsSync(photoPath)) fs.unlinkSync(photoPath);
    }
    if (student.user_id) await User.findByIdAndDelete(student.user_id);
    await Student.findByIdAndDelete(req.params.id);

    res.json({ message: 'Student deleted successfully' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// ── 5. Graduate / Archive Student ────────────────────────────────────────
const graduateStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    student.isActive = false;
    if (student.courses?.[0]) student.courses[0].completion_date = new Date();
    await student.save();
    res.json({ message: 'Student archived successfully' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// ── 6. Reset Credentials ──────────────────────────────────────────────────
const getStudentCredentials = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const userAccount = await User.findById(student.user_id);
    if (!userAccount) return res.status(404).json({ message: 'No login account found for this student' });

    const newPassword = generateSecurePassword();
    userAccount.password = newPassword;
    await userAccount.save();

    if (student.email) {
      sendCredentialsEmail({
        to: userAccount.email,
        name: student.full_name,
        role: 'student',
        email: userAccount.email,
        password: newPassword,
      }).catch(() => {});
    }

    res.json({ email: userAccount.email, password: newPassword, roll_number: student.roll_number });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// ── 7. Set Installments (legacy academy) ─────────────────────────────────
const setInstallments = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    if (!student.courses[0]) return res.status(400).json({ message: 'No course enrolled' });
    student.courses[0].installments = req.body.installments;
    await student.save();
    res.json({ message: 'Installment plan saved', installments: student.courses[0].installments });
  } catch (error) { res.status(400).json({ message: error.message }); }
};

// ── Family Lookup ─────────────────────────────────────────────────────────────
// GET /api/students/family-lookup?phone=03001234567
// Returns all students whose father_phone OR mother_phone OR guardian_phone matches
const familyLookup = async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone || phone.length < 7)
      return res.json({ students: [], family: null });

    const clean = phone.replace(/[^0-9]/g, '');
    // Build a pattern that allows optional separator chars between digits
    // so "03001111111" matches stored "0300-1111111" or "0300 1111111"
    const tail    = clean.slice(-8);
    const pattern = tail.split('').join('[^0-9]?');
    const re      = new RegExp(pattern);

    const students = await Student.find({
      isActive: true,
      $or: [
        { father_phone: { $regex: re } },
        { mother_phone: { $regex: re } },
        { guardian_phone: { $regex: re } },
      ],
    })
      .select('full_name roll_number father_name father_cnic father_phone father_occupation father_employer mother_name mother_cnic mother_phone mother_occupation guardian_name guardian_phone guardian_relation school_class_id address city')
      .populate('school_class_id', 'name section grade_level')
      .limit(20)
      .lean();

    // Extract shared family bio from first match
    const family = students.length ? {
      father_name:       students[0].father_name,
      father_cnic:       students[0].father_cnic,
      father_phone:      students[0].father_phone,
      father_occupation: students[0].father_occupation,
      father_employer:   students[0].father_employer,
      mother_name:       students[0].mother_name,
      mother_cnic:       students[0].mother_cnic,
      mother_phone:      students[0].mother_phone,
      mother_occupation: students[0].mother_occupation,
      address:           students[0].address,
      city:              students[0].city,
    } : null;

    res.json({ students, family });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  addStudent, getStudents, updateStudent, deleteStudent,
  graduateStudent, getStudentCredentials, setInstallments, familyLookup,
};
