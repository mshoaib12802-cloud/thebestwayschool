const mongoose = require('mongoose');

const DiscussionSchema = new mongoose.Schema({
  module_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'CourseModule', required: true },
  course_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  author_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  parent_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'Discussion', default: null },
  message:    { type: String, required: true, maxlength: 2000 },
  is_teacher: { type: Boolean, default: false },
  is_pinned:  { type: Boolean, default: false },
}, { timestamps: true });

DiscussionSchema.index({ module_id: 1, parent_id: 1 });

module.exports = mongoose.model('Discussion', DiscussionSchema);
