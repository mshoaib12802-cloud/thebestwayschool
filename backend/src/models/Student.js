const mongoose = require('mongoose');

const InstallmentSchema = new mongoose.Schema({
  label: { type: String },
  amount: { type: Number },
  due_date: { type: Date },
  is_paid: { type: Boolean, default: false },
  paid_date: { type: Date, default: null }
}, { _id: true });

const StudentSchema = new mongoose.Schema({
  full_name: { type: String, required: true },
  father_name: { type: String },
  roll_number: { type: String, unique: true, required: true },
  phone: { type: String, required: true },
  guardian_phone: { type: String },
  email: { type: String },
  cnic: { type: String },
  address: { type: String },

  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  // --- COURSE & SHIFT INFO ---
  courses: [{
    course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },
    course_name: String,
    duration: String,
    shift: {
      type: String,
      enum: ['Morning', 'Afternoon', 'Evening', 'Weekend'],
      default: 'Morning'
    },
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
  }],

  // Rs. charged per absent day — 0 disables auto-fine for this student
  absence_fine_amount: { type: Number, default: 100 },

  // --- SYSTEM INFO ---
  isActive: { type: Boolean, default: true },
  qr_code: { type: String },

}, { timestamps: true });

module.exports = mongoose.model('Student', StudentSchema);