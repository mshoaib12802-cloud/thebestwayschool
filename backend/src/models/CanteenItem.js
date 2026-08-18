const mongoose = require('mongoose');

const CanteenItemSchema = new mongoose.Schema({
  name:           { type: String, required: true, trim: true },
  category:       { type: String, enum: ['breakfast', 'lunch', 'snack', 'drink', 'other'], default: 'other' },
  price:          { type: Number, required: true, min: 0 },
  description:    { type: String, default: '' },
  available_days: { type: [String], default: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  is_active:      { type: Boolean, default: true },
  created_by:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('CanteenItem', CanteenItemSchema);
