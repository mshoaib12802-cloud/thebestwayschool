const Notification = require('../models/Notification');
const Student = require('../models/Student');

// Resolve a Student._id → User._id (for sending notifications to student accounts)
const getStudentUserId = async (studentId) => {
  if (!studentId) return null;
  try {
    const s = await Student.findById(studentId).select('user_id');
    return s?.user_id || null;
  } catch { return null; }
};

const notify = async (recipientUserId, title, message, type = 'info', link = '') => {
  if (!recipientUserId) return;
  try {
    await Notification.create({ recipient_id: recipientUserId, title, message, type, link });
  } catch (e) {
    console.error('Notification create error:', e.message);
  }
};

// Shortcut: notify a student by their Student._id
const notifyStudent = async (studentId, title, message, type = 'info', link = '') => {
  const userId = await getStudentUserId(studentId);
  if (userId) await notify(userId, title, message, type, link);
};

module.exports = { notify, notifyStudent, getStudentUserId };
