const mongoose = require('mongoose');

const VideoProgressSchema = new mongoose.Schema({
  student_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  module_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'CourseModule', required: true },
  course_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  watched:       { type: Boolean, default: false },
  watched_at:    { type: Date },
  quiz_attempts: { type: Number, default: 0 },
  quiz_score:    { type: Number, default: 0 },
  quiz_total:    { type: Number, default: 0 },
  quiz_passed:   { type: Boolean, default: false },
  completed:     { type: Boolean, default: false },
  completed_at:  { type: Date },
  student_notes: { type: String, default: '' },
}, { timestamps: true });

VideoProgressSchema.index({ student_id: 1, module_id: 1 }, { unique: true });
VideoProgressSchema.index({ student_id: 1, course_id: 1 });

module.exports = mongoose.model('VideoProgress', VideoProgressSchema);
