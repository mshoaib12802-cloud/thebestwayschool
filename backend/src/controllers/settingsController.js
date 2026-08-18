const InstituteSettings = require('../models/InstituteSettings');
const audit = require('../utils/auditLogger');

const getSettings = async (req, res) => {
  try {
    let s = await InstituteSettings.findById('singleton').lean();
    if (!s) s = await InstituteSettings.create({ _id: 'singleton' });
    // Never expose credentials to frontend
    const safe = { ...s };
    delete safe.twilio_auth_token;
    delete safe.sms_api_key;
    delete safe.whatsapp_api_key;
    res.json(safe);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const updateSettings = async (req, res) => {
  try {
    const allowed = [
      'name','tagline','address','city','phone','email','website',
      'currency','currency_symbol','timezone','academic_session',
      'sms_enabled','sms_provider','sms_api_key','sms_sender','sms_webhook_url',
      'twilio_account_sid','twilio_auth_token',
      'whatsapp_enabled','whatsapp_webhook_url','whatsapp_api_key',
      'notify_on_absence','notify_on_fee_due','notify_on_result','notify_on_fine',
      'fee_due_day','fine_per_day','facebook_url','instagram_url',
    ];
    const update = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
    update.updated_by = req.user._id;

    const s = await InstituteSettings.findByIdAndUpdate('singleton', { $set: update }, { upsert: true, new: true });
    await audit({ req, action: 'update', module: 'Settings', description: 'Institute settings updated' });
    res.json({ message: 'Settings saved', settings: s });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// Update logo URL after file upload
const updateLogo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const logo_url = `/uploads/settings/${req.file.filename}`;
    await InstituteSettings.findByIdAndUpdate('singleton', { $set: { logo_url } }, { upsert: true });
    await audit({ req, action: 'update', module: 'Settings', description: 'Institute logo updated' });
    res.json({ logo_url });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// Test SMS — send a test message
const testSMS = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ message: 'Phone number required' });
    const { sendSMS } = require('../utils/smsService');
    const result = await sendSMS(phone, 'Test SMS from Inflorescence ERP. SMS integration is working!');
    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { getSettings, updateSettings, updateLogo, testSMS };
