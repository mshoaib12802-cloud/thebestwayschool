const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['admin', 'teacher', 'student', 'clerk', 'office_boy', 'client'],
    default: 'student'
  },
  salary_type: { type: String, default: 'monthly' },
  salary_amount: { type: Number, default: 0 },
  commission_percent: { type: Number, default: 0 }, // % of each fee payment credited to this trainer
  qr_code: { type: String },
  joining_date: { type: Date, default: Date.now },
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null },
  client_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'Client',  default: null },
  assigned_courses: [{ type: String }]
}, { timestamps: true });

// --- YEH DO FUNCTIONS BOHT ZAROORI HAIN ---

// 1. Password Hash karna (Save se pehle)
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// 2. Password Match karna (Login ke waqt)
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);