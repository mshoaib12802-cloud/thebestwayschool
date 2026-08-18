const mongoose = require('mongoose');

const HomeworkDiarySchema = new mongoose.Schema({
  class_id:        { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolClass', required: true },
  subject_id:      { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  academic_year_id:{ type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear' },
  teacher_id:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date:            { type: Date, required: true },
  title:           { type: String, required: true },
  description:     { type: String, default: '' },
  due_date:        { type: Date },
  type:            { type: String, enum: ['homework', 'classwork', 'project', 'reading', 'revision', 'other'], default: 'homework' },
  is_important:    { type: Boolean, default: false },
  attachments:     [{ file_url: String, file_name: String }],
}, { timestamps: true });

HomeworkDiarySchema.index({ class_id: 1, date: -1 });
HomeworkDiarySchema.index({ teacher_id: 1, date: -1 });

module.exports = mongoose.model('HomeworkDiary', HomeworkDiarySchema);
