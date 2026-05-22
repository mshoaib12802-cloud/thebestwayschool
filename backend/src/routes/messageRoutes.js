const express = require('express');
const router  = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { getContacts, getThread, sendMessage, getUnreadCount } = require('../controllers/messageController');

router.use(protect);

router.get('/contacts',        getContacts);
router.get('/unread',          getUnreadCount);
router.get('/thread/:userId',  getThread);
router.post('/send',           sendMessage);

module.exports = router;
