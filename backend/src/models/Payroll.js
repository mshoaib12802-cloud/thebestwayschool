const mongoose = require('mongoose');

const PayrollSchema = new mongoose.Schema({
  staff_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  month: { type: String, required: true }, // "2026-01"
  basic_salary: { type: Number, default: 0 },
  allowances: [{
    label: { type: String },
    amount: { type: Number, default: 0 },
  }],
  deductions: [{
    label: { type: String },
    amount: { type: Number, default: 0 },
  }],
  advance_deduction: { type: Number, default: 0 },
  absence_deduction: { type: Number, default: 0 },
  gross_salary: { type: Number, default: 0 },
  net_salary: { type: Number, default: 0 },
  status: { type: String, enum: ['draft', 'paid'], default: 'draft' },
  paid_date: { type: Date, default: null },
  payment_method: { type: String, default: 'bank_transfer' },
  notes: { type: String, default: '' },
  transaction_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', default: null },
  processed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

PayrollSchema.index({ staff_id: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Payroll', PayrollSchema);
