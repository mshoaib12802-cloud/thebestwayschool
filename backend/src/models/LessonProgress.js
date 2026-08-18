const mongoose = require('mongoose');

const LessonProgressSchema = new mongoose.Schema({
  student_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lesson_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'SubjectLesson', required: true },
  subject_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  watched:       { type: Boolean, default: false },
  watched_at:    { type: Date },
  completed:     { type: Boolean, default: false },
  completed_at:  { type: Date },
  quiz_attempts: { type: Number, default: 0 },
  quiz_score:    { type: Number, default: 0 },
  quiz_total:    { type: Number, default: 0 },
  quiz_passed:   { type: Boolean, default: false },
  student_notes: { type: String, default: '' },
}, { timestamps: true });

LessonProgressSchema.index({ student_id: 1, lesson_id: 1 }, { unique: true });
LessonProgressSchema.index({ student_id: 1, subject_id: 1 });

module.exports = mongoose.model('LessonProgress', LessonProgressSchema);
