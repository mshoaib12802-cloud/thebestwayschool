const mongoose = require('mongoose');

const PaperSectionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  instructions: { type: String, default: '' },
  question_type: {
    type: String,
    enum: ['mcq', 'short', 'long', 'true_false', 'fill_blank', 'pair_match'],
    default: 'short'
  },
  marks_per_question: { type: Number, default: 1 },
  attempt_any: { type: Number, default: 0 }, // 0 = attempt all
  questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BankQuestion' }]
}, { _id: true });

const ExamPaperSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subject_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  class_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolClass', required: true },
  academic_year_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', default: null },
  exam_type: {
    type: String,
    enum: ['annual', 'half_yearly', 'monthly_test', 'quiz', 'practice', 'unit_test'],
    default: 'monthly_test'
  },
  exam_date: { type: Date, default: null },
  duration_minutes: { type: Number, default: 60 },
  total_marks: { type: Number, default: 0 },
  pass_marks:  { type: Number, default: 0 },
  general_instructions: [String],
  sections: [PaperSectionSchema],
  is_published: { type: Boolean, default: false },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

module.exports = mongoose.model('ExamPaper', ExamPaperSchema);
