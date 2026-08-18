const express = require('express');
const router = express.Router();
const { protect, adminOnly, staffOnly, parentOnly } = require('../middlewares/authMiddleware');
const { getLeaves, reviewLeave, deleteLeave, applyLeave, getMyLeaves, applyStudentLeave, getChildLeaves } = require('../controllers/leaveController');

router.get('/',                                protect, staffOnly, getLeaves);
router.put('/:id/review',                      protect, adminOnly, reviewLeave);
router.delete('/:id',                          protect, adminOnly, deleteLeave);

router.post('/apply',                          protect, applyLeave);
router.get('/my',                              protect, getMyLeaves);

router.post('/student/:studentId',             protect, parentOnly, applyStudentLeave);
router.get('/student/:studentId',              protect, parentOnly, getChildLeaves);

module.exports = router;
