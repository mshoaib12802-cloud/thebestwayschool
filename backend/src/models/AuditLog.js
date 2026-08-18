const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  user_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  user_name:   { type: String },
  user_role:   { type: String },
  action:      { type: String, enum: ['create', 'update', 'delete', 'login', 'logout', 'export', 'print', 'approve', 'reject'], required: true },
  module:      { type: String, required: true },
  entity_type: { type: String },
  entity_id:   { type: mongoose.Schema.Types.ObjectId },
  entity_label:{ type: String },
  description: { type: String },
  old_value:   { type: mongoose.Schema.Types.Mixed },
  new_value:   { type: mongoose.Schema.Types.Mixed },
  ip_address:  { type: String },
  user_agent:  { type: String },
}, { timestamps: true });

AuditLogSchema.index({ user_id: 1, createdAt: -1 });
AuditLogSchema.index({ module: 1, createdAt: -1 });
AuditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
