const mongoose = require('mongoose');

const FeeStructureItemSchema = new mongoose.Schema({
  fee_head_id: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeHead', required: true },
  fee_head_name: { type: String },
  amount: { type: Number, required: true, min: 0 },
}, { _id: true });

const FeeStructureSchema = new mongoose.Schema({
  class_id: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolClass', required: true },
  academic_year_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  items: [FeeStructureItemSchema],
  due_day: { type: Number, default: 10, min: 1, max: 28 },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

FeeStructureSchema.index({ class_id: 1, academic_year_id: 1 }, { unique: true });

module.exports = mongoose.model('FeeStructure', FeeStructureSchema);
