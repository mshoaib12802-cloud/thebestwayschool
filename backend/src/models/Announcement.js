const mongoose = require('mongoose');

const AnnouncementSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  body: { type: String, required: true },
  audience: {
    type: [String],
    enum: ['all', 'students', 'parents', 'teachers', 'staff'],
    default: ['all'],
  },
  class_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SchoolClass' }], // empty = school-wide
  is_pinned: { type: Boolean, default: false },
  expires_at: { type: Date, default: null },
  attachment_url: { type: String, default: '' },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  is_active: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Announcement', AnnouncementSchema);
