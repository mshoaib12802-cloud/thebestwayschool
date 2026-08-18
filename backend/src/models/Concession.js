const mongoose = require('mongoose');

const ConcessionSchema = new mongoose.Schema({
  student_id:      { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  type:            { type: String, enum: ['scholarship', 'sibling', 'staff_child', 'need_based', 'merit', 'custom'], required: true },
  label:           { type: String, required: true },
  discount_type:   { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
  discount_value:  { type: Number, required: true },
  applicable_heads: [{ type: String }],  // fee head names; empty = all
  valid_from:      { type: Date },
  valid_to:        { type: Date },
  academic_year_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear' },
  is_active:       { type: Boolean, default: true },
  notes:           { type: String, default: '' },
  approved_by:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  created_by:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

ConcessionSchema.index({ student_id: 1, is_active: 1 });

module.exports = mongoose.model('Concession', ConcessionSchema);
