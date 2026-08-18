const axios = require('axios');
const InstituteSettings = require('../models/InstituteSettings');

let _settings = null;
let _settingsLoadedAt = 0;

async function getSettings() {
  // Cache for 60 seconds
  if (_settings && Date.now() - _settingsLoadedAt < 60000) return _settings;
  _settings = await InstituteSettings.findById('singleton').lean();
  _settingsLoadedAt = Date.now();
  return _settings;
}

/**
 * Send a single SMS
 * @param {string} to   - phone number (e.g. "+923001234567" or "03001234567")
 * @param {string} body - message text
 */
async function sendSMS(to, body) {
  try {
    const settings = await getSettings();
    if (!settings?.sms_enabled) return { ok: false, reason: 'SMS disabled' };

    // Normalize Pakistani numbers
    let phone = to.replace(/\s+/g, '');
    if (phone.startsWith('0')) phone = '+92' + phone.slice(1);
    if (!phone.startsWith('+')) phone = '+' + phone;

    if (settings.sms_provider === 'twilio') {
      const twilio = require('twilio');
      const client = twilio(settings.twilio_account_sid, settings.twilio_auth_token);
      await client.messages.create({ body, from: settings.sms_sender, to: phone });
      console.log(`[SMS/Twilio] Sent to ${phone}`);
      return { ok: true };
    }

    if (settings.sms_provider === 'webhook' && settings.sms_webhook_url) {
      await axios.post(settings.sms_webhook_url, {
        to: phone,
        message: body,
        sender: settings.sms_sender,
        api_key: settings.sms_api_key,
      }, { timeout: 8000 });
      console.log(`[SMS/Webhook] Sent to ${phone}`);
      return { ok: true };
    }

    // Dev fallback — log to console
    console.log(`[SMS/console] To: ${phone} | Msg: ${body}`);
    return { ok: true, dev: true };
  } catch (err) {
    console.error('[SMS Error]', err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * Send WhatsApp message via webhook
 */
async function sendWhatsApp(to, body) {
  try {
    const settings = await getSettings();
    if (!settings?.whatsapp_enabled || !settings.whatsapp_webhook_url) return { ok: false };

    let phone = to.replace(/\s+/g, '');
    if (phone.startsWith('0')) phone = '92' + phone.slice(1);
    if (phone.startsWith('+')) phone = phone.slice(1);

    await axios.post(settings.whatsapp_webhook_url, {
      phone,
      message: body,
      api_key: settings.whatsapp_api_key,
    }, { timeout: 8000 });
    console.log(`[WhatsApp] Sent to ${phone}`);
    return { ok: true };
  } catch (err) {
    console.error('[WhatsApp Error]', err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * Notify parent/guardian about absence
 */
async function notifyAbsence({ studentName, className, date, parentPhone }) {
  const d = new Date(date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
  const msg = `Dear Parent, ${studentName} (${className}) was marked ABSENT on ${d}. Please contact the school if needed. - Inflorescence`;
  if (parentPhone) {
    await sendSMS(parentPhone, msg);
    await sendWhatsApp(parentPhone, msg);
  }
}

/**
 * Notify about fee due
 */
async function notifyFeeDue({ studentName, amount, dueDate, parentPhone }) {
  const d = new Date(dueDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
  const msg = `Dear Parent, Fee of Rs.${amount} for ${studentName} is due by ${d}. Please pay to avoid late fine. - Inflorescence`;
  if (parentPhone) {
    await sendSMS(parentPhone, msg);
    await sendWhatsApp(parentPhone, msg);
  }
}

/**
 * Notify about result published
 */
async function notifyResult({ studentName, term, percentage, parentPhone }) {
  const msg = `Dear Parent, Result for ${studentName} - ${term}: ${percentage}%. Login to portal to view full report card. - Inflorescence`;
  if (parentPhone) {
    await sendSMS(parentPhone, msg);
    await sendWhatsApp(parentPhone, msg);
  }
}

/**
 * Notify about fine issued
 */
async function notifyFine({ studentName, amount, reason, parentPhone }) {
  const msg = `Dear Parent, A fine of Rs.${amount} has been issued for ${studentName} (${reason}). Please pay promptly. - Inflorescence`;
  if (parentPhone) {
    await sendSMS(parentPhone, msg);
    await sendWhatsApp(parentPhone, msg);
  }
}

/**
 * Send bulk SMS to a list of numbers
 */
async function sendBulkSMS(numbers, body) {
  const results = await Promise.allSettled(numbers.map(n => sendSMS(n, body)));
  const sent   = results.filter(r => r.status === 'fulfilled' && r.value?.ok).length;
  const failed = results.length - sent;
  return { total: results.length, sent, failed };
}

module.exports = { sendSMS, sendWhatsApp, sendBulkSMS, notifyAbsence, notifyFeeDue, notifyResult, notifyFine };
