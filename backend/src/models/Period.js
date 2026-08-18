const mongoose = require('mongoose');

const PeriodSchema = new mongoose.Schema({
  name: { type: String, required: true },
  start_time: { type: String, required: true },
  end_time: { type: String, required: true },
  is_break: { type: Boolean, default: false },
  order: { type: Number, required: true },
  is_active: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Period', PeriodSchema);
