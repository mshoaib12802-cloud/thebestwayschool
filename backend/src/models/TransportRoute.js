const mongoose = require('mongoose');

const StopSchema = new mongoose.Schema({
  name: { type: String, required: true },
  pickup_time: { type: String, default: '' },
  drop_time: { type: String, default: '' },
  monthly_fee: { type: Number, default: 0 },
}, { _id: true });

const TransportRouteSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  vehicle_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', default: null },
  stops: [StopSchema],
  academic_year_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear' },
  is_active: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('TransportRoute', TransportRouteSchema);
