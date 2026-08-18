const mongoose = require('mongoose');

const ConductSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  incident_date: { type: Date, default: Date.now },
  type: { type: String, enum: ['positive', 'negative'], required: true },
  category: {
    type: String,
    enum: ['discipline', 'academic', 'attendance', 'respect', 'teamwork', 'uniform', 'property_damage', 'other'],
    default: 'other',
  },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  action_taken: { type: String, default: '' },
  points: { type: Number, default: 0 }, // positive = merit, negative = demerit
  reported_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  parent_notified: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Conduct', ConductSchema);
