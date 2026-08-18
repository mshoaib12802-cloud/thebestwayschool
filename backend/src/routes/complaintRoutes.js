const express = require('express');
const router  = express.Router();
const { protect, staffOnly } = require('../middlewares/authMiddleware');
const { getAll, getMyComplaints, getById, create, reply, updateStatus, getStats } = require('../controllers/complaintController');

router.get('/stats',  protect, staffOnly, getStats);
router.get('/mine',   protect, getMyComplaints);
router.get('/',       protect, staffOnly, getAll);
router.get('/:id',    protect, getById);
router.post('/',      protect, create);
router.post('/:id/reply',   protect, reply);
router.put('/:id/status',   protect, staffOnly, updateStatus);

module.exports = router;
