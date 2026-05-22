const mongoose = require('mongoose');

const ScheduleSchema = new mongoose.Schema({
  batch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
  day_of_week: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    required: true
  },
  start_time: { type: String, required: true },
  end_time: { type: String, required: true },
  room: { type: String, default: '' },
  subject: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Schedule', ScheduleSchema);
