const mongoose = require('mongoose');

const PushSubscriptionSchema = new mongoose.Schema({
  user_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  endpoint: { type: String, required: true },
  keys: {
    p256dh: { type: String },
    auth:   { type: String },
  },
}, { timestamps: true });

PushSubscriptionSchema.index({ user_id: 1, endpoint: 1 }, { unique: true });

module.exports = mongoose.model('PushSubscription', PushSubscriptionSchema);
