const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  exam_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  text:          { type: String, required: true },
  options:       { type: [String], validate: v => v.length === 4 },
  correct_index: { type: Number, min: 0, max: 3, required: true },
  marks:         { type: Number, default: 1, min: 1 },
  order:         { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Question', QuestionSchema);
