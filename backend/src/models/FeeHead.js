const mongoose = require('mongoose');

const FeeHeadSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  is_recurring: { type: Boolean, default: true }, // true = monthly, false = one-time
  is_active: { type: Boolean, default: true },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('FeeHead', FeeHeadSchema);
