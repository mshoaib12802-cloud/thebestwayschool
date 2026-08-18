const mongoose = require('mongoose');

const SubjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, default: '' },
  class_id: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolClass', required: true },
  teacher_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  total_marks: { type: Number, default: 100 },
  passing_marks: { type: Number, default: 40 },
  is_active: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Subject', SubjectSchema);
