const mongoose = require('mongoose');

const InstituteSettingsSchema = new mongoose.Schema({
  _id: { type: String, default: 'singleton' },
  name:        { type: String, default: 'Inflorescence Advance Skills' },
  tagline:     { type: String, default: '' },
  logo_url:    { type: String, default: '' },
  address:     { type: String, default: '' },
  city:        { type: String, default: '' },
  phone:       { type: String, default: '' },
  email:       { type: String, default: '' },
  website:     { type: String, default: '' },
  currency:    { type: String, default: 'PKR' },
  currency_symbol: { type: String, default: 'Rs.' },
  timezone:    { type: String, default: 'Asia/Karachi' },
  academic_session: { type: String, default: '' },
  // SMS
  sms_enabled:  { type: Boolean, default: false },
  sms_provider: { type: String, enum: ['twilio', 'webhook', 'none'], default: 'none' },
  sms_api_key:  { type: String, default: '' },
  sms_sender:   { type: String, default: '' },
  sms_webhook_url: { type: String, default: '' },
  twilio_account_sid: { type: String, default: '' },
  twilio_auth_token:  { type: String, default: '' },
  // WhatsApp
  whatsapp_enabled:    { type: Boolean, default: false },
  whatsapp_webhook_url: { type: String, default: '' },
  whatsapp_api_key:    { type: String, default: '' },
  // Notification toggles
  notify_on_absence:   { type: Boolean, default: true },
  notify_on_fee_due:   { type: Boolean, default: true },
  notify_on_result:    { type: Boolean, default: true },
  notify_on_fine:      { type: Boolean, default: true },
  // Fee settings
  fee_due_day:    { type: Number, default: 10 },
  fine_per_day:   { type: Number, default: 0 },
  // Social
  facebook_url:   { type: String, default: '' },
  instagram_url:  { type: String, default: '' },
  // Updated by
  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, _id: false });

module.exports = mongoose.model('InstituteSettings', InstituteSettingsSchema);
