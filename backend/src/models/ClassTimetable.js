const mongoose = require('mongoose');

const ClassTimetableSchema = new mongoose.Schema({
  class_id:        { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolClass',  required: true },
  academic_year_id:{ type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  day_of_week: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    required: true,
  },
  period_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'Period',  required: true },
  subject_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null },
  teacher_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User',    default: null },
  room:       { type: String, default: '' },
}, { timestamps: true });

ClassTimetableSchema.index(
  { class_id: 1, academic_year_id: 1, day_of_week: 1, period_id: 1 },
  { unique: true }
);

module.exports = mongoose.model('ClassTimetable', ClassTimetableSchema);
