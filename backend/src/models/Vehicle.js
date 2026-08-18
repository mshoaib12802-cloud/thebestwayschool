const mongoose = require('mongoose');

const VehicleSchema = new mongoose.Schema({
  registration_no: { type: String, required: true, unique: true, trim: true },
  vehicle_type: { type: String, default: 'bus' },
  capacity: { type: Number, default: 40 },
  driver_name: { type: String, default: '' },
  driver_phone: { type: String, default: '' },
  conductor_name: { type: String, default: '' },
  conductor_phone: { type: String, default: '' },
  is_active: { type: Boolean, default: true },
  notes: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Vehicle', VehicleSchema);
