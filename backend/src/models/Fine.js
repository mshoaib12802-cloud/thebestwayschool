const mongoose = require('mongoose');

const FineSchema = new mongoose.Schema({
  target_type: {
    type: String,
    enum: ['student', 'staff'],
    required: true
  },
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    default: null
  },
  staff_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  category: {
    type: String,
    enum: ['late_arrival', 'absence', 'misconduct', 'library', 'damage', 'uniform', 'other'],
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'waived'],
    default: 'pending'
  },
  issued_date: {
    type: Date,
    default: Date.now
  },
  paid_date: {
    type: Date,
    default: null
  },
  issued_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: {
    type: String,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model('Fine', FineSchema);
