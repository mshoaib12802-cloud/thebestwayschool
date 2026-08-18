const mongoose = require('mongoose');

const TermSchema = new mongoose.Schema({
  name: { type: String },
  start_date: { type: Date },
  end_date: { type: Date },
}, { _id: true });

const AcademicYearSchema = new mongoose.Schema({
  label: { type: String, required: true },
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  terms: [TermSchema],
  is_current: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('AcademicYear', AcademicYearSchema);
