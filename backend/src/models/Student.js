const mongoose = require('mongoose');

// kept for academy backward-compat
const InstallmentSchema = new mongoose.Schema({
  label: { type: String },
  amount: { type: Number },
  due_date: { type: Date },
  is_paid: { type: Boolean, default: false },
  paid_date: { type: Date, default: null }
}, { _id: true });

const CourseEntrySchema = new mongoose.Schema({
  course_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },
  course_name: String,
  duration: String,
  shift: { type: String, enum: ['Morning', 'Afternoon', 'Evening', 'Weekend'], default: 'Morning' },
  total_fee: Number,
  discount_amount: { type: Number, default: 0 },
  monthly_fee: Number,
  late_fee_percent: { type: Number, default: 0 },
  admission_date: { type: Date, default: Date.now },
  completion_date: Date,
  trainer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  trainer_commission_percent: { type: Number, default: 0 },
  batch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', default: null },
  installments: [InstallmentSchema],
});

const StudentSchema = new mongoose.Schema({

  // ── Identity ─────────────────────────────────────────────────────────────
  full_name:       { type: String, required: true },
  full_name_urdu:  { type: String, default: '' },
  photo:           { type: String, default: '' }, // stored filename
  dob:             { type: Date },
  place_of_birth:  { type: String, default: '' },
  gender:          { type: String, enum: ['male', 'female'], default: 'male' },
  religion:        { type: String, enum: ['Islam', 'Christianity', 'Hinduism', 'Sikhism', 'Other'], default: 'Islam' },
  nationality:     { type: String, default: 'Pakistani' },
  domicile:        { type: String, default: '' },
  blood_group:     { type: String, enum: ['A+','A-','B+','B-','AB+','AB-','O+','O-','Unknown'], default: 'Unknown' },
  b_form_no:       { type: String, default: '' },  // child's B-Form / CNIC
  cnic:            { type: String, default: '' },  // backward compat alias

  // ── Father ────────────────────────────────────────────────────────────────
  father_name:       { type: String, default: '' },
  father_cnic:       { type: String, default: '' },
  father_phone:      { type: String, default: '' },
  father_occupation: { type: String, default: '' },
  father_employer:   { type: String, default: '' },

  // ── Mother ────────────────────────────────────────────────────────────────
  mother_name:       { type: String, default: '' },
  mother_cnic:       { type: String, default: '' },
  mother_phone:      { type: String, default: '' },
  mother_occupation: { type: String, default: '' },

  // ── Guardian (if different from father/mother) ───────────────────────────
  guardian_name:     { type: String, default: '' },
  guardian_phone:    { type: String, default: '' },
  guardian_relation: { type: String, default: '' },

  // ── Contact ───────────────────────────────────────────────────────────────
  phone:   { type: String, default: '' }, // primary contact (backward compat)
  email:   { type: String, default: '' },
  address: { type: String, default: '' },
  city:    { type: String, default: '' },

  // ── Emergency Contact ────────────────────────────────────────────────────
  emergency_contact_name:     { type: String, default: '' },
  emergency_contact_phone:    { type: String, default: '' },
  emergency_contact_relation: { type: String, default: '' },

  // ── Academic Info ─────────────────────────────────────────────────────────
  roll_number:       { type: String, unique: true, required: true },
  school_class_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolClass', default: null },
  section:           { type: String, default: '' },
  academic_year_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', default: null },
  medium:            { type: String, enum: ['English', 'Urdu'], default: 'English' },
  subject_group:     {
    type: String,
    enum: ['None','Pre-Medical','Pre-Engineering','Computer Science','Arts','Commerce','General Science'],
    default: 'None',
  },
  admission_date:    { type: Date, default: Date.now },
  siblings_in_school:{ type: Number, default: 0 },

  // ── Previous School ───────────────────────────────────────────────────────
  previous_school:       { type: String, default: '' },
  previous_class:        { type: String, default: '' },
  leaving_certificate_no:{ type: String, default: '' },
  transfer_reason:       { type: String, default: '' },

  // ── Medical ───────────────────────────────────────────────────────────────
  disability: { type: String, default: '' },
  allergies:  { type: String, default: '' },

  // ── Transport ─────────────────────────────────────────────────────────────
  transport_required: { type: Boolean, default: false },

  // ── Relationships ─────────────────────────────────────────────────────────
  user_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  parent_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  // ── System ────────────────────────────────────────────────────────────────
  isActive:            { type: Boolean, default: true },
  qr_code:             { type: String },
  absence_fine_amount: { type: Number, default: 0 },

  // ── Legacy academy fields (backward compat) ───────────────────────────────
  courses: [CourseEntrySchema],

}, { timestamps: true });

module.exports = mongoose.model('Student', StudentSchema);
