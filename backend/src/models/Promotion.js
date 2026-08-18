const mongoose = require('mongoose');

const PromotionSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  from_class_id: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolClass', default: null },
  to_class_id: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolClass', default: null },
  academic_year_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', default: null },
  promoted_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: {
    type: String,
    enum: ['promoted', 'repeated', 'graduated'],
    default: 'promoted',
  },
  remarks: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Promotion', PromotionSchema);
