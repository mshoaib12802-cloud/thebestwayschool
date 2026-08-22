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

const ConcessionLineSchema = new mongoose.Schema({
  label: { type: String },
  fee_head_name: { type: String },
  discount_amount: { type: Number, default: 0 },
}, { _id: false });

const FeeInvoiceSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  class_id: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolClass' },
  academic_year_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear' },
  month: { type: String }, // "2026-01"
  items: [InvoiceItemSchema],
  total_amount: { type: Number, default: 0 },
  // Concession + any manual discount already taken off total_amount, kept for
  // the receipt so the bill can show what was waived and why.
  discount_amount: { type: Number, default: 0 },
  concessions: [ConcessionLineSchema],
  // Accrued after due_date at InstituteSettings.fine_per_day. Owed on top of
  // total_amount, so balance = total_amount + late_fine - paid_amount.
  late_fine: { type: Number, default: 0 },
  paid_amount: { type: Number, default: 0 },
  balance: { type: Number, default: 0 },
  status: { type: String, enum: ['unpaid', 'partial', 'paid'], default: 'unpaid' },
  due_date: { type: Date },
  notes: { type: String, default: '' },
  generated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

FeeInvoiceSchema.index({ student_id: 1, month: 1, academic_year_id: 1 }, { unique: true });

module.exports = mongoose.model('FeeInvoice', FeeInvoiceSchema);
