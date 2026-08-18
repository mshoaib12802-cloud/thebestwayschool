const mongoose = require('mongoose');

const LeaveSchema = new mongoose.Schema({
  applicant_type: { type: String, enum: ['staff', 'student'], required: true },
  staff_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null },
  leave_type: {
    type: String,
    enum: ['casual', 'sick', 'annual', 'emergency', 'maternity', 'other'],
    required: true,
  },
  from_date: { type: Date, required: true },
  to_date: { type: Date, required: true },
  total_days: { type: Number, default: 1 },
  reason: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reviewed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewed_at: { type: Date, default: null },
  rejection_reason: { type: String, default: '' },
  applied_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // parent or staff themselves
}, { timestamps: true });

module.exports = mongoose.model('Leave', LeaveSchema);
