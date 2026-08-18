const express = require('express');
const router  = express.Router();
const { protect, adminOnly } = require('../middlewares/authMiddleware');
const { getSettings, updateSettings, updateLogo, testSMS } = require('../controllers/settingsController');
const { uploadLogo } = require('../middlewares/uploadDocs');

router.get('/',          protect, getSettings);
router.put('/',          protect, adminOnly, updateSettings);
router.post('/logo',     protect, adminOnly, uploadLogo.single('logo'), updateLogo);
router.post('/test-sms', protect, adminOnly, testSMS);

module.exports = router;
