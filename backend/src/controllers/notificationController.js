const Notification = require('../models/Notification');

const getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient_id: req.user._id })
      .sort({ createdAt: -1 }).limit(50);
    res.json(notifications);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ recipient_id: req.user._id, is_read: false });
    res.json({ count });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const markRead = async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient_id: req.user._id },
      { is_read: true }
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ recipient_id: req.user._id, is_read: false }, { is_read: true });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { getMyNotifications, getUnreadCount, markRead, markAllRead };
