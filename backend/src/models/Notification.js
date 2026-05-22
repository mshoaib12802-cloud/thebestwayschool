const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:        { type: String, required: true },
  message:      { type: String, required: true },
  type:         { type: String, enum: ['fee', 'result', 'attendance', 'fine', 'info'], default: 'info' },
  is_read:      { type: Boolean, default: false },
  link:         { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
