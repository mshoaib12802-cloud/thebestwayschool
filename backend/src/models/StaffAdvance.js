const mongoose = require('mongoose');

const StaffAdvanceSchema = new mongoose.Schema({
  staff_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true, min: 1 },
  reason: { type: String, required: true },
  requested_date: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'recovered'], default: 'pending' },
  approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  approved_date: { type: Date, default: null },
  recovery_months: { type: Number, default: 1 }, // deduct over N months
  recovered_amount: { type: Number, default: 0 },
  notes: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('StaffAdvance', StaffAdvanceSchema);
