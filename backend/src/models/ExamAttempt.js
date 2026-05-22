const mongoose = require('mongoose');

const AnswerSchema = new mongoose.Schema({
  question_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
  selected_index:    { type: Number, default: -1 }, // -1 = skipped
  time_spent_seconds:{ type: Number, default: 0 },
  flagged:           { type: Boolean, default: false },
}, { _id: false });

const ExamAttemptSchema = new mongoose.Schema({
  exam_id:            { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  student_id:         { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  answers:            { type: [AnswerSchema], default: [] },
  score:              { type: Number, default: 0 },
  total_marks:        { type: Number, default: 0 },
  grade:              { type: String, default: '' },
  started_at:         { type: Date, default: Date.now },
  submitted_at:       { type: Date },
  time_taken_seconds: { type: Number, default: 0 },
  status:             { type: String, enum: ['in_progress', 'submitted', 'timed_out'], default: 'in_progress' },
}, { timestamps: true });

ExamAttemptSchema.index({ exam_id: 1, student_id: 1 }, { unique: true });

module.exports = mongoose.model('ExamAttempt', ExamAttemptSchema);
