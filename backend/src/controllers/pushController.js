const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');
const User = require('../models/User');

// VAPID keys — generate once with: npx web-push generate-vapid-keys
// Store in .env as VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY
const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY  || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || 'UUxI4O8-FbRouAevSmBQ6co62grn2DCR-9J5R4-fReE';

webpush.setVapidDetails(
  'mailto:admin@thebestway.edu.pk',
  VAPID_PUBLIC,
  VAPID_PRIVATE
);

// Save push subscription for current user
const subscribe = async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint) return res.status(400).json({ message: 'endpoint required' });

    await PushSubscription.findOneAndUpdate(
      { user_id: req.user._id, endpoint },
      { user_id: req.user._id, endpoint, keys },
      { upsert: true, new: true }
    );
    res.json({ message: 'Subscribed' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// Remove subscription
const unsubscribe = async (req, res) => {
  try {
    await PushSubscription.deleteMany({ user_id: req.user._id });
    res.json({ message: 'Unsubscribed' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// Get VAPID public key (needed by browser to subscribe)
const getVapidKey = async (req, res) => {
  res.json({ publicKey: VAPID_PUBLIC });
};

// Internal helper: send push to one or many user IDs
const sendPushToUsers = async (userIds, payload) => {
  const subs = await PushSubscription.find({ user_id: { $in: userIds } }).lean();
  const promises = subs.map(sub =>
    webpush.sendNotification(
      { endpoint: sub.endpoint, keys: sub.keys },
      JSON.stringify(payload)
    ).catch(() => {})
  );
  await Promise.all(promises);
};

// Admin: broadcast push to role(s)
const broadcastPush = async (req, res) => {
  try {
    const { roles, title, body, url } = req.body;
    const filter = roles?.length ? { role: { $in: roles } } : {};
    const users = await User.find(filter).select('_id').lean();
    const ids = users.map(u => u._id);
    await sendPushToUsers(ids, { title: title || 'New Notification', body: body || '', url: url || '/' });
    res.json({ sent: ids.length, message: 'Push notifications sent' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { subscribe, unsubscribe, getVapidKey, broadcastPush, sendPushToUsers };
