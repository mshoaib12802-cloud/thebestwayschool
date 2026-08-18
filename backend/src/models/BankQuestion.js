const mongoose = require('mongoose');

const BankQuestionSchema = new mongoose.Schema({
  subject_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  class_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolClass', required: true },
  syllabus_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Syllabus', default: null },
  chapter_title: { type: String, default: '' },
  topic_title:   { type: String, default: '' },
  type: {
    type: String,
    enum: ['mcq', 'short', 'long', 'true_false', 'fill_blank', 'pair_match'],
    required: true
  },
  text: { type: String, required: true },
  options: [String],           // MCQ: 4 options
  correct_answer: { type: String, default: '' }, // option index or text
  marks: { type: Number, default: 1 },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  bloom_level: {
    type: String,
    enum: ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'],
    default: 'remember'
  },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  times_used: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('BankQuestion', BankQuestionSchema);
