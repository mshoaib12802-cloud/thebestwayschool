const Message = require('../models/Message');
const User    = require('../models/User');
const Student = require('../models/Student');

// Contacts: student → their teachers; teacher → their students
const getContacts = async (req, res) => {
  try {
    const me = req.user;
    let contactUserIds = [];

    if (me.role === 'student') {
      const student = await Student.findOne({ user_id: me._id }).select('courses');
      if (student) {
        const seen = new Set();
        for (const c of student.courses) {
          if (c.trainer_id && !seen.has(c.trainer_id.toString())) {
            seen.add(c.trainer_id.toString());
            contactUserIds.push(c.trainer_id);
          }
        }
      }
    } else if (me.role === 'teacher') {
      const students = await Student.find({
        'courses.trainer_id': me._id,
        isActive: true,
        user_id: { $ne: null },
      }).select('user_id');
      contactUserIds = students.map(s => s.user_id);
    }

    if (contactUserIds.length === 0) return res.json([]);

    // Mark all messages sent to me as delivered (user is online / polling)
    await Message.updateMany({ to: me._id, delivered: false }, { delivered: true });

    const contactUsers = await User.find({ _id: { $in: contactUserIds } }).select('name email role');

    const contacts = await Promise.all(contactUsers.map(async (c) => {
      const [lastMsg] = await Message.find({
        $or: [
          { from: me._id, to: c._id },
          { from: c._id,  to: me._id },
        ],
      }).sort({ createdAt: -1 }).limit(1).lean();

      const unread = await Message.countDocuments({ from: c._id, to: me._id, read: false });

      return {
        _id:         c._id,
        name:        c.name,
        role:        c.role,
        lastMessage: lastMsg?.text ?? null,
        lastTime:    lastMsg?.createdAt ?? null,
        unread,
      };
    }));

    contacts.sort((a, b) => {
      if (!a.lastTime && !b.lastTime) return 0;
      if (!a.lastTime) return 1;
      if (!b.lastTime) return -1;
      return new Date(b.lastTime) - new Date(a.lastTime);
    });

    res.json(contacts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Full thread between me and another user (also marks incoming as read)
const getThread = async (req, res) => {
  try {
    const me    = req.user._id;
    const other = req.params.userId;

    const messages = await Message.find({
      $or: [
        { from: me,    to: other },
        { from: other, to: me    },
      ],
    }).sort({ createdAt: 1 }).limit(100).lean();

    await Message.updateMany({ from: other, to: me, delivered: false }, { delivered: true });
    await Message.updateMany({ from: other, to: me, read: false }, { read: true });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Send a message
const sendMessage = async (req, res) => {
  try {
    const { to, text } = req.body;
    if (!to || !text?.trim()) {
      return res.status(400).json({ message: 'to and text are required' });
    }
    const msg = await Message.create({ from: req.user._id, to, text: text.trim() });
    res.status(201).json(msg);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Total unread count for the current user (used for the badge on the floating button)
const getUnreadCount = async (req, res) => {
  try {
    const me = req.user._id;
    await Message.updateMany({ to: me, delivered: false }, { delivered: true });
    const count = await Message.countDocuments({ to: me, read: false });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getContacts, getThread, sendMessage, getUnreadCount };
