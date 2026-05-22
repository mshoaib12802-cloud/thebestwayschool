const mongoose = require('mongoose');

const EntrySchema = new mongoose.Schema({
  subject:     { type: String, required: true },
  date:        { type: Date, required: true },
  start_time:  { type: String, default: '' },
  end_time:    { type: String, default: '' },
  room:        { type: String, default: '' },
  examiner:    { type: String, default: '' },
  notes:       { type: String, default: '' },
}, { _id: false });

const DateSheetSchema = new mongoose.Schema({
  title:         { type: String, required: true },
  course_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  course_name:   { type: String, required: true },
  batch_id:      { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', default: null },
  description:   { type: String, default: '' },
  academic_year: { type: String, default: '' },
  entries:       [EntrySchema],
  is_published:  { type: Boolean, default: false },
  published_at:  { type: Date, default: null },
  created_by:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('DateSheet', DateSheetSchema);
