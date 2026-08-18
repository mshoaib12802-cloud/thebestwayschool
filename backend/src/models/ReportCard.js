const mongoose = require('mongoose');

const SubjectMarkSchema = new mongoose.Schema({
  subject_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null },
  subject_name: { type: String },
  obtained_marks: { type: Number, default: 0 },
  total_marks: { type: Number, default: 100 },
  passing_marks: { type: Number, default: 40 },
  grade: { type: String, default: '' },
  is_pass: { type: Boolean, default: false },
}, { _id: true });

const ReportCardSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  academic_year_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  class_id: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolClass', required: true },
  term: { type: String, required: true },
  subject_marks: [SubjectMarkSchema],
  total_obtained: { type: Number, default: 0 },
  total_marks: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  grade: { type: String, default: '' },
  position: { type: Number, default: null },
  remarks: { type: String, default: '' },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('ReportCard', ReportCardSchema);
