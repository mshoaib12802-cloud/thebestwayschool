const mongoose = require('mongoose');

const DiaryItemSchema = new mongoose.Schema({
  subject_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null },
  subject_name:  { type: String, default: '' },
  topic_covered: { type: String, default: '' },
  homework:      { type: String, default: '' },
  notes:         { type: String, default: '' },
}, { _id: true });

const DiaryEntrySchema = new mongoose.Schema({
  class_id:         { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolClass', required: true },
  academic_year_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  date:             { type: Date, required: true },
  items:            [DiaryItemSchema],
  general_note:     { type: String, default: '' },
  is_published:     { type: Boolean, default: true },
  created_by:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

DiaryEntrySchema.index({ class_id: 1, date: -1 });

module.exports = mongoose.model('DiaryEntry', DiaryEntrySchema);
