const mongoose = require('mongoose');

const SeatSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null },
  student_name: { type: String, default: '' },
  roll_number: { type: String, default: '' },
  class_name: { type: String, default: '' },
  seat_no: { type: String },
  row_no: { type: Number },
  column_no: { type: Number },
}, { _id: true });

const SeatingPlanSchema = new mongoose.Schema({
  exam_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', default: null },
  exam_label: { type: String, required: true },
  room_name: { type: String, required: true },
  class_id: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolClass' },
  class_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SchoolClass' }],
  academic_year_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear' },
  date: { type: Date },
  seats: [SeatSchema],
  rows: { type: Number, default: 5 },
  columns: { type: Number, default: 6 },
  arrangement: { type: String, enum: ['sequential', 'random', 'serpentine', 'column_wise'], default: 'sequential' },
  students_count: { type: Number, default: 0 },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('SeatingPlan', SeatingPlanSchema);
