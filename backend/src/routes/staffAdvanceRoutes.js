const express = require('express');
const router = express.Router();
const { protect, adminOnly, staffOnly } = require('../middlewares/authMiddleware');
const { getAdvances, applyAdvance, getMyAdvances, reviewAdvance, deleteAdvance } = require('../controllers/staffAdvanceController');

router.get('/',             protect, staffOnly, getAdvances);
router.put('/:id/review',   protect, adminOnly, reviewAdvance);
router.delete('/:id',       protect, adminOnly, deleteAdvance);
router.post('/apply',       protect, applyAdvance);
router.get('/my',           protect, getMyAdvances);

module.exports = router;
