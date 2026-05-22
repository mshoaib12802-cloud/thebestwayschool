const mongoose = require('mongoose');

const ResultSchema = new mongoose.Schema({
  exam_id:        { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  student_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  marks_obtained: { type: Number, required: true },
  remarks:        { type: String, default: '' },
  grade:          { type: String, default: '' },
  is_retake:      { type: Boolean, default: false },
  is_absent:      { type: Boolean, default: false },
}, { timestamps: true });

ResultSchema.index({ exam_id: 1, student_id: 1 }, { unique: true });

module.exports = mongoose.model('Result', ResultSchema);
