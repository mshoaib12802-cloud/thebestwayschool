const mongoose = require('mongoose');

const AssignmentSubmissionSchema = new mongoose.Schema({
  assignment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  submission_text: { type: String, default: '' },
  attachment_url: { type: String, default: '' },
  submitted_at: { type: Date, default: Date.now },
  is_late: { type: Boolean, default: false },
  obtained_marks: { type: Number, default: null },
  feedback: { type: String, default: '' },
  status: { type: String, enum: ['submitted', 'graded', 'returned'], default: 'submitted' },
  graded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  graded_at: { type: Date, default: null },
}, { timestamps: true });

AssignmentSubmissionSchema.index({ assignment_id: 1, student_id: 1 }, { unique: true });

module.exports = mongoose.model('AssignmentSubmission', AssignmentSubmissionSchema);
