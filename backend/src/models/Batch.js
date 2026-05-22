const mongoose = require('mongoose');

const BatchSchema = new mongoose.Schema({
  name: { type: String, required: true },
  course_name: { type: String, required: true },
  course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },
  shift: { type: String, enum: ['Morning', 'Afternoon', 'Evening', 'Weekend'], default: 'Morning' },
  start_date: { type: Date },
  end_date: { type: Date },
  trainer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  capacity: { type: Number, default: 30 },
  is_active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Batch', BatchSchema);
