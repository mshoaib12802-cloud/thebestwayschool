const mongoose = require('mongoose');

const ExamSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  course_name: { type: String, required: true },
  type:        { type: String, enum: ['quiz', 'midterm', 'final', 'assignment', 'practical'], default: 'quiz' },
  batch_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', default: null },
  exam_date:   { type: Date, required: true },
  duration_minutes: { type: Number, default: 60 },
  total_marks: { type: Number, required: true },
  pass_marks:  { type: Number, default: 0 },
  is_published:{ type: Boolean, default: false },
  grade_boundaries: {
    a_plus: { type: Number, default: 90 },
    a:      { type: Number, default: 80 },
    b:      { type: Number, default: 70 },
    c:      { type: Number, default: 60 },
    d:      { type: Number, default: 50 },
  },
  description: { type: String, default: '' },
  is_live:                  { type: Boolean, default: false },
  live_start:               { type: Date, default: null },
  live_end:                 { type: Date, default: null },
  allow_retake:             { type: Boolean, default: false },
  shuffle_questions:        { type: Boolean, default: false },
  negative_marks_per_wrong: { type: Number, default: 0, min: 0 },
  weightage_percent:        { type: Number, default: 100, min: 0, max: 100 },
  created_by:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Exam', ExamSchema);
