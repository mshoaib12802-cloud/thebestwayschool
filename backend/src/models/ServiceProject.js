const mongoose = require('mongoose');

const MilestoneSchema = new mongoose.Schema({
  title:               { type: String, required: true },
  description:         { type: String, default: '' },
  status:              { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
  due_date:            { type: Date },
  completed_date:      { type: Date },
  client_approved:     { type: Boolean, default: false },
  client_approved_at:  { type: Date },
  order:               { type: Number, default: 0 },
}, { _id: true });

const ServiceProjectSchema = new mongoose.Schema({
  client_id:            { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  title:                { type: String, required: true },
  description:          { type: String, default: '' },
  service_type:         { type: String, default: '' },
  status:               { type: String, enum: ['planning', 'in_progress', 'review', 'completed', 'on_hold'], default: 'planning' },
  priority:             { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  start_date:           { type: Date },
  deadline:             { type: Date },
  budget:               { type: Number, default: 0 },
  paid_amount:          { type: Number, default: 0 },
  currency:             { type: String, enum: ['PKR', 'USD'], default: 'PKR' },
  assigned_to:          [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  milestones:           [MilestoneSchema],
  is_visible_to_client: { type: Boolean, default: true },
  client_notes:         { type: String, default: '' },
  internal_notes:       { type: String, default: '' },
  created_by:           { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

ServiceProjectSchema.index({ client_id: 1, createdAt: -1 });

module.exports = mongoose.model('ServiceProject', ServiceProjectSchema);
