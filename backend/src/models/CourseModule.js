const mongoose = require('mongoose');

const ResourceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  url: { type: String, default: '' }
}, { _id: false });

const QuizQuestionSchema = new mongoose.Schema({
  text:          { type: String, required: true },
  options:       { type: [String], validate: v => v.length === 4 },
  correct_index: { type: Number, required: true, min: 0, max: 3 },
  marks:         { type: Number, default: 1 },
}, { _id: true });

const QuizSchema = new mongoose.Schema({
  pass_percent: { type: Number, default: 70 },
  questions:    [QuizQuestionSchema],
}, { _id: false });

const CourseModuleSchema = new mongoose.Schema({
  course_id:           { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  title:               { type: String, required: true },
  description:         { type: String, default: '' },
  order:               { type: Number, required: true },
  type: {
    type: String,
    enum: ['theory', 'practical', 'project', 'assessment', 'workshop'],
    default: 'theory'
  },
  duration_days:       { type: Number, default: 1 },
  status: {
    type: String,
    enum: ['upcoming', 'in_progress', 'completed'],
    default: 'upcoming'
  },
  started_date:        { type: Date },
  completed_date:      { type: Date },
  teacher_notes:       { type: String, default: '' },
  notes_visible:       { type: Boolean, default: true },
  resources:           [ResourceSchema],
  // LMS video fields
  video_url:           { type: String, default: '' },
  video_title:         { type: String, default: '' },
  video_duration_mins: { type: Number, default: 0 },
  quiz:                { type: QuizSchema, default: () => ({ pass_percent: 70, questions: [] }) },
  created_by:          { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('CourseModule', CourseModuleSchema);
