const express = require('express');
const router = express.Router();
const { getPromotions, promoteStudent, promoteClass } = require('../controllers/promotionController');
const { protect, staffOnly, adminOnly } = require('../middlewares/authMiddleware');

router.get('/',            protect, staffOnly, getPromotions);
router.post('/student',    protect, adminOnly, promoteStudent);
router.post('/class-bulk', protect, adminOnly, promoteClass);

module.exports = router;
