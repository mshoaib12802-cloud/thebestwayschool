const mongoose = require('mongoose');

const ResourceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  url:   { type: String, default: '' },
}, { _id: false });

const PdfFileSchema = new mongoose.Schema({
  title:         { type: String, required: true },
  filename:      { type: String, required: true },
  original_name: { type: String, default: '' },
  size_bytes:    { type: Number, default: 0 },
}, { _id: true });

const QuizQuestionSchema = new mongoose.Schema({
  text:          { type: String, required: true },
  options:       [{ type: String }],
  correct_index: { type: Number, required: true },
  marks:         { type: Number, default: 1 },
}, { _id: true });

const SubjectLessonSchema = new mongoose.Schema({
  subject_id:          { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  teacher_id:          { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title:               { type: String, required: true },
  description:         { type: String, default: '' },
  order:               { type: Number, default: 1 },
  type:                { type: String, enum: ['theory', 'practical', 'project', 'assessment', 'workshop'], default: 'theory' },
  video_url:           { type: String, default: '' },
  video_title:         { type: String, default: '' },
  video_duration_mins: { type: Number, default: 0 },
  resources:           [ResourceSchema],
  is_published:        { type: Boolean, default: false },
  quiz: {
    pass_percent: { type: Number, default: 70 },
    questions:    [QuizQuestionSchema],
  },
  teacher_notes:  { type: String, default: '' },
  notes_visible:  { type: Boolean, default: true },
  pdf_files:      [PdfFileSchema],
}, { timestamps: true });

SubjectLessonSchema.index({ subject_id: 1, order: 1 });

module.exports = mongoose.model('SubjectLesson', SubjectLessonSchema);
