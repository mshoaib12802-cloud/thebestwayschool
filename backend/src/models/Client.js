const mongoose = require('mongoose');

const ClientSchema = new mongoose.Schema({
  company_name:   { type: String, required: true },
  contact_person: { type: String, required: true },
  email:          { type: String, required: true, unique: true },
  phone:          { type: String, default: '' },
  address:        { type: String, default: '' },
  city:           { type: String, default: '' },
  industry:       { type: String, default: '' },
  website:        { type: String, default: '' },
  status:         { type: String, enum: ['active', 'inactive', 'prospect'], default: 'active' },
  user_id:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  notes:          { type: String, default: '' },
  source:         { type: String, default: '' },
  created_by:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Client', ClientSchema);
