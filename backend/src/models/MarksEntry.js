const mongoose = require('mongoose');

const StudentMarkSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  student_name: { type: String },
  roll_number: { type: String },
  obtained_marks: { type: Number, default: null },
  is_absent: { type: Boolean, default: false },
  remarks: { type: String, default: '' },
}, { _id: true });

const MarksEntrySchema = new mongoose.Schema({
  class_id: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolClass', required: true },
  subject_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  academic_year_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  term: { type: String, required: true }, // "Term 1", "Mid Term", "Final"
  exam_label: { type: String, required: true }, // "Monthly Test - January", "Mid-Term Exam"
  total_marks: { type: Number, required: true },
  passing_marks: { type: Number, default: 40 },
  exam_date: { type: Date },
  student_marks: [StudentMarkSchema],
  entered_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  is_finalized: { type: Boolean, default: false },
}, { timestamps: true });

MarksEntrySchema.index({ class_id: 1, subject_id: 1, academic_year_id: 1, term: 1, exam_label: 1 }, { unique: true });

module.exports = mongoose.model('MarksEntry', MarksEntrySchema);
