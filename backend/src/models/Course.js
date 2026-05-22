const mongoose = require('mongoose');

const CourseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  duration: { type: String, default: '3 Months' },
  total_fee: { type: Number, required: true },
  monthly_fee: { type: Number, required: true },
  is_active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Course', CourseSchema);
