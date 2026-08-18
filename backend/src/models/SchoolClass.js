const mongoose = require('mongoose');

const SchoolClassSchema = new mongoose.Schema({
  name: { type: String, required: true },
  section: { type: String, default: 'A' },
  grade_level: { type: Number, required: true },
  class_teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  academic_year: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', default: null },
  capacity: { type: Number, default: 40 },
  room: { type: String, default: '' },
  is_active: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('SchoolClass', SchoolClassSchema);
