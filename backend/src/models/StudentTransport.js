const mongoose = require('mongoose');

const StudentTransportSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, unique: true },
  route_id: { type: mongoose.Schema.Types.ObjectId, ref: 'TransportRoute', required: true },
  stop_name: { type: String, default: '' },
  monthly_fee: { type: Number, default: 0 },
  academic_year_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear' },
  is_active: { type: Boolean, default: true },
  enrolled_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('StudentTransport', StudentTransportSchema);
