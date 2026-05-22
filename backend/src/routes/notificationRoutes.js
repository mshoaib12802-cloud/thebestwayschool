const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { getMyNotifications, getUnreadCount, markRead, markAllRead } = require('../controllers/notificationController');

router.get('/',              protect, getMyNotifications);
router.get('/unread-count',  protect, getUnreadCount);
router.patch('/:id/read',    protect, markRead);
router.patch('/read-all',    protect, markAllRead);

module.exports = router;
