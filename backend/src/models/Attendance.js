const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  person_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'person_type'
  },
  person_type: { type: String, required: true, enum: ['Student', 'User'] },

  date: { type: Date, default: Date.now },

  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'leave', 'half_day'],
    default: 'absent'
  },

  method: {
    type: String,
    enum: ['qr_scan', 'manual', 'bulk_rollcall', 'self_checkin', 'biometric', 'rfid', 'system'],
    default: 'manual'
  },

  check_in_time:  { type: Date },
  check_out_time: { type: Date },
  late_minutes:   { type: Number, default: 0 },
  note:           { type: String, default: '' },

  marked_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

AttendanceSchema.index({ person_id: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
