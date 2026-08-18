const express = require('express');
const router  = express.Router();
const { protect, staffOnly } = require('../middlewares/authMiddleware');
const { subscribe, unsubscribe, getVapidKey, broadcastPush } = require('../controllers/pushController');

router.get('/vapid-key',   protect, getVapidKey);
router.post('/subscribe',  protect, subscribe);
router.post('/unsubscribe',protect, unsubscribe);
router.post('/broadcast',  protect, staffOnly, broadcastPush);

module.exports = router;
