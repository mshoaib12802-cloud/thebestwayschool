const mongoose = require('mongoose');

const DailyLogSchema = new mongoose.Schema({
  date:        { type: Date, required: true },
  description: { type: String, default: '' },
  amount:      { type: Number, default: 0 },
  items:       [{
    item_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'CanteenItem' },
    item_name: String,
    qty:       { type: Number, default: 1 },
    price:     Number,
  }],
}, { _id: true });

const CanteenChargeSchema = new mongoose.Schema({
  student_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  class_id:         { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolClass' },
  academic_year_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear' },
  month:            { type: String, required: true },  // "2026-06"
  amount:           { type: Number, default: 0 },
  daily_log:        [DailyLogSchema],
  notes:            { type: String, default: '' },
  status:           { type: String, enum: ['pending', 'invoiced', 'paid'], default: 'pending' },
  fee_invoice_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'FeeInvoice', default: null },
  set_by:           { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

CanteenChargeSchema.index({ student_id: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('CanteenCharge', CanteenChargeSchema);
