const mongoose = require('mongoose');

const BookIssueSchema = new mongoose.Schema({
  book_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  borrower_type: { type: String, enum: ['student', 'staff'], required: true },
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null },
  staff_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  issue_date: { type: Date, default: Date.now },
  due_date: { type: Date, required: true },
  return_date: { type: Date, default: null },
  status: { type: String, enum: ['issued', 'returned', 'overdue'], default: 'issued' },
  fine_amount: { type: Number, default: 0 },
  fine_paid: { type: Boolean, default: false },
  notes: { type: String, default: '' },
  issued_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  returned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

module.exports = mongoose.model('BookIssue', BookIssueSchema);
