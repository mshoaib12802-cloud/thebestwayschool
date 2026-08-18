const mongoose = require('mongoose');

const ReplySchema = new mongoose.Schema({
  by:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  by_name:  { type: String },
  by_role:  { type: String },
  message:  { type: String, required: true },
}, { timestamps: true });

const ComplaintSchema = new mongoose.Schema({
  ticket_no:      { type: String, unique: true },
  submitted_by_type: { type: String, enum: ['student', 'parent', 'staff'], required: true },
  submitted_by_id:   { type: mongoose.Schema.Types.ObjectId, required: true },
  submitted_by_name: { type: String },
  category:   { type: String, enum: ['academic', 'fee', 'staff_behaviour', 'facility', 'transport', 'bullying', 'administration', 'other'], default: 'other' },
  priority:   { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  title:      { type: String, required: true },
  description:{ type: String, required: true },
  status:     { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open' },
  assigned_to:{ type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolved_at:{ type: Date },
  resolution: { type: String, default: '' },
  replies:    [ReplySchema],
  is_anonymous:{ type: Boolean, default: false },
}, { timestamps: true });

ComplaintSchema.pre('save', async function (next) {
  if (!this.ticket_no) {
    const count = await mongoose.model('Complaint').countDocuments();
    this.ticket_no = `CMP-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

ComplaintSchema.index({ status: 1, createdAt: -1 });
ComplaintSchema.index({ submitted_by_id: 1 });

module.exports = mongoose.model('Complaint', ComplaintSchema);
