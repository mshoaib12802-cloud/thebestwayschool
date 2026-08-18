const mongoose = require('mongoose');

const SubtopicSchema = new mongoose.Schema({
  title: { type: String, required: true },
  is_done: { type: Boolean, default: false }
}, { _id: true });

const TopicSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subtopics: [SubtopicSchema],
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  marks_weightage: { type: Number, default: 0 },
  is_completed: { type: Boolean, default: false },
  completion_date: { type: Date, default: null },
  notes: { type: String, default: '' }
}, { _id: true });

const ChapterSchema = new mongoose.Schema({
  chapter_no: { type: Number, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  topics: [TopicSchema]
}, { _id: true });

const SyllabusSchema = new mongoose.Schema({
  subject_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  class_id: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolClass', required: true },
  academic_year_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  title: { type: String, default: '' },
  chapters: [ChapterSchema],
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

SyllabusSchema.index({ subject_id: 1, class_id: 1, academic_year_id: 1 }, { unique: true });

module.exports = mongoose.model('Syllabus', SyllabusSchema);
