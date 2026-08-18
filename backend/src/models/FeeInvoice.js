const mongoose = require('mongoose');

const InvoiceItemSchema = new mongoose.Schema({
  fee_head_id: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeHead' },
  fee_head_name: { type: String },
  amount: { type: Number, default: 0 },
  is_paid: { type: Boolean, default: false },
  paid_amount: { type: Number, default: 0 },
  paid_date: { type: Date, default: null },
  transaction_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', default: null },
}, { _id: true });

const FeeInvoiceSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  class_id: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolClass' },
  academic_year_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear' },
  month: { type: String }, // "2026-01"
  items: [InvoiceItemSchema],
  total_amount: { type: Number, default: 0 },
  paid_amount: { type: Number, default: 0 },
  balance: { type: Number, default: 0 },
  status: { type: String, enum: ['unpaid', 'partial', 'paid'], default: 'unpaid' },
  due_date: { type: Date },
  notes: { type: String, default: '' },
  generated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

FeeInvoiceSchema.index({ student_id: 1, month: 1, academic_year_id: 1 }, { unique: true });

module.exports = mongoose.model('FeeInvoice', FeeInvoiceSchema);
