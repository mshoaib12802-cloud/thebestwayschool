const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  event_type: {
    type: String,
    enum: ['holiday', 'exam', 'ptm', 'sports', 'cultural', 'meeting', 'other'],
    default: 'other',
  },
  start_date: { type: Date, required: true },
  end_date: { type: Date },
  is_all_day: { type: Boolean, default: true },
  start_time: { type: String, default: '' },
  end_time: { type: String, default: '' },
  audience: {
    type: [String],
    enum: ['all', 'students', 'parents', 'teachers', 'staff'],
    default: ['all'],
  },
  class_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SchoolClass' }],
  color: { type: String, default: '#6366f1' },
  is_active: { type: Boolean, default: true },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Event', EventSchema);
