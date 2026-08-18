const mongoose = require('mongoose');

const AssignmentSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  class_id: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolClass', required: true },
  subject_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  academic_year_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear' },
  teacher_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  due_date: { type: Date, required: true },
  total_marks: { type: Number, default: 0 },
  attachment_url: { type: String, default: '' },
  status: { type: String, enum: ['active', 'closed'], default: 'active' },
}, { timestamps: true });

module.exports = mongoose.model('Assignment', AssignmentSchema);
