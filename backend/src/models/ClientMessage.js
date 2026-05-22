const mongoose = require('mongoose');

const ClientMessageSchema = new mongoose.Schema({
  client_id:         { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  project_id:        { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceProject', default: null },
  sender_type:       { type: String, enum: ['client', 'staff'], required: true },
  sender_id:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message:           { type: String, required: true, maxlength: 3000 },
  is_read_by_client: { type: Boolean, default: false },
  is_read_by_staff:  { type: Boolean, default: false },
}, { timestamps: true });

ClientMessageSchema.index({ client_id: 1, createdAt: 1 });

module.exports = mongoose.model('ClientMessage', ClientMessageSchema);
