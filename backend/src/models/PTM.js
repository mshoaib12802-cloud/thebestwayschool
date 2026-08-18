const mongoose = require('mongoose');

const SlotSchema = new mongoose.Schema({
  time: { type: String, required: true }, // "09:00"
  parent_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null },
  is_booked: { type: Boolean, default: false },
  notes: { type: String, default: '' },
}, { _id: true });

const PTMSchema = new mongoose.Schema({
  title: { type: String, required: true },
  date: { type: Date, required: true },
  class_id: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolClass', required: true },
  teacher_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  academic_year_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear' },
  slot_duration_minutes: { type: Number, default: 10 },
  slots: [SlotSchema],
  venue: { type: String, default: '' },
  notes: { type: String, default: '' },
  status: { type: String, enum: ['scheduled', 'completed', 'cancelled'], default: 'scheduled' },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('PTM', PTMSchema);
